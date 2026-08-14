import {db} from '@/lib/db';
import {audit} from '@/lib/audit';
import {getSetting} from '@/lib/settings/service';
import type {SafeUser} from '@/lib/auth/session';
import {downloadWhatsAppMedia} from '@/services/travelers/ocr';
import {markFailed,markPaid} from './service';
import {sendWhatsAppText} from '@/services/whatsapp/send';
import {recordMessage} from '@/services/live-ops/service';
import {createHash} from 'node:crypto';

type ReceiptOcr={amount?:number|null;currency?:string|null;reference?:string|null;date?:string|null;sender?:string|null;receiver?:string|null;confidence?:number|null;notes?:string[];rawText?:string|null};
function clean(v:unknown){return String(v??'').trim()}
function safeDate(v:unknown){const s=clean(v);if(!s)return null;const d=new Date(s);return Number.isNaN(d.valueOf())?null:d}
function currency(v:unknown){return clean(v).toUpperCase().slice(0,3)}
function normalizeRef(v:unknown){return clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'')}

export async function createManualPaymentReview(paymentId:string,mediaId:string,mimeType?:string|null){
 const payment=await db.payment.findUnique({where:{id:paymentId}});if(!payment)throw new Error('payment_not_found');
 if(payment.status==='PAID')throw new Error('payment_already_paid');
 if(!['manual_zelle','manual_us_bank'].includes(payment.provider))throw new Error('manual_review_not_allowed_for_provider');
 if(payment.status==='EXPIRED'||(payment.expiresAt&&payment.expiresAt.getTime()<Date.now()))throw new Error('payment_expired');
 await db.manualPaymentReview.updateMany({where:{paymentId,status:{in:['PENDING','NEEDS_INFO']}},data:{status:'SUPERSEDED'}});
 const media=await downloadWhatsAppMedia(mediaId);if(media.bytes.length>8*1024*1024)throw new Error('receipt_too_large');
 const review=await db.manualPaymentReview.create({data:{paymentId,mediaId,mimeType:media.mime||mimeType||null,receiptBytes:media.bytes,receiptSha256:createHash('sha256').update(media.bytes).digest('hex'),receiptSize:media.bytes.length,status:'PENDING',ocrStatus:'pending'}});
 await db.payment.update({where:{id:paymentId},data:{expiresAt:null}}); // receipt submitted on time: freeze expiry while human review is pending
 return analyzeManualPaymentReview(review.id);
}

export async function extractReceipt(bytes:Buffer,mime='image/jpeg'):Promise<ReceiptOcr>{
 const enabled=await getSetting<boolean>('payments.manual_receipt_ocr_enabled');
 if(!enabled)return{confidence:0,notes:['ocr_disabled']};
 const key=clean(await getSetting<string>('ocr.anthropic_api_key'));if(!key)return{confidence:0,notes:['anthropic_key_missing']};
 const model=clean(await getSetting<string>('ocr.model'))||'claude-haiku-4-5-20251001';
 const prompt='Analyze this payment receipt ONLY as an extraction task. Return ONLY JSON: {amount:number|null,currency:string|null,reference:string|null,date:string|null,sender:string|null,receiver:string|null,confidence:number,notes:string[],raw_text:string|null}. Never decide authenticity and never claim payment is valid. Never invent unreadable values.';
 const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model,max_tokens:900,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:mime.startsWith('image/')?mime:'image/jpeg',data:bytes.toString('base64')}},{type:'text',text:prompt}]}]})});
 if(!r.ok)return{confidence:0,notes:[`anthropic_http_${r.status}`]};
 const body=await r.json();const text=clean(body?.content?.[0]?.text);const m=text.match(/\{[\s\S]*\}/);if(!m)return{confidence:0,notes:['unparseable']};
 try{const x=JSON.parse(m[0]);return{amount:Number.isFinite(Number(x.amount))?Number(x.amount):null,currency:currency(x.currency)||null,reference:clean(x.reference)||null,date:clean(x.date)||null,sender:clean(x.sender)||null,receiver:clean(x.receiver)||null,confidence:Math.max(0,Math.min(1,Number(x.confidence)||0)),notes:Array.isArray(x.notes)?x.notes.map(clean).filter(Boolean):[],rawText:clean(x.raw_text)||null};}catch{return{confidence:0,notes:['invalid_json']}}
}

