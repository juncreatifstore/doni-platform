import {db} from '@/lib/db';
import {sendWhatsAppText} from '@/services/whatsapp/send';
import type {ConversationSession,JsonObject} from '@/services/conversation/types';

const SIX_HOURS=6*3600_000, SEVEN_DAYS=7*86400_000;
const LOCKED_SEGMENTS=new Set(['segment_selection','segment_repricing','segment_saved_passengers','segment_new_passenger','segment_ocr_upload','segment_ocr_confirmation','segment_manual_passenger','segment_compliance','segment_ancillaries','segment_recap','segment_payment_choice','segment_payment_confirmation','segment_ticketing']);
const PAYMENT_WAITING=new Set(['payment_link_sent','awaiting_payment','payment_pending','awaiting_manual_payment','awaiting_receipt_validation','manual_pending','awaiting_mobile_payment']);

export function needsRecovery(s:ConversationSession){
  if(!s.lastMessageAt)return false; const age=Date.now()-s.lastMessageAt.getTime();
  if(age<SIX_HOURS||age>SEVEN_DAYS)return false;
  if(Boolean(s.state.booking_context_locked))return false;
  if(LOCKED_SEGMENTS.has(s.currentSegment))return false;
  const order=(s.state.order??{}) as JsonObject; const ps=String(order.payment_status??s.state.payment_status??'');
  if(PAYMENT_WAITING.has(ps))return false;
  return true;
}
function progress(s:ConversationSession){const c=(s.state.criteria??{}) as JsonObject;const rows:string[]=[];if(c.origin)rows.push(`• Origine/Origin: ${c.origin}`);if(c.destination)rows.push(`• Destination: ${c.destination}`);if(c.depart_date)rows.push(`• Départ/Departure: ${c.depart_date}`);if(c.return_date)rows.push(`• Retour/Return: ${c.return_date}`);return rows.length?`\n\n📋 ${rows.join('\n')}`:'';}
export function recoveryMessage(s:ConversationSession){const l=s.lockedLanguage??'es';const intro:{[k:string]:string}={fr:'👋 Bon retour ! On avait commencé votre demande de vol.',en:'👋 Welcome back! We had started your flight request.',es:'👋 ¡Bienvenido de nuevo! Habíamos comenzado su solicitud de vuelo.',ht:'👋 Byenvni retounen! Nou te kòmanse demand vòl ou.'};const q:{[k:string]:string}={fr:'Voulez-vous *reprendre* ou *recommencer* ?',en:'Would you like to *resume* or *restart*?',es:'¿Quiere *retomar* o *reiniciar*?',ht:'Èske ou vle *kontinye* oswa *rekòmanse*?'};return `${intro[l]??intro.es}${progress(s)}\n\n${q[l]??q.es}`;}
export function classifyRecoveryAnswer(text:string){const v=text.trim().toLowerCase();if(/^(reprendre|retomar|resume|continuer|kontinye|1)$/.test(v))return'resume';if(/^(recommencer|reiniciar|restart|rekòmanse|2)$/.test(v))return'restart';return null;}
export async function scanSilentSessions(limit=50){const min=new Date(Date.now()-SEVEN_DAYS),max=new Date(Date.now()-SIX_HOURS);const rows=await db.doniConversation.findMany({where:{status:'ACTIVE',lastMessageAt:{gte:min,lte:max}},orderBy:{lastMessageAt:'asc'},take:limit});let processed=0;for(const row of rows){const s=row as unknown as ConversationSession;if(!needsRecovery(s))continue;const state=(row.state??{}) as JsonObject;const previous=state.recovery_attempted_at?new Date(String(state.recovery_attempted_at)).getTime():0;if(previous&&Date.now()-previous<86400_000)continue;const sent=await sendWhatsAppText(row.waId,recoveryMessage(s));await db.doniConversation.update({where:{id:row.id},data:{state:{...state,recovery_pending:{asked_at:new Date().toISOString(),last_segment:row.currentSegment},recovery_attempted_at:new Date().toISOString()} as any}});if(sent)processed++;}return{found:rows.length,processed};}
export async function markAbandoned(){return db.doniConversation.updateMany({where:{status:'ACTIVE',lastMessageAt:{lt:new Date(Date.now()-SEVEN_DAYS)}},data:{status:'ABANDONED'}});}
