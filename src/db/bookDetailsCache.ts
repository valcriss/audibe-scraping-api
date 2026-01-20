import type { BookDetails } from '../models/api';
import { getPrismaClient } from './prismaClient';

export async function getCachedBookDetails(asin: string): Promise<BookDetails | null> {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const record = await prisma.bookDetailsCache.findUnique({ where: { asin } });
    if (!record) {
      return null;
    }
    return record.payload as BookDetails;
  } catch {
    return null;
  }
}

export async function setCachedBookDetails(details: BookDetails): Promise<void> {
  const prisma = await getPrismaClient();
  if (!prisma) {
    return;
  }

  try {
    await prisma.bookDetailsCache.upsert({
      where: { asin: details.asin },
      create: {
        asin: details.asin,
        payload: details,
      },
      update: {
        payload: details,
      },
    });
  } catch {
    return;
  }
}
