CREATE TABLE IF NOT EXISTS "CustomerProfile" (
  "id" TEXT NOT NULL,
  "customerCode" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "displayName" TEXT,
  "email" TEXT,
  "country" TEXT,
  "preferredLanguage" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerProfile_customerCode_key" ON "CustomerProfile"("customerCode");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerProfile_phone_key" ON "CustomerProfile"("phone");
CREATE INDEX IF NOT EXISTS "CustomerProfile_email_idx" ON "CustomerProfile"("email");
CREATE INDEX IF NOT EXISTS "CustomerProfile_country_lastSeenAt_idx" ON "CustomerProfile"("country","lastSeenAt");
ALTER TABLE "DoniConversation" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
CREATE INDEX IF NOT EXISTS "DoniConversation_customerId_updatedAt_idx" ON "DoniConversation"("customerId","updatedAt");
DO $$ BEGIN
 ALTER TABLE "DoniConversation" ADD CONSTRAINT "DoniConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
