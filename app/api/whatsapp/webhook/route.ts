import {getSetting} from '@/lib/settings/service';
import {dispatchInbound} from '../../../../services/conversation/router';
import {extractWhatsAppMessages} from '../../../../services/whatsapp/extract';
import {sendWhatsAppText} from '../../../../services/whatsapp/send';
import {loadOrCreateSession} from '../../../../services/conversation/session-manager';
import {db} from '../../../../lib/db';
import {recordMessage} from '../../../../services/live-ops/service';
import {ensureCustomerProfile} from '../../../../services/customers/service';

export const runtime='nodejs';
export async function GET(req:Request){const u=new URL(req.url);const mode=u.searchParams.get('hub.mode');const token=u.searchParams.get('hub.verify_token');const challenge=u.searchParams.get('hub.challenge');if(mode==='subscribe'&&token===await getSetting<string>('whatsapp.verify_token'))return new Response(challenge??'',{status:200});return new Response('Forbidden',{status:403});}
export async function POST(req:Request){
 const payload=await req.json();const messages=extractWhatsAppMessages(payload);const processed=[];
 for(const m of messages){
  try{
   const session=await loadOrCreateSession(m.waId);
   await ensureCustomerProfile({waId:m.waId,conversationId:session.id,displayName:m.displayName,language:session.lockedLanguage,country:session.country}).catch(()=>null);
   const raw:any=m.raw; const contentType=String(raw?.type||'text');
   await recordMessage({conversationId:session.id,direction:'INBOUND',senderType:'CUSTOMER',text:m.text,contentType,providerMessageId:m.messageId,metadata:{rawType:contentType}});
   await db.doniConversation.update({where:{id:session.id},data:{lastMessageAt:new Date()}});
   if(session.status==='AGENT_HOLD'){
    processed.push({messageId:m.messageId,waId:m.waId,sessionId:session.id,heldByAgent:true});
    continue;
   }
   const result=await dispatchInbound(m.waId,m.text,m.raw);
   const fresh=await db.doniConversation.findUnique({where:{id:result.sessionId}}).catch(()=>null);
   const freshState=(fresh?.state||{}) as any;await ensureCustomerProfile({waId:m.waId,conversationId:result.sessionId,displayName:m.displayName,language:fresh?.lockedLanguage||fresh?.language||null,email:freshState.contact_email||freshState.email||null,country:fresh?.country||null}).catch(()=>null);
   const delivery=result.reply.message?await sendWhatsAppText(m.waId,result.reply.message):{sent:false,dryRun:true};
   if(result.reply.message){const providerMessageId=(delivery as any)?.response?.messages?.[0]?.id??null;await recordMessage({conversationId:result.sessionId,direction:'OUTBOUND',senderType:'BOT',text:result.reply.message,providerMessageId,metadata:{delivery,nextSegment:result.segment,outcome:result.reply.outcome}});}
   processed.push({messageId:m.messageId,waId:m.waId,sessionId:result.sessionId,nextSegment:result.segment,outcome:result.reply.outcome,delivery});
  }catch(error){console.error('whatsapp_dispatch_failed',{waId:m.waId,messageId:m.messageId,error:error instanceof Error?error.message:String(error)});processed.push({messageId:m.messageId,waId:m.waId,error:'dispatch_failed'});}
 }
 return Response.json({received:true,count:messages.length,processed},{status:200});
}
