import { BaseSegment } from './base';
import type { ConversationSession } from '../conversation/types';
import { db } from '@/lib/db';
import { createPostBooking } from '@/services/post-booking/service';
import { listCustomerTickets } from '@/services/customers/service';

function refFrom(text: string) {
  const match = text.toUpperCase().match(/\bDONI-[A-Z0-9-]{3,32}\b/);
  return match?.[0] || text.trim().toUpperCase();
}

export class PostBookingSegment extends BaseSegment {
  readonly id = 'segment_post_booking';

  async handle(session: ConversationSession, text: string) {
    const state = session.state as any;
    let reference = String(state.post_booking_reference || '');
    const input = text.trim();

    if (!reference) {
      const known = await listCustomerTickets(session.waId, 6);
      if (!input && known.length) {
        if (known.length === 1) {
          reference = known[0].reference;
        } else {
          const lines = known.map(
            (ticket: any, index: number) =>
              `*${index + 1}* — ${ticket.reference}${ticket.pnr ? ` · PNR ${ticket.pnr}` : ''} · ${ticket.status}`,
          );
          return this.retry(
            this.t(session, {
              fr: `📂 J’ai retrouvé vos réservations :\n\n${lines.join('\n')}\n\nRépondez avec le numéro de la réservation, ou envoyez une référence/PNR.`,
              en: `📂 I found your bookings:\n\n${lines.join('\n')}\n\nReply with the booking number, or send a reference/PNR.`,
              es: `📂 Encontré sus reservas:\n\n${lines.join('\n')}\n\nResponda con el número de reserva, o envíe referencia/PNR.`,
              ht: `📂 Mwen jwenn rezèvasyon ou yo:\n\n${lines.join('\n')}\n\nReponn ak nimewo rezèvasyon an, oswa voye referans/PNR.`,
            }),
            { post_booking_choices: known.map((ticket: any) => ticket.reference) },
          );
        }
      }

      if (/^\d+$/.test(input) && Array.isArray(state.post_booking_choices)) {
        reference = state.post_booking_choices[Number(input) - 1] || '';
      } else if (input) {
        reference = refFrom(input);
      }

      if (!reference) return this.retry(this.prompt(session));
    }

    let ticket = await db.ticket.findUnique({ where: { reference } }).catch(() => null);
    if (!ticket) {
      ticket = await db.ticket.findFirst({ where: { pnr: reference }, orderBy: { createdAt: 'desc' } }).catch(() => null);
    }
    if (!ticket) {
      return this.retry(
        this.t(session, {
          fr: 'Je n’ai pas trouvé cette réservation. Envoyez votre référence DONI/PNR, ou écrivez *menu*.',
          en: "I couldn't find that booking. Send your DONI reference/PNR, or type *menu*.",
          es: 'No encontré esa reserva. Envíe su referencia DONI/PNR, o escriba *menu*.',
          ht: 'Mwen pa jwenn rezèvasyon sa a. Voye referans DONI/PNR ou, oswa ekri *menu*.',
        }),
      );
    }

    reference = ticket.reference;
    if (!state.post_booking_reference || reference !== state.post_booking_reference) {
      return this.retry(
        this.t(session, {
          fr: `📂 Réservation *${reference}*${ticket.pnr ? ` · PNR *${ticket.pnr}*` : ''}\nStatut : *${ticket.status}*\n\n*1* Vérifier le statut\n*2* Changer le vol\n*3* Annuler / demander remboursement\n*4* Corriger un nom\n*5* Statut du vol`,
          en: `📂 Booking *${reference}*${ticket.pnr ? ` · PNR *${ticket.pnr}*` : ''}\nStatus: *${ticket.status}*\n\n*1* Check status\n*2* Change flight\n*3* Cancel / request refund\n*4* Correct a name\n*5* Flight status`,
          es: `📂 Reserva *${reference}*${ticket.pnr ? ` · PNR *${ticket.pnr}*` : ''}\nEstado: *${ticket.status}*\n\n*1* Ver estado\n*2* Cambiar vuelo\n*3* Cancelar / solicitar reembolso\n*4* Corregir nombre\n*5* Estado de vuelo`,
          ht: `📂 Rezèvasyon *${reference}*${ticket.pnr ? ` · PNR *${ticket.pnr}*` : ''}\nEstati: *${ticket.status}*\n\n*1* Verifye estati\n*2* Chanje vòl\n*3* Anile / mande ranbousman\n*4* Korije non\n*5* Estati vòl`,
        }),
        { post_booking_reference: reference, post_booking_choices: null },
      );
    }

    const choice = input;
    if (choice === '1') {
      return this.retry(
        this.t(session, {
          fr: `🎫 *${reference}*\nStatut : *${ticket.status}*\nPNR : *${ticket.pnr || 'pas encore disponible'}*\nLivraison : *${ticket.deliveryStatus}*`,
          en: `🎫 *${reference}*\nStatus: *${ticket.status}*\nPNR: *${ticket.pnr || 'not available yet'}*\nDelivery: *${ticket.deliveryStatus}*`,
          es: `🎫 *${reference}*\nEstado: *${ticket.status}*\nPNR: *${ticket.pnr || 'aún no disponible'}*\nEntrega: *${ticket.deliveryStatus}*`,
          ht: `🎫 *${reference}*\nEstati: *${ticket.status}*\nPNR: *${ticket.pnr || 'poko disponib'}*\nLivrezon: *${ticket.deliveryStatus}*`,
        }),
      );
    }

    if (choice === '5') {
      return this.reply(null, 'segment_flight_status', { post_booking_reference: null, service_selected: 'flight_status' }, { autoChain: true });
    }
    if (/^menu$/i.test(choice)) {
      return this.reply(null, 'segment_service_selection', { post_booking_reference: null, service_awaiting: true }, { autoChain: true });
    }

    const pending = String(state.post_booking_pending_type || '');
    const confirming = /^(confirmer|confirm|confirmar|konfime)$/i.test(choice);
    const type = confirming && pending
      ? pending
      : choice === '2'
        ? 'flight_change'
        : choice === '3'
          ? 'cancellation'
          : choice === '4'
            ? 'name_correction'
            : null;

    if (!type) {
      return this.retry(this.t(session, { fr: 'Choisissez 1, 2, 3, 4 ou 5.', en: 'Choose 1, 2, 3, 4 or 5.', es: 'Elija 1, 2, 3, 4 o 5.', ht: 'Chwazi 1, 2, 3, 4 oswa 5.' }));
    }

    const labels: any = {
      flight_change: { fr: 'changement de vol', en: 'flight change', es: 'cambio de vuelo', ht: 'chanjman vòl' },
      cancellation: { fr: 'annulation / remboursement', en: 'cancellation / refund', es: 'cancelación / reembolso', ht: 'anilasyon / ranbousman' },
      name_correction: { fr: 'correction de nom', en: 'name correction', es: 'corrección de nombre', ht: 'koreksyon non' },
    };

    if (!confirming && pending !== type) {
      return this.retry(
        this.t(session, {
          fr: `⚠️ Vous demandez un *${labels[type].fr}* pour *${reference}*. Répondez *CONFIRMER* pour créer la demande.`,
          en: `⚠️ You are requesting a *${labels[type].en}* for *${reference}*. Reply *CONFIRM* to create the request.`,
          es: `⚠️ Solicita un *${labels[type].es}* para *${reference}*. Responda *CONFIRMAR* para crear la solicitud.`,
          ht: `⚠️ Ou mande yon *${labels[type].ht}* pou *${reference}*. Reponn *KONFIME* pou kreye demand lan.`,
        }),
        { post_booking_pending_type: type },
      );
    }

    if (!confirming) {
      return this.retry(this.t(session, { fr: 'Répondez *CONFIRMER* pour continuer.', en: 'Reply *CONFIRM* to continue.', es: 'Responda *CONFIRMAR* para continuar.', ht: 'Reponn *KONFIME* pou kontinye.' }));
    }

    await createPostBooking({
      reference,
      conversationId: session.id,
      phone: session.waId,
      requestType: type,
      priority: type === 'cancellation' ? 'P1' : 'P2',
      clientConsentText: text,
      payload: { source: 'whatsapp', ticket_status: ticket.status, pnr: ticket.pnr },
    });
    await db.doniConversation.update({ where: { id: session.id }, data: { agentRequired: true } }).catch(() => null);

    return this.reply(
      this.t(session, {
        fr: `✅ Demande créée pour *${reference}*. Un agent vérifiera les règles avant toute action.`,
        en: `✅ Request created for *${reference}*. An agent will verify the rules before any action.`,
        es: `✅ Solicitud creada para *${reference}*. Un agente verificará las reglas antes de cualquier acción.`,
        ht: `✅ Demand kreye pou *${reference}*. Yon ajan ap verifye règ yo anvan nenpòt aksyon.`,
      }),
      'segment_service_selection',
      { post_booking_reference: null, post_booking_pending_type: null, service_awaiting: true, agentRequired: true },
    );
  }

  prompt(session: ConversationSession) {
    return this.t(session, {
      fr: '📂 Je peux retrouver vos réservations avec ce numéro. Sinon envoyez votre *référence DONI* ou *PNR*.',
      en: '📂 I can find bookings linked to this number. Or send your *DONI reference* or *PNR*.',
      es: '📂 Puedo encontrar reservas vinculadas a este número. O envíe su *referencia DONI* o *PNR*.',
      ht: '📂 Mwen ka jwenn rezèvasyon ki lye ak nimewo sa a. Oswa voye *referans DONI* / *PNR* ou.',
    });
  }
}
