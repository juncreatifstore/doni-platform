-- Phase 7: portal authentication hardening.
ALTER TABLE "PortalUser" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "PortalUser" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- Existing users must receive a password hash before NOT NULL is enforced.
-- For a fresh Phase 7 deployment, bootstrap the first admin before exposing the portal.
UPDATE "PortalUser" SET "passwordHash" = 'DISABLED_RESET_REQUIRED' WHERE "passwordHash" IS NULL;
ALTER TABLE "PortalUser" ALTER COLUMN "passwordHash" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PortalUser_email_key" ON "PortalUser"("email");
CREATE INDEX IF NOT EXISTS "PortalSession_userId_expiresAt_idx" ON "PortalSession"("userId", "expiresAt");

CREATE TABLE IF NOT EXISTS "AuthAttempt" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuthAttempt_fingerprint_createdAt_idx" ON "AuthAttempt"("fingerprint", "createdAt");
