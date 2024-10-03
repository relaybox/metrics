# Metrics - Metrics Management Service by RelayBox

The metrics service is one of four core services that keep the core database up to date with the latest data broadcast by the UWS Realtime Service.

## Getting Started

Create a copy of .env.tempate in the root of the project and rename it to .env. Add the following configuration options...

```
# Local DB host
DB_HOST=

# Local DB name
DB_NAME=

# Local DB port
DB_PORT=

# Local DB proxy enabled - Set to false for local development
DB_PROXY_ENABLED=

# Local DB user
DB_USER=

# Local DB password
DB_PASSWORD=

# Local DB max connections
DB_MAX_CONNECTIONS=

# Local DB idle timeout
DB_IDLE_TIMEOUT_MS=

# Local DB TLS disabled - Set to true for local development unless connecttion over TLS
DB_TLS_DISABLED=

# Local Redis host
REDIS_HOST=

# Local Redis port
REDIS_PORT=

# Local DB TLS disabled - Set to true for local development unless connecttion over TLS
REDIS_TLS_DISABLED=

# Local RabbitMQ connection string
RABBIT_MQ_CONNECTION_STRING=

# Recommended setting 5 - This value needs to be synced across services
RABBIT_MQ_QUEUE_COUNT=

# Localhost - Set to true for local development
LOCALHOST=

# Desired log level - recommended setting "debug" for local development
LOG_LEVEL=
```

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

Unit tests are built using `vitest`.

```
npm run test
```

## About "Metrics"

Metrics play an important role in providing visibility into the traffic and performance of the RelayBox ecosystem from a global right down to individual application and even user level.

Metrics provide feebback on user interaction with rooms and events, along with statistics related to the delivery of messages and time taken to process.

The dashboard provides useful insights into the e=perfomance and usage statistics and you are even able to write your own metrics visualizations based on the data we collect.

## About this service

The "Metrics" service initiates worker processes that handle FIFO jobs added to BullMQ by the [UWS](https://github.com/relaybox/uws) service. It is responsible for aggregating and persisting data related to how users interact with the system and broadcast to data to relevant subscribers.

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
