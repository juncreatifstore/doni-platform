import { createHmac, timingSafeEqual } from 'node:crypto';
function secret(){const s=process.env.TICKET_LINK_SECRET||process.env.AUTH_SECRET;if(!s)throw new Error('ticket_link_secret_missing');return s;}
export function signTicketLink(reference:string,expiresAt:number){return createHmac('sha256',secret()).update(`${reference}.${expiresAt}`).digest('hex');}
export function verifyTicketLink(reference:string,expiresAtRaw:string|null,sig:string|null){if(!expiresAtRaw||!sig)return false;const exp=Number(expiresAtRaw);if(!Number.isFinite(exp)||Date.now()>exp)return false;try{const expected=Buffer.from(signTicketLink(reference,exp),'hex');const actual=Buffer.from(sig,'hex');return expected.length===actual.length&&timingSafeEqual(expected,actual);}catch{return false;}}