function compareReceipt(expected:{amount:number;currency:string;reference:string},ocr:ReceiptOcr){
 const checks:any={amount:'unknown',currency:'unknown',reference:'unknown'};
 if(ocr.amount!=null)checks.amount=Math.abs(ocr.amount-expected.amount)<=0.02?'match':'mismatch';
 if(ocr.currency)checks.currency=currency(ocr.currency)===currency(expected.currency)?'match':'mismatch';
 if(ocr.reference){const a=normalizeRef(ocr.reference),b=normalizeRef(expected.reference);checks.reference=(a.includes(b)||b.includes(a))?'match':'mismatch';}
 const vals=Object.values(checks);const mismatch=vals.includes('mismatch');const matches=vals.filter(x=>x==='match').length;
 const status=mismatch?'MISMATCH':matches>=2?'MATCH':'NEEDS_REVIEW';
 return{status,checks,expected,ocr:{amount:ocr.amount??null,currency:ocr.currency??null,reference:ocr.reference??null},warning:'OCR comparison is not proof of payment authenticity.'};
}

export async function analyzeManualPaymentReview(id:string){
 const review=await db.manualPaymentReview.findUnique({where:{id},include:{payment:true}});if(!review)throw new Error('review_not_found');
 await db.manualPaymentReview.update({where:{id},data:{ocrStatus:'processing'}});
 try{
  const media=review.receiptBytes?{bytes:Buffer.from(review.receiptBytes),mime:review.mimeType||'image/jpeg'}:await downloadWhatsAppMedia(review.mediaId);const ocr=await extractReceipt(media.bytes,media.mime);const comparison=compareReceipt({amount:Number(review.payment.amount),currency:review.payment.currency,reference:review.payment.reference},ocr);
  return await db.manualPaymentReview.update({where:{id},data:{mimeType:media.mime,ocrStatus:ocr.notes?.includes('ocr_disabled')?'disabled':'completed',ocrConfidence:ocr.confidence??null,ocrAmount:ocr.amount??null,ocrCurrency:ocr.currency??null,ocrReference:ocr.reference??null,ocrDate:safeDate(ocr.date),ocrSender:ocr.sender??null,ocrReceiver:ocr.receiver??null,ocrPayload:ocr as never,comparisonStatus:comparison.status,comparisonNotes:comparison as never}});
 }catch(e){return db.manualPaymentReview.update({where:{id},data:{ocrStatus:'failed',ocrPayload:{error:e instanceof Error?e.message:'ocr_failed'} as never,comparisonStatus:'NEEDS_REVIEW'}})}
}

export async function listManualPaymentReviews(limit=200){
 const take=Math.min(Math.max(limit,1),500);
 const [rows,waiting]=await Promise.all([
  db.manualPaymentReview.findMany({orderBy:{createdAt:'desc'},take,include:{payment:{include:{conversation:{select:{id:true,waId:true,country:true,state:true}}}},reviewedBy:{select:{id:true,username:true,fullName:true}}}}),
  db.payment.findMany({where:{provider:{in:['manual_zelle','manual_us_bank']},status:'PENDING',manualReviews:{none:{}}},orderBy:{createdAt:'desc'},take,include:{conversation:{select:{id:true,waId:true,country:true,state:true}}}})
 ]);
 const reviewed=rows.map((r:any)=>{const {receiptBytes,...safe}=r;return{...safe,hasReceipt:true,payment:{...r.payment,amount:r.payment.amount.toString()},ocrAmount:r.ocrAmount?.toString()??null}});
 const noReceipt=waiting.map(p=>({id:`waiting-${p.id}`,paymentId:p.id,mediaId:null,mimeType:null,status:'PENDING',ocrStatus:'waiting_receipt',ocrConfidence:null,ocrAmount:null,ocrCurrency:null,ocrReference:null,ocrDate:null,ocrSender:null,ocrReceiver:null,ocrPayload:null,comparisonStatus:null,comparisonNotes:null,reviewerNotes:null,reviewedById:null,reviewedBy:null,reviewedAt:null,createdAt:p.createdAt,updatedAt:p.updatedAt,hasReceipt:false,payment:{...p,amount:p.amount.toString()}}));
 return [...reviewed,...noReceipt].sort((a:any,b:any)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,take);
}

export async function getManualPaymentReview(id:string){
 const r:any=await db.manualPaymentReview.findUnique({where:{id},include:{payment:{include:{conversation:true}},reviewedBy:{select:{id:true,username:true,fullName:true}}}});if(!r)return null;const {receiptBytes,...safe}=r;return{...safe,payment:{...r.payment,amount:r.payment.amount.toString()},ocrAmount:r.ocrAmount?.toString()??null};
}

