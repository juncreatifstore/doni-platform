import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {canAccessMarketing} from '@/lib/auth/marketing-access';
import {saveMetaAdsPerformanceGuard} from '@/lib/workspace/meta-ads-performance';
import {getMetaAdsPerformance} from '@/services/facebook/performance';
import {pauseMetaAdsCampaign} from '@/services/facebook/activation';
export const dynamic='force-dynamic';

function money(v:number,c:string){return `${Number(v||0).toFixed(2)} ${c||'USD'}`;}
function pct(v:number){return `${Number(v||0).toFixed(2)}%`;}
export default async function Page({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}){
 const user=await requirePageUser('AGENT');if(!canAccessMarketing(user))redirect('/overview?forbidden=1');
 const params=searchParams?await searchParams:{};const ok=typeof params?.ok==='string'?params.ok:'';const error=typeof params?.error==='string'?params.error:'';
 const rows=await getMetaAdsPerformance();
 const totals=rows.reduce((a,r)=>({spend:a.spend+r.spend,impressions:a.impressions+r.impressions,clicks:a.clicks+r.clicks,critical:a.critical+(r.alert==='CRITICAL'?1:0)}),{spend:0,impressions:0,clicks:0,critical:0});
 async function saveGuard(formData:FormData){'use server';const u=await requirePageUser('ADMIN');const id=String(formData.get('id')||'');try{await saveMetaAdsPerformanceGuard(id,{warningSpend:formData.get('warningSpend'),criticalSpend:formData.get('criticalSpend')},u.id);revalidatePath('/marketing/meta-ads-performance');redirect('/marketing/meta-ads-performance?ok=guard_saved');}catch(e){redirect(`/marketing/meta-ads-performance?error=${encodeURIComponent(e instanceof Error?e.message:'guard_save_failed')}`);}}
 async function emergencyPause(formData:FormData){'use server';const u=await requirePageUser('SUPER_ADMIN');const id=String(formData.get('id')||'');try{await pauseMetaAdsCampaign(id,{id:u.id,username:u.username,role:u.role});revalidatePath('/marketing/meta-ads-performance');revalidatePath('/marketing/meta-ads-launch');redirect('/marketing/meta-ads-performance?ok=paused');}catch(e){redirect(`/marketing/meta-ads-performance?error=${encodeURIComponent(e instanceof Error?e.message:'pause_failed')}`);}}
 return <DoniShell title="Meta Ads Performance" active="/marketing/meta-ads-performance" user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Meta Ads · Supervision réelle</span><h2>Meta Ads Performance</h2><p>Lecture en temps réel des statuts et métriques Meta. Les seuils déclenchent des alertes visuelles uniquement : aucune modification de budget ni pause automatique.</p></div></section>
  {ok?<div className="settingsMessage">✓ {ok==='guard_saved'?'Seuils de dépense enregistrés.':'Campagne mise en pause via arrêt d’urgence.'}</div>:null}
  {error?<div className="settingsMessage">⚠ Meta Ads : {error}</div>:null}
  <div className="marketingKpis"><div className="card"><span>Dépense Meta</span><strong>{money(totals.spend,rows[0]?.currency||'USD')}</strong></div><div className="card"><span>Impressions</span><strong>{totals.impressions.toLocaleString('fr-FR')}</strong></div><div className="card"><span>Clics</span><strong>{totals.clicks.toLocaleString('fr-FR')}</strong></div><div className="card"><span>Alertes critiques</span><strong>{totals.critical}</strong><small>Aucune pause automatique</small></div></div>
  <section className="card publisherQueue"><div className="searchIntelHead"><div><span>Marketing API</span><h3>Statut, dépense et rendement</h3></div><small>Données Meta · date preset maximum</small></div>
   <div className="publisherRows">{rows.map(r=><article className="publisherRow" key={r.campaignId} style={{alignItems:'start'}}><div><span className="publisherStatus">{r.alert}</span><h4>{r.name}</h4><small>Campaign {r.remoteCampaignId}</small><p className="muted">Meta : {r.effectiveStatus||r.status||'—'}{r.error?` · ${r.error}`:''}</p></div><div><span>Performance</span><strong>{money(r.spend,r.currency)}</strong><small>{r.impressions.toLocaleString('fr-FR')} impressions · {r.clicks.toLocaleString('fr-FR')} clics</small><small>CTR {pct(r.ctr)} · CPC {money(r.cpc,r.currency)}</small></div><div><span>Garde-fou dépense</span><strong>{r.criticalSpend>0?`${money(r.warningSpend,r.currency)} → ${money(r.criticalSpend,r.currency)}`:'Non configuré'}</strong>{user.role!=='AGENT'?<form action={saveGuard} style={{display:'grid',gap:6,marginTop:8,minWidth:210}}><input type="hidden" name="id" value={r.campaignId}/><label><small>Avertissement ({r.currency})</small><input type="number" name="warningSpend" min="0" step="0.01" defaultValue={r.warningSpend||0}/></label><label><small>Critique ({r.currency})</small><input type="number" name="criticalSpend" min="0.01" step="0.01" defaultValue={r.criticalSpend||Math.max(1,r.spend*1.25||10)} required/></label><button className="btn" type="submit">Enregistrer les seuils</button></form>:null}</div><div><span>Action</span><strong>{r.alert==='CRITICAL'?'Seuil critique atteint':r.alert==='WARNING'?'Surveillance requise':'Sous contrôle'}</strong><small>DONI n’agit jamais automatiquement.</small>{user.role==='SUPER_ADMIN'&&(r.alert==='CRITICAL'||r.effectiveStatus==='ACTIVE'||r.status==='ACTIVE')?<form action={emergencyPause} style={{marginTop:8}}><input type="hidden" name="id" value={r.campaignId}/><button className="btn" type="submit">⏸ Pause d’urgence</button></form>:null}</div></article>)}{!rows.length?<p className="muted">Aucune campagne Meta distante à superviser.</p>:null}</div>
  </section>
 </DoniShell>;
}
