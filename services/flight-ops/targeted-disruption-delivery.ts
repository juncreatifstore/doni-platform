import {db} from '@/lib/db';
import {getSetting} from '@/lib/settings/service';
import {sendWhatsAppText} from '@/services/whatsapp/send';
import {disruptionAlertState} from '@/services/operations/incidents';

export async function deliverDisruptionsForTicket(reference:string){
  const ref=String(reference||'').trim().toUpperCase();
  if(!ref)throw new Error('reference_required');
  const [testDelivery,alertsEnabled,autoSendEnabled,whatsappEnabled,standardEnabled]=await Promise.all([
    getSetting<boolean>('tracking.test_delivery_enabled'),
    getSetting<boolean>('tracking.alerts_enabled'),
    getSetting<boolean>('tracking.auto_send_enabled'),
    getSetting<boolean>('whatsapp.enabled'),
    getSetting<boolean>('tracking.standard_alerts_enabled')
  ]);
  if(!testDelivery)throw new Error('tracking_test_delivery_disabled');
  if(!alertsEnabled||!autoSendEnabled||!whatsappEnabled)throw new Error('automatic_delivery_gates_disabled');
  if(standardEnabled)throw new Error('standard_alerts_must_remain_disabled');
  const now=new Date();
  const rows:any[]=await (db as any).flightAlert.findMany({
    where:{status:'pending',scheduledAt:{lte:now},alertType:{startsWith:'disruption:'},tracking:{ticketReference:ref}},
    include:{tracking:true},orderBy:{scheduledAt:'asc'},take:20
  }).catch(()=>[]);
  let sent=0,failed=0;
  const results:any[]=[];
  for(const a of rows){
    try{
      if(!a.recipient)throw new Error('missing_recipient');
      const s:any=await sendWhatsAppText(a.recipient,a.message);
      if(s.dryRun)throw new Error('whatsapp_disabled');
      await (db as any).flightAlert.update({where:{id:a.id},data:{status:'sent',sentAt:new Date(),error:null}});
      sent++;results.push({id:a.id,alertType:a.alertType,status:'sent'});
    }catch(e){
      const error=e instanceof Error?e.message:'send_failed';
      await (db as any).flightAlert.update({where:{id:a.id},data:{status:'failed',error}}).catch(()=>null);
      failed++;results.push({id:a.id,alertType:a.alertType,status:'failed',error});
    }
  }
  const remaining=await (db as any).flightAlert.count({where:{status:'pending',alertType:{startsWith:'disruption:'},tracking:{ticketReference:ref}}}).catch(()=>0);
  return {reference:ref,eligible:rows.length,sent,failed,remaining,standardAlertsTouched:0,dedupe:{sent:disruptionAlertState('sent'),pending:disruptionAlertState('pending'),failed:disruptionAlertState('failed')}};
}
