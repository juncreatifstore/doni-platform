import type { Prisma } from '@prisma/client';
import { db } from '../../lib/db';
import type { ConversationSession } from '../conversation/types';
import type { FlightOffer } from '../flights/types';
import type { PaymentOption } from './types';
import { createProviderIntent } from './providers';
import { expiryDate, ttlMinutes } from './expiry';
import { convertCurrency } from './fx';
import { getSetting } from '@/lib/settings/service';

function makeReference() {
  return `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createPayment(s: ConversationSession, o: PaymentOption) {
  const offer = s.state.selected_offer as FlightOffer | undefined;
  if (!offer) return { ok: false, error: 'missing_selected_offer' };

  if (o.manual && !(await getSetting<boolean>('payments.manual_create_enabled'))) {
    return { ok: false, error: 'manual_payments_create_disabled' };
  }

  const rawAmount = Number(s.state.payment_amount ?? offer.price_total);
  const sourceCurrency = String(s.state.payment_amount ? o.currency : offer.currency).toUpperCase();
  const fx = await convertCurrency(rawAmount, sourceCurrency, o.currency);
  if (!fx) return { ok: false, error: `currency_conversion_unavailable:${sourceCurrency}->${o.currency}` };

  const amount = fx.amount;
  const ref = makeReference();
  const exp = await expiryDate(o.manual);
  const ttl = await ttlMinutes(o.manual);

  const basePayload = asJson({
    method: o.method,
    manual: o.manual,
    ttl_minutes: ttl,
    fx,
  });

  const payment = await db.payment.create({
    data: {
      reference: ref,
      conversationId: s.id,
      provider: o.provider,
      currency: o.currency,
      amount,
      status: o.manual ? 'PENDING' : 'CREATED',
      expiresAt: exp,
      providerPayload: basePayload,
    },
  });

  if (o.manual) return { ok: true, payment, manual: true, reference: ref, expiresAt: exp };

  const r = await createProviderIntent(o.provider, {
    reference: ref,
    amount,
    currency: o.currency,
    conversationId: s.id,
    description: `DONI flight ${ref}`,
  });

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: r.success ? 'PENDING' : 'FAILED',
      providerPayload: asJson({
        method: o.method,
        manual: false,
        ttl_minutes: ttl,
        fx,
        provider_intent_id: r.providerIntentId ?? null,
        checkout_url: r.checkoutUrl ?? null,
        error: r.error ?? null,
      }),
    },
  });

  return {
    ok: r.success,
    payment: { ...payment, status: r.success ? 'PENDING' : 'FAILED' },
    manual: false,
    reference: ref,
    expiresAt: exp,
    checkoutUrl: r.checkoutUrl,
    error: r.error,
  };
}

export async function markFailed(reference: string, details: any) {
  const p = await db.payment.update({ where: { reference }, data: { status: 'FAILED' } });
  await db.paymentEvent
    .create({
      data: {
        paymentId: p.id,
        provider: p.provider,
        providerEventId: `local-${Date.now()}-${Math.random()}`,
        eventType: 'PAYMENT_FAILED',
        reference,
        payload: asJson(details ?? {}),
      },
    })
    .catch(() => null);
  return { ok: true, payment: p };
}

export async function markPaid(reference: string, provider: string, details: any) {
  const p = await db.payment.findUnique({ where: { reference }, include: { conversation: true } });
  if (!p) return { ok: false, reason: 'payment_not_found' };
  if (p.status === 'PAID') return { ok: true, alreadyPaid: true, payment: p };
  if (p.expiresAt && p.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'payment_expired' };

  const expected = Number(p.amount);
  const got = Number(details?.amount);
  const currency = String(details?.currency || '').toUpperCase();
  if (Number.isFinite(got) && Math.abs(got-expected)>0.02) return { ok: false, reason: 'amount_mismatch' };
  if (currency && currency !== p.currency.toUpperCase()) return { ok: false, reason: 'currency_mismatch' };

  const paid = await db.payment.update({ where: { id: p.id }, data: { status: 'PAID' } });

  if (p.conversation) {
    const state: any = (p.conversation.state as any) || {};
    const ticketPayload = asJson({
      passengers: (state.travelers ?? []).map((x: any) => ({
        firstName: x.firstName ?? x.first_name ?? '',
        lastName: x.lastName ?? x.last_name ?? '',
        type: x.type ?? x.passenger_type ?? '',
        documentNumber: x.documentNumber ?? x.passport_number ?? x.document_number ?? '',
        nationality: x.nationality ?? '',
      })),
      segments: (state.selected_offer?.segments ?? []).map((x: any) => ({
        airline: x.airline ?? x.airline_code ?? '',
        airlineName: x.airlineName ?? x.airline_name ?? '',
        flightNumber: x.flightNumber ?? x.flight_number ?? '',
        origin: x.origin ?? '',
        destination: x.destination ?? '',
        departureAt: x.departureAt ?? x.departure_at ?? '',
        arrivalAt: x.arrivalAt ?? x.arrival_at ?? '',
        cabin: x.cabin ?? x.cabin_class ?? 'Economy',
      })),
      contact: {
        email: state.contact_email ?? null,
        phone: state.contact_phone ?? p.conversation.waId,
      },
      total: expected,
      currency: p.currency,
      provider: state.selected_offer?.provider ?? null,
      offerId: state.selected_offer?.offer_id ?? null,
      payment_reference: reference,
    });

    await db.ticket.upsert({
      where: { reference: `TKT-${reference}` },
      create: {
        reference: `TKT-${reference}`,
        conversationId: p.conversation.id,
        status: 'PENDING_MANUAL_ISSUE',
        payload: ticketPayload,
      },
      update: { status: 'PENDING_MANUAL_ISSUE', payload: ticketPayload },
    });
  }

  return { ok: true, payment: paid };
}
