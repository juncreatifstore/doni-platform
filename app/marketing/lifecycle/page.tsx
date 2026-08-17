import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {MarketingLifecycle} from '@/components/workspace/MarketingLifecycle';
import {requirePageUser} from '@/lib/auth/session';
import {hasRole} from '@/lib/auth/permissions';
import {getMarketingLifecycleWorkspace} from '@/services/workspace/marketing-lifecycle';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requirePageUser('AGENT');if(!hasRole(user.role,'ADMIN')&&user.department!=='MARKETING')redirect('/overview?forbidden=1');const workspace=await getMarketingLifecycleWorkspace();return <DoniShell title="Cycle client unifié" active="/marketing/lifecycle" user={user}><MarketingLifecycle workspace={workspace}/></DoniShell>}
