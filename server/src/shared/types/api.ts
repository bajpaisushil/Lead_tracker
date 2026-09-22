import type { ErrorCode } from '../errors';

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiFailure {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiPaginated<T> extends ApiSuccess<T[]> {
  meta: PageMeta;
}

export function buildPageMeta(page: number, pageSize: number, total: number): PageMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && total > 0,
  };
}
