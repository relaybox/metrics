import { Connection, Envelope, PublisherProps } from 'rabbitmq-client';
import { ReducedSession } from 'src/module/types';
import { v4 as uuid } from 'uuid';

const AMQP_CONNECTION_STRING = process.env.RABBIT_MQ_CONNECTION_STRING;
const AMQP_EXCHANGE_NAME = 'ds.rooms';
const AMQP_QUEUE_TYPE = 'topic';
const AMQP_MAX_RETRY_ATTEMPTS = 2;

const connection = new Connection(AMQP_CONNECTION_STRING);

const publisherOptions: PublisherProps = {
  confirm: true,
  maxAttempts: AMQP_MAX_RETRY_ATTEMPTS,
  exchanges: [
    {
      exchange: AMQP_EXCHANGE_NAME,
      type: AMQP_QUEUE_TYPE
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
    routingKey: getBindingKey(subscription)
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

function getBindingKey(subscription: string): string {
  return subscription.replace(/:/g, '.');
}
