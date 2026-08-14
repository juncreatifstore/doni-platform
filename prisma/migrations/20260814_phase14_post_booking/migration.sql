CREATE TABLE "PostBookingRequest" (
  "id" TEXT PRIMARY KEY,
  "reference" TEXT NOT NULL,
  "ticketId" TEXT,
  "conversationId" TEXT,
  "phone" TEXT,
  "requestType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'request_created',
  "priority" TEXT,
  "payload" JSONB,
  "clientConsentText" TEXT,
  "adminNotes" TEXT,
  "airlineDecision" TEXT,
  "penaltyAmount" DECIMAL(10,2),
  "penaltyCurrency" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "PostBookingEvent" (
  "id" TEXT PRIMARY KEY,
  "requestId" TEXT NOT NULL REFERENCES "PostBookingRequest"("id") ON DELETE CASCADE,
  "eventType" TEXT NOT NULL,
  "actorUserId" TEXT,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "RefundRequest" (
  "id" TEXT PRIMARY KEY,
  "postBookingId" TEXT REFERENCES "PostBookingRequest"("id") ON DELETE SET NULL,
  "paymentId" TEXT,
  "ticketReference" TEXT,
  "phone" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "refundMethod" TEXT,
  "refundReference" TEXT,
  "requestedBy" TEXT,
  "approvedBy" TEXT,
  "processedBy" TEXT,
  "processedAt" TIMESTAMP(3),
  "notes" TEXT,
  "providerPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "RefundEvent" (
  "id" TEXT PRIMARY KEY,
  "refundId" TEXT NOT NULL REFERENCES "RefundRequest"("id") ON DELETE CASCADE,
  "eventType" TEXT NOT NULL,
  "actorUserId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PostBookingRequest_reference_createdAt_idx" ON "PostBookingRequest"("reference","createdAt");
CREATE INDEX "PostBookingRequest_status_priority_createdAt_idx" ON "PostBookingRequest"("status","priority","createdAt");
CREATE INDEX "PostBookingRequest_requestType_status_idx" ON "PostBookingRequest"("requestType","status");
CREATE INDEX "PostBookingRequest_conversationId_createdAt_idx" ON "PostBookingRequest"("conversationId","createdAt");
CREATE INDEX "PostBookingEvent_requestId_createdAt_idx" ON "PostBookingEvent"("requestId","createdAt");
CREATE INDEX "RefundRequest_status_createdAt_idx" ON "RefundRequest"("status","createdAt");
CREATE INDEX "RefundRequest_paymentId_createdAt_idx" ON "RefundRequest"("paymentId","createdAt");
CREATE INDEX "RefundRequest_ticketReference_createdAt_idx" ON "RefundRequest"("ticketReference","createdAt");
CREATE INDEX "RefundEvent_refundId_createdAt_idx" ON "RefundEvent"("refundId","createdAt");
