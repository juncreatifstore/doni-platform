CREATE TABLE "ManualFlightInventory" (
 "id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE, "active" BOOLEAN NOT NULL DEFAULT true,
 "origin" TEXT NOT NULL, "destination" TEXT NOT NULL, "airlineCode" TEXT NOT NULL, "airlineName" TEXT NOT NULL,
 "flightNumber" TEXT NOT NULL, "departureTime" TEXT NOT NULL, "arrivalTime" TEXT NOT NULL, "durationMinutes" INTEGER NOT NULL,
 "adultPrice" DECIMAL(12,2) NOT NULL, "childPrice" DECIMAL(12,2), "infantPrice" DECIMAL(12,2), "currency" TEXT NOT NULL,
 "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "ManualFlightInventory_active_origin_destination_idx" ON "ManualFlightInventory"("active","origin","destination");
CREATE INDEX "ManualFlightInventory_airlineCode_active_idx" ON "ManualFlightInventory"("airlineCode","active");
CREATE TABLE "FlightTracking" (
 "id" TEXT PRIMARY KEY, "ticketId" TEXT, "ticketReference" TEXT, "pnr" TEXT, "ticketNumber" TEXT,
 "airlineCode" TEXT NOT NULL, "flightNumber" TEXT NOT NULL, "origin" TEXT NOT NULL, "destination" TEXT NOT NULL,
 "scheduledDeparture" TIMESTAMP(3) NOT NULL, "scheduledArrival" TIMESTAMP(3), "estimatedDeparture" TIMESTAMP(3), "estimatedArrival" TIMESTAMP(3),
 "actualDeparture" TIMESTAMP(3), "actualArrival" TIMESTAMP(3), "delayMinutes" INTEGER, "gate" TEXT, "terminal" TEXT,
 "flightStatus" TEXT NOT NULL DEFAULT 'scheduled', "providerUsed" TEXT, "rawData" JSONB, "clientPhone" TEXT, "clientEmail" TEXT,
 "clientLanguage" TEXT DEFAULT 'fr', "active" BOOLEAN NOT NULL DEFAULT true, "lastCheckAt" TIMESTAMP(3), "nextCheckAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "FlightTracking_active_nextCheckAt_idx" ON "FlightTracking"("active","nextCheckAt");
CREATE INDEX "FlightTracking_airlineCode_flightNumber_scheduledDeparture_idx" ON "FlightTracking"("airlineCode","flightNumber","scheduledDeparture");
CREATE INDEX "FlightTracking_pnr_idx" ON "FlightTracking"("pnr");
CREATE INDEX "FlightTracking_ticketReference_idx" ON "FlightTracking"("ticketReference");
CREATE TABLE "FlightAlert" (
 "id" TEXT PRIMARY KEY, "trackingId" TEXT NOT NULL REFERENCES "FlightTracking"("id") ON DELETE CASCADE,
 "alertType" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending', "scheduledAt" TIMESTAMP(3) NOT NULL, "sentAt" TIMESTAMP(3),
 "language" TEXT DEFAULT 'fr', "channel" TEXT NOT NULL DEFAULT 'whatsapp', "recipient" TEXT, "message" TEXT NOT NULL, "error" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "FlightAlert_trackingId_alertType_key" UNIQUE("trackingId","alertType")
);
CREATE INDEX "FlightAlert_status_scheduledAt_idx" ON "FlightAlert"("status","scheduledAt");
CREATE TABLE "CheckinService" (
 "id" TEXT PRIMARY KEY, "trackingId" TEXT NOT NULL REFERENCES "FlightTracking"("id") ON DELETE CASCADE,
 "status" TEXT NOT NULL DEFAULT 'offered', "price" DECIMAL(10,2), "currency" TEXT DEFAULT 'USD', "paymentStatus" TEXT,
 "seatPreference" TEXT, "completedBy" TEXT, "completedAt" TIMESTAMP(3), "notes" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "CheckinService_trackingId_status_idx" ON "CheckinService"("trackingId","status");
