import type { FastifyReply } from 'fastify';

/** Cookie phiên web (SAD §4.1.1): `__Host-` buộc Secure, Path=/ và không có Domain. */
export const SESSION_COOKIE = '__Host-ph_sid';
const MAX_AGE_SEC = 30 * 24 * 60 * 60;

const BASE = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' } as const;

export function setSessionCookie(reply: FastifyReply, token: string): void {
  void reply.setCookie(SESSION_COOKIE, token, { ...BASE, maxAge: MAX_AGE_SEC });
}

export function clearSessionCookie(reply: FastifyReply): void {
  void reply.setCookie(SESSION_COOKIE, '', { ...BASE, maxAge: 0 });
}
