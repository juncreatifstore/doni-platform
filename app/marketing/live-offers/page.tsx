import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {canAccessMarketing} from '@/lib/auth/marketing-access';
import {createLiveOfferCampaignDraft,getMarketingLiveOffers,listLiveOfferCampaignDrafts} from '@/lib/workspace/marketing-live-offers';
export const dynamic='force-dynamic';

function money(n:number,c:string){try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency:c}).format(n);}catch{return `${n.toFixed(2)} ${c}`;}}
function statusLabel(s:string){return ({VERIFIED:'Vérifiée',CHANGED:'Prix modifié',UNAVAILABLE:'Indisponible',EXPIRED:'Expirée',UNSUPPORTED:'Non repricable'} as Record<string,string>)[s]||s;}
function ttl(sec:number|null){if(sec===null)return 'Expiration fournisseur non fournie';if(sec<=0)return 'Expirée';const m=Math.floor(sec/60);return m>=60?`${Math.floor(m/60)} h ${m%60} min restantes`:`${m} min restantes`;}

export default async function Page(){
 const user=await requirePageUser('AGENT');if(!canAccessMarketing(user))redirect('/overview?forbidden=1');
 const data=await getMarketingLiveOffers();const drafts=await listLiveOfferCampaignDrafts();
 async function makeDraft(formData:FormData){'use server';const u=await requirePageUser('AGENT');if(!canAccessMarketing(u))redirect('/overview?forbidden=1');const id=String(formData.get('conversationId')||'');if(id)await createLiveOfferCampaignDraft(id);revalidatePath('/marketing/live-offers');}
 return <DoniShell title="Live Offers Engine" active="/marketing/live-offers" user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Marketing V2.3 · Prix vérifiés</span><h2>Live Offers Engine</h2><p>Chaque offre exploitable est repricée avant utilisation marketing. Un tarif observé n'est jamais présenté comme tarif actuel sans validation fournisseur.</p></div></section>
  <div className="liveOfferProviders"><div className="card"><span>Duffel</span><strong>Connecté</strong><small>Recherche + repricing réel</small></div><div className="card mutedProvider"><span>PKFARE</span><strong>Non connecté</strong><small>Aucun adaptateur PKFARE présent dans le dépôt actuel</small></div></div>
  <div className="marketingKpis"><div className="card"><span>Offres contrôlées</span><strong>{data.metrics.checked}</strong></div><div className="card"><span>Vérifiées</span><strong>{data.metrics.verified}</strong></div><div className="card"><span>Prix modifiés</span><strong>{data.metrics.changed}</strong></div><div className="card"><span>Indisponibles / expirées</span><strong>{data.metrics.unavailable}</strong></div></div>
  <section className="card liveOffersCard"><div className="searchIntelHead"><div><span>Repricing temps réel</span><h3>Offres sélectionnées récemment</h3></div><small>Fenêtre : 24 heures</small></div>
   <div className="liveOffersGrid">{data.offers.length?data.offers.map(x=><article className="liveOfferRow" key={`${x.conversationId}-${x.offerId}`}><div><span className={`liveStatus ${x.status.toLowerCase()}`}>{statusLabel(x.status)}</span><h4>{x.origin} → {x.destination}</h4><small>{x.provider.toUpperCase()} · {x.offerId}</small></div><div><span>Prix actuel</span><strong>{money(x.price,x.currency)}</strong>{x.status==='CHANGED'?<small>Ancien : {money(x.oldPrice,x.currency)}</small>:null}</div><div><span>Validité</span><strong>{ttl(x.secondsRemaining)}</strong><small>{x.expiresAt?new Date(x.expiresAt).toLocaleString('fr-FR'):'Pas d’expiration fournie'}</small></div><div>{x.status==='VERIFIED'||x.status==='CHANGED'?<form action={makeDraft}><input type="hidden" name="conversationId" value={x.conversationId}/><button className="primaryButton" type="submit">Créer un brouillon campagne</button></form>:<span className="muted">Publication bloquée</span>}</div></article>):<p className="muted">Aucune offre sélectionnée récente à repricer.</p>}</div>
  </section>
  <section className="card liveDraftsCard"><div className="searchIntelHead"><div><span>Campagnes préparées</span><h3>Brouillons issus d'offres vérifiées</h3></div><small>Repricing obligatoire avant diffusion</small></div>{drafts.length?<div className="liveDraftGrid">{drafts.map((d:any)=><div className="liveDraft" key={d.id}><span>{d.status}</span><strong>{d.headline}</strong><small>{d.provider?.toUpperCase()} · vérifiée {new Date(d.verifiedAt).toLocaleString('fr-FR')}</small><p>{d.disclaimer}</p></div>)}</div>:<p className="muted">Aucun brouillon créé pour le moment.</p>}</section>
 </DoniShell>;
}
