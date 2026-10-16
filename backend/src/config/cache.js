const Redis = require('ioredis');

let redis = null;

if (process.env.REDIS_ENABLED === 'true' && process.env.REDIS_HOST) {
    redis = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 1,
        retryStrategy: (retryCount) => retryCount < 3 ? 1000 : null
    });

    redis.on('connect', () => console.log('Connected to Redis'));
    redis.on('error', (error) => console.warn('Redis unavailable; continuing without cache:', error.code || error.message));
} else {
    console.warn('Redis is disabled; blacklist checks are disabled. Set REDIS_ENABLED=true to enable it.');
}

module.exports = redis;