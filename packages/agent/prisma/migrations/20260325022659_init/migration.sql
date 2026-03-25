-- UpdateTable
ALTER TABLE "Memory" RENAME TO "Memory_old";

CREATE TABLE "Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL COLLATE NOCASE,
    "metadata" TEXT
);

INSERT INTO "Memory" (id, createdAt, content, metadata)
SELECT id, createdAt, content, metadata FROM "Memory_old";

DROP TABLE "Memory_old";
