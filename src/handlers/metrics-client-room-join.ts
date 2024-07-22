import { Pool } from 'pg';
import { RedisClient } from '../lib/redis';
import { getLogger } from '../util/logger.util';
import {
  broadcastMetrics,
  getApplicationId,
  getMetricsKeyName,
  saveRoomJoin,
  setMetric
} from '../module/service';

const logger = getLogger('metrics-client-room-join');

export async function handler(pgPool: Pool, redisClient: RedisClient, data: any): Promise<void> {
  const { uid, nspRoomId, metrics, timestamp, session } = data;

  const pgClient = await pgPool.connect();

  try {
    const appId = await getApplicationId(pgClient, session);

    await Promise.all(
      metrics.map(async (metricType: any) => {
        const key = getMetricsKeyName(nspRoomId, metricType);
        return setMetric(logger, redisClient, key, uid);
      })
    );

    await saveRoomJoin(logger, pgClient, appId, nspRoomId, timestamp, session);
    await broadcastMetrics(logger, redisClient, session, nspRoomId);
  } catch (err) {
    logger.error(`Failed to push room join metrics`, { data, err });
    throw err;
  } finally {
    pgClient.release();
  }
}
