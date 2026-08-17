import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {hasRole} from '@/lib/auth/permissions';
import {getMarketingChannelPerformance} from '@/services/workspace/marketing-channels';
export const dynamic='force-dynamic';

const labels:Record<string,string>={WHATSAPP:'WhatsApp',FACEBOOK:'Facebook',INSTAGRAM:'Instagram',TIKTOK:'TikTok',GOOGLE:'Google',REFERRAL:'Parrainage',FIELD:'Terrain',OTHER:'Autre'};
function fmt(v:number|null){return v===null?'—':`${v.toFixed(v%1?1:0)} min`;}
function ResponseCard({title,data,target,description}:{title:string;data:any;target:number;description:string}){return <section className="card channelResponseCard"><div className="channelResponseHead"><div><span>WhatsApp</span><h3>{title}</h3></div><strong className={data.withinTargetPct!==null&&data.withinTargetPct>=90?'scoreOk':'scoreWarn'}>{data.withinTargetPct===null?'N/A':`${data.withinTargetPct}%`}</strong></div><p>{description}</p><div className="channelResponseStats"><div><span>Moyenne</span><strong>{fmt(data.averageMinutes)}</strong></div><div><span>Médiane</span><strong>{fmt(data.medianMinutes)}</strong></div><div><span>P90</span><strong>{fmt(data.p90Minutes)}</strong></div><div><span>Échantillons</span><strong>{data.samples}</strong></div></div><small>Objectif : réponse en moins de {target} min. {data.openEpisodes>0?`${data.openEpisodes} séquence(s) encore ouverte(s).`:''}</small></section>}
function money(v:number){return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(v)}

export default async function Page(){
 const user=await requirePageUser('AGENT');if(!hasRole(user.role,'ADMIN')&&user.department!=='MARKETING')redirect('/overview?forbidden=1');
 const d=await getMarketingChannelPerformance(30);
 const totalLeads=d.channels.reduce((a,x)=>a+x.leads,0),sales=d.channels.reduce((a,x)=>a+x.attributedSales,0);
 return <DoniShell title="Canaux & Temps de réponse" active="/marketing/channels" user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Performance réelle · 30 jours</span><h2>Acquisition, ventes et réactivité</h2><p>Les canaux sont comparés à partir des leads et ventes réellement attribuées. Les revenus restent séparés par devise. Le SLA WhatsApp distingue la réponse DONI de la réponse humaine.</p></div></section>
  <div className="marketingKpis"><div className="card"><span>Leads · 30 j</span><strong>{totalLeads}</strong></div><div className="card"><span>Ventes attribuées · 30 j</span><strong>{sales}</strong></div><div className="card"><span>Réponse DONI &lt; 60 min</span><strong>{d.whatsapp.firstDoniResponse.withinTargetPct===null?'N/A':`${d.whatsapp.firstDoniResponse.withinTargetPct}%`}</strong></div><div className="card"><span>Réponse humaine &lt; 60 min</span><strong>{d.whatsapp.humanResponse.withinTargetPct===null?'N/A':`${d.whatsapp.humanResponse.withinTargetPct}%`}</strong></div></div>
  <div className="channelResponseGrid"><ResponseCard title="Première réponse DONI" data={d.whatsapp.firstDoniResponse} target={d.targetMinutes} description="Première réponse BOT ou AGENT après une séquence entrante client."/><ResponseCard title="Réponse humaine" data={d.whatsapp.humanResponse} target={d.targetMinutes} description="Première réponse AGENT uniquement. Les conversations traitées exclusivement par le bot ne sont pas classées comme échec humain."/></div>
  <section className="card channelTableCard"><div className="marketingToolbar"><div><h2>Performance par source</h2><p>Fenêtre glissante de {d.periodDays} jours.</p></div></div><div className="channelTableWrap"><table className="channelTable"><thead><tr><th>Canal</th><th>Leads</th><th>Qualifiés</th><th>Ventes attribuées</th><th>Lead → vente</th><th>Revenu attribué</th></tr></thead><tbody>{d.channels.map(x=><tr key={x.source}><td><strong>{labels[x.source]||x.source}</strong></td><td>{x.leads}</td><td>{x.qualified}</td><td>{x.attributedSales}</td><td>{x.leadToSalePct===null?'—':`${x.leadToSalePct}%`}</td><td>{x.revenueByCurrency.length?x.revenueByCurrency.map(r=><span className="channelMoney" key={r.currency}>{money(r.amount)} {r.currency}</span>):'—'}</td></tr>)}</tbody></table></div><small>Une vente compte uniquement lorsqu’une attribution marketing confirmée existe. Les chiffres ne sont pas convertis entre devises.</small></section>
 </DoniShell>
}
