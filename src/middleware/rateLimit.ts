import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { loadConfig } from '../config/env';

const config = loadConfig();

export const rateLimitMiddleware: RequestHandler =
  config.API_RATE_LIMIT_ENABLED === true
    ? rateLimit({
        windowMs: config.API_RATE_LIMIT_WINDOW_MS,
        max: config.API_RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
      })
    : (_req, _res, next) => next();
