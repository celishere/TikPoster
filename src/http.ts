import axios from "axios";
import { Logger } from "pino";

import * as fs from "fs/promises";

import { IFavouriteResponse, IFavouriteVideo } from "./interfaces/favourite.model.interface";

const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36";

const client = axios.create({
    baseURL: "https://www.tikwm.com/api/",
    headers: {
        "User-Agent": userAgent
    }
});

export async function getLikedVideos(logger: Logger, username: string, count: number): Promise<IFavouriteVideo[] | null> {
    logger.info({
        from: 'getLikedVideos',
        event: 'newTask',
    });

    const response = await client.get(`user/favorite?unique_id=${username}&count=${count}`);
    const { data } = response.data as IFavouriteResponse;

    if (!data) {
        logger.error({
            from: 'getLikedVideos',
            event: 'noDataErr',
            message: 'Could not get data from API'
        });
        return null;
    }

    if (!data.videos || data.videos.length === 0) {
        logger.error({
            from: 'getLikedVideos',
            event: 'noDataErr',
            message: 'Could not get data from API'
        });
        return null;
    }

    const videos: IFavouriteVideo[] = [];

    data.videos.map((video) => {
        videos.push({
            id: video.video_id,
            region: video.region,
            title: video.title,
            play: video.play,
            music: video.music,
            views: video.play_count,
            likes: video.digg_count,
            images: video.images,
            author: video.author
        })
    });

    logger.info({
        from: 'getLikedVideos',
        event: 'completed',
        entities: videos.length
    });

    return videos;
}

export async function downloadVideo(link: string, path: string, logger: Logger): Promise<void> {
    logger.info({
        from: 'downloadVideo',
        event: 'newTask',
    });

    const response = await client.get(link, { baseURL: '', responseType: 'arraybuffer' });

    if (!response.data || response.data.length === 0) {
        logger.error({
            from: 'downloadVideo',
            event: 'noDataErr',
            message: 'Could not get data from API'
        });
        return;
    }

    logger.info({
        from: 'downloadVideo',
        event: 'completed',
        size: response.data.length,
        path
    });

    await fs.writeFile(path, response.data);

    logger.info({
        from: 'downloadVideo',
        event: 'saved'
    });
}