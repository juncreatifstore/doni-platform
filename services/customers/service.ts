import {db} from '@/lib/db';

export function normalizeCustomerPhone(input:string){return input.replace(/\D/g,'');}
export function inferCountryFromPhone(input:string){const n=normalizeCustomerPhone(input);if(n.startsWith('509'))return'HT';if(n.startsWith('52'))return'MX';if(n.startsWith('63'))return'PH';if(/^1(809|829|849)/.test(n))return'DO';if(n.startsWith('1'))return'US';return null;}
export async function ensureCustomerProfile(input:{waId:string;conversationId?:string;displayName?:string|null;language?:string|null;email?:string|null;country?:string|null}){
 const phone=normalizeCustomerPhone(input.waId);if(!phone)throw new Error('customer_phone_required');
 const country=input.country||inferCountryFromPhone(phone);
 const existing=await (db as any).customerProfile.findUnique({where:{phone}}).catch(()=>null);
 const data:any={lastSeenAt:new Date()};
 if(input.displayName?.trim())data.displayName=input.displayName.trim();
 if(input.language)data.preferredLanguage=input.language;
 if(input.email?.trim())data.email=input.email.trim().toLowerCase();
 if(country)data.country=country;
 const customer=existing?await (db as any).customerProfile.update({where:{id:existing.id},data}):await (db as any).customerProfile.create({data:{phone,customerCode:`CUS-${phone.slice(-8)}-${Date.now().toString(36).toUpperCase()}`,firstSeenAt:new Date(),...data}});
 if(input.conversationId)await db.doniConversation.update({where:{id:input.conversationId},data:{customerId:customer.id,country:country||undefined}}).catch(()=>null);
 return customer;
}
export async function listCustomerTickets(waId:string,limit=8){const phone=normalizeCustomerPhone(waId);return db.ticket.findMany({where:{conversation:{waId:phone}},orderBy:{createdAt:'desc'},take:limit,include:{conversation:true}}).catch(()=>[] as any[]);}
export async function listCustomerTrackedFlights(waId:string,limit=8){const phone=normalizeCustomerPhone(waId);return (db as any).flightTracking.findMany({where:{clientPhone:phone,active:true},orderBy:{scheduledDeparture:'asc'},take:limit}).catch(()=>[] as any[]);}
export async function customerIdentitySummary(waId:string){const phone=normalizeCustomerPhone(waId);const [profile,tickets,flights]=await Promise.all([(db as any).customerProfile.findUnique({where:{phone}}).catch(()=>null),listCustomerTickets(phone),listCustomerTrackedFlights(phone)]);return {profile,tickets,flights};}
