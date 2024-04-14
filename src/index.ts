import { Telegraf } from "telegraf";
import { config } from "dotenv";
import { RedisClientType } from "redis";

import pinoLogger from "./logger";

import createRedisClient from "./redis";

import { parseConfig } from "./utils";
import Worker from "./worker";

// load .env
config();

const main = async () => {
    const logger = pinoLogger;
    const config = parseConfig(logger);

    if (!config) {
        logger.error("bad config");
        return;
    }

    const delay = config.fetch_delay * 1000;

    const redis = createRedisClient(config.redis_url) as RedisClientType;

    redis.on('error', err => logger.error({
        event: 'redisError',
        err
    }));

    await redis.connect();

    const bot = new Telegraf(config.bot_token);
    bot.launch()
        .catch(err => logger.error({
            event: 'telegramErr',
            err
        }));

    const worker = new Worker(logger, config, bot, redis);
    await worker.createTask();

    const taskWorker = () => {
        setTimeout(async () => {
            await worker.createTask();

            taskWorker();
        }, delay)
    }

    taskWorker();

    logger.info({
        event: 'appReady'
    })
}

main()
    .then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10000));

        main();
    })