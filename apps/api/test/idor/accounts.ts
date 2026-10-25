import type { FastifyInstance } from 'fastify';

import { SESSION_COOKIE } from '../../src/modules/identity/adapters/http/cookies.js';
import { API_PREFIX } from '../../src/platform/http/openapi.js';
import { TEST_ORIGIN } from '../helpers.js';

export interface Account {
  userId: string;
  email: string;
  /** Giá trị header `cookie`. */
  cookie: string;
  csrfToken: string;
}

/** Đăng ký qua `POST /auth/register` thật (Argon2, phiên, CSRF). */
export async function registerAccount(app: FastifyInstance, email: string): Promise<Account> {
  const res = await app.inject({
    method: 'POST',
    url: `${API_PREFIX}/auth/register`,
    headers: { origin: TEST_ORIGIN },
    payload: {
      email,
      password: 'mat-khau-du-dai-1',
      timezone: 'Asia/Ho_Chi_Minh',
      nickname: 'IDOR',
      birthDate: '1990-05-20',
    },
  });
  if (res.statusCode !== 201) {
    throw new Error(`Đăng ký ${email} thất bại: ${String(res.statusCode)} ${res.body}`);
  }
  const body = res.json<{ user: { id: string }; csrfToken: string }>();
  const sid = res.cookies.find((c) => c.name === SESSION_COOKIE)?.value;
  if (!sid) throw new Error('Không nhận được cookie phiên');
  return {
    userId: body.user.id,
    email,
    cookie: `${SESSION_COOKIE}=${sid}`,
    csrfToken: body.csrfToken,
  };
}

export async function createTwoAccounts(app: FastifyInstance): Promise<{ a: Account; b: Account }> {
  const a = await registerAccount(app, 'idor-a@example.test');
  const b = await registerAccount(app, 'idor-b@example.test');
  return { a, b };
}

/** Header cho request có phiên: cookie, Origin, X-CSRF-Token. */
export function authHeaders(account: Account): Record<string, string> {
  return { cookie: account.cookie, origin: TEST_ORIGIN, 'x-csrf-token': account.csrfToken };
}
