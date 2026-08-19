import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireApiUser} from '@/lib/auth/session';
import {hashPassword} from '@/lib/auth/password';
import {audit} from '@/lib/audit';
import {getDepartmentsForUsers,isDepartment,setUserDepartment,type Department} from '@/lib/auth/departments';
import {ORG_ROLES,canManageOrgRole,getOrgRolesForUsers,isOrgRole,roleRequiresCountry,roleRequiresDepartment,securityRoleForOrgRole,setUserOrgRole,type OrgRole} from '@/lib/auth/org-roles';

function canAdminister(role:OrgRole){return role==='SUPER_ADMIN'||role==='COUNTRY_ADMIN'||role==='SECTION_MANAGER'}
function visibleTarget(actor:typeof ORG_ROLES[number],actorCountry:string|null,actorDepartment:Department|null,targetRole:OrgRole,targetCountry:string|null,targetDepartment:Department|null){
 if(actor==='SUPER_ADMIN')return true;
 if(actor==='COUNTRY_ADMIN')return Boolean(actorCountry&&targetCountry===actorCountry&&targetRole!=='SUPER_ADMIN'&&targetRole!=='PARTNER');
 if(actor==='SECTION_MANAGER')return Boolean(actorCountry&&targetCountry===actorCountry&&actorDepartment&&targetDepartment===actorDepartment&&targetRole==='AGENT');
 return false;
}

export async function GET(){
 const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
 if(!canAdminister(auth.user.orgRole))return NextResponse.json({success:false,error:'forbidden'},{status:403});
 const users=await db.portalUser.findMany({select:{id:true,username:true,fullName:true,email:true,role:true,country:true,active:true,lastLoginAt:true,createdAt:true},orderBy:{createdAt:'asc'}});
 const [departments,orgRoles]=await Promise.all([getDepartmentsForUsers(users.map(u=>u.id)),getOrgRolesForUsers(users)]);
 const mapped=users.map(u=>({...u,department:departments.get(u.id)||null,orgRole:orgRoles.get(u.id)!})).filter(u=>visibleTarget(auth.user.orgRole,auth.user.country,auth.user.department,u.orgRole,u.country,u.department)||u.id===auth.user.id);
 const availableRoles=ORG_ROLES.filter(role=>canManageOrgRole(auth.user.orgRole,role));
 return NextResponse.json({success:true,users:mapped,availableRoles,scope:{orgRole:auth.user.orgRole,country:auth.user.country,department:auth.user.department}});
}

export async function POST(req:Request){
 const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
 if(!canAdminister(auth.user.orgRole))return NextResponse.json({success:false,error:'forbidden'},{status:403});
 try{
  const b=await req.json();const orgRole=String(b.orgRole||b.role||'AGENT');
  if(!isOrgRole(orgRole)||!canManageOrgRole(auth.user.orgRole,orgRole))return NextResponse.json({success:false,error:'forbidden_role'},{status:403});
  const rawDepartment=b.department?String(b.department):null;if(rawDepartment&&!isDepartment(rawDepartment))return NextResponse.json({success:false,error:'invalid_department'},{status:400});
  let department:Department|null=rawDepartment&&isDepartment(rawDepartment)?rawDepartment:null;
  let country=b.country?String(b.country).trim().toUpperCase():null;
  if(auth.user.orgRole==='COUNTRY_ADMIN')country=auth.user.country;
  if(auth.user.orgRole==='SECTION_MANAGER'){country=auth.user.country;department=auth.user.department;}
  if(roleRequiresCountry(orgRole)&&!country)return NextResponse.json({success:false,error:'country_required'},{status:400});
  if(roleRequiresDepartment(orgRole)&&!department)return NextResponse.json({success:false,error:'department_required'},{status:400});
  if(orgRole==='SUPER_ADMIN'||orgRole==='PARTNER')department=null;
  if(orgRole==='SUPER_ADMIN')country=null;
  const username=String(b.username||'').trim().toLowerCase();if(!/^[a-z0-9._-]{3,40}$/.test(username))return NextResponse.json({success:false,error:'invalid_username'},{status:400});
  const password=String(b.password||'');if(password.length<10)return NextResponse.json({success:false,error:'password_too_short'},{status:400});
  const role=securityRoleForOrgRole(orgRole);
  const user=await db.portalUser.create({data:{username,passwordHash:hashPassword(password),fullName:b.fullName?String(b.fullName).trim():null,email:b.email?String(b.email).trim().toLowerCase():null,role,country}});
  await setUserOrgRole(user.id,orgRole,auth.user.id);if(department)await setUserDepartment(user.id,department,auth.user.id);
  await audit({userId:auth.user.id,action:'USER_CREATE',entity:'PortalUser',entityId:user.id,metadata:{username,orgRole,securityRole:role,country,department}});
  return NextResponse.json({success:true,id:user.id});
 }catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'create_failed'},{status:400})}
}
