import {dispatchInbound} from '../../../../services/conversation/router';
export const runtime='nodejs';
export async function POST(req:Request){
 if(process.env.DONI_DEV_SIMULATOR!=='true') return Response.json({error:'not_enabled'},{status:404});
 const body=await req.json().catch(()=>({})); const waId=String(body?.waId??'').trim(); const raw=body?.raw??{source:'dev-simulator'}; const text=String(body?.text??(raw?.image?.id?'[image]':'')).trim();
 if(!waId||!text)return Response.json({error:'waId_and_text_required'},{status:400});
 const result=await dispatchInbound(waId,text,raw); return Response.json(result);
}
