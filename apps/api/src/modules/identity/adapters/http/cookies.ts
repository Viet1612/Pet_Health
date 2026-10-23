import type { FastifyReply } from 'fastify';

/** Cookie phiên web (SAD §4.1.1): `__Host-` buộc Secure, Path=/ và không có Domain. */
export const SESSION_COOKIE = '__Host-ph_sid';
/** Tên cookie khi tắt Secure (chỉ máy dev, mở bằng IP LAN qua http). */
export const INSECURE_SESSION_COOKIE = 'ph_sid';
const MAX_AGE_SEC = 30 * 24 * 60 * 60;

let secure = true;

/** Gọi một lần lúc khởi động (`SESSION_COOKIE_SECURE`); production luôn `true`. */
export function configureSessionCookie(options: { secure: boolean }): void {
  secure = options.secure;
}

export function sessionCookieName(): string {
  return secure ? SESSION_COOKIE : INSECURE_SESSION_COOKIE;
}

const base = () => ({ httpOnly: true, secure, sameSite: 'strict', path: '/' }) as const;

export function setSessionCookie(reply: FastifyReply, token: string): void {
  void reply.setCookie(sessionCookieName(), token, { ...base(), maxAge: MAX_AGE_SEC });
}

export function clearSessionCookie(reply: FastifyReply): void {
  void reply.setCookie(sessionCookieName(), '', { ...base(), maxAge: 0 });
}
