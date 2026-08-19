import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {getCasePortfolio} from '@/services/workspace/case-portfolio';
import {CasePortfolio} from '@/components/workspace/CasePortfolio';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requirePageUser('AGENT');const d=await getCasePortfolio(user);const canManage=user.role!=='AGENT';const rows=canManage?d.rows:d.rows.filter(r=>r.ownerId===user.id);return <DoniShell title="Mes dossiers" active="/cases" user={user}><section className="workspaceWelcome"><div><span className="workspaceKicker">Suivi & relances</span><h2>{canManage?'Portefeuille équipe':'Mon portefeuille'}</h2><p>Retrouvez les dossiers 360 dont une action est attendue, avec priorité, propriétaire et prochaine échéance.</p></div></section><CasePortfolio initialRows={rows} users={canManage?d.users:[]} currentUserId={user.id} canManage={canManage}/></DoniShell>}
