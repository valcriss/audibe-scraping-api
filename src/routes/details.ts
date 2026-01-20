import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../http/audibleClient';
import { getDetailsWithCache } from '../services/detailsService';

export const detailsRouter = Router();

const asinSchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .refine((value) => /^[A-Z0-9]{8,12}$/.test(value), {
    message: 'Invalid ASIN format',
  });

detailsRouter.get('/details/:asin', async (req, res, next) => {
  try {
    const asinParsed = asinSchema.safeParse(req.params.asin);
    if (!asinParsed.success) {
      throw new HttpError('VALIDATION_ERROR', 'Invalid ASIN', 400, asinParsed.error);
    }

    const asin = asinParsed.data;
    const details = await getDetailsWithCache(asin);
    res.json(details);
  } catch (error) {
    next(error);
  }
});
