import type { Request, Response } from 'express';

import type { ApiFailure } from '../types/api';

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiFailure = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} does not exist`,
    },
  };
  res.status(404).json(body);
}
