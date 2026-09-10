# DONI Platform

Plateforme d’opérations de voyage de JUN Créatif & Travel : agent WhatsApp multilingue
(FR / EN / ES / HT) → recherche de vols (Duffel, inventaire manuel) → paiement
(Stripe, Mercado Pago, PayPal, Bazik/MonCash, Zelle) → émission et livraison des billets →
suivi de vol et alertes, avec un portail interne pour l’équipe (Next.js 15, Prisma 6, PostgreSQL).

## Démarrage

```bash
cp .env.example .env.local   # DATABASE_URL, DIRECT_URL, AUTH_SECRET, SETTINGS_ENCRYPTION_KEY, CRON_SECRET
npm install
npx prisma migrate deploy
npm run admin:create         # premier SUPER_ADMIN
npm run dev
```

## Qualité

`npm run check` = Prettier + ESLint + `tsc --noEmit` + Vitest, les mêmes portes que la CI
(`.github/workflows/ci.yml`, qui ajoute `npm audit` et un scan de secrets). `GET /api/health`
renvoie l’état de la base, du planificateur (heartbeat des crons) et des variables requises.

## Mise en service progressive

Tous les interrupteurs de production (WhatsApp, Duffel, paiements, remboursements, émission,
livraison, alertes, OCR) sont **à OFF par défaut** et se pilotent dans Réglages ou via les
runbooks `.github/workflows/doni-phase*.yml`, qui activent une capacité à la fois avec
vérification et retour arrière automatique. Ordre recommandé : phases 20 → 43.

Historique des phases de migration ci-dessous ; la couverture WordPress détaillée est dans
`docs/WORDPRESS_COVERAGE_MATRIX.md`.

---


Initial migration scaffold for the DONI Flight Engine WordPress plugin.

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Configure a PostgreSQL database.
3. Run `npm install`.
4. Run `npx prisma generate` and create the first migration.
5. Run `npm run dev`.

## Important
This scaffold is Phase 1. Existing WordPress business logic is not yet retired. Webhook routes currently acknowledge requests but provider signature validation/business processing must be ported before production traffic is switched.


## Phase 2 — Conversation core

The WhatsApp conversation core is now ported in TypeScript: session lifecycle, language detection/locking, intent classification, segment registry, language bootstrap, service selection and trip type.

### Safe test mode

Keep `WHATSAPP_SEND_ENABLED=false` while comparing WordPress and Vercel. Set `DONI_DEV_SIMULATOR=true` only in a protected development deployment to POST test messages to `/api/dev/conversation`.

### Current migration boundary

The flow is real through `segment_trip_type`. `segment_origin`, `segment_post_booking`, and autonomous review are registered placeholders so the router never falls into an unknown segment while the next modules are being ported.

## Phase 3 — Flight search core

The client flow is now ported from trip type through flight result presentation:

`origin → airport disambiguation → destination → dates → passengers → search → results → selection`

The bundled WordPress airport dataset (`airports-iata.json.gz`, ~7k IATA airports) is loaded directly by the Node runtime. Passenger parsing and multilingual date parsing mirror the WordPress flow. Following the latest plugin behavior, cabin class is not asked to the client and is forced to `economy` as a system default.

### Duffel safety switch

Duffel search code is ported but disabled by default. Add a valid `DUFFEL_ACCESS_TOKEN` and explicitly set `DUFFEL_SEARCH_ENABLED=true` in a protected environment when ready to compare live search responses. Booking/order creation is **not** enabled in Phase 3.

`POST /api/dev/flight-search` is available only when `DONI_DEV_SIMULATOR=true` for isolated provider testing.

### Provider migration status

- Duffel: search + offer normalization ported.
- Manual inventory: routing rule preserved, provider implementation pending.
- Google fallback: routing rule preserved, provider implementation pending.
- Agent quote: last-resort state preserved, implementation pending.
- Selection: user can select a displayed offer; repricing/traveler collection is the Phase 4 boundary.

## Phase 5 — Payments
Payment routing is now implemented with country-aware methods, safe FX conversion, TTL/expiry, Stripe, Mercado Pago, PayPal, Bazik/MonCash, Zelle/manual bank instructions and signed/idempotent webhooks. Real checkout creation remains disabled until `PAYMENTS_CREATE_ENABLED=true`.

## Phase 6 — Ticketing & Live Ops

Phase 6 ports the manual issuance queue and e-ticket delivery path from the WordPress plugin.

New routes:
- `GET /api/ticketing/queue`
- `POST /api/ticketing/issue` (feature-gated)
- `POST /api/ticketing/deliver` (feature-gated)
- `GET /api/ticketing/[reference]/pdf`
- `GET /api/live-ops/summary`

Production writes remain disabled until `TICKETING_WRITE_ENABLED=true`. This flag is not authentication; add portal auth before production enablement.

## Phase 8 — Analytics réelles
Overview, Finance et Flow Tracker sont maintenant alimentés directement depuis PostgreSQL. Les montants sont regroupés par devise et les écrans se rafraîchissent automatiquement. Voir `PHASE8_FLOW.md` et `PHASE8_VALIDATION.md`.

## Phase 9 — Live Ops avancé

Phase 9 ajoute le Conversation Viewer, l'historique des messages, la prise en charge par agent (`AGENT_HOLD`), l'envoi WhatsApp manuel, la libération de la conversation vers DONI et la reprise au segment courant. Les actions agent sont auditées.

## Phase 10 — Settings & Integrations Center

`/settings` now supports database overrides with Vercel environment fallback. Secrets saved in the portal are encrypted at rest with AES-256-GCM using `SETTINGS_ENCRYPTION_KEY` and are writable/testable only by `SUPER_ADMIN`.

Before enabling production integrations, apply the Phase 10 migration and configure `SETTINGS_ENCRYPTION_KEY`. Keep payment creation, WhatsApp sending, Duffel search, OCR, and ticketing writes disabled until their individual connection tests pass.

## Phase 12 — Flight providers & Flight Ops
Adds PostgreSQL manual inventory, the legacy Google/RapidAPI fallback, PKFARE passenger dossier validation, FlightAware polling, OAG schedule-only diagnostics, flight alerts, and the Flight Ops dashboard. Real tracking/alerts/fallback calls remain opt-in through Settings.

## Phase 14
Adds Post-Booking Center, WhatsApp booking lookup/change/cancel/name-correction requests, airline/penalty workflow, multilingual status notifications, and a controlled refund lifecycle. Real refunds are disabled by default and require SUPER_ADMIN plus `REFUNDS_EXECUTION_ENABLED=true`.


## Phase 15
Customer Identity, persistent My Bookings lookup, Customer Center and direct WhatsApp Flight Status are implemented. See `PHASE15_FLOW.md`.


## Phase 16 — Manual Payment Verification
- Agent queue for manual receipts (Zelle / bank transfer).
- Private receipt evidence persisted with SHA-256.
- Optional OCR extraction/comparison; never automatic approval.
- Human approval routes through the existing verified `markPaid()` flow and Ticketing.
