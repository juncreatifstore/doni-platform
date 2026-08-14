# DONI WordPress → Vercel coverage audit — Phase 13

Source audited: DONI Flight Engine v2.9.36.2 (276 files). Target audited: DONI Vercel Phase 12 + Phase 13 corrections.

Legend: **PORTED** = functional equivalent exists; **PARTIAL** = core exists but parity is incomplete; **MISSING** = no functional equivalent yet; **OBSOLETE** = WordPress-only plumbing intentionally not ported.

| Area | WordPress source | Vercel status | Vercel target / gap |
|---|---|---:|---|
| Session manager | core/class-session-manager.php | PORTED | services/conversation/session-manager.ts |
| Router / segment registry | core/class-router.php, class-segment-registry.php | PORTED | services/conversation/router.ts, segments/registry.ts |
| Language / language policy | core/class-language-engine.php, class-doni-language-policy.php | PORTED | conversation/language-engine.ts + language segment |
| Intent engine | core/class-intent-engine.php | PORTED | conversation/intent-engine.ts |
| Anti-silence / recovery | core/class-anti-silence-engine.php, class-recovery-engine.php | PORTED (P13) | services/recovery/service.ts + cron |
| 30-min inactivity safety lock | recovery/session fixes in v2.9.32.x | PORTED (P13) | router protects commercial/payment segments |
| Service / trip / origin / destination / dates | segments/* | PORTED | services/segments/* |
| Airport disambiguation | segment-origin-airport / destination-airport | PORTED | airport-choice.ts + airport database |
| Passenger counts | segment-passengers.php | PORTED | segments/passengers.ts |
| Saved/new/manual passenger flow | segment-saved/new/manual-passenger.php | PORTED | services/segments/* |
| Passport OCR | flight/class-ocr-engine.php + OCR segments | PORTED | travelers/ocr.ts + OCR segments |
| Compliance | flight/class-compliance-engine.php, segment-compliance.php | PORTED (P13) | flights/compliance.ts + segment_compliance |
| Ancillaries before payment | flight/class-ancillary-engine.php, segment-ancillaries.php | PARTIAL | Post-booking baggage center exists; pre-payment seat/meal/bag selection still missing |
| Search engine | flight/class-flight-engine.php | PORTED | segments/search.ts + providers |
| Duffel provider | providers/class-duffel-provider.php | PORTED | providers/duffel.ts |
| Google fallback | providers/class-google-fallback-provider.php | PORTED | providers/google-fallback.ts, disabled by default |
| Manual inventory provider | providers/class-manual-inventory-provider.php | PORTED | provider + Inventory Center CRUD |
| Agent quote provider | providers/class-agent-quote-provider.php | PARTIAL | escalation exists; full quote workspace not yet ported |
| PKFARE passenger validation | providers/class-pkfare-passenger-validator.php | PORTED | pkfare/passenger-validator.ts |
| PKFARE live API booking/search | not implemented in WP source | N/A | intentionally not invented |
| OAG schedule resolver | flight/class-oag-client.php, class-oag-resolver.php | PORTED | flight-ops/oag.ts, schedule-only |
| Repricing | flight/class-repricing-engine.php | PORTED | flights/repricing.ts + segment |
| Offer normalization/filter/comparison | flight/* | PARTIAL | normalization/search sorting exists; full comparison UI/logic parity incomplete |
| Customer CRM identity | customer profile / reusable identity | PORTED | persistent profile keyed by WhatsApp number, linked across sessions |
| Recap | segment-recap.php | PORTED | segments/recap.ts |
| Payment matrix / policy | core/class-payment-matrix.php, provider policy | PORTED | payments/matrix.ts |
| Stripe | payments/class-stripe-handler.php | PORTED | payments/providers.ts + webhooks |
| Mercado Pago | payments/class-mercado-handler.php | PORTED | payments/providers.ts + verified webhook |
| PayPal | payments/class-paypal-handler.php | PORTED | payments/providers.ts + verification |
| MonCash/Bazik | payments/class-bazik-handler.php | PORTED | payments/providers.ts + HMAC webhook |
| Manual payment / receipts | payments/class-manual-payment-handler.php | PARTIAL | instructions + receipt path exist; full admin verification queue parity incomplete |
| Payment expiry | payments/class-payment-expiry.php | PORTED | payments/expiry.ts + cron |
| Refund handling | payments/class-refund-handler.php | PORTED | controlled request/approval workflow; Stripe/PayPal/Mercado/manual execution behind SUPER_ADMIN + feature flag |
| Post-booking requests | payments/class-post-booking-request.php + segment | PORTED | WhatsApp booking lookup, client consent, change/cancel/name requests, agent lifecycle, fees, airline decision, notifications |
| Ticketing queue | flight/class-ticketing-engine.php + public ticketing | PORTED | ticketing/service.ts + portal UI |
| E-ticket PDF | eticket-center/* generator/renderer | PORTED | ticketing/pdf.ts |
| E-ticket delivery WhatsApp/email | eticket-center delivery | PORTED | ticketing/delivery.ts |
| E-ticket branding/templates | eticket-center branding/template engine | PARTIAL | one Vercel PDF renderer; full template/branding configurator not ported |
| Flight tracking FlightAware | flight-alerts/* | PORTED | flight-ops/flightaware.ts + cron |
| Flight alerts/check-in reminders | flight-alerts/* + checkin notifier | PORTED | flight-ops/alerts.ts + Check-in Center |
| Flight status inbound Q&A | flight-status-intent/resolver/replier | PORTED | direct intent → customer tracking lookup → FlightAware refresh → multilingual reply |
| Baggage service | post-booking/baggage logic | PORTED | Baggage Center |
| Disruption incidents | flight status/alert logic | PORTED | FlightIncident + Live Ops |
| Live Ops conversations | live-ops/conversations.php | PORTED | Live Ops + Conversation Viewer |
| Human takeover/release | live-ops/manual queue | PORTED | AGENT_HOLD workflow |
| Live Ops contacts/passengers/bookings | live-ops/* | PARTIAL | conversation side panel exists; dedicated CRM-style pages incomplete |
| Live Ops alerts/problems | live-ops/alerts/problems.php | PORTED/PARTIAL | operational incidents exist; generic problem taxonomy incomplete |
| Copilot / AI assistant | live-ops/class-copilot-engine.php | MISSING | not yet ported |
| Triggers/templates/labels/departments/companies | live-ops pages | MISSING | administrative CRM functions remain |
| Documents/invoices | live-ops documents/invoices | MISSING | dedicated document/invoice centers remain |
| Finance center | finance-center/* | PORTED/PARTIAL | real KPIs/transactions exist; AI advisor/action requests/sync parity incomplete |
| Flow tracker | flow-tracker/* | PORTED/PARTIAL | real funnel/stuck detection exists; AI/actions parity incomplete |
| Portal auth/roles | portal auth/roles | PORTED | secure sessions + roles |
| Invitations | portal/class-invite-manager.php | MISSING | user creation exists, email invitation flow absent |
| Country access manager | portal/class-country-access-manager.php | PARTIAL | user.country exists; country-scoped authorization missing |
| Notifications engine | portal/live-ops notifications | PARTIAL | flight/ticket alerts exist; generic notification inbox/triggers incomplete |
| Settings | WP admin settings | PORTED | encrypted Settings & Integrations Center |
| Audit log | portal/live-ops audit | PORTED | AuditLog page/model |
| Diagnostics/data health | admin dashboards | PARTIAL | integration tests + health exist; full DB/data-health suite incomplete |
| Brevo email | brevo email/api/settings | PORTED | ticket delivery + settings/test |
| Brevo SMS | brevo/class-brevo-sms-service.php | MISSING | SMS channel not yet ported |
| Brevo webhook | brevo/class-brevo-webhook.php | MISSING | dedicated Brevo event ingestion absent |
| Claude AI understanding | ai-understanding/* | PARTIAL | Anthropic OCR exists; general intent/understanding renderer/API not ported |
| Public legal pages | public/class-legal-pages.php | MISSING | should remain on marketing WordPress unless DONI app must host them |
| Public home/warroom/client portal | public/* | PARTIAL | internal portal exists; client self-service portal/warroom parity incomplete |
| WordPress admin menu/hooks/nonces/wp-cron | admin/menu, WP plumbing | OBSOLETE | replaced by Next.js routing, auth, Vercel Cron |
| MySQL migrations/wpdb wrappers | database/* | OBSOLETE | replaced by Prisma/PostgreSQL |

## Phase 13 critical corrections implemented

1. Added anti-silence scan (6h–7d) with one recovery attempt per 24h.
2. Added abandoned-session marking after 7 days.
3. Added resume/restart interception so the next inbound message is not misrouted as a normal segment answer.
4. Added universal commercial/payment lock preventing the 30-minute inactivity reset after offer selection or while payment is pending.
5. Added pre-payment traveler compliance checks: passport expiry/6-month validity, age/type consistency, duplicate passport detection, infant/adult constraints.
6. Added `/api/cron/anti-silence` hourly schedule.

## Remaining P0/P1 parity targets after Phase 13

**P0 before production after Phase 14:** flight-status inbound Q&A; customer identity/profile persistence; full manual-payment verification queue. Post-booking and refund workflow are now ported but still require integration/sandbox validation before activation.

**P1 shortly after:** pre-payment ancillaries; agent quote workspace; dedicated contact/passenger/booking pages; generic notifications; invitation flow; country-scoped access; full diagnostics/data health.

**P2/admin parity:** Copilot, CRM labels/departments/companies, invoice/documents centers, Finance AI advisor, Flow Tracker AI/actions, Brevo SMS/webhook, legal/public pages if they are not kept on WordPress.
