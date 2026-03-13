-- CreateTable
CREATE TABLE "SessionCronJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "reason" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "agentProfile" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "cronTask" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT
);
INSERT INTO "new_Session" ("agentProfile", "createdAt", "id", "metadata", "updatedAt") SELECT "agentProfile", "createdAt", "id", "metadata", "updatedAt" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
