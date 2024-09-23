import { Pool } from 'pg';
import { RedisClient } from '@/lib/redis';
import { getLogger } from '@/util/logger.util';
import { getApplicationId, saveDeliveryMetrics } from '@/module/service';

const logger = getLogger('metrics-delivery-data');

export async function handler(pgPool: Pool, redisClient: RedisClient, data: any): Promise<void> {
  const { nspRoomId, event, recipientCount, session } = data;

  const pgClient = await pgPool.connect();

  try {
    const appId = await getApplicationId(pgClient, session);

    await saveDeliveryMetrics(logger, pgClient, appId, data);
  } catch (err: any) {
    logger.error(`Failed to push dispatch data for ${event}, ${err}`, {
      nspRoomId,
      event,
      recipientCount,
      err
    });
    throw err;
  } finally {
    pgClient.release();
  }
}
