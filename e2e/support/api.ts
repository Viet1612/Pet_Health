import { randomUUID } from 'node:crypto';

import { request, type APIRequestContext, type APIResponse } from '@playwright/test';

import { API_URL, MAILPIT_URL, ORIGIN } from './env';

export const PASSWORD = 'mat-khau-e2e-123';

/** IP giả cho mỗi lần đăng ký (API E2E tin CF-Connecting-IP). */
const fakeIp = () =>
  `10.${String(Math.floor(Math.random() * 250))}.${String(Math.floor(Math.random() * 250))}.${String(Math.floor(Math.random() * 250) + 1)}`;

export interface Json {
  status: number;
  /** JSON thô, kiểm bằng expect. */
  body: any;
  headers: Record<string, string>;
}

async function toJson(res: APIResponse): Promise<Json> {
  const text = await res.text();
  return { status: res.status(), body: text ? JSON.parse(text) : null, headers: res.headers() };
}

/** Điều khiển đồng hồ giả của API (POST /__test/clock). */
export async function setClock(at: string): Promise<void> {
  const ctx = await request.newContext({ extraHTTPHeaders: { origin: ORIGIN } });
  const res = await ctx.post(`${API_URL}/__test/clock`, { data: { now: at, frozen: true } });
  if (!res.ok()) throw new Error(`setClock ${at}: ${String(res.status())} ${await res.text()}`);
  await ctx.dispose();
}

export async function advanceClock(ms: number): Promise<void> {
  const ctx = await request.newContext({ extraHTTPHeaders: { origin: ORIGIN } });
  await ctx.post(`${API_URL}/__test/clock`, { data: { advanceMs: ms } });
  await ctx.dispose();
}

export async function resetClock(): Promise<void> {
  const ctx = await request.newContext({ extraHTTPHeaders: { origin: ORIGIN } });
  await ctx.post(`${API_URL}/__test/clock`, { data: { reset: true } });
  await ctx.dispose();
}

/** 9 giờ sáng giờ Việt Nam của một ngày (múi giờ mặc định của tài khoản). */
export const vn = (date: string, time = '09:00:00') => `${date}T${time}+07:00`;

export const newEmail = () => `e2e+${randomUUID().slice(0, 8)}@example.test`;

/** Một phiên đăng nhập (một "thiết bị"): cookie riêng, CSRF token riêng. */
export class ApiSession {
  private csrf: string | null = null;

  private constructor(
    private readonly ctx: APIRequestContext,
    readonly email: string,
  ) {}

  static async create(email: string): Promise<ApiSession> {
    const ctx = await request.newContext({ extraHTTPHeaders: { origin: ORIGIN } });
    return new ApiSession(ctx, email);
  }

  /** Đăng ký tài khoản mới (Asia/Ho_Chi_Minh mặc định). */
  static async register(
    opts: { email?: string; timezone?: string; nickname?: string; birthDate?: string } = {},
  ): Promise<ApiSession> {
    const s = await ApiSession.create(opts.email ?? newEmail());
    const res = await s.ctx.post(`${API_URL}/auth/register`, {
      data: {
        email: s.email,
        password: PASSWORD,
        timezone: opts.timezone ?? 'Asia/Ho_Chi_Minh',
        nickname: opts.nickname ?? 'Người thử E2E',
        birthDate: opts.birthDate ?? '1990-05-20',
      },
      headers: { 'cf-connecting-ip': fakeIp() },
    });
    const json = await toJson(res);
    if (json.status !== 201)
      throw new Error(`register: ${String(json.status)} ${JSON.stringify(json.body)}`);
    s.csrf = json.body.csrfToken;
    return s;
  }

  /** Đăng nhập phiên khác cho cùng tài khoản (thiết bị thứ hai). */
  static async login(email: string): Promise<ApiSession> {
    const s = await ApiSession.create(email);
    const json = await toJson(
      await s.ctx.post(`${API_URL}/auth/login`, { data: { email, password: PASSWORD } }),
    );
    if (json.status !== 200)
      throw new Error(`login: ${String(json.status)} ${JSON.stringify(json.body)}`);
    s.csrf = json.body.csrfToken;
    return s;
  }

  async call(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    opts: { idempotent?: boolean } = {},
  ): Promise<Json> {
    const headers: Record<string, string> = {};
    if (method !== 'GET' && this.csrf) headers['x-csrf-token'] = this.csrf;
    if (opts.idempotent) headers['idempotency-key'] = randomUUID();
    const res = await this.ctx.fetch(`${API_URL}${path}`, {
      method,
      headers,
      ...(data === undefined ? {} : { data }),
    });
    return toJson(res);
  }

  /** Mở app: đồng bộ thông báo (summary) rồi đọc danh sách, như client làm. */
  async openApp(): Promise<{ summary: any; items: any[] }> {
    const summary = await this.call('GET', '/notifications/summary');
    const list = await this.call('GET', '/notifications');
    return { summary: summary.body, items: list.body.items };
  }

  async createPet(name = 'Mochi'): Promise<string> {
    const res = await this.call(
      'POST',
      '/pets',
      { name, breed: 'Poodle', sex: 'FEMALE', birthDate: '2020-01-15' },
      { idempotent: true },
    );
    if (res.status !== 201) throw new Error(`createPet: ${JSON.stringify(res.body)}`);
    return res.body.id as string;
  }

  async createMilestone(
    petId: string,
    input: { type: string; dueOn: string; note?: string; cycleMonths?: number },
  ): Promise<any> {
    const res = await this.call('POST', `/pets/${petId}/milestones`, input, { idempotent: true });
    if (res.status !== 201) throw new Error(`createMilestone: ${JSON.stringify(res.body)}`);
    return res.body;
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}

/** Lấy link xác minh từ Mailpit (chờ worker gửi tối đa 60 s). */
export async function verificationLink(email: string): Promise<string> {
  const ctx = await request.newContext();
  try {
    for (let i = 0; i < 120; i += 1) {
      const search = await ctx.get(`${MAILPIT_URL}/api/v1/search`, {
        params: { query: `to:"${email}"` },
      });
      const found = (await search.json()) as { messages?: { ID: string }[] };
      const id = found.messages?.[0]?.ID;
      if (id) {
        const msg = (await (await ctx.get(`${MAILPIT_URL}/api/v1/message/${id}`)).json()) as {
          Text: string;
          HTML: string;
        };
        const link = /https?:\/\/[^\s"'<>]+#token=[A-Za-z0-9_-]+/.exec(`${msg.Text} ${msg.HTML}`);
        if (link) return link[0];
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Không thấy email xác minh cho ${email}`);
  } finally {
    await ctx.dispose();
  }
}

export const tokenOf = (link: string): string => link.split('#token=')[1] ?? '';
