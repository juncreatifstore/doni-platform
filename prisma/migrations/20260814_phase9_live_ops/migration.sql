ALTER TABLE "DoniConversation" ADD COLUMN IF NOT EXISTS "assignedAgentId" TEXT;
ALTER TABLE "DoniConversation" ADD COLUMN IF NOT EXISTS "agentTakenOverAt" TIMESTAMP(3);
ALTER TABLE "DoniConversation" ADD COLUMN IF NOT EXISTS "agentReleasedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ConversationMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "senderUserId" TEXT,
  "contentType" TEXT NOT NULL DEFAULT 'text',
  "text" TEXT,
  "providerMessageId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ConversationMessage_providerMessageId_key" ON "ConversationMessage"("providerMessageId");
CREATE INDEX IF NOT EXISTS "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId","createdAt");
CREATE INDEX IF NOT EXISTS "DoniConversation_status_agentRequired_updatedAt_idx" ON "DoniConversation"("status","agentRequired","updatedAt");
CREATE INDEX IF NOT EXISTS "DoniConversation_assignedAgentId_status_idx" ON "DoniConversation"("assignedAgentId","status");

DO $$ BEGIN
  ALTER TABLE "DoniConversation" ADD CONSTRAINT "DoniConversation_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DoniConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
