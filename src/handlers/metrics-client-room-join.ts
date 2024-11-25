import { Pool } from 'pg';
import { RedisClient } from '@/lib/redis';
import { getLogger } from '@/util/logger.util';
import {
  broadcastMetrics,
  getApplicationId,
  getMetricsKeyName,
  addRoomSession,
  setMetric,
  createRoomIfNotExists,
  addRoomMember
} from '@/module/service';
import { RoomMemberType } from '@/module/types';

const logger = getLogger('metrics-client-room-join');

export async function handler(pgPool: Pool, redisClient: RedisClient, data: any): Promise<void> {
  const { uid, roomId, nspRoomId, roomType, metrics, timestamp, session } = data;

  const pgClient = await pgPool.connect();

  try {
    const appId = await getApplicationId(pgClient, session);

    await Promise.all(
      metrics.map(async (metricType: any) => {
        const key = getMetricsKeyName(nspRoomId, metricType);
        return setMetric(logger, redisClient, key, uid);
      })
    );

    await createRoomIfNotExists(logger, pgClient, appId, roomId, roomType, timestamp, session);
    await addRoomMember(logger, pgClient, appId, roomId, RoomMemberType.OWNER, timestamp, session);
    await addRoomSession(logger, pgClient, appId, nspRoomId, timestamp, session);
    await broadcastMetrics(logger, redisClient, session, nspRoomId);
  } catch (err) {
    logger.error(`Failed to push room join metrics`, { data, err });
    throw err;
  } finally {
    pgClient.release();
  }
}
