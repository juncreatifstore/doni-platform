import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireApiUser} from '@/lib/auth/session';
import {requireRecentStepUp} from '@/lib/auth/session-security';
import {hashPassword} from '@/lib/auth/password';
import {audit} from '@/lib/audit';
import {getUserDepartment,isDepartment,setUserDepartment,type Department} from '@/lib/auth/departments';
import {canManageOrgRole,getUserOrgRole,isOrgRole,roleRequiresCountry,roleRequiresDepartment,securityRoleForOrgRole,setUserOrgRole,type OrgRole} from '@/lib/auth/org-roles';

function canAdminister(role:OrgRole){return role==='SUPER_ADMIN'||role==='COUNTRY_ADMIN'||role==='SECTION_MANAGER'}
function canReach(actor:OrgRole,actorCountry:string|null,actorDepartment:Department|null,target:OrgRole,targetCountry:string|null,targetDepartment:Department|null){
 if(actor==='SUPER_ADMIN')return true;
 if(actor==='COUNTRY_ADMIN')return Boolean(actorCountry&&targetCountry===actorCountry&&target!=='SUPER_ADMIN'&&target!=='PARTNER');
 if(actor==='SECTION_MANAGER')return Boolean(actorCountry&&targetCountry===actorCountry&&actorDepartment&&targetDepartment===actorDepartment&&target==='AGENT');
 return false;
}

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiUser('AGENT');if(!auth.ok)return NextResponse.json({success:false,error:auth.error},{status:auth.status});
 if(!canAdminister(auth.user.orgRole))return NextResponse.json({success:false,error:'forbidden'},{status:403});
 const step=await requireRecentStepUp();if(!step.ok)return NextResponse.json({success:false,error:step.error,windowSeconds:step.windowSeconds},{status:step.status});
 const {id}=await params;const target=await db.portalUser.findUnique({where:{id}});if(!target)return NextResponse.json({success:false,error:'not_found'},{status:404});
 const [targetOrgRole,targetDepartment]=await Promise.all([getUserOrgRole(target.id,target.role),getUserDepartment(target.id)]);
 if(id!==auth.user.id&&!canReach(auth.user.orgRole,auth.user.country,auth.user.department,targetOrgRole,target.country,targetDepartment))return NextResponse.json({success:false,error:'forbidden_target'},{status:403});
 try{
  const b=await req.json();const data:Record<string,unknown>={};
  if(typeof b.fullName==='string')data.fullName=b.fullName||null;if(typeof b.email==='string')data.email=b.email.trim().toLowerCase()||null;if(typeof b.active==='boolean'&&id!==auth.user.id)data.active=b.active;
  let nextOrgRole=targetOrgRole;if(typeof b.orgRole==='string'){if(!isOrgRole(b.orgRole)||!canManageOrgRole(auth.user.orgRole,b.orgRole))return NextResponse.json({success:false,error:'forbidden_role'},{status:403});nextOrgRole=b.orgRole;data.role=securityRoleForOrgRole(nextOrgRole)}
  let nextCountry=target.country;let nextDepartment=targetDepartment;
  if(typeof b.country==='string')nextCountry=b.country.trim().toUpperCase()||null;
  if('department' in b){const raw=b.department?String(b.department):null;if(raw&&!isDepartment(raw))return NextResponse.json({success:false,error:'invalid_department'},{status:400});nextDepartment=raw&&isDepartment(raw)?raw:null}
  if(auth.user.orgRole==='COUNTRY_ADMIN')nextCountry=auth.user.country;
  if(auth.user.orgRole==='SECTION_MANAGER'){nextCountry=auth.user.country;nextDepartment=auth.user.department}
  if(roleRequiresCountry(nextOrgRole)&&!nextCountry)return NextResponse.json({success:false,error:'country_required'},{status:400});
  if(roleRequiresDepartment(nextOrgRole)&&!nextDepartment)return NextResponse.json({success:false,error:'department_required'},{status:400});
  if(nextOrgRole==='SUPER_ADMIN'||nextOrgRole==='PARTNER')nextDepartment=null;if(nextOrgRole==='SUPER_ADMIN')nextCountry=null;
  data.country=nextCountry;
  if(typeof b.password==='string'&&b.password){if(b.password.length<10)return NextResponse.json({success:false,error:'password_too_short'},{status:400});data.passwordHash=hashPassword(b.password)}
  const updated=await db.portalUser.update({where:{id},data});
  if(typeof b.orgRole==='string')await setUserOrgRole(id,nextOrgRole,auth.user.id);if('department' in b||nextDepartment!==targetDepartment)await setUserDepartment(id,nextDepartment,auth.user.id);
  if(data.active===false)await db.portalSession.deleteMany({where:{userId:id}});
  await audit({userId:auth.user.id,action:'USER_UPDATE',entity:'PortalUser',entityId:id,metadata:{fields:[...Object.keys(data),...('department' in b?['department']:[]),...(typeof b.orgRole==='string'?['orgRole']:[])]}});
  return NextResponse.json({success:true,user:{id:updated.id,username:updated.username,role:updated.role,orgRole:nextOrgRole,country:updated.country,department:nextDepartment,active:updated.active}})
 }catch(e){return NextResponse.json({success:false,error:e instanceof Error?e.message:'update_failed'},{status:400})}
}
