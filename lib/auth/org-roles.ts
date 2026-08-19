import type {UserRole} from '@prisma/client';
import {db} from '@/lib/db';

export const ORG_ROLES=['SUPER_ADMIN','COUNTRY_ADMIN','SECTION_MANAGER','AGENT','PARTNER'] as const;
export type OrgRole=(typeof ORG_ROLES)[number];

export const ORG_ROLE_LABELS:Record<OrgRole,string>={
 SUPER_ADMIN:'Super Admin · Direction',
 COUNTRY_ADMIN:'Admin pays',
 SECTION_MANAGER:'Responsable de section',
 AGENT:'Agent',
 PARTNER:'Partenaire',
};

export const ORG_ROLE_RANK:Record<OrgRole,number>={PARTNER:0,AGENT:1,SECTION_MANAGER:2,COUNTRY_ADMIN:3,SUPER_ADMIN:4};

export function isOrgRole(value:unknown):value is OrgRole{return typeof value==='string'&&(ORG_ROLES as readonly string[]).includes(value)}
export function defaultOrgRole(role:UserRole):OrgRole{return role==='SUPER_ADMIN'?'SUPER_ADMIN':role==='ADMIN'?'COUNTRY_ADMIN':'AGENT'}
export function securityRoleForOrgRole(role:OrgRole):UserRole{return role==='SUPER_ADMIN'?'SUPER_ADMIN':role==='COUNTRY_ADMIN'?'ADMIN':'AGENT'}
export function canManageOrgRole(actor:OrgRole,target:OrgRole){
 if(actor==='SUPER_ADMIN')return true;
 if(actor==='COUNTRY_ADMIN')return target==='SECTION_MANAGER'||target==='AGENT';
 if(actor==='SECTION_MANAGER')return target==='AGENT';
 return false;
}
export function roleRequiresCountry(role:OrgRole){return role==='COUNTRY_ADMIN'||role==='SECTION_MANAGER'||role==='AGENT'}
export function roleRequiresDepartment(role:OrgRole){return role==='SECTION_MANAGER'||role==='AGENT'}

function key(userId:string){return `user.orgRole.${userId}`}
export async function getUserOrgRole(userId:string,securityRole:UserRole):Promise<OrgRole>{const row=await db.appSetting.findUnique({where:{key:key(userId)}}).catch(()=>null);return isOrgRole(row?.value)?row!.value as OrgRole:defaultOrgRole(securityRole)}
export async function setUserOrgRole(userId:string,role:OrgRole,updatedBy?:string){await db.appSetting.upsert({where:{key:key(userId)},create:{key:key(userId),category:'Users',value:role,updatedBy},update:{value:role,updatedBy}})}
export async function getOrgRolesForUsers(users:Array<{id:string;role:UserRole}>){if(!users.length)return new Map<string,OrgRole>();const rows=await db.appSetting.findMany({where:{key:{in:users.map(u=>key(u.id))}}}).catch(()=>[]);const stored=new Map(rows.map(r=>[r.key.replace('user.orgRole.',''),r.value]));return new Map(users.map(u=>[u.id,isOrgRole(stored.get(u.id))?stored.get(u.id) as OrgRole:defaultOrgRole(u.role)]))}
