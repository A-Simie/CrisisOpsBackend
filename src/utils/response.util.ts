import { Response } from 'express';

interface ApiResponseData<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  };
  requestId: string;
  timestamp: string;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  metadata?: ApiResponseData<T>['metadata']
): Response => {
  const requestId = (res.req?.headers['x-request-id'] as string) ?? 'unknown';

  const response: ApiResponseData<T> = {
    success: true,
    message,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };

  if (metadata) {
    response.metadata = metadata;
  }

  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T, message = 'Created successfully'): Response => {
  return sendSuccess(res, data, message, 201);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errorCode = 'INTERNAL_ERROR',
  details?: Record<string, unknown>
): Response => {
  const requestId = (res.req?.headers['x-request-id'] as string) ?? 'unknown';

  const response: ApiResponseData<null> = {
    success: false,
    message,
    error: {
      code: errorCode,
      details,
    },
    requestId,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
};
