export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE_EMAIL'
  | 'INVALID_STATUS_TRANSITION'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly isOperational = true;

  constructor(message: string, statusCode: number, code: ErrorCode, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'The request payload is invalid', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string) {
    super(id ? `${resource} '${id}' was not found` : `${resource} was not found`, 404, 'NOT_FOUND');
  }
}

export class DuplicateEmailError extends AppError {
  constructor(email: string) {
    super(`A lead with the email '${email}' already exists`, 409, 'DUPLICATE_EMAIL');
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string, allowed: readonly string[]) {
    super(`Cannot move a lead from '${from}' to '${to}'`, 422, 'INVALID_STATUS_TRANSITION', {
      from,
      to,
      allowed,
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}
