import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../config/env';

let client: PrismaClient | null = null;
let connecting: Promise<PrismaClient | null> | null = null;

function buildDatabaseUrl() {
  const config = loadConfig();
  const user = encodeURIComponent(config.DB_USER || '');
  const password = encodeURIComponent(config.DB_PASSWORD || '');
  const host = config.DB_HOST || 'localhost';
  const dbName = config.DB_NAME || 'postgres';
  return `postgresql://${user}:${password}@${host}:5432/${dbName}`;
}

function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });
}

async function connectPrisma(clientInstance: PrismaClient): Promise<PrismaClient> {
  await clientInstance.$connect();
  return clientInstance;
}

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
