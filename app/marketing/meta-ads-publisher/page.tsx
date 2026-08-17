import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {canAccessMarketing} from '@/lib/auth/marketing-access';
import {listMarketingCampaigns} from '@/lib/workspace/marketing-campaigns';
import {createPausedMetaCampaign,getMetaAdsStatus} from '@/services/facebook/ads';
export const dynamic='force-dynamic';

function money(v:number,c:string){return `${Number(v||0).toFixed(2)} ${c||'USD'}`;}
export default async function Page({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}){
 const user=await requirePageUser('AGENT');if(!canAccessMarketing(user))redirect('/overview?forbidden=1');
 const params=searchParams?await searchParams:{};const ok=typeof params?.created==='string'?params.created:'';const error=typeof params?.error==='string'?params.error:'';
 const [campaigns,status]=await Promise.all([listMarketingCampaigns(),getMetaAdsStatus()]);
 const items=campaigns.filter(c=>c.channel==='META_ADS');
 async function createPaused(formData:FormData){'use server';const u=await requirePageUser('SUPER_ADMIN');const id=String(formData.get('id')||'');if(!id)redirect('/marketing/meta-ads-publisher?error=campaign_id_required');try{const r=await createPausedMetaCampaign(id,u.id);revalidatePath('/marketing/meta-ads-publisher');revalidatePath('/marketing/campaigns');redirect(`/marketing/meta-ads-publisher?created=${encodeURIComponent(r.remoteCampaignId||r.campaign.metaAds?.remoteCampaignId||'ok')}`);}catch(e){redirect(`/marketing/meta-ads-publisher?error=${encodeURIComponent(e instanceof Error?e.message:'meta_ads_publish_failed')}`);}}
 return <DoniShell title="Meta Ads Publisher" active="/marketing/meta-ads-publisher" user={user}>
  <section className="workspaceWelcome"><div><span className="workspaceKicker">Meta Ads · Exécution contrôlée</span><h2>Meta Ads Publisher</h2><p>Création distante autorisée uniquement après approbation humaine. DONI crée exclusivement des campagnes Meta en statut PAUSED. Aucune activation ni dépense automatique.</p></div></section>
  {ok?<div className="settingsMessage">✓ Campagne créée chez Meta en PAUSED · ID {ok}</div>:null}
  {error?<div className="settingsMessage">⚠ Création Meta impossible : {error}</div>:null}
  <div className="marketingKpis"><div className="card"><span>OAuth Ads</span><strong>{status.connected?'Connecté':'Non connecté'}</strong></div><div className="card"><span>Ad Account</span><strong>{status.account?.name||status.adAccountId||'Non sélectionné'}</strong></div><div className="card"><span>Compte</span><strong>{status.account?.accountStatus===1?'Actif':'Non prêt'}</strong></div><div className="card"><span>Écriture Meta</span><strong>{status.writeEnabled?'AUTORISÉE':'OFF'}</strong></div></div>
  <section className="card publisherQueue"><div className="searchIntelHead"><div><span>Campagnes Meta Ads</span><h3>File d’approbation et création distante</h3></div><small>Remote status imposé : PAUSED</small></div>
   <div className="publisherRows">{items.map(c=>{const m=c.metaAds;const approved=m?.approvalStatus==='APPROVED'&&m.approvedAt&&m.approvedBy;return <article className="publisherRow" key={c.id}><div><span className="publisherStatus">{m?.remoteCampaignId?'META PAUSED':m?.approvalStatus||'DRAFT'}</span><h4>{c.name}</h4><small>{c.audience||'Audience à définir'} · budget préparé {money(c.budget,c.currency)}</small></div><div><span>Approbation</span><strong>{m?.approvedBy?`Approuvée par ${m.approvedBy}`:'Approbation requise'}</strong><small>{m?.approvedAt?new Date(m.approvedAt).toLocaleString('fr-FR'):'—'}</small></div><div><span>Meta</span><strong>{m?.remoteCampaignId||'Pas encore créée'}</strong><small>{m?.remoteStatus||'Local uniquement'}</small></div><div>{m?.remoteCampaignId?<span className="muted">Déjà créée · activation interdite ici</span>:approved&&user.role==='SUPER_ADMIN'?<form action={createPaused}><input type="hidden" name="id" value={c.id}/><button className="primaryButton" type="submit" disabled={!status.writeEnabled||status.account?.accountStatus!==1}>Créer chez Meta (PAUSED)</button></form>:<span className="muted">Soumettre et approuver d’abord</span>}</div></article>})}{!items.length?<p className="muted">Aucune campagne Meta Ads.</p>:null}</div>
  </section>
 </DoniShell>;
}
