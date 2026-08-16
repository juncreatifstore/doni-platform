import {db} from '@/lib/db';

export const DEPARTMENTS=['RESERVATIONS','CUSTOMER_SERVICE','TICKETING','FLIGHT_OPS','FINANCE','MARKETING','OPERATIONS','MANAGEMENT'] as const;
export type Department=(typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS:Record<Department,string>={
 RESERVATIONS:'Réservations',
 CUSTOMER_SERVICE:'Service client',
 TICKETING:'Ticketing',
 FLIGHT_OPS:'Flight Ops',
 FINANCE:'Finance',
 MARKETING:'Marketing',
 OPERATIONS:'Opérations',
 MANAGEMENT:'Direction',
};

export function isDepartment(value:unknown):value is Department{return typeof value==='string'&&(DEPARTMENTS as readonly string[]).includes(value);}
export function departmentLabel(value:string|null|undefined){return value&&isDepartment(value)?DEPARTMENT_LABELS[value]:'Équipe générale';}

function key(userId:string){return `user.department.${userId}`;}
export async function getUserDepartment(userId:string):Promise<Department|null>{
 const row=await db.appSetting.findUnique({where:{key:key(userId)}}).catch(()=>null);
 const value=row?.value;
 return isDepartment(value)?value:null;
}
export async function setUserDepartment(userId:string,department:Department|null,updatedBy?:string){
 const settingKey=key(userId);
 if(!department){await db.appSetting.deleteMany({where:{key:settingKey}}).catch(()=>{});return;}
 await db.appSetting.upsert({where:{key:settingKey},create:{key:settingKey,category:'Users',value:department,updatedBy},update:{value:department,updatedBy}});
}
export async function getDepartmentsForUsers(userIds:string[]){
 if(!userIds.length)return new Map<string,Department>();
 const rows=await db.appSetting.findMany({where:{key:{in:userIds.map(key)}}}).catch(()=>[]);
 const out=new Map<string,Department>();
 for(const row of rows){const id=row.key.replace('user.department.','');if(isDepartment(row.value))out.set(id,row.value);}
 return out;
}
