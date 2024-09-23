import { Pool } from 'pg';
import { RedisClient } from '@/lib/redis';
import { getLogger } from '@/util/logger.util';
import {
  broadcastMetrics,
  getMetricsKeyName,
  getRoomSessionId,
  unsetMetric,
  updateRoomSessionTimestamp
} from '@/module/service';

const logger = getLogger('metrics-client-room-leave');

export async function handler(pgPool: Pool, redisClient: RedisClient, data: any): Promise<void> {
  const { uid, nspRoomId, metrics, session, timestamp } = data;

  const pgClient = await pgPool.connect();

  try {
    await Promise.all(
      metrics.map((metricType: any) => {
        const key = getMetricsKeyName(nspRoomId, metricType);
        return unsetMetric(logger, redisClient, key, uid);
      })
    );

    const roomSessionId = await getRoomSessionId(logger, pgClient, nspRoomId, session);

    await updateRoomSessionTimestamp(logger, pgClient, roomSessionId, timestamp);
    await broadcastMetrics(logger, redisClient, session, nspRoomId);
  } catch (err) {
    logger.error(`Failed to push room leave metrics`, { data, err });
    throw err;
  } finally {
    pgClient.release();
  }
}
