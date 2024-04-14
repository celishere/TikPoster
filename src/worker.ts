import * as fs from "fs/promises";
import * as fs_base from "fs";

import { RedisClientType } from "redis";
import { Logger } from "pino";

import { flag } from 'country-emoji';

import { sprintf } from 'sprintf-js';

import { Telegraf } from "telegraf";
import { InputMediaPhoto } from "telegraf/src/core/types/typegram";

import { IConfig } from "./interfaces/config.interface";
import { IFavouriteVideo} from "./interfaces/favourite.model.interface";

import { downloadVideo, getLikedVideos } from "./http";

import { abbrNum, checkFileSize } from "./utils";

import { compressVideo } from "./videoProcessor";


enum ContentType {
    IMAGES = 'images',
    VIDEO = 'video'
}

enum Events {
    PROCESSING = 'processing',
    FETCH_ERR = 'fetchErr',
    NO_VIDEOS_ERR = 'noVideos',
    VIDEO_RENDER_START = 'videoRenderStart',
    VIDEO_RENDER_END = 'videoRenderEnd',
    VIDEO_RENDER_ERR = 'videoRenderErr',
    VIDEO_SEND = 'videoSend',
    IMAGE_SEND = 'imageSend',
    COMPLETED = 'completed'
}

class Worker {
    private readonly appPath: string;
    private readonly cachePath: string;

    constructor(
        private readonly logger: Logger,
        private readonly config: IConfig,
        private readonly bot: Telegraf,
        private readonly redis: RedisClientType
    ) {
        this.appPath = fs_base.realpathSync(`${ __dirname }/../`);
        this.cachePath = `${ this.appPath }/cache`;

        if (!fs_base.existsSync(this.cachePath)) {
            fs_base.mkdirSync(this.cachePath);
        }
    }

    async createTask(): Promise<void> {
        let videos;

        try {
            videos = await getLikedVideos(this.logger, this.config.tiktok_username, this.config.fetch_count);
        } catch (err) {
            this.logger.error({
                event: Events.FETCH_ERR
            });
            return;
        }

        if (!videos) {
            this.logger.error({
                event: Events.NO_VIDEOS_ERR
            });
            return;
        }

        for (const video of videos) {
            try {
                const cache = await this.redis.get(`tiktok:${video.id}`);
                if (cache) {
                    continue;
                }

                const title = video.title ? video.title : "";

                const views = abbrNum(video.views);
                const likes = abbrNum(video.likes);

                const type = video.images && video.images.length > 0 ? ContentType.IMAGES : ContentType.VIDEO;

                const caption = sprintf(
                    '%s [%s] %s\n\nViews: %s | Likes: %s',
                    flag(video.region),
                    video.author.nickname,
                    title,
                    views,
                    likes
                )

                this.logger.info({
                    event: Events.PROCESSING,
                    id: video.id,
                    type,
                    views,
                    likes
                })

                switch (type) {
                    case ContentType.VIDEO:
                        await this.processVideo(video, caption);
                        break;
                    case ContentType.IMAGES:
                        await this.processImages(video, caption)
                        break;
                }

                await this.redis.set(`tiktok:${video.id}`, 1);

                this.logger.info({
                    event: Events.COMPLETED,
                    id: video.id
                });
            } catch (e) {
                this.logger.error(e);
            }
        }
    }

    async processVideo(video: IFavouriteVideo, caption: string): Promise<void> {
        try {
            let videoPath = `${ this.cachePath }/${ video.id }.mp4`;
            const maxSize = 10 * 1024 * 1024;

            this.logger.info({
                event: Events.VIDEO_RENDER_START,
                id: video.id,
                videoPath
            });

            await downloadVideo(video.play, videoPath, this.logger);

            if (await checkFileSize(videoPath, maxSize)) {
                const oldVideoPath = videoPath;
                videoPath = `${ this.cachePath }/${ video.id }_new.mp4`;

                await compressVideo(oldVideoPath, videoPath);
                this.logger.info({
                    event: Events.VIDEO_RENDER_END,
                    id: video.id
                });
                await fs.unlink(oldVideoPath);
            }

            this.logger.info({
                event: Events.VIDEO_SEND,
                id: video.id
            });

            const stream = await fs.readFile(videoPath);
          //  await this.bot.telegram.sendVideo(this.config.channel_id, { source: stream }, { caption });
            await fs.unlink(videoPath);
        } catch (error) {
            this.logger.error({
                event: Events.VIDEO_RENDER_ERR,
                err: error
            });
        }
    }

    async processImages(video: IFavouriteVideo, caption: string): Promise<void> {
        const imagesFromVideo = video.images ? video.images : [];

        const images: InputMediaPhoto[] = [];
        const continuationTag = `(Продолжение) [${ video.author.nickname }]`;

        let pageNumber = 1;

        const totalPages = Math.ceil(imagesFromVideo.length / 10);

        for (const image of Array.from(imagesFromVideo)) {
            const key = Array.from(imagesFromVideo).indexOf(image);
            const pageText = totalPages > 1 ? ` (страница: ${ pageNumber } из ${ totalPages })` : "";

            let captionText = "";
            if (key === 0) {
                captionText = caption + "\n\n" + pageText;
            } else if (images.length === 0 && pageNumber > 1) {
                captionText = continuationTag + pageText;

                pageNumber++;
            }

            images.push({
                caption: captionText,
                type: 'photo',
                media: { url: image }
            });

            if (images.length === 10 || key === Array.from(imagesFromVideo).length - 1) {
               // await this.bot.telegram.sendMediaGroup(this.config.channel_id, images);

                this.logger.info({
                    event: Events.IMAGE_SEND,
                    id: video.id,
                    page: pageNumber
                });

                images.length = 0;
            }
        }
    }
}

export default Worker;