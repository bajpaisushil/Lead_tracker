import mongoose from 'mongoose';

import { logger } from '../shared/logger';
import { env } from './env';

mongoose.set('strictQuery', true);

interface MongooseCache {
  promise: Promise<typeof mongoose> | null;
}

// On a serverless host the module can be re-evaluated while the container
// stays warm. Keeping the promise on globalThis means we reuse the pool
// instead of opening a new one per invocation and exhausting the Atlas limit.
const globalForMongoose = globalThis as typeof globalThis & {
  __leadTrackerMongoose?: MongooseCache;
};

const cache: MongooseCache = (globalForMongoose.__leadTrackerMongoose ??= { promise: null });

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (cache.promise) return cache.promise;

  cache.promise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: env.isProduction ? 5 : 10,
      minPoolSize: 0,
      autoIndex: !env.isProduction,
    })
    .then((connection) => {
      logger.info({ db: connection.connection.name }, 'mongodb connected');
      return connection;
    })
    .catch((error: unknown) => {
      cache.promise = null;
      throw error;
    });

  return cache.promise;
}

export async function disconnectDatabase(): Promise<void> {
  if (!cache.promise) return;
  cache.promise = null;
  await mongoose.disconnect();
  logger.info('mongodb disconnected');
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

mongoose.connection.on('error', (error) => {
  logger.error({ err: error }, 'mongodb connection error');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('mongodb disconnected');
});
