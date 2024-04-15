import { Telegraf } from "telegraf";
import { config } from "dotenv";
import { RedisClientType } from "redis";

import pinoLogger from "./logger";

import createRedisClient from "./redis";

import { downloadProxies, checkProxies, readProxyList, getLastCheck, setLastCheck, saveProxies } from "./proxy";
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

    const lastCheck = await getLastCheck();

    let proxyList = await readProxyList();

    if (Date.now() > lastCheck) {
        if (config.need_proxies && Date.now() > lastCheck) {
            logger.info({
                event: 'proxyDownload',
                message: 'Downloading actual proxy servers.'
            });

            await downloadProxies();
            proxyList = await readProxyList();
        }

        if (proxyList && proxyList.length > 0 && Date.now() > lastCheck) {
            logger.info({
                event: 'proxyCheckStart',
            })

            const startTime = performance.now();

            proxyList = await checkProxies(proxyList);

            await saveProxies(proxyList);

            await setLastCheck(Date.now());

            const endTime = performance.now();

            const elapsedTime = (endTime - startTime) / 1000;

            logger.info({
                event: 'proxyCheckEnd',
                time: elapsedTime,
                valid: proxyList?.length
            })
        }
    }

    const bot = new Telegraf(config.bot_token);
    bot.launch()
        .catch(err => logger.error({
            event: 'telegramErr',
            err
        }));

    const worker = new Worker(logger, config, bot, redis, proxyList);
    worker.createTask();

    const taskWorker = () => {
        setTimeout(async () => {
            // todo
            if (Date.now() > lastCheck) {
                await downloadProxies();
                const newProxyList = await readProxyList();

                if (newProxyList) {
                    const proxyList = await checkProxies(newProxyList);

                    await saveProxies(proxyList);

                    await setLastCheck(Date.now());

                    worker.updateProxyList(proxyList);
                }
            }

            await worker.createTask();

            taskWorker();
        }, delay)
    }

    taskWorker();

    logger.info({
        event: 'appReady'
    })
}

const runApp = async () => {
    try {
        main();
    } catch (e) {
        console.error(e);

        await new Promise((resolve) => setTimeout(resolve, 10000));

        runApp();
    }
}

runApp();