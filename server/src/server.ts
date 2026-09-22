import type { Server } from 'node:http';

import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { MongoLeadRepository } from './modules/leads';
import { logger } from './shared/logger';

const SHUTDOWN_TIMEOUT_MS = 10_000;

function registerShutdownHooks(server: Server): void {
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');

    // If a connection refuses to drain, exit anyway rather than hang the host.
    const force = setTimeout(() => {
      logger.error('forced exit after shutdown timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    force.unref();

    server.close(async () => {
      await disconnectDatabase();
      clearTimeout(force);
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp({ leadRepository: new MongoLeadRepository() });
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'api listening');
  });

  registerShutdownHooks(server);
}

void bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, 'failed to start the api');
  process.exit(1);
});
