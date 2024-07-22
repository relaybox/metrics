import { Job, Worker } from 'bullmq';
import { getLogger } from '../util/logger.util';
import { JobName, router } from './router';
import { createClient } from '../lib/redis';
import { getPgPool } from '../lib/pg';

const logger = getLogger('metrics');

const QUEUE_NAME = 'metrics';
const REDIS_HOST = process.env.REDIS_HOST!;
const REDIS_PORT = Number(process.env.REDIS_PORT!);

const connectionOpts = {
  host: REDIS_HOST,
  port: REDIS_PORT
};

const redisClient = createClient({
  host: REDIS_HOST,
  port: REDIS_PORT
});

const pgPool = getPgPool();

async function handler({ name, data }: Job) {
  try {
    logger.info(`Processing ${name}`, { data });
    await router(pgPool, redisClient, name as JobName, data);
  } catch (err) {
    logger.error(`Processing job (${name}) failed`, { err, data });
    throw err;
  }
}

export async function startWorker() {
  await redisClient.connect();

  const worker = new Worker(QUEUE_NAME, handler, {
    connection: connectionOpts,
    prefix: 'queue'
  });

  worker.on('failed', (job: Job<any, void, string> | undefined, err: Error, prev: string) => {
    logger.error(`Failed to process job ${job?.id}`, { err });
  });
}
