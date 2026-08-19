import {DoniShell} from '@/components/DoniShell';
import {SecuritySettings} from '@/components/SecuritySettings';
import {requirePageUser} from '@/lib/auth/session';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requirePageUser('AGENT');return <DoniShell title="Sécurité du compte" active="" user={user}><section className="workspaceWelcome"><div><span className="workspaceKicker">Protection du compte</span><h2>Connexion & authentification</h2><p>Configure les facteurs de sécurité utilisés pour accéder à DONI et protéger les opérations sensibles.</p></div></section><SecuritySettings/></DoniShell>}
