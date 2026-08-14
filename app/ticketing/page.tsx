import { DoniShell } from '@/components/DoniShell';
import { TicketingQueue } from '@/components/TicketingQueue';
import { requirePageUser } from '@/lib/auth/session';
export default async function Page(){const user=await requirePageUser('AGENT');return <DoniShell title="Ticketing" active="/ticketing" user={user}><TicketingQueue/></DoniShell>}
