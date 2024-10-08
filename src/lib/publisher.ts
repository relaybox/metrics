import { Connection, Envelope, PublisherProps } from 'rabbitmq-client';
import { ReducedSession } from '@/module/types';
import { getLogger } from '@/util/logger.util';
import { v4 as uuid } from 'uuid';

const logger = getLogger('publisher');

const AMQP_CONNECTION_STRING = process.env.RABBIT_MQ_CONNECTION_STRING;
const AMQP_QUEUE_COUNT = Number(process.env.RABBIT_MQ_QUEUE_COUNT!);
const AMQP_EXCHANGE_NAME = 'ds.rooms.durable';
const AMQP_QUEUE_TYPE = 'topic';
const AMQP_MAX_RETRY_ATTEMPTS = 2;
const AMQP_ROUTING_KEY_PREFIX = '$$';

const connection = new Connection(AMQP_CONNECTION_STRING);

connection.on('error', (err) => {
  logger.error(`RabbitMQ connection error`, { err });
});

const publisherOptions: PublisherProps = {
  confirm: true,
  maxAttempts: AMQP_MAX_RETRY_ATTEMPTS,
  exchanges: [
    {
      exchange: AMQP_EXCHANGE_NAME,
      type: AMQP_QUEUE_TYPE,
      durable: true
    }
  ]
};

const publisher = connection.createPublisher(publisherOptions);

export function dispatch(
  nspRoomId: string,
  subscription: string,
  data: any,
  session: ReducedSession
): void {
  const envelope: Envelope = {
    exchange: AMQP_EXCHANGE_NAME,
    routingKey: getRoutingKey(nspRoomId)
  };

  const requestId = uuid();

  const message = {
    nspRoomId,
    event: subscription,
    data,
    requestId,
    session
  };

  publisher.send(envelope, message);
}

export function getRoutingKey(nspRoomId: string): string {
  const [appPid, roomId] = nspRoomId.split(/:(.+)/);
  const hashedRoomId = getHashedRoomId(roomId);

  return `${AMQP_ROUTING_KEY_PREFIX}:${appPid}:${hashedRoomId}`;
}

export function getHashedRoomId(roomId: string): number {
  let hash = 0;
  let chr: number;

  for (let i = 0; i < roomId.length; i++) {
    chr = roomId.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }

  return ((hash % AMQP_QUEUE_COUNT) + AMQP_QUEUE_COUNT) % AMQP_QUEUE_COUNT;
}
