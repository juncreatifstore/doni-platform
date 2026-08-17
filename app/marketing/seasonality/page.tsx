import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {hasRole} from '@/lib/auth/permissions';
import {MarketingSeasonality} from '@/components/workspace/MarketingSeasonality';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requirePageUser('AGENT');if(!hasRole(user.role,'ADMIN')&&user.department!=='MARKETING')redirect('/overview?forbidden=1');return <DoniShell title="Calendrier saisonnier" active="/marketing/seasonality" user={user}><MarketingSeasonality/></DoniShell>}
