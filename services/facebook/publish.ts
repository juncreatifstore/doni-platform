import {getSetting} from '@/lib/settings/service';
import {marketingCampaignPrefill} from '@/lib/workspace/marketing-booking-handoff';

export type FacebookPublishInput={itemId:string;message:string};

function digitsOnly(value:string){return String(value||'').replace(/\D+/g,'');}

export async function buildFacebookWhatsAppLink(itemId:string){
 const raw=await getSetting<string>('facebook.whatsapp_number');
 const phone=digitsOnly(raw);
 if(!phone)return null;
 const text=marketingCampaignPrefill(itemId,'fr');
 return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export async function publishFacebookPagePost(input:FacebookPublishInput){
 const [enabled,pageId,token,graphVersion]=await Promise.all([
  getSetting<boolean>('facebook.enabled'),
  getSetting<string>('facebook.page_id'),
  getSetting<string>('facebook.page_access_token'),
  getSetting<string>('facebook.graph_version')
 ]);
 const whatsappLink=await buildFacebookWhatsAppLink(input.itemId);
 const message=whatsappLink?`${input.message}\n\n📲 Vérifier le tarif et réserver avec DONI : ${whatsappLink}`:input.message;
 if(!enabled)return{sent:false,dryRun:true,pageId:pageId||null,message,whatsappLink};
 if(!pageId||!token)throw new Error('Facebook Page credentials missing');
 const version=String(graphVersion||'v23.0').replace(/^\/+|\/+$/g,'');
 const body=new URLSearchParams({message,access_token:token});
 const res=await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/feed`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 const json=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(`Facebook publish failed: ${res.status} ${JSON.stringify(json)}`);
 return{sent:true,dryRun:false,pageId,message,whatsappLink,postId:String((json as any)?.id||''),response:json};
}
