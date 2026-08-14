# DONI Vercel — Phase 12

Phase 12 adds operational post-ticketing tools that existed in the WordPress plugin or were needed to administer the Phase 11 backend:

- Manual Inventory Center with authenticated CRUD. AGENT can view; ADMIN/SUPER_ADMIN can create, activate/deactivate and delete.
- Check-in Center preserving WordPress states: offered -> accepted -> payment_pending -> completed/declined.
- Baggage Services preserving WordPress states: requested -> price_to_confirm -> payment_pending -> confirmed/declined.
- Flight incidents for delays >=30 minutes, cancelled and diverted flights.
- FlightAware polling can create persistent FlightIncident records.
- Optional multilingual customer disruption alerts (FR/EN/ES/HT), disabled by default.
- Live Ops summary now includes flight incidents, check-in work and baggage work.

## Safety
`FLIGHT_DISRUPTION_ALERTS_ENABLED=false` by default. Disruption messages also require the existing flight alerts/tracking and WhatsApp sending configuration to be enabled.

## Migration
Run:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

Migration added: `20260814_phase12_ops_services`.
