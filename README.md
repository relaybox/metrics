# Metrics - RelayBox Metrics Service

The metrics service is one of four core services that keep the core database up to date with the latest data broadcast by the [Core](https://github.com/relaybox/core) Realtime Service.

## Getting Started

### Prerequisites

- Node.js 20.x
- Docker (optional)

### Configuration

Create a copy of `.env.template` in the root of the project and rename it to `.env`. Adjust the configuration settings to match your local environment. Further information about each environment variable can be found in `.env.template`.

## Installation

To install the necessary packages, simply run...

```
npm install
```

Once complete, the dev environment is ready to go. To start the service, run the following command...

```
npm run dev
```

## Testing

The service unit tests can be found in the `./test` directory. Tests are run using the `vitest` runner.

```
npm run test
```

## About "Metrics"

Metrics play an important role in providing visibility into the traffic and performance of the RelayBox ecosystem from a global level right down to the individual application, user, room and event level. Metrics provide feebback on user interaction with rooms and events, along with statistics related to the delivery of messages and system latency.

![RelayBox system diagram, highlight Metrics](/assets/system/relaybox-system-metrics.png)

The dashboard provides useful insights into the perfomance and usage statistics and even provides a mechanism to write your own metrics visualizations based on the data collected.

## About this service

The "Metrics" service initiates worker processes that handle FIFO jobs added to BullMQ by the [Core](https://github.com/relaybox/core) service. It is responsible for aggregating and persisting data related to how users interact with the system and broadcast data to relevant subscribers.

The service router is structured to map jobs to handlers based on the job name...

```typescript
import { RedisClient } from '@/lib/redis';
import { Pool } from 'pg';
import { handler as metricsPushHandler } from '@/handlers/metrics-push';
import { handler as metricsShiftHandler } from '@/handlers/metrics-shift';
import { handler as metricsClientRoomJoinHandler } from '@/handlers/metrics-client-room-join';
import { handler as metricsClientRoomLeaveHandler } from '@/handlers/metrics-client-room-leave';
import { handler as metricsDeliveryDataHandler } from '@/handlers/metrics-delivery-data';

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
```

The following jobs are handled by the service:

- `metrics:push`

This job is responsible for incrementing cached metrics based on a user events. Once updated, the full metrics set is broadcast to relevant subscribers.

- `metrics:shift`

This job is responsible for decrementing cached metrics based on a user events. Once updated, the full metrics set is broadcast to relevant subscribers.

- `metrics:delivery:data`

This job is responsible for persisting event delivery data to the database. Each persisted record contains information about the event, the number of subscribers receiving the event, the sender, the room, the listener, and includes the latency log to determine how long the event took from creation to delivery and persistence.

- `metrics:client:room:join`

This job is responsible for persisting room "join" events and includes details about the user, room, socket, and connection.

- `metrics:client:room:leave`

Opposite to the `metrics:client:room:join` job, this job is responsible for persisting room "leave" events.
