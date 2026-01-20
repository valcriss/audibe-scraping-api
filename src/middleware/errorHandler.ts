import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../http/audibleClient';
import type { ApiError } from '../models/api';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    const payload: ApiError = {
      code: err.code,
      message: err.message,
      details: err.details,
    };
    res.status(err.status).json({ error: payload });
    return;
  }

  if (err instanceof Error) {
    const payload: ApiError = {
      code: 'PARSING_ERROR',
      message: err.message || 'Unexpected error',
    };
    res.status(500).json({ error: payload });
    return;
  }

  res.status(500).json({
    error: {
      code: 'PARSING_ERROR',
      message: 'Unknown error',
    },
  });
};
