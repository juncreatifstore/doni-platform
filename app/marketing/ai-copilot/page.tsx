import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {canAccessMarketing} from '@/lib/auth/marketing-access';
import {generateCopilotDraft,getMarketingAICopilot,listCopilotDrafts} from '@/lib/workspace/marketing-ai-copilot';
export const dynamic='force-dynamic';

function money(n:number|null|undefined,c:string|null|undefined){if(!n||!c)return null;try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency:c}).format(n);}catch{return `${n.toFixed(2)} ${c}`;}}
function pLabel(v:string){return ({CRITICAL:'Critique',HIGH:'Haute',MEDIUM:'Moyenne',LOW:'Faible'} as Record<string,string>)[v]||v;}
function tLabel(v:string){return ({RECOVERY:'Récupération',LIVE_OFFER:'Offre live',DEMAND:'Demande',DATA_QUALITY:'Infrastructure'} as Record<string,string>)[v]||v;}

export default async function Page(){
 const user=await requirePageUser('AGENT');if(!canAccessMarketing(user))redirect('/overview?forbidden=1');
 const data=await getMarketingAICopilot();const drafts=await listCopilotDrafts();
 async function createDraft(formData:FormData){'use server';const u=await requirePageUser('AGENT');if(!canAccessMarketing(u))redirect('/overview?forbidden=1');const id=String(formData.get('recommendationId')||'');if(id)await generateCopilotDraft(id);revalidatePath('/marketing/ai-copilot');}
 return <DoniShell title="DONI Marketing AI Copilot" active="/marketing/ai-copilot" user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Marketing V2.4 · Analyse → recommandation → génération</span><h2>DONI Marketing AI Copilot</h2><p>DONI croise Search Intelligence, les abandons de réservation et les offres live pour prioriser les prochaines actions. Toute publication, relance ou dépense reste soumise à validation humaine.</p></div></section>
  <div className="copilotMode card"><div><span>Mode actuel</span><strong>Moteur de décision opérationnel</strong><small>Le copilote fonctionne sans dépendance LLM externe. Les brouillons sont structurés pour accueillir ensuite un modèle génératif.</small></div><div><span>Contrôle humain</span><strong>Obligatoire</strong><small>Aucun envoi, publication ni dépense publicitaire automatique.</small></div></div>
  <div className="marketingKpis"><div className="card"><span>Recherches · 30 j</span><strong>{data.summary.searches}</strong></div><div className="card"><span>Intentions fortes</span><strong>{data.summary.highIntent}</strong></div><div className="card"><span>Abandons actifs</span><strong>{data.summary.abandoned}</strong></div><div className="card"><span>Offres live vérifiées</span><strong>{data.summary.liveVerified}</strong></div><div className="card"><span>Priorités critiques</span><strong>{data.summary.critical}</strong></div><div className="card"><span>Priorités hautes</span><strong>{data.summary.high}</strong></div></div>
  <section className="card copilotRecommendations"><div className="searchIntelHead"><div><span>Priorisation DONI</span><h3>Prochaines actions recommandées</h3></div><small>Score 0–100 · données réelles</small></div>
   <div className="copilotGrid">{data.recommendations.length?data.recommendations.map(r=><article className="copilotRow" key={r.id}><div className={`copilotScore ${r.priority.toLowerCase()}`}><strong>{r.score}</strong><span>{pLabel(r.priority)}</span></div><div className="copilotMain"><div><span className="copilotType">{tLabel(r.type)}</span><h4>{r.title}</h4></div><p>{r.reason}</p><small>{r.source}</small></div><div className="copilotAction"><span>Action recommandée</span><p>{r.recommendedAction}</p>{money(r.amount,r.currency)?<strong>{money(r.amount,r.currency)}</strong>:null}</div><div>{r.canGenerate?<form action={createDraft}><input type="hidden" name="recommendationId" value={r.id}/><button className="primaryButton" type="submit">Générer le brouillon</button></form>:<span className="muted">Action technique requise</span>}</div></article>):<p className="muted">Aucune recommandation disponible pour le moment.</p>}</div>
  </section>
  <section className="card copilotDrafts"><div className="searchIntelHead"><div><span>Génération assistée</span><h3>Brouillons préparés par DONI</h3></div><small>État : AI_READY · approbation humaine obligatoire</small></div>{drafts.length?<div className="copilotDraftGrid">{drafts.map((d:any)=><article className="copilotDraft" key={d.id}><div><span>{d.status}</span><strong>{d.title}</strong><small>{d.objective}</small></div><p>{d.message}</p><div className="copilotDraftMeta"><span>Audience : {d.audience}</span><span>Canal : {d.channelSuggestion}</span><span>{d.budgetSuggestion}</span></div><em>{d.disclaimer}</em></article>)}</div>:<p className="muted">Aucun brouillon généré pour le moment.</p>}</section>
 </DoniShell>;
}
