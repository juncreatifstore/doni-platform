import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {NotificationCenter} from '@/components/workspace/NotificationCenter';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requirePageUser('AGENT');return <DoniShell title="Notifications" active="/notifications" user={user}><NotificationCenter/></DoniShell>}
