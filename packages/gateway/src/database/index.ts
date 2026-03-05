import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client";

let db: PrismaClient | undefined;

export function getDatabaseClient(): PrismaClient {
  if (db) {
    return db;
  }

  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL!,
  });

  db = new PrismaClient({ adapter });

  return db;
}
