import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Kysely } from 'kysely';

import type { ClockPort } from '../../../../platform/clock/clock.js';
import type { Database } from '../../../../platform/db/kysely.js';
import type { AuthContext, SessionResolverPort } from '../../../../platform/http/auth.js';
import { SESSION_TOUCH_INTERVAL_MS, SESSION_TTL_MS } from '../../application/session-service.js';
import { tokenService } from '../../application/token-service.js';
import { sessionRepository } from '../persistence/session-repository.js';
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from './cookies.js';

/**
 * Đọc phiên từ cookie `__Host-ph_sid` (FR-AUTH-012, SD-003): phiên hết hạn → xóa cookie; quá 5 phút
 * kể từ lần ghi trước → gia hạn trượt 30 ngày (dưới 5 phút không ghi DB).
 */
export class CookieSessionResolver implements SessionResolverPort {
  constructor(
    private readonly db: Kysely<Database>,
    private readonly clock: ClockPort,
  ) {}

  async resolve(request: FastifyRequest, reply: FastifyReply): Promise<AuthContext | null> {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return null;

    const now = this.clock.now();
    const session = await sessionRepository.findValidByTokenHash(
      this.db,
      tokenService.hashOf(token),
      now,
    );
    if (!session) {
      clearSessionCookie(reply);
      return null;
    }

    if (now.getTime() - session.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
      await sessionRepository.touch(
        this.db,
        session.sessionId,
        now,
        new Date(now.getTime() + SESSION_TTL_MS),
      );
      setSessionCookie(reply, token);
    }

    return {
      userId: session.user.id,
      sessionId: session.sessionId,
      csrfSecret: session.csrfSecret,
    };
  }
}
