import {getSetting} from '@/lib/settings/service';
import {handleMarketingPreferenceCommand} from '@/lib/workspace/marketing-consent';
import {recordMarketingDeliveryStatus,recordMarketingReply} from '@/lib/workspace/marketing-delivery-tracking';
import {dispatchInbound} from '../../../../services/conversation/router';
import {extractWhatsAppMessages} from '../../../../services/whatsapp/extract';
import {sendWhatsAppText} from '../../../../services/whatsapp/send';
import {loadOrCreateSession} from '../../../../services/conversation/session-manager';
import {db} from '../../../../lib/db';
import {recordMessage} from '../../../../services/live-ops/service';
import {ensureCustomerProfile} from '../../../../services/customers/service';

export const runtime='nodejs';

function errorCode(error:unknown){
 const raw=error instanceof Error?error.message:String(error);
 return raw.replace(/\s+/g,' ').slice(0,180);
}
function extractStatuses(payload:any){const out:any[]=[];for(const entry of payload?.entry||[])for(const change of entry?.changes||[])for(const s of change?.value?.statuses||[])out.push({providerMessageId:String(s?.id||''),status:String(s?.status||''),timestamp:s?.timestamp?String(s.timestamp):null,recipient:s?.recipient_id?String(s.recipient_id):null,errors:s?.errors||null});return out.filter(x=>x.providerMessageId&&x.status);}

async function dispatchWithRetry(waId:string,text:string,raw:unknown){
 try{return await dispatchInbound(waId,text,raw);}
 catch(first){
  console.warn('whatsapp_dispatch_retry',{waId,error:errorCode(first)});
  await new Promise(resolve=>setTimeout(resolve,180));
  try{return await dispatchInbound(waId,text,raw);}
  catch(second){
   (second as any).__firstDispatchError=errorCode(first);
   throw second;
  }
 }
}

export async function GET(req:Request){const u=new URL(req.url);const mode=u.searchParams.get('hub.mode');const token=u.searchParams.get('hub.verify_token');const challenge=u.searchParams.get('hub.challenge');if(mode==='subscribe'&&token===await getSetting<string>('whatsapp.verify_token'))return new Response(challenge??'',{status:200});return new Response('Forbidden',{status:403});}

export async function POST(req:Request){
 const payload=await req.json();const statuses=extractStatuses(payload);const statusResults=[];for(const s of statuses)statusResults.push(await recordMarketingDeliveryStatus(s).catch(()=>({matched:false,error:true} as const)));const messages=extractWhatsAppMessages(payload);const processed=[];
 for(const m of messages){
  let sessionId:string|null=null;
  try{
   const session=await loadOrCreateSession(m.waId);sessionId=session.id;
   await ensureCustomerProfile({waId:m.waId,conversationId:session.id,displayName:m.displayName,language:session.lockedLanguage,country:session.country}).catch(()=>null);
   const raw:any=m.raw; const contentType=String(raw?.type||'text');
   await recordMessage({conversationId:session.id,direction:'INBOUND',senderType:'CUSTOMER',text:m.text,contentType,providerMessageId:m.messageId,metadata:{rawType:contentType}});
   await db.doniConversation.update({where:{id:session.id},data:{lastMessageAt:new Date()}});
   const preference=contentType==='text'?await handleMarketingPreferenceCommand(m.waId,m.text).catch(()=>({handled:false} as const)):{handled:false} as const;
   if(preference.handled){const delivery=await sendWhatsAppText(m.waId,preference.reply);const providerMessageId=(delivery as any)?.response?.messages?.[0]?.id??null;await recordMessage({conversationId:session.id,direction:'OUTBOUND',senderType:'BOT',text:preference.reply,providerMessageId,metadata:{delivery,event:'marketing_preference',status:preference.status}});processed.push({messageId:m.messageId,waId:m.waId,sessionId:session.id,marketingPreference:preference.status,delivery});continue;}
   if(m.messageId)await recordMarketingReply(m.waId,m.messageId).catch(()=>null);
   if(session.status==='AGENT_HOLD'){
    processed.push({messageId:m.messageId,waId:m.waId,sessionId:session.id,heldByAgent:true});
    continue;
   }
   const result=await dispatchWithRetry(m.waId,m.text,m.raw);
   const fresh=await db.doniConversation.findUnique({where:{id:result.sessionId}}).catch(()=>null);
   const freshState=(fresh?.state||{}) as any;await ensureCustomerProfile({waId:m.waId,conversationId:result.sessionId,displayName:m.displayName,language:fresh?.lockedLanguage||fresh?.language||null,email:freshState.contact_email||freshState.email||null,country:fresh?.country||null}).catch(()=>null);
   const delivery=result.reply.message?await sendWhatsAppText(m.waId,result.reply.message):{sent:false,dryRun:true};
   if(result.reply.message){const providerMessageId=(delivery as any)?.response?.messages?.[0]?.id??null;await recordMessage({conversationId:result.sessionId,direction:'OUTBOUND',senderType:'BOT',text:result.reply.message,providerMessageId,metadata:{delivery,nextSegment:result.segment,outcome:result.reply.outcome}});}
   processed.push({messageId:m.messageId,waId:m.waId,sessionId:result.sessionId,nextSegment:result.segment,outcome:result.reply.outcome,delivery});
  }catch(error){
   const code=errorCode(error);const first=(error as any)?.__firstDispatchError??null;
   console.error('whatsapp_dispatch_failed',{waId:m.waId,messageId:m.messageId,error:code,firstError:first});
   if(sessionId){
    await recordMessage({conversationId:sessionId,direction:'OUTBOUND',senderType:'SYSTEM',text:'⚠️ Message entrant reçu mais traitement DONI interrompu.',metadata:{event:'whatsapp_dispatch_failed',providerMessageId:m.messageId,error:code,firstError:first}}).catch(()=>null);
   }
   processed.push({messageId:m.messageId,waId:m.waId,sessionId,error:'dispatch_failed'});
  }
 }
 return Response.json({received:true,count:messages.length,statusCount:statuses.length,statusMatched:statusResults.filter((x:any)=>x?.matched).length,processed},{status:200});
}
