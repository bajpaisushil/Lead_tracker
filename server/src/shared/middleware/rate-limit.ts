import rateLimit from 'express-rate-limit';

import { env } from '../../config/env';
import type { ApiFailure } from '../types/api';

const tooManyRequests: ApiFailure = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests from this IP, please try again shortly',
  },
};

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: tooManyRequests,
});
