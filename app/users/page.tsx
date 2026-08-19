import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {UserAdmin} from '@/components/UserAdmin';
import {requirePageUser} from '@/lib/auth/session';
export default async function Page(){const user=await requirePageUser('AGENT');if(!['SUPER_ADMIN','COUNTRY_ADMIN','SECTION_MANAGER'].includes(user.orgRole))redirect('/portal/sections/home?forbidden=1');return <DoniShell title="Utilisateurs" active="/users" user={user}><UserAdmin/></DoniShell>}
