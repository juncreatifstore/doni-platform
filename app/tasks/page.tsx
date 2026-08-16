import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {TaskBoard} from '@/components/workspace/TaskBoard';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requirePageUser('AGENT');return <DoniShell title="Tâches" active="/tasks" user={user}><section className="workspaceWelcome"><div><span className="workspaceKicker">Collaboration interne</span><h2>Mes tâches & assignations</h2><p>Répartissez les dossiers, définissez les priorités et suivez l’avancement sans travailler deux fois sur la même demande.</p></div></section><TaskBoard/></DoniShell>}
