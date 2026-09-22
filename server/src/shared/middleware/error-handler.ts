import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

import { env } from '../../config/env';
import { AppError } from '../errors';
import { logger } from '../logger';
import type { ApiFailure } from '../types/api';

interface FieldIssue {
  field: string;
  message: string;
}

function zodIssues(error: ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let status = 500;
  let body: ApiFailure = {
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side' },
  };

  if (error instanceof AppError) {
    status = error.statusCode;
    body = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };
  } else if (error instanceof ZodError) {
    status = 400;
    body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request payload is invalid',
        details: zodIssues(error),
      },
    };
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: `'${String(error.value)}' is not a valid ${error.path}`,
      },
    };
  } else if (error instanceof MongoServerError && error.code === 11000) {
    status = 409;
    body = {
      error: { code: 'DUPLICATE_EMAIL', message: 'A lead with that email already exists' },
    };
  }

  if (status >= 500) {
    logger.error(
      { err: error, method: req.method, url: req.originalUrl },
      'unhandled request error',
    );
  } else {
    logger.debug({ method: req.method, url: req.originalUrl, status }, body.error.message);
  }

  if (!env.isProduction && status >= 500 && error instanceof Error) {
    body.error.details = { stack: error.stack };
  }

  res.status(status).json(body);
}
