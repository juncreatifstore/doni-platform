import {db} from '@/lib/db';

const CATEGORY='DONI Marketing Winning Learnings';
const PREFIX='marketing.winning-learning.';

export type WinningLearning={id:string;experimentId:string;winner:'A'|'B';campaignId:string;campaignTitle:string;metric:string;controlCampaignId:string;variantCampaignId:string|null;resultNote:string|null;statsA:any;statsB:any;promotedAt:string;promotedBy:string;status:'APPROVED_LEARNING';autoApply:false};
function parse(v:unknown):WinningLearning|null{if(!v||typeof v!=='object')return null;const x=v as WinningLearning;return x.id&&x.experimentId&&x.status==='APPROVED_LEARNING'?x:null;}
export async function saveWinningLearning(value:WinningLearning){await db.appSetting.upsert({where:{key:`${PREFIX}${value.id}`},create:{key:`${PREFIX}${value.id}`,category:CATEGORY,value:value as any},update:{category:CATEGORY,value:value as any}});return value;}
export async function listWinningLearnings(limit=100){const rows=await db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}},orderBy:{createdAt:'desc'},take:limit});return rows.map(x=>parse(x.value)).filter((x):x is WinningLearning=>Boolean(x));}
export async function findWinningLearningByExperiment(experimentId:string){const rows=await db.appSetting.findMany({where:{category:CATEGORY,key:{startsWith:PREFIX}},select:{value:true}});return rows.map(x=>parse(x.value)).find(x=>x?.experimentId===experimentId)||null;}
