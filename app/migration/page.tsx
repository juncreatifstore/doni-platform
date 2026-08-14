import {DoniShell} from '@/components/DoniShell';import {requirePageUser} from '@/lib/auth/session';
const groups=[
 ['Core conversation','PORTED','Sessions, router, language, intent, anti-silence/recovery'],
 ['Flight shopping','PORTED','Airports, dates, passengers, Duffel, manual inventory, Google fallback, repricing'],
 ['Traveler compliance','PORTED','Passport validity, age/type, duplicate passport, infant/adult rules'],
 ['Payments','PORTED','Stripe, Mercado Pago, PayPal, MonCash/Bazik, expiry, verified webhooks, manual receipt review/OCR'],
 ['Ticketing & delivery','PORTED','Manual issue, PNR, PDF, WhatsApp/email'],
 ['Flight Ops','PORTED','FlightAware, OAG schedule-only, alerts, check-in, baggage, incidents'],
 ['Live Ops','PORTED','Conversation viewer, takeover/release, agent messaging'],
 ['Finance / Flow Tracker','PARTIAL','Operational dashboards ported; AI/sync/action parity incomplete'],
 ['Post-booking change/cancel','PORTED','Client WhatsApp request, agent lifecycle, penalties, airline decision and notifications'],
 ['Customer CRM identity','PORTED','Persistent CustomerProfile linked across WhatsApp sessions, with Customer Center'],
 ['Ancillaries before payment','PARTIAL','Post-booking baggage exists; full seat/meal/bag pre-checkout remains'],
 ['Flight status inbound Q&A','PORTED','Direct WhatsApp intent, customer tracked-flight lookup and FlightAware refresh'],
 ['Refund workflow','PORTED','Request → approval → SUPER_ADMIN execution; Stripe/PayPal/Mercado/manual with over-refund guard'],
 ['Copilot / CRM admin extras','MISSING','Labels, departments, companies, templates, documents, invoices, Copilot'],
 ['WordPress plumbing','OBSOLETE','Replaced by Next.js, Prisma, secure auth and Vercel Cron']
] as const;
export default async function Page(){const user=await requirePageUser('ADMIN');return <DoniShell title="Migration Coverage" active="/migration" user={user}><div className="card"><h2>WordPress v2.9.36.2 → Vercel</h2><p className="muted">Audit de couverture mis à jour en Phase 16. Le détail exhaustif est dans docs/WORDPRESS_COVERAGE_MATRIX.md.</p><div className="tableWrap"><table className="table"><thead><tr><th>Domaine</th><th>État</th><th>Résumé</th></tr></thead><tbody>{groups.map(([a,s,d])=><tr key={a}><td><b>{a}</b></td><td><span className={`badge ${s==='PORTED'?'ok':s==='MISSING'?'badBadge':'warn'}`}>{s}</span></td><td>{d}</td></tr>)}</tbody></table></div></div></DoniShell>}
