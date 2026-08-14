import {getSetting} from '@/lib/settings/service';
export const AUTO_TTL=15,MANUAL_TTL=30;
export async function ttlMinutes(manual:boolean){const key=manual?'payments.manual_ttl_minutes':'payments.auto_ttl_minutes';const n=Number(await getSetting<number>(key));return Number.isFinite(n)&&n>0?n:(manual?MANUAL_TTL:AUTO_TTL)}
export async function expiryDate(manual:boolean){return new Date(Date.now()+(await ttlMinutes(manual))*60000)}
