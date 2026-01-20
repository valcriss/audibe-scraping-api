import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../config/env';

let client: PrismaClient | null = null;
let connecting: Promise<PrismaClient | null> | null = null;

/** Builds a database URL from environment variables. */
function buildDatabaseUrl() {
  const config = loadConfig();
  const user = encodeURIComponent(config.DB_USER || '');
  const password = encodeURIComponent(config.DB_PASSWORD || '');
  const host = config.DB_HOST || 'localhost';
  const dbName = config.DB_NAME || 'postgres';
  return `postgresql://${user}:${password}@${host}:5432/${dbName}`;
}

/** Creates a Prisma client for the provided connection string. */
function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });
}

/** Connects and returns a Prisma client instance. */
async function connectPrisma(clientInstance: PrismaClient): Promise<PrismaClient> {
  await clientInstance.$connect();
  return clientInstance;
}

/** Returns a singleton Prisma client when database access is enabled. */
export async function getPrismaClient(): Promise<PrismaClient | null> {
  const config = loadConfig();
  if (!config.DB_ENABLED) {
    return null;
  }

  if (client) {
    return client;
  }

  if (connecting) {
    return connecting;
  }

  const url = process.env.DATABASE_URL || buildDatabaseUrl();
  const nextClient = createPrismaClient(url);

  connecting = connectPrisma(nextClient)
    .then((connected) => {
      client = connected;
      return connected;
    })
    .catch(() => {
      connecting = null;
      return null;
    });

  return connecting;
}
