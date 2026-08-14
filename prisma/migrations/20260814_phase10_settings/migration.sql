CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "category" TEXT NOT NULL,
  "value" JSONB,
  "encryptedValue" TEXT,
  "isSecret" BOOLEAN NOT NULL DEFAULT false,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AppSetting_category_key_idx" ON "AppSetting"("category", "key");
