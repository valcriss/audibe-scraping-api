-- CreateTable
CREATE TABLE "BookDetailsCache" (
    "asin" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "BookDetailsCache_asin_key" ON "BookDetailsCache"("asin");
