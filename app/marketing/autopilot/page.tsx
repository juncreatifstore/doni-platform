import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {canAccessMarketing} from '@/lib/auth/marketing-access';
import {approveAutopilot,getMarketingAutopilot,rejectAutopilot,scheduleAutopilot,submitAutopilotForApproval} from '@/lib/workspace/marketing-autopilot';
export const dynamic='force-dynamic';

function label(s:string){return ({AI_READY:'AI Ready',WAITING_APPROVAL:'En attente d’approbation',APPROVED:'Approuvé',REJECTED:'Rejeté',SCHEDULED:'Planifié',SENT:'Envoyé'} as Record<string,string>)[s]||s;}
function actorOf(u:any){return {id:u.id,username:u.username,role:u.role};}
function displayTitle(x:any){const isTest=String(x?.source||'').includes('V2.14 Facebook Organic Publisher · Controlled Test')||String(x?.title||'')==='Test DONI Facebook Publisher';if(!isTest)return x?.title||'Campagne DONI';const short=String(x.id||'').slice(0,6).toUpperCase();const when=x.createdAt?new Date(x.createdAt).toLocaleString('fr-FR',{timeZone:'America/Mexico_City',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'date inconnue';return `Test Facebook · #${short} · ${when}`;}
function mexicoCityIso(value:string){
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return `${value}:00-06:00`;
 return value;
}

export default async function Page({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}){
 const user=await requirePageUser('AGENT');if(!canAccessMarketing(user))redirect('/overview?forbidden=1');
 const params=searchParams?await searchParams:{};const scheduleError=typeof params?.schedule_error==='string'?params.schedule_error:'';
 const data=await getMarketingAutopilot();const admin=user.role==='ADMIN'||user.role==='SUPER_ADMIN';
 async function submit(formData:FormData){'use server';const u=await requirePageUser('AGENT');if(!canAccessMarketing(u))redirect('/overview?forbidden=1');await submitAutopilotForApproval(String(formData.get('id')||''),actorOf(u));revalidatePath('/marketing/autopilot');}
 async function approve(formData:FormData){'use server';const u=await requirePageUser('ADMIN');await approveAutopilot(String(formData.get('id')||''),actorOf(u));revalidatePath('/marketing/autopilot');}
 async function reject(formData:FormData){'use server';const u=await requirePageUser('ADMIN');await rejectAutopilot(String(formData.get('id')||''),actorOf(u),'Rejet manuel depuis le cockpit Autopilot');revalidatePath('/marketing/autopilot');}
 async function schedule(formData:FormData){'use server';const u=await requirePageUser('ADMIN');const id=String(formData.get('id')||'');const raw=String(formData.get('scheduledFor')||'');if(!id||!raw)redirect('/marketing/autopilot?schedule_error=date_required');const when=mexicoCityIso(raw);const result=await scheduleAutopilot(id,actorOf(u),when);if(!result.ok)redirect(`/marketing/autopilot?schedule_error=${encodeURIComponent(result.reason)}`);revalidatePath('/marketing/autopilot');redirect('/marketing/autopilot');}
 return <DoniShell title="Marketing Autopilot contrôlé" active="/marketing/autopilot" user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Marketing V2.5 · Automatisation avec garde-fous</span><h2>Marketing Autopilot contrôlé</h2><p>DONI peut préparer, prioriser et planifier. Un humain garde l’approbation finale avant toute publication, relance ou dépense.</p></div></section>
  {scheduleError?<div className="settingsMessage">⚠ Planification impossible : {scheduleError==='scheduled_time_must_be_future'?'choisissez une heure future (heure de Mexico City).':scheduleError}</div>:null}
  <div className="autopilotSafety card"><div><span>Règle principale</span><strong>AI_READY ne peut jamais devenir SENT directement</strong><small>Chemin imposé : AI_READY → WAITING_APPROVAL → APPROVED → SCHEDULED → SENT.</small></div><div><span>Envoi direct</span><strong>Désactivé</strong><small>Aucun bouton « envoyer maintenant » dans ce cockpit.</small></div></div>
  <div className="marketingKpis"><div className="card"><span>AI Ready</span><strong>{data.counts.AI_READY}</strong></div><div className="card"><span>À approuver</span><strong>{data.counts.WAITING_APPROVAL}</strong></div><div className="card"><span>Approuvés</span><strong>{data.counts.APPROVED}</strong></div><div className="card"><span>Planifiés</span><strong>{data.counts.SCHEDULED}</strong></div><div className="card"><span>Envoyés</span><strong>{data.counts.SENT}</strong></div></div>
  <section className="card autopilotQueue"><div className="searchIntelHead"><div><span>File de contrôle</span><h3>Brouillons et campagnes</h3></div><small>{admin?'Mode approbateur':'Mode préparateur'}</small></div>
   <div className="autopilotGrid">{data.items.length?data.items.map(x=><article className="autopilotRow" key={x.id}><div><span className={`autopilotStatus ${x.status.toLowerCase()}`}>{label(x.status)}</span><h4>{displayTitle(x)}</h4><small>{x.objective}</small></div><div><span>Audience</span><strong>{x.audience||'—'}</strong><small>{x.channelSuggestion||'Canal à définir'}</small></div><div><span>Contrôle</span><strong>{x.approvedBy?`Approuvé par ${x.approvedBy}`:'Approbation requise'}</strong><small>{x.scheduledFor?`Planifié : ${new Date(x.scheduledFor).toLocaleString('fr-FR',{timeZone:'America/Mexico_City'})}`:'Non planifié'}</small></div><div className="autopilotActions">
    {x.status==='AI_READY'?<form action={submit}><input type="hidden" name="id" value={x.id}/><button className="primaryButton" type="submit">Soumettre</button></form>:null}
    {x.status==='WAITING_APPROVAL'&&admin?<><form action={approve}><input type="hidden" name="id" value={x.id}/><button className="primaryButton" type="submit">Approuver</button></form><form action={reject}><input type="hidden" name="id" value={x.id}/><button className="secondaryButton" type="submit">Rejeter</button></form></>:null}
    {x.status==='APPROVED'&&admin?<form action={schedule} className="autopilotSchedule"><input type="hidden" name="id" value={x.id}/><input type="datetime-local" name="scheduledFor" required/><small className="muted">Heure de Mexico City</small><button className="primaryButton" type="submit">Planifier</button></form>:null}
    {x.status==='SCHEDULED'?<span className="muted">En attente du Publisher Worker</span>:null}
    {x.status==='SENT'?<span className="muted">Cycle terminé</span>:null}
   </div></article>):<p className="muted">Aucun brouillon disponible. Générez d’abord un brouillon dans DONI Marketing AI Copilot.</p>}</div>
  </section>
 </DoniShell>;
}
