import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../http/audibleClient';
import { getSearchResponse } from '../services/searchService';
import { getDetailsWithCache } from '../services/detailsService';

export const findRouter = Router();

const querySchema = z.object({
  keywords: z.string().min(1),
});

findRouter.get('/find', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError('VALIDATION_ERROR', 'Invalid query parameters', 400, parsed.error);
    }

    const { keywords } = parsed.data;
    const searchResponse = await getSearchResponse(keywords, 1);
    const firstItem = searchResponse.items[0];

    if (!firstItem) {
      res.json({});
      return;
    }

    const details = await getDetailsWithCache(firstItem.asin);
    res.json(details);
  } catch (error) {
    next(error);
  }
});
