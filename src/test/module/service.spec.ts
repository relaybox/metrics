import { getMockReducedSession } from '@/test/__mocks__/internal/session.mock';
import { describe, vi, it, afterEach, expect } from 'vitest';
import { getLogger } from '@/util/logger.util';
import { MetricType } from '@/module/types';
import { RedisClient } from '@/lib/redis';
import { PoolClient } from 'pg';
import {
  broadcastMetrics,
  formatMetricsSubscription,
  getApplicationId,
  getRoomSessionId,
  saveDeliveryMetrics,
  saveRoomJoin,
  setMetric,
  unsetMetric,
  updateRoomSessionTimestamp
} from '@/module/service';

const logger = getLogger('metrics-service');

const mockRepository = vi.hoisted(() => ({
  getMetric: vi.fn(),
  setMetric: vi.fn(),
  unsetMetric: vi.fn()
}));

vi.mock('@/module/repository', () => mockRepository);

const mockPublisher = vi.hoisted(() => ({
  dispatch: vi.fn()
}));

vi.mock('@/lib/publisher', () => mockPublisher);

const mockDb = vi.hoisted(() => ({
  getApplicationIdByAppPid: vi.fn(),
  saveRoomJoin: vi.fn(),
  updateRoomSessionTimestamp: vi.fn(),
  getRoomSessionId: vi.fn(),
  saveDeliveryMetrics: vi.fn()
}));

vi.mock('@/module/db', () => mockDb);

describe('service', () => {
  const mockRedisClient = {} as RedisClient;
  const mockPgClient = {} as PoolClient;

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getApplicationId', () => {
    it('should return application id from session appPid', async () => {
      const session = getMockReducedSession();
      const mockAppId = '123';

      mockDb.getApplicationIdByAppPid.mockResolvedValue({ rows: [{ id: mockAppId }] });

      await expect(getApplicationId(mockPgClient, session)).resolves.toBe(mockAppId);
    });
  });

  describe('setMetric', () => {
    it('should set metric by key for uid', async () => {
      const uid = '123';
      const key = 'test-key';

      await setMetric(logger, mockRedisClient, key, uid);

      expect(mockRepository.setMetric).toHaveBeenCalledWith(mockRedisClient, key, uid);
    });
  });

  describe('unsetMetric', () => {
    it('should unset metric by key for uid', async () => {
      const uid = '123';
      const key = 'test-key';

      await unsetMetric(logger, mockRedisClient, key, uid);

      expect(mockRepository.unsetMetric).toHaveBeenCalledWith(mockRedisClient, key, uid);
    });
  });

  describe('saveRoomJoin', () => {
    it('should save room join data', async () => {
      const appId = '123';
      const nspRoomId = 'test:123';
      const timestamp = '2023-01-01T00:00:00.000Z';
      const session = getMockReducedSession();

      await saveRoomJoin(logger, mockPgClient, appId, nspRoomId, timestamp, session);

      expect(mockDb.saveRoomJoin).toHaveBeenCalledWith(
        mockPgClient,
        appId,
        nspRoomId,
        timestamp,
        session
      );
    });
  });

  describe('updateRoomSessionTimestamp', () => {
    it('should update room session timestamp', async () => {
      const roomSessionId = '123';
      const timestamp = '2023-01-01T00:00:00.000Z';

      await updateRoomSessionTimestamp(logger, mockPgClient, roomSessionId, timestamp);

      expect(mockDb.updateRoomSessionTimestamp).toHaveBeenCalledWith(
        mockPgClient,
        roomSessionId,
        timestamp
      );
    });
  });

  describe('getRoomSessionId', () => {
    it('should get room session id', async () => {
      const nspRoomId = 'test:123';
      const session = getMockReducedSession();

      mockDb.getRoomSessionId.mockResolvedValue({ rows: [{ id: '123' }] });

      await expect(getRoomSessionId(logger, mockPgClient, nspRoomId, session)).resolves.toBe('123');
    });
  });

  describe('broadcastMetrics', () => {
    it('should broadcast metrics', async () => {
      mockRepository.getMetric.mockResolvedValueOnce(1);
      mockRepository.getMetric.mockResolvedValueOnce(2);
      mockRepository.getMetric.mockResolvedValueOnce(3);
      mockRepository.getMetric.mockResolvedValueOnce(4);
      mockRepository.getMetric.mockResolvedValueOnce(5);

      const session = getMockReducedSession();
      const nspRoomId = 'test:123';
      const subscription = formatMetricsSubscription(nspRoomId, MetricType.ALL);

      await broadcastMetrics(logger, mockRedisClient, session, nspRoomId);

      expect(mockPublisher.dispatch).toHaveBeenCalledWith(
        nspRoomId,
        subscription,
        {
          [MetricType.CONNECTION]: 1,
          [MetricType.SUBSCRIBER]: 2,
          [MetricType.PUBLISHER]: 3,
          [MetricType.PRESENCE_SUBSCRIBER]: 4,
          [MetricType.PRESENCE_MEMBER]: 5
        },
        session
      );
    });
  });

  describe('saveDeliveryMetrics', () => {
    it('should save message delivery metrics', async () => {
      const session = getMockReducedSession();
      const appId = '123';
      const nspRoomId = 'test:123';
      const event = 'test-event';
      const recipientCount = 1;
      const timestamp = '2023-01-01T00:00:00.000Z';
      const requestId = '123';
      const listener = 'test-listener';
      const latencyLog = {
        createdAt: '2023-01-01T00:00:00.000Z',
        receivedAt: '2023-01-01T00:00:00.000Z'
      };

      await saveDeliveryMetrics(logger, mockPgClient, appId, {
        nspRoomId,
        event,
        recipientCount,
        timestamp,
        requestId,
        session,
        listener,
        latencyLog
      });

      expect(mockDb.saveDeliveryMetrics).toHaveBeenCalledWith(
        mockPgClient,
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
    });
  });
});
