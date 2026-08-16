import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {hasRole} from '@/lib/auth/permissions';
import {MarketingTeam} from '@/components/workspace/MarketingTeam';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requirePageUser('AGENT');if(!hasRole(user.role,'ADMIN')&&user.department!=='MARKETING')redirect('/overview?forbidden=1');return <DoniShell title="Équipe Marketing" active="/marketing/team" user={user}><MarketingTeam canManage={hasRole(user.role,'ADMIN')}/></DoniShell>}
