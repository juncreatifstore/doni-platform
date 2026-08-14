import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384, r = 8, p = 1, keylen = 64;
export function hashPassword(password: string) {
  if (password.length < 10) throw new Error('password_too_short');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 }).toString('hex');
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}
export function verifyPassword(password: string, stored: string) {
  try {
    const [algo, nRaw, rRaw, pRaw, salt, expectedHex] = stored.split('$');
    if (algo !== 'scrypt' || !salt || !expectedHex) return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = scryptSync(password, salt, expected.length, { N: Number(nRaw), r: Number(rRaw), p: Number(pRaw), maxmem: 64 * 1024 * 1024 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}
