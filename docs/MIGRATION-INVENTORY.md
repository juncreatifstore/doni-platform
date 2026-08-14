# DONI WordPress → Vercel migration inventory

Source: `doni-flight-engine-v2` version supplied by user (2.9.36.2 fix-routes).

## Measured source coupling
- 268 PHP files
- 159 WordPress REST route registrations
- 3,653 `$wpdb` references
- 347 WordPress option API calls
- 50 WordPress cron scheduling references
- 1 admin JS file + 1 admin CSS file, with additional inline CSS/JS in PHP renderers

## Migration rule
The WordPress plugin remains immutable reference code. Each domain is ported to a TypeScript service and covered by route-level tests before its WordPress endpoint is retired.

## First target domains
1. Authentication / portal shell
2. Conversation/session engine
3. WhatsApp webhook and API client
4. Flights/provider router/Duffel
5. Payments + provider webhooks
6. Ticketing and delivery
7. Live Ops / Flow / Finance
8. Scheduled jobs and alerts
