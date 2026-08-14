# Phase 2 — Conversation core

Ported from DONI WordPress 2.9.36.2:

- Session bootstrap and active-session lookup
- Unknown/stale (72h) session reset
- 30-minute inactivity reset to service selection
- Language detection and language locking (FR/EN/ES/HT)
- Intent classifier
- Segment registry
- Language segment
- Service-selection segment
- Trip-type segment
- WhatsApp Cloud API payload extraction
- WhatsApp webhook → conversation router integration
- Safe outbound transport with `WHATSAPP_SEND_ENABLED=false` by default

## Safety during migration

The webhook processes messages and persists state, but outbound WhatsApp messages remain in dry-run mode until `WHATSAPP_SEND_ENABLED=true` is explicitly configured. This prevents accidental production traffic during parity testing.

## Next porting target

`segment_origin` → airport resolver → destination → date → passengers → search provider router (Duffel/PKFARE).
