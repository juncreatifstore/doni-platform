# État des lieux DONI — 2026-09-11T03:44Z

## Health
```json
{"status":"degraded","service":"doni-platform","version":"b38e885","checks":{"db":{"ok":true,"ms":7},"crons":{"ok":true,"detail":"last run 4 min ago"},"env":{"ok":false,"detail":"missing: AUTH_MFA_ENCRYPTION_KEY"}}}
```

## Interrupteurs
| Catégorie | Clé | État |
|---|---|---|
| WhatsApp | whatsapp.enabled | off |
| Facebook | facebook.enabled | **ON** |
| Flights | flights.duffel_enabled | off |
| Flights | flights.duffel_reprice_enabled | off |
| Flights | flights.pkfare_enabled | off |
| Flights | flights.google_fallback_enabled | off |
| Flights | flights.manual_inventory_enabled | **ON** |
| Flight Tracking | tracking.alerts_enabled | off |
| Flight Tracking | tracking.disruption_alerts_enabled | **ON** |
| Flight Tracking | tracking.auto_send_enabled | off |
| Flight Tracking | tracking.standard_alerts_enabled | off |
| Flight Tracking | tracking.test_alert_enabled | off |
| Flight Tracking | tracking.test_poll_enabled | off |
| Flight Tracking | tracking.test_delivery_enabled | off |
| Flight Tracking | tracking.oag_testing_enabled | off |
| Flight Tracking | tracking.enabled | **ON** |
| Flight Tracking | tracking.auto_poll_enabled | **ON** |
| Payments | payments.create_enabled | off |
| Payments | payments.manual_create_enabled | off |
| Payments | payments.refunds_execute_enabled | off |
| Payments | payments.manual_receipt_ocr_enabled | off |
| Payments | payments.mx_paypal_enabled | off |
| Ticketing | ticketing.write_enabled | off |
| Ticketing | ticketing.delivery_enabled | off |
| OCR | ocr.enabled | off |

## Secrets d’intégration
| Catégorie | Clé | État |
|---|---|---|
| WhatsApp | whatsapp.access_token | ✅ configuré |
| WhatsApp | whatsapp.phone_number_id | ✅ configuré |
| WhatsApp | whatsapp.verify_token | ✅ configuré |
| Facebook | facebook.app_secret | ✅ configuré |
| Facebook | facebook.user_access_token | ✅ configuré |
| Facebook | facebook.page_access_token | ✅ configuré |
| Flights | flights.duffel_access_token | ✅ configuré |
| Flights | flights.pkfare_api_key | — absent |
| Flights | flights.rapidapi_key | — absent |
| Flight Tracking | tracking.oag_secondary_api_key | — absent |
| Flight Tracking | tracking.flightaware_api_key | ✅ configuré |
| Flight Tracking | tracking.oag_api_key | — absent |
| Payments | payments.stripe_secret_key | — absent |
| Payments | payments.stripe_webhook_secret | — absent |
| Payments | payments.mercadopago_access_token | — absent |
| Payments | payments.paypal_client_id | — absent |
| Payments | payments.paypal_client_secret | — absent |
| Payments | payments.paypal_webhook_id | — absent |
| Payments | payments.bazik_webhook_secret | — absent |
| Payments | payments.bazik_user_id | — absent |
| Payments | payments.bazik_secret_key | — absent |
| FX | fx.openexchangerates_app_id | — absent |
| Email | email.brevo_api_key | — absent |
| OCR | ocr.anthropic_api_key | — absent |

## Autres réglages
| Catégorie | Clé | Renseigné |
|---|---|---|
| Facebook | facebook.app_id | ✅ |
| Facebook | facebook.page_id | ✅ |
| Facebook | facebook.page_name | ✅ |
| Facebook | facebook.graph_version | ✅ |
| Facebook | facebook.whatsapp_number | ✅ |
| Flights | flights.provider_priority | ✅ |
| Flight Tracking | tracking.checkin_assistance_price | ✅ |
| Payments | payments.auto_ttl_minutes | ✅ |
| Payments | payments.manual_ttl_minutes | ✅ |
| Payments | payments.paypal_mode | ✅ |
| Payments | payments.zelle_email | ✅ |
| Payments | payments.zelle_phone | ✅ |
| Payments | payments.us_bank_instructions | — |
| Email | email.sender_email | — |
| Email | email.sender_name | ✅ |
| OCR | ocr.model | ✅ |
| General | app.public_url | ✅ |
| General | app.name | ✅ |
| General | app.support_email | — |
| General | app.support_phone | — |
| General | conversation.inactivity_reset_minutes | ✅ |
| General | conversation.stale_hours | ✅ |

## Tests de connexion
| Intégration | Résultat | Message |
|---|---|---|
| whatsapp | ❌ | Meta a refusé les identifiants |
| whatsapp_webhook | ✅ | Webhook WhatsApp vérifiable par Meta |
| duffel | ✅ | Connexion Duffel réussie |
| stripe | ❌ | Stripe key manquante |
| mercadopago | ❌ | Mercado Pago token manquant |
| paypal | ❌ | Identifiants PayPal manquants |
| brevo | ❌ | Brevo key manquante |
| facebook | ✅ | Connexion Facebook réussie — Jun Store  |
