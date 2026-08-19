import type {SafeUser} from '@/lib/auth/session';
import type {Department} from '@/lib/auth/departments';
import {db} from '@/lib/db';

export type DataScope={mode:'global'|'country'|'none';country?:string};

export function dataScopeForUser(user:Pick<SafeUser,'orgRole'|'country'>):DataScope{
 if(user.orgRole==='SUPER_ADMIN')return{mode:'global'};
 if(user.orgRole==='PARTNER')return{mode:'none'};
 const country=String(user.country||'').trim();
 return country?{mode:'country',country}:{mode:'none'};
}

export function canAccessDepartments(user:Pick<SafeUser,'orgRole'|'department'>,allowed:readonly Department[]){
 if(user.orgRole==='SUPER_ADMIN'||user.orgRole==='COUNTRY_ADMIN')return true;
 if(user.orgRole==='PARTNER')return false;
 return Boolean(user.department&&allowed.includes(user.department));
}

export function countryWhere(scope:DataScope,field='country'){
 if(scope.mode==='global')return{};
 if(scope.mode==='none')return{[field]:'__DONI_NO_ACCESS__'};
 return{[field]:scope.country};
}

export function conversationCountryWhere(scope:DataScope){
 if(scope.mode==='global')return{};
 if(scope.mode==='none')return{conversation:{country:'__DONI_NO_ACCESS__'}};
 return{conversation:{country:scope.country}};
}

export async function allowedTicketReferences(scope:DataScope){
 if(scope.mode==='none')return [] as string[];
 if(scope.mode==='global')return null;
 const rows=await db.ticket.findMany({where:{conversation:{country:scope.country}},select:{reference:true}});
 return rows.map(r=>r.reference);
}

export async function ticketReferenceAllowed(scope:DataScope,reference:string|null|undefined){
 if(scope.mode==='global')return true;
 if(scope.mode==='none'||!reference)return false;
 const count=await db.ticket.count({where:{reference,conversation:{country:scope.country}}});
 return count>0;
}
