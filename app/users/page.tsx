import { DoniShell } from '@/components/DoniShell';
import { UserAdmin } from '@/components/UserAdmin';
import { requirePageUser } from '@/lib/auth/session';
export default async function Page(){const user=await requirePageUser('ADMIN');return <DoniShell title="Utilisateurs" active="/users" user={user}><UserAdmin/></DoniShell>}
