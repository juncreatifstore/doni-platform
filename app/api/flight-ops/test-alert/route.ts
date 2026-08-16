import {NextResponse} from 'next/server';
import {requireApiUser} from '@/lib/auth/session';
import {getSetting} from '@/lib/settings/service';
import {db} from '@/lib/db';
import {audit} from '@/lib/audit';
import {sendWhatsAppText} from '@/services/whatsapp/send';
import {classifyFlightDisruption,disruptionMessage,type FlightDisruptionType} from '@/services/operations/incidents';

type Scenario='delay'|'cancelled'|'diverted'|'checkin_open';

function checkinMessage(t:any){
  const id=`${t.airlineCode}${t.flightNumber}`,route=`${t.origin} → ${t.destination}`,lang=String(t.clientLanguage||'fr').toLowerCase();
  const m:any={
    fr:`✅ TEST DONI — Check-in : la fenêtre d’enregistrement de ${id} (${route}) peut être ouverte selon les règles de la compagnie. Vérifiez le site officiel de la compagnie.`,
    en:`✅ DONI TEST — Check-in for ${id} (${route}) may now be open under the airline rules. Check the airline official site.`,
    es:`✅ PRUEBA DONI — El check-in de ${id} (${route}) puede estar abierto según las reglas de la aerolínea. Verifica el sitio oficial.`,
    ht:`✅ TÈS DONI — Check-in pou ${id} (${route}) ka deja ouvri selon règ konpayi an. Verifye sit ofisyèl la.`
  };
  return m[lang]||m.fr;
}

function testMessage(t:any,scenario:Scenario){
  if(scenario==='checkin_open')return checkinMessage(t);
  const type=scenario as FlightDisruptionType;
  const base=disruptionMessage(t,type,type==='delay'?45:0);
  return `🧪 TEST DONI — PHASE 37\n${base}`;
}

export async function POST(req:Request){
  const auth=await requireApiUser('SUPER_ADMIN');
  if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
  if(!(await getSetting<boolean>('tracking.test_alert_enabled')))return NextResponse.json({success:false,error:'tracking_test_alert_disabled'},{status:403});
  if(!(await getSetting<boolean>('whatsapp.enabled')))return NextResponse.json({success:false,error:'whatsapp_disabled'},{status:403});
  try{
    const body=await req.json();
    const reference=String(body?.reference||'').trim().toUpperCase();
    const scenario=String(body?.scenario||'delay') as Scenario;
    if(!reference)return NextResponse.json({success:false,error:'reference_required'},{status:400});
    if(!['delay','cancelled','diverted','checkin_open'].includes(scenario))return NextResponse.json({success:false,error:'invalid_scenario'},{status:400});
    const tracking:any=await (db as any).flightTracking.findFirst({where:{ticketReference:reference,active:true},orderBy:{scheduledDeparture:'asc'}});
    if(!tracking)return NextResponse.json({success:false,error:'tracking_not_found'},{status:404});
    if(!tracking.clientPhone)return NextResponse.json({success:false,error:'tracking_phone_missing'},{status:400});
    const classifications={
      scheduled:classifyFlightDisruption('scheduled',0),
      delay29:classifyFlightDisruption('scheduled',29),
      delay30:classifyFlightDisruption('scheduled',30),
      delayed:classifyFlightDisruption('delayed',5),
      cancelled:classifyFlightDisruption('cancelled',0),
      diverted:classifyFlightDisruption('diverted',0)
    };
    const message=testMessage(tracking,scenario);
    const sent:any=await sendWhatsAppText(tracking.clientPhone,message);
    if(!sent?.sent||sent?.dryRun)throw new Error('test_alert_not_sent');
    await audit({userId:auth.user.id,action:'FLIGHT_ALERT_TEST',entity:'FlightTracking',entityId:tracking.id,metadata:{reference,scenario,flight:`${tracking.airlineCode}${tracking.flightNumber}`}});
    return NextResponse.json({success:true,scenario,reference,flight:`${tracking.airlineCode}${tracking.flightNumber}`,route:`${tracking.origin}-${tracking.destination}`,classifications,sent:true,mutatedFlightState:false});
  }catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'test_alert_failed'},{status:400});}
}
