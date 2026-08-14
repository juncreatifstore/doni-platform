CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING','PARTIAL','DELIVERED','FAILED');
ALTER TABLE "Ticket" ADD COLUMN "ticketNumber" TEXT,
ADD COLUMN "providerBookingId" TEXT,
ADD COLUMN "issuedBy" TEXT,
ADD COLUMN "issuedAt" TIMESTAMP(3),
ADD COLUMN "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "deliveredAt" TIMESTAMP(3);
CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status","createdAt");
CREATE TABLE "TicketEvent" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "actor" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TicketEvent_ticketId_createdAt_idx" ON "TicketEvent"("ticketId","createdAt");
CREATE TABLE "TicketDelivery" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketDelivery_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TicketDelivery_ticketId_createdAt_idx" ON "TicketDelivery"("ticketId","createdAt");
