import { Pool } from 'pg';
import { RedisClient } from '@/lib/redis';
import { getLogger } from '@/util/logger.util';
import { broadcastMetrics, getMetricsKeyName, unsetMetric } from '@/module/service';

const logger = getLogger('metrics-shift');

export async function handler(pgPool: Pool, redisClient: RedisClient, data: any): Promise<void> {
  const { uid, nspRoomId, metricType, session } = data;

  const key = getMetricsKeyName(nspRoomId, metricType);

  try {
    await unsetMetric(logger, redisClient, key, uid);
    await broadcastMetrics(logger, redisClient, session, nspRoomId);
  } catch (err) {
    logger.error(`Failed to shift metric`, { key, data, err });
    throw err;
  }
}
