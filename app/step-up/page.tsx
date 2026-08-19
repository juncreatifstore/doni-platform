import {redirect} from 'next/navigation';
import {requirePageUser} from '@/lib/auth/session';
import {StepUpGate} from '@/components/security/StepUpGate';

export const dynamic='force-dynamic';

function safeReturnTo(value:string|undefined){
 const v=String(value||'');
 if(v.startsWith('/api/settings/facebook/ads/connect'))return '/api/settings/facebook/ads/connect';
 if(v.startsWith('/api/settings/facebook/connect'))return '/api/settings/facebook/connect';
 return '';
}

export default async function StepUpPage({searchParams}:{searchParams:Promise<{returnTo?:string}>}){
 await requirePageUser('AGENT');
 const params=await searchParams;
 const returnTo=safeReturnTo(params.returnTo);
 if(!returnTo)redirect('/overview');
 return <StepUpGate returnTo={returnTo}/>;
}
