import { Pool } from 'pg';
import { RedisClient } from '../lib/redis';
import { getLogger } from '../util/logger.util';
import { broadcastMetrics, getMetricsKeyName, setMetric } from '../module/service';

const logger = getLogger('metrics-push');

export async function handler(pgPool: Pool, redisClient: RedisClient, data: any): Promise<void> {
  const { uid, nspRoomId, metricType, session } = data;

  const key = getMetricsKeyName(nspRoomId, metricType);

  try {
    await setMetric(logger, redisClient, key, uid);
    await broadcastMetrics(logger, redisClient, session, nspRoomId);
  } catch (err) {
    logger.error(`Failed to push metric`, { key, data, err });
    throw err;
  }
}
