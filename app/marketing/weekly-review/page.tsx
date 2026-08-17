import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {hasRole} from '@/lib/auth/permissions';
import {MarketingWeeklyReviews} from '@/components/workspace/MarketingWeeklyReviews';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requirePageUser('AGENT');if(!hasRole(user.role,'ADMIN')&&user.department!=='MARKETING')redirect('/overview?forbidden=1');return <DoniShell title="Revue hebdomadaire Marketing" active="/marketing/weekly-review" user={user}><MarketingWeeklyReviews/></DoniShell>}
