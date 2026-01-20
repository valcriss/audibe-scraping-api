import { createClient } from 'redis';
import { loadConfig } from '../config/env';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connecting: Promise<RedisClient> | null = null;

/** Creates a Redis client for the provided connection string. */
function createRedisClient(url: string): RedisClient {
  return createClient({ url });
}

/** Connects the Redis client and returns it. */
async function connectRedis(clientInstance: RedisClient): Promise<RedisClient> {
  await clientInstance.connect();
  return clientInstance;
}

/** Returns a singleton Redis client when caching is enabled. */
async function getClient(): Promise<RedisClient | null> {
  const config = loadConfig();
  if (!config.REDIS_ENABLED) {
    return null;
  }

  if (client) {
    return client;
  }

  if (connecting) {
    return connecting;
  }

  const nextClient = createRedisClient(config.REDIS_URL);
  connecting = connectRedis(nextClient)
    .then((connected) => {
      client = connected;
      return connected;
    })
    .catch((error) => {
      connecting = null;
      throw error;
    });

  return connecting;
}

/** Reads and parses cached JSON data, returning null on failures. */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = await getClient();
    if (!redis) {
      return null;
    }
    const value = await redis.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Writes JSON data to Redis with an optional TTL. */
export async function setCached<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  try {
    const redis = await getClient();
    if (!redis) {
      return;
    }
    if (ttlSeconds && ttlSeconds > 0) {
      await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return;
    }
    await redis.set(key, JSON.stringify(value));
  } catch {
    return;
  }
}
