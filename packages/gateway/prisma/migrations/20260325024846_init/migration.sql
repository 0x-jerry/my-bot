/*
  Warnings:

  - Added the required column `name` to the `ProviderConfig` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProviderConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseURL" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL
);
INSERT INTO "new_ProviderConfig" ("apiKey", "baseURL", "createdAt", "id", "type", "updatedAt") SELECT "apiKey", "baseURL", "createdAt", "id", "type", "updatedAt" FROM "ProviderConfig";
DROP TABLE "ProviderConfig";
ALTER TABLE "new_ProviderConfig" RENAME TO "ProviderConfig";
CREATE UNIQUE INDEX "ProviderConfig_name_key" ON "ProviderConfig"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