async function notifyReviewDecision(paymentId:string,kind:'approved'|'rejected'|'needs_info',notes?:string){
 const p=await db.payment.findUnique({where:{id:paymentId},include:{conversation:true}});const c=p?.conversation;if(!p||!c)return;const lang=String(c.lockedLanguage||c.language||'fr').toLowerCase();const map:any={approved:{fr:'✅ Votre paiement manuel a été vérifié et confirmé. Votre dossier est maintenant dans la file d’émission.',en:'✅ Your manual payment was reviewed and confirmed. Your booking is now in the ticket issuance queue.',es:'✅ Su pago manual fue revisado y confirmado. Su reserva está ahora en la cola de emisión.',ht:'✅ Peman manyèl ou a verifye epi konfime. Dosye w la kounye a nan lis pou emisyon biyè.'},rejected:{fr:'❌ Le reçu de paiement n’a pas pu être validé. Un agent peut vous aider à vérifier ou à choisir une autre méthode.',en:'❌ The payment receipt could not be validated. An agent can help you verify it or choose another method.',es:'❌ No se pudo validar el recibo de pago. Un agente puede ayudarle a verificarlo o elegir otro método.',ht:'❌ Nou pa t kapab valide resi peman an. Yon ajan ka ede w verifye li oswa chwazi yon lòt metòd.'},needs_info:{fr:'ℹ️ Nous avons besoin d’une information supplémentaire pour vérifier votre paiement.',en:'ℹ️ We need additional information to verify your payment.',es:'ℹ️ Necesitamos información adicional para verificar su pago.',ht:'ℹ️ Nou bezwen yon lòt enfòmasyon pou verifye peman ou.'}};let text=map[kind][lang]||map[kind].fr;if(notes&&kind!=='approved')text+=`\n\n${notes}`;const delivery=await sendWhatsAppText(c.waId,text);await recordMessage({conversationId:c.id,direction:'OUTBOUND',senderType:'BOT',text,metadata:{event:'manual_payment_review',kind,delivery}}).catch(()=>null);}

export async function decideManualPaymentReview(id:string,action:'approve'|'reject'|'needs_info'|'reanalyze',user:SafeUser,notes?:string){
 const r=await db.manualPaymentReview.findUnique({where:{id},include:{payment:true}});if(!r)throw new Error('review_not_found');
 if(action==='reanalyze'){const x=await analyzeManualPaymentReview(id);await audit({userId:user.id,action:'manual_payment.reanalyze',entity:'ManualPaymentReview',entityId:id,metadata:{paymentReference:r.payment.reference}});return x;}
 if(['APPROVED','REJECTED'].includes(r.status))throw new Error('review_already_decided');
 if(r.payment.status==='PAID'&&action!=='approve')throw new Error('payment_already_paid');
 if(action==='approve'){
   const paid=await markPaid(r.payment.reference,r.payment.provider,{amount:Number(r.payment.amount),currency:r.payment.currency,manual_review_id:id,reviewed_by:user.id});if(!paid.ok)throw new Error(String(paid.reason||'mark_paid_failed'));
   const row=await db.manualPaymentReview.update({where:{id},data:{status:'APPROVED',reviewerNotes:notes||null,reviewedById:user.id,reviewedAt:new Date()}});
   await db.manualPaymentReview.updateMany({where:{paymentId:r.paymentId,id:{not:id},status:{in:['PENDING','NEEDS_INFO']}},data:{status:'SUPERSEDED'}});
   await audit({userId:user.id,action:'manual_payment.approve',entity:'Payment',entityId:r.paymentId,metadata:{reference:r.payment.reference,reviewId:id,amount:String(r.payment.amount),currency:r.payment.currency}});await notifyReviewDecision(r.paymentId,'approved');return row;
 }
 const status=action==='reject'?'REJECTED':'NEEDS_INFO';const row=await db.manualPaymentReview.update({where:{id},data:{status,reviewerNotes:notes||null,reviewedById:user.id,reviewedAt:new Date()}});
 if(action==='reject')await markFailed(r.payment.reference,{reason:'manual_receipt_rejected',reviewId:id,reviewedBy:user.id,notes:notes||null});
 await audit({userId:user.id,action:`manual_payment.${action}`,entity:'ManualPaymentReview',entityId:id,metadata:{paymentReference:r.payment.reference}});await notifyReviewDecision(r.paymentId,action==='reject'?'rejected':'needs_info',notes);return row;
}

export async function receiptBytes(id:string){const r=await db.manualPaymentReview.findUnique({where:{id},select:{mediaId:true,mimeType:true,receiptBytes:true}});if(!r)throw new Error('review_not_found');if(r.receiptBytes)return{bytes:Buffer.from(r.receiptBytes),mime:r.mimeType||'image/jpeg'};const media=await downloadWhatsAppMedia(r.mediaId);return{bytes:media.bytes,mime:media.mime||r.mimeType||'image/jpeg'};}
