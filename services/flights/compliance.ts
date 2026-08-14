import type { FlightOffer } from './types';
import type { Traveler } from '@/services/travelers/types';

export interface ComplianceResult {
  ok: boolean;
  failures: { code: string; passengerIndex?: number; details?: unknown }[];
  warnings: { code: string; passengerIndex?: number; details?: unknown }[];
}

function ageAt(dob?: string | null, ref?: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const r = ref ? new Date(ref) : new Date();
  if (Number.isNaN(d.getTime()) || Number.isNaN(r.getTime())) return null;

  let age = r.getUTCFullYear() - d.getUTCFullYear();
  const monthDelta = r.getUTCMonth() - d.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && r.getUTCDate() < d.getUTCDate())) {
    age--;
  }
  return age;
}

function monthsAfter(date: string, months: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function checkCompliance(offer: FlightOffer, travelers: Traveler[]): ComplianceResult {
  const failures: ComplianceResult['failures'] = [];
  const warnings: ComplianceResult['warnings'] = [];
  const segs = offer.segments ?? [];
  const last = segs.at(-1);
  const lastDate = last?.arrival_at ?? last?.departure_at;
  const seen = new Map<string, number>();
  let adults = 0;
  let infants = 0;

  travelers.forEach((p: any, i) => {
    const type = String(p.type ?? 'adult');
    if (type === 'adult') adults++;
    if (type === 'infant') infants++;

    if (!p.first_name || !p.last_name) {
      failures.push({ code: 'missing_name', passengerIndex: i });
    }

    if (p.passport_expiry) {
      const exp = new Date(p.passport_expiry);
      if (exp < new Date()) {
        failures.push({ code: 'passport_expired', passengerIndex: i });
      }
      if (lastDate && exp < monthsAfter(lastDate, 6)) {
        failures.push({ code: 'passport_validity_too_short', passengerIndex: i });
      }
    }

    const age = ageAt(p.date_of_birth, segs[0]?.departure_at);
    if (age !== null) {
      if (type === 'infant' && age >= 2) {
        failures.push({ code: 'infant_age_invalid', passengerIndex: i });
      } else if (type === 'child' && (age < 2 || age >= 12)) {
        warnings.push({ code: 'child_age_borderline', passengerIndex: i });
      } else if (type === 'adult' && age < 12) {
        failures.push({ code: 'adult_age_too_young', passengerIndex: i });
      }
    }

    const passportNumber = String(p.passport_number ?? '').toUpperCase();
    if (passportNumber) {
      if (seen.has(passportNumber)) {
        failures.push({
          code: 'duplicate_passport',
          passengerIndex: i,
          details: { duplicateWith: seen.get(passportNumber) },
        });
      }
      seen.set(passportNumber, i);
    }
  });

  if (infants > 0 && adults === 0) failures.push({ code: 'infant_without_adult' });
  if (infants > adults) failures.push({ code: 'too_many_infants_per_adult' });

  return { ok: failures.length === 0, failures, warnings };
}

export function complianceMessage(result: ComplianceResult) {
  const labels: Record<string, string> = {
    missing_name: 'Nom du voyageur incomplet',
    passport_expired: 'Passeport expiré',
    passport_validity_too_short: 'Passeport valide moins de 6 mois après le voyage',
    infant_age_invalid: 'Âge du bébé incompatible',
    child_age_borderline: 'Âge enfant à vérifier',
    adult_age_too_young: 'Voyageur marqué adulte mais trop jeune',
    duplicate_passport: 'Numéro de passeport dupliqué',
    infant_without_adult: 'Bébé sans adulte accompagnateur',
    too_many_infants_per_adult: 'Trop de bébés par adulte',
  };

  return result.failures
    .map(
      (item) =>
        `• ${labels[item.code] ?? item.code}${
          item.passengerIndex !== undefined ? ` (voyageur ${item.passengerIndex + 1})` : ''
        }`,
    )
    .join('\n');
}
