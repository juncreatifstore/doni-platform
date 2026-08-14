CREATE TYPE "ManualPaymentReviewStatus" AS ENUM ('PENDING','NEEDS_INFO','APPROVED','REJECTED','SUPERSEDED');
CREATE TABLE "ManualPaymentReview" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "mimeType" TEXT,
  "receiptBytes" BYTEA,
  "receiptSha256" TEXT,
  "receiptSize" INTEGER,
  "status" "ManualPaymentReviewStatus" NOT NULL DEFAULT 'PENDING',
  "ocrStatus" TEXT NOT NULL DEFAULT 'pending',
  "ocrConfidence" DOUBLE PRECISION,
  "ocrAmount" DECIMAL(12,2),
  "ocrCurrency" TEXT,
  "ocrReference" TEXT,
  "ocrDate" TIMESTAMP(3),
  "ocrSender" TEXT,
  "ocrReceiver" TEXT,
  "ocrPayload" JSONB,
  "comparisonStatus" TEXT,
  "comparisonNotes" JSONB,
  "reviewerNotes" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualPaymentReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ManualPaymentReview_status_createdAt_idx" ON "ManualPaymentReview"("status","createdAt");
CREATE INDEX "ManualPaymentReview_paymentId_createdAt_idx" ON "ManualPaymentReview"("paymentId","createdAt");
ALTER TABLE "ManualPaymentReview" ADD CONSTRAINT "ManualPaymentReview_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualPaymentReview" ADD CONSTRAINT "ManualPaymentReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
