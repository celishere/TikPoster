import { Logger } from "pino";

import * as fs from "fs/promises";

import { IConfig } from "./interfaces/config.interface";

export const parseConfig = (logger: Logger): IConfig | null => {
    const redis_url = process.env.REDIS_URL;
    if (!redis_url) {
        logger.error("Missing REDIS_URL");
        return null;
    }

    const bot_token = process.env.BOT_TOKEN;
    if (!bot_token) {
        logger.error("Missing BOT_TOKEN");
        return null;
    }

    const channel_id = process.env.CHANNEL_ID;
    if (!channel_id) {
        logger.error("Missing CHANNEL_ID");
        return null;
    }

    const tiktok_username = process.env.TIKTOK_USERNAME;
    if (!tiktok_username) {
        logger.error("Missing TIKTOK_USERNAME");
        return null;
    }

    const fetch_count = process.env.FETCH_COUNT;
    if (!fetch_count) {
        logger.error("Missing FETCH_COUNT");
        return null;
    }

    const fetch_delay = process.env.FETCH_DELAY;
    if (!fetch_delay) {
        logger.error("Missing FETCH_DELAY");
        return null;
    }

    let need_proxies = process.env.NEED_PROXIES;
    if (!need_proxies) {
        need_proxies = 'no';
    }

    return {
        redis_url,
        bot_token,
        channel_id: parseInt(channel_id, 10),
        tiktok_username,
        fetch_count: parseInt(fetch_count, 10),
        fetch_delay: parseInt(fetch_delay, 10),
        need_proxies: need_proxies == 'yes'
    }
}

export const abbrNum = (input: number): string => {
    const decPlaces = Math.pow(10, 1);

    let number = input;
    let result = String(input);

    const abbrev = ["K", "M", "B", "T"];

    for (let i = abbrev.length - 1; i >= 0; i--) {

        const size = Math.pow(10, (i + 1) * 3);

        if (size <= number) {
            number = Math.round(number * decPlaces / size) / decPlaces;

            if ((number == 1000) && (i < abbrev.length - 1)) {
                number = 1;
                i++;
            }

            result = `${number} ${abbrev[i]}`;
            break;
        }
    }

    return result;
}

export const checkFileSize = (filePath: string, maxSizeInBytes: number): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        await fs.stat(filePath)
            .then((stats) => {
                const fileSizeInBytes = stats.size;

                if (fileSizeInBytes > maxSizeInBytes) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
            .catch((e) => reject(e));
    });
}