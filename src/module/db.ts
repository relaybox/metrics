import { PoolClient, QueryResult } from 'pg';
import { LatencyLog, ReducedSession } from './types';

export function getApplicationIdByAppPid(
  pgClient: PoolClient,
  appPid: string
): Promise<QueryResult> {
  const query = `
    SELECT id FROM applications WHERE pid = $1
  `;

  return pgClient.query(query, [appPid]);
}

export function saveDeliveryMetrics(
  pgClient: PoolClient,
  appId: string,
  nspRoomId: string,
  event: string,
  recipientCount: number,
  timestamp: string,
  requestId: string,
  session: ReducedSession,
  listener: string,
  latencyLog?: LatencyLog
): Promise<QueryResult> {
  const now = new Date().toISOString();
  const query = `
    INSERT INTO delivery_metrics (
      "appId", "nspRoomId", "event", "recipientCount", "dispatchedAt", "requestId", "appPid", 
      "keyId", uid, "clientId", "connectionId", "socketId", "persistedAt", "createdAt", "receivedAt", "listener"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, 
      $8, $9, $10, $11, $12, $13, $14, $15, $16
    )
  `;

  return pgClient.query(query, [
    appId,
    nspRoomId,
    event,
    recipientCount,
    timestamp,
    requestId,
    session.appPid,
    session.keyId,
    session.uid,
    session.clientId,
    session.connectionId,
    session.socketId,
    now,
    latencyLog?.createdAt,
    latencyLog?.receivedAt,
    listener
  ]);
}

export function saveRoomJoin(
  pgClient: PoolClient,
  appId: string,
  nspRoomId: string,
  timestamp: string,
  session: ReducedSession
): Promise<QueryResult> {
  const now = new Date().toISOString();
  const { appPid, uid, clientId, connectionId, socketId } = session;

  const query = `
    INSERT INTO room_sessions (
      "appId", "appPid", "roomId", "nspRoomId", uid, "clientId", 
      "connectionId", "socketId", "joinedAt", "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11
    );
  `;

  return pgClient.query(query, [
    appId,
    appPid,
    nspRoomId,
    nspRoomId,
    uid,
    clientId,
    connectionId,
    socketId,
    timestamp,
    now,
    now
  ]);
}

export function getRoomSessionId(
  pgClient: PoolClient,
  nspRoomId: string,
  connectionId: string,
  socketId: string
): Promise<QueryResult> {
  const query = `
    SELECT id FROM room_sessions 
    WHERE "nspRoomId" = $1 AND "connectionId" = $2 AND "leftAt" IS NULL;
  `;

  return pgClient.query(query, [nspRoomId, connectionId]);
}

export function updateRoomSessionTimestamp(
  pgClient: PoolClient,
  roomSessionId: string,
  timestamp: string
): Promise<QueryResult> {
  const query = `
    UPDATE room_sessions SET "leftAt" = $1 WHERE id = $2;
  `;

  return pgClient.query(query, [timestamp, roomSessionId]);
}
