import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {MarketingAssets} from '@/components/workspace/MarketingAssets';
import {requirePageUser} from '@/lib/auth/session';
import {hasRole} from '@/lib/auth/permissions';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requirePageUser('AGENT');if(!hasRole(user.role,'ADMIN')&&user.department!=='MARKETING')redirect('/overview?forbidden=1');return <DoniShell title="Bibliothèque de marque" active="/marketing/assets" user={user}><section className="mkAssetsHero"><div><span className="workspaceKicker">Brand & ressources</span><h2>Assets approuvés et réutilisables</h2><p>Centraliser les logos, modèles, offres, visuels, vidéos, témoignages et documents utilisés par l’équipe Marketing.</p></div></section><MarketingAssets/></DoniShell>}
