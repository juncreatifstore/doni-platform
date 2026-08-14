CREATE TABLE "BaggageService" (
  "id" TEXT NOT NULL,
  "trackingId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "weightKg" INTEGER,
  "price" DECIMAL(10,2),
  "currency" TEXT DEFAULT 'USD',
  "paymentStatus" TEXT,
  "confirmedBy" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BaggageService_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BaggageService_trackingId_status_idx" ON "BaggageService"("trackingId","status");
CREATE INDEX "BaggageService_status_createdAt_idx" ON "BaggageService"("status","createdAt");
ALTER TABLE "BaggageService" ADD CONSTRAINT "BaggageService_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "FlightTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FlightIncident" (
  "id" TEXT NOT NULL,
  "trackingId" TEXT NOT NULL,
  "incidentKey" TEXT NOT NULL,
  "incidentType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'warning',
  "status" TEXT NOT NULL DEFAULT 'open',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "acknowledgedBy" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FlightIncident_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FlightIncident_trackingId_incidentKey_key" ON "FlightIncident"("trackingId","incidentKey");
CREATE INDEX "FlightIncident_status_severity_createdAt_idx" ON "FlightIncident"("status","severity","createdAt");
CREATE INDEX "FlightIncident_trackingId_createdAt_idx" ON "FlightIncident"("trackingId","createdAt");
ALTER TABLE "FlightIncident" ADD CONSTRAINT "FlightIncident_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "FlightTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
