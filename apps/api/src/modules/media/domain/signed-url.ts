import { createHmac, timingSafeEqual } from 'node:crypto';

/** URL ảnh hiệu lực tối đa 15 phút (NFR-SEC-006). */
export const MEDIA_URL_TTL_SEC = 900;

function signature(secret: string, key: string, exp: number): string {
  return createHmac('sha256', secret)
    .update(`${key}\n${String(exp)}`)
    .digest('base64url');
}

/**
 * `exp` làm tròn xuống phút, nên URL giữ nguyên trong 1 phút và trình duyệt dùng lại được cache
 * (hiệu lực thực 840–900 s).
 */
export function signedExpiry(now: Date): number {
  return Math.floor((Math.floor(now.getTime() / 1000) + MEDIA_URL_TTL_SEC) / 60) * 60;
}

/** `/media/{key}?exp=…&sig=…` */
export function signMediaUrl(secret: string, key: string, now: Date): string {
  const exp = signedExpiry(now);
  return `/media/${key}?exp=${String(exp)}&sig=${signature(secret, key, exp)}`;
}

export type MediaSignatureCheck = 'OK' | 'EXPIRED' | 'BAD_SIGNATURE';

/** Kiểm `exp` còn hạn (≥ now) và chữ ký khớp (so sánh thời gian hằng). */
export function verifyMediaSignature(
  secret: string,
  key: string,
  exp: string | undefined,
  sig: string | undefined,
  now: Date,
): MediaSignatureCheck {
  if (!exp || !sig || !/^\d{1,12}$/.test(exp)) return 'BAD_SIGNATURE';
  const expNum = Number(exp);
  if (expNum < Math.floor(now.getTime() / 1000)) return 'EXPIRED';
  const expected = Buffer.from(signature(secret, key, expNum));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return 'BAD_SIGNATURE';
  return 'OK';
}
