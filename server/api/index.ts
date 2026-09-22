import type { IncomingMessage, ServerResponse } from 'node:http';

import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/database';
import { MongoLeadRepository } from '../src/modules/leads';
import { logger } from '../src/shared/logger';

const app = createApp({ leadRepository: new MongoLeadRepository() });

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    await connectDatabase();
  } catch (error) {
    logger.error({ err: error }, 'could not reach mongodb');

    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'The database is unavailable' },
      }),
    );
    return;
  }

  app(req as never, res as never);
}
