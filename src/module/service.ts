import { Logger } from 'winston';
import { dispatch } from '@/lib/publisher';
import { KeyPrefix, MetricCount, MetricType, ReducedSession } from './types';
import * as metricsRepository from '@/module/repository';
import * as metricsDb from '@/module/db';
import { RedisClient } from '@/lib/redis';
import { PoolClient } from 'pg';

const PLATFORM_RESERVED_NAMESPACE = '$';
const METRICS_SUBSCRIPTION_NAMESPACE = 'metrics';

export function getMetricsKeyName(nspRoomId: string, metricType: MetricType): string {
  return `${KeyPrefix.METRICS}:${nspRoomId}:${metricType}`;
}

export function formatMetricsSubscription(nspRoomId: string, event: string): string {
  return `${nspRoomId}:${PLATFORM_RESERVED_NAMESPACE}:${METRICS_SUBSCRIPTION_NAMESPACE}:${event}`;
}

export async function getApplicationId(
  pgClient: PoolClient,
  session: ReducedSession
): Promise<string> {
  const { rows: applications } = await metricsDb.getApplicationIdByAppPid(pgClient, session.appPid);
  return applications[0].id;
}

export async function setMetric(
  logger: Logger,
  redisClient: RedisClient,
  key: string,
  uid: string
): Promise<void> {
  logger.debug(`Setting metric ${key}`, { uid });

  try {
    await metricsRepository.setMetric(redisClient, key, uid);
  } catch (err: any) {
    logger.error(`Failed to set metric`);
    throw err;
  }
}

export async function unsetMetric(
  logger: Logger,
  redisClient: RedisClient,
  key: string,
  uid: string
): Promise<void> {
  logger.debug(`Setting metric ${key}`, { uid });

  try {
    await metricsRepository.unsetMetric(redisClient, key, uid);
  } catch (err: any) {
    logger.error(`Failed to set metric`);
    throw err;
  }
}

export async function saveRoomJoin(
  logger: Logger,
  pgClient: PoolClient,
  appId: string,
  nspRoomId: string,
  timestamp: string,
  session: ReducedSession
): Promise<void> {
  logger.debug(`Persisting room join data ${nspRoomId}`, { session });

  try {
    await metricsDb.saveRoomJoin(pgClient, appId, nspRoomId, timestamp, session);
  } catch (err: any) {
    logger.error(`Failed persist join room data`, { err, nspRoomId });
    throw err;
  }
}

export async function updateRoomSessionTimestamp(
  logger: Logger,
  pgClient: PoolClient,
  roomSessionId: string,
  timestamp: string
): Promise<void> {
  logger.debug(`Updating room session timestamp ${roomSessionId}`, { roomSessionId });

  try {
    await metricsDb.updateRoomSessionTimestamp(pgClient, roomSessionId, timestamp);
  } catch (err: any) {
    logger.error(`Failed to update room session timestamp`, { err, roomSessionId });
    throw err;
  }
}

export async function getRoomSessionId(
  logger: Logger,
  pgClient: PoolClient,
  nspRoomId: string,
  session: ReducedSession
): Promise<string> {
  const { connectionId, socketId } = session;

  logger.debug(`Getting room session id`, { nspRoomId, connectionId });

  try {
    const { rows: roomSessions } = await metricsDb.getRoomSessionId(
      pgClient,
      nspRoomId,
      connectionId,
      socketId
    );

    return roomSessions[0]?.id;
  } catch (err: any) {
    logger.error(`Failed to get room session id`, { err, nspRoomId, connectionId });
    throw err;
  }
}

export async function broadcastMetrics(
  logger: Logger,
  redisClient: RedisClient,
  session: ReducedSession,
  nspRoomId: string
): Promise<void> {
  const counts = await getMetrics(logger, redisClient, nspRoomId);
  const subscription = formatMetricsSubscription(nspRoomId, MetricType.ALL);

  dispatch(nspRoomId, subscription, counts, session);
}

export async function getMetrics(
  logger: Logger,
  redisClient: RedisClient,
  nspRoomId: string
): Promise<MetricCount> {
  const counts: MetricCount = {};

  const metricTypes = [
    MetricType.CONNECTION,
    MetricType.SUBSCRIBER,
    MetricType.PUBLISHER,
    MetricType.PRESENCE_SUBSCRIBER,
    MetricType.PRESENCE_MEMBER
  ];

  await Promise.all(
    metricTypes.map(async (metricType) => {
      const key = `${KeyPrefix.METRICS}:${nspRoomId}:${metricType}`;

      try {
        const count = await metricsRepository.getMetric(redisClient, key);
        counts[metricType] = count;
      } catch (err) {
        logger.error(`Failed to get metric for ${metricType}:`, { err });
        counts[key] = 0;
      }
    })
  );

  return counts;
}

export async function saveDeliveryMetrics(
  logger: Logger,
  pgClient: PoolClient,
  appId: string,
  data: any
): Promise<void> {
  const { nspRoomId, event, recipientCount, timestamp, session, requestId, latencyLog, listener } =
    data;

  logger.debug(`Pushing dispatch data for ${event}`, { nspRoomId, event, recipientCount });

  try {
    await metricsDb.saveDeliveryMetrics(
      pgClient,
      appId,
      nspRoomId,
      event,
      recipientCount,
      timestamp,
      requestId,
      session,
      listener,
      latencyLog
    );
  } catch (err: any) {
    logger.error(`Failed to push dispatch data for ${event}, ${err}`, {
      nspRoomId,
      event,
      recipientCount,
      err
    });
    throw err;
  }
}
