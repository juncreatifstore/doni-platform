import { db as prisma } from '@/lib/db';
import { buildEticketPdf } from '@/services/ticketing/pdf';
import { getCurrentUser } from '@/lib/auth/session';
import { verifyTicketLink } from '@/lib/ticket-link';
export async function GET(req:Request,{params}:{params:Promise<{reference:string}>}){const {reference}=await params;const u=new URL(req.url);const user=await getCurrentUser();if(!user&&!verifyTicketLink(reference,u.searchParams.get('exp'),u.searchParams.get('sig')))return new Response('Unauthorized',{status:401});const t=await prisma.ticket.findUnique({where:{reference}});if(!t||t.status!=='ISSUED')return new Response('Not found',{status:404});const pdf=await buildEticketPdf(t);return new Response(pdf,{headers:{'content-type':'application/pdf','content-disposition':`inline; filename="eticket-${reference}.pdf"`,'cache-control':'private, no-store'}});}
