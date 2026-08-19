import {redirect} from 'next/navigation';
import {DoniShell} from '@/components/DoniShell';
import {requirePageUser} from '@/lib/auth/session';
import {db} from '@/lib/db';
import {canAccessDepartments,countryWhere,dataScopeForUser} from '@/lib/auth/data-scope';

const ALLOWED=['RESERVATIONS','CUSTOMER_SERVICE','MARKETING','OPERATIONS','MANAGEMENT'] as const;

export default async function Page(){
 const user=await requirePageUser('AGENT');
 if(!canAccessDepartments(user,ALLOWED))redirect('/overview?forbidden=1');
 const scope=dataScopeForUser(user);
 if(scope.mode==='none')redirect('/overview?forbidden=1');
 const rows=await (db as any).customerProfile.findMany({where:countryWhere(scope),orderBy:{lastSeenAt:'desc'},take:100,include:{_count:{select:{conversations:true}}}}).catch(()=>[]);
 const scopeLabel=scope.mode==='global'?'Tous les pays':scope.country;
 return <DoniShell title="Clients" active="/customers" user={user}><div className="panel"><h2>Identité client persistante</h2><p className="muted">Un profil par numéro WhatsApp, conservé même lorsque les sessions conversationnelles expirent. Périmètre visible : <strong>{scopeLabel}</strong>.</p><div className="tableWrap"><table className="table"><thead><tr><th>Client</th><th>Téléphone</th><th>Pays</th><th>Langue</th><th>Email</th><th>Conversations</th><th>Dernière activité</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}><td><strong>{r.displayName||r.customerCode}</strong><br/><small>{r.customerCode}</small></td><td>{r.phone}</td><td>{r.country||'—'}</td><td>{r.preferredLanguage||'—'}</td><td>{r.email||'—'}</td><td>{r._count?.conversations||0}</td><td>{new Date(r.lastSeenAt).toLocaleString('fr-FR')}</td></tr>)}</tbody></table>{!rows.length?<div className="emptyState">Aucun client dans ce périmètre.</div>:null}</div></div></DoniShell>
}
