import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../http/audibleClient';
import { getSearchResponse } from '../services/searchService';

export const searchRouter = Router();

const querySchema = z.object({
  keywords: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
});

searchRouter.get('/search', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError('VALIDATION_ERROR', 'Invalid query parameters', 400, parsed.error);
    }

    const { keywords, page } = parsed.data;
    const response = await getSearchResponse(keywords, page);
    res.json(response);
  } catch (error) {
    next(error);
  }
});
