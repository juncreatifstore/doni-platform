import { DoniShell } from '@/components/DoniShell';
import { requirePageUser } from '@/lib/auth/session';
import { getFlowMetrics } from '@/services/analytics/dashboard';
import { MetricCard } from '@/components/analytics/MetricCard';
import { AutoRefresh } from '@/components/analytics/AutoRefresh';

export const dynamic = 'force-dynamic';

export default async function FlowTrackerPage(){
  const user = await requirePageUser('AGENT');
  const d = await getFlowMetrics();

  return (
    <DoniShell title="Flow Tracker" active="/flow-tracker" user={user}>
      <AutoRefresh seconds={30}/>

      <div className="grid">
        <MetricCard label="Conversations démarrées · 24 h" value={d.started24} />
        <MetricCard label="Paiements · 24 h" value={d.paid24} note={`${d.paymentConversionPct}% de conversion`} tone={d.paymentConversionPct >= 30 ? 'good' : 'warn'} />
        <MetricCard label="Tickets émis · 24 h" value={d.issued24} note={`${d.issueConversionPct}% des conversations`} />
        <MetricCard label="Flux critiques" value={d.criticalCount} note="Bloqués > 30 min ou agent requis" tone={d.criticalCount ? 'bad' : 'good'} />
      </div>

      <h2 className="sectionTitle">Funnel DONI en temps réel</h2>
      <div className="card tableWrap">
        <table className="table">
          <thead><tr><th>Étape</th><th>Conversations actives</th></tr></thead>
          <tbody>
            {d.funnel.map((x)=><tr key={x.key}><td>{x.label}</td><td><strong>{x.count}</strong></td></tr>)}
          </tbody>
        </table>
      </div>

      <h2 className="sectionTitle">Conversations bloquées</h2>
      <div className="card tableWrap">
        <table className="table">
          <thead><tr><th>WhatsApp</th><th>Pays</th><th>Langue</th><th>Étape</th><th>Blocage</th><th>Agent</th></tr></thead>
          <tbody>
            {d.stalled.length ? d.stalled.map((r)=><tr key={r.id}><td>{r.waId}</td><td>{r.country||'—'}</td><td>{r.language||'—'}</td><td><code>{r.currentSegment}</code></td><td>{r.stalledMinutes} min</td><td>{r.agentRequired?<span className="badge warn">Requis</span>:<span className="badge ok">Auto</span>}</td></tr>) : <tr><td colSpan={6} className="muted">Aucune conversation bloquée.</td></tr>}
          </tbody>
        </table>
      </div>

      {d.unknown.length ? <>
        <h2 className="sectionTitle">Segments hors funnel</h2>
        <div className="card tableWrap"><table className="table"><thead><tr><th>Segment</th><th>Nombre</th></tr></thead><tbody>{d.unknown.map((x)=><tr key={x.segment}><td><code>{x.segment}</code></td><td>{x.count}</td></tr>)}</tbody></table></div>
      </> : null}
    </DoniShell>
  );
}
