import compression from 'compression';
import cors, { type CorsOptions } from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { isDatabaseConnected } from './config/database';
import { env } from './config/env';
import { createHealthRouter } from './modules/health/health.routes';
import { LeadService, type LeadRepository, createLeadRouter } from './modules/leads';
import { errorHandler } from './shared/middleware/error-handler';
import { notFoundHandler } from './shared/middleware/not-found';
import { apiRateLimiter } from './shared/middleware/rate-limit';
import { requestLogger } from './shared/middleware/request-logger';

export interface AppDependencies {
  leadRepository: LeadRepository;
  checkDatabase?: () => boolean;
}

function buildCorsOptions(): CorsOptions {
  const allowAll = env.corsOrigins.includes('*');

  return {
    origin(origin, callback) {
      // No Origin header means curl, a health check or a same-origin request.
      if (!origin || allowAll || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    maxAge: 86_400,
  };
}

export function createApp({
  leadRepository,
  checkDatabase = isDatabaseConnected,
}: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  // Render and Vercel sit behind a proxy; without this the rate limiter keys
  // every request to the same address.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger);

  app.use('/api/health', createHealthRouter(checkDatabase));
  app.use('/api/leads', apiRateLimiter, createLeadRouter(new LeadService(leadRepository)));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
