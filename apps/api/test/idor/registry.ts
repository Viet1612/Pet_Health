import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';

import type { Database } from '../../src/platform/db/kysely.js';
import type { Account } from './accounts.js';

export interface IdorParamFixture {
  /** Tạo tài nguyên thuộc `owner`, trả về giá trị cho path param. */
  create(ctx: { app: FastifyInstance; owner: Account; db: Kysely<Database> }): Promise<string>;
  /** Ảnh chụp dữ liệu của owner liên quan tới tài nguyên; `db` là kết nối app_worker (BYPASSRLS). */
  snapshot(ctx: { db: Kysely<Database>; ownerId: string; id: string }): Promise<unknown>;
}

export interface IdorCustomCtx {
  app: FastifyInstance;
  a: Account;
  b: Account;
  db: Kysely<Database>;
}

interface ParamEntry {
  route: string | RegExp;
  param: string;
  fixture: IdorParamFixture;
}

const params: ParamEntry[] = [];
const bodies = new Map<string, (ids: Record<string, string>) => unknown>();
const customs = new Map<string, (ctx: IdorCustomCtx) => Promise<void>>();
const exemptions = new Map<string, string>();

const key = (method: string, url: string): string => `${method.toUpperCase()} ${url}`;

/** Fixture cho một path param của route khớp `routePattern` (chuỗi đúng `url` hoặc RegExp). */
export function registerIdorParam(
  routePattern: string | RegExp,
  param: string,
  fixture: IdorParamFixture,
): void {
  params.push({ route: routePattern, param, fixture });
}

/** Body hợp lệ cho POST/PUT/PATCH để request không bị 400 trước bước kiểm quyền. */
export function registerIdorBody(
  method: string,
  url: string,
  body: (ids: Record<string, string>) => unknown,
): void {
  bodies.set(key(method, url), body);
}

/** Ca đặc biệt, ví dụ ID nằm trong body. */
export function registerIdorCustom(name: string, run: (ctx: IdorCustomCtx) => Promise<void>): void {
  customs.set(name, run);
}

/** Miễn kiểm IDOR cho route; bắt buộc có lý do, in ra trong báo cáo test. */
export function exemptFromIdor(method: string, url: string, reason: string): void {
  if (!reason.trim()) throw new Error(`exemptFromIdor(${method} ${url}) phải có lý do`);
  exemptions.set(key(method, url), reason);
}

export function findParamFixture(url: string, param: string): IdorParamFixture | undefined {
  return params.find(
    (p) => p.param === param && (typeof p.route === 'string' ? p.route === url : p.route.test(url)),
  )?.fixture;
}

export function bodyFor(method: string, url: string, ids: Record<string, string>): unknown {
  const make = bodies.get(key(method, url));
  if (make) return make(ids);
  return method === 'GET' || method === 'DELETE' ? undefined : {};
}

export function exemptionOf(method: string, url: string): string | undefined {
  return exemptions.get(key(method, url));
}

export function customCases(): [string, (ctx: IdorCustomCtx) => Promise<void>][] {
  return [...customs.entries()];
}
