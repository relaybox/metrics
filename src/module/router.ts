import { RedisClient } from '../lib/redis';
import { Pool } from 'pg';
import { handler as metricsPushHandler } from '../handlers/metrics-push';
import { handler as metricsShiftHandler } from '../handlers/metrics-shift';
import { handler as metricsClientRoomJoinHandler } from '../handlers/metrics-client-room-join';
import { handler as metricsClientRoomLeaveHandler } from '../handlers/metrics-client-room-leave';
import { handler as metricsDeliveryDataHandler } from '../handlers/metrics-delivery-data';

export enum JobName {
  METRICS_PUSH = 'metrics:push',
  METRICS_SHIFT = 'metrics:shift',
  METRICS_DELIVERY_DATA = 'metrics:delivery:data',
  METRICS_PUSH_ROOM_JOIN = 'metrics:client:room:join',
  METRICS_PUSH_ROOM_LEAVE = 'metrics:client:room:leave'
}

const handlerMap = {
  [JobName.METRICS_PUSH]: metricsPushHandler,
  [JobName.METRICS_SHIFT]: metricsShiftHandler,
  [JobName.METRICS_DELIVERY_DATA]: metricsDeliveryDataHandler,
  [JobName.METRICS_PUSH_ROOM_JOIN]: metricsClientRoomJoinHandler,
  [JobName.METRICS_PUSH_ROOM_LEAVE]: metricsClientRoomLeaveHandler
};

export function router(
  pgPool: Pool,
  redisClient: RedisClient,
  jobName: JobName,
  data: any
): Promise<void> | undefined {
  return handlerMap[jobName](pgPool, redisClient, data);
}
