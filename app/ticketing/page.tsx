import {redirect} from 'next/navigation';
import { DoniShell } from '@/components/DoniShell';
import { TicketingQueue } from '@/components/TicketingQueue';
import { requirePageUser } from '@/lib/auth/session';
import {TaskBoard} from '@/components/workspace/TaskBoard';
import {WorkCenterHeader} from '@/components/workspace/WorkQueue';
import {canAccessDepartments} from '@/lib/auth/data-scope';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requirePageUser('AGENT');if(!canAccessDepartments(user,['TICKETING','OPERATIONS','MANAGEMENT']))redirect('/overview?forbidden=1');return <DoniShell title="Ticketing" active="/ticketing" user={user}><WorkCenterHeader kicker="Ticketing & émission" title="Centre Ticketing" description="Émettre, livrer et répartir les dossiers entre agents sans doublon de traitement." actions={[{label:'Mes tâches',href:'/tasks'},{label:'Réservations',href:'/reservations'}]}/><TaskBoard department="TICKETING"/><h2 className="sectionTitle">File d’émission & livraison</h2><TicketingQueue/></DoniShell>}
