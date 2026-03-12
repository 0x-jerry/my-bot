import { PrismaClient } from "../generated/prisma/client";
import { PrismaBunSqlite } from "prisma-adapter-bun-sqlite";

let db: PrismaClient | undefined;

export function getDatabaseClient(): PrismaClient {
  if (db) {
    return db;
  }

  const adapter = new PrismaBunSqlite({
    url: process.env.DATABASE_URL!,
  });

  db = new PrismaClient({ adapter });

  return db;
}
