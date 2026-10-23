import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var ledobizPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add your Neon connection string to .env.local.");
  }
  // Neon's serverless driver on Neon; the standard Postgres driver anywhere else (e.g. local dev).
  const isNeon = /\.neon\.tech(:\d+)?\//.test(connectionString) || connectionString.includes(".neon.tech");
  const adapter = isNeon ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/** Lazily created so builds and pages that don't touch the database never need DATABASE_URL. */
export function db(): PrismaClient {
  if (!globalThis.ledobizPrisma) {
    globalThis.ledobizPrisma = createClient();
  }
  return globalThis.ledobizPrisma;
}
