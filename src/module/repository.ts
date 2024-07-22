import { RedisClient } from '../lib/redis';

export async function getMetric(redisClient: RedisClient, key: string): Promise<number> {
  return redisClient.lLen(key);
}

export async function setMetric(redisClient: RedisClient, key: string, uid: string): Promise<void> {
  await redisClient.lRem(key, 0, uid);
  await redisClient.lPush(key, uid);
}

export async function unsetMetric(
  redisClient: RedisClient,
  key: string,
  uid: string
): Promise<void> {
  await redisClient.lRem(key, 0, uid);
}
