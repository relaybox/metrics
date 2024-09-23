export enum KeyPrefix {
  METRICS = 'metrics'
}

export enum KeyNamespace {
  SUBSCRIPTIONS = 'subscriptions'
}

export interface ReducedSession {
  appPid: string;
  keyId: string;
  uid: string;
  clientId: string;
  connectionId: string;
  socketId: string;
  requestId?: string;
}

export interface LatencyLog {
  createdAt: string;
  receivedAt: string;
}

export interface MetricCount {
  [key: string]: number;
}

export enum MetricType {
  ALL = 'all',
  CONNECTION = 'connection',
  SUBSCRIBER = 'subscriber',
  PUBLISHER = 'publisher',
  PRESENCE_CONNECTION = 'presenceConnection',
  PRESENCE_SUBSCRIBER = 'presenceSubscriber',
  PRESENCE_MEMBER = 'presenceMember'
}
