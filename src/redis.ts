import { createClient } from 'redis';

const createRedisClient = (url: string) => createClient({
    url
});

export default createRedisClient;