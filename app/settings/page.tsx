import {DoniShell} from '@/components/DoniShell';
import {SettingsCenter} from '@/components/settings/SettingsCenter';
import {requirePageUser} from '@/lib/auth/session';
export default async function Page(){const user=await requirePageUser('ADMIN');return <DoniShell title="Settings & Integrations" active="/settings" user={user!}><div className="card settingsIntro"><h2>Centre de configuration DONI</h2><p>Les paramètres peuvent être surchargés dans PostgreSQL. Les secrets enregistrés ici sont chiffrés AES-256-GCM et ne sont jamais renvoyés à l’interface. Les variables Vercel restent disponibles comme fallback.</p>{user!.role!=='SUPER_ADMIN'&&<p className="muted">Seul SUPER_ADMIN peut modifier ou tester les secrets d’intégration.</p>}</div><SettingsCenter/></DoniShell>}
