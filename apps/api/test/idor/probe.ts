// Bảng và route chỉ có trong bộ test IDOR, để chứng minh harness chạy khi S1 chưa có route nghiệp vụ
// có path param. Không bao giờ được đăng ký ở main-api.
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { sql, type Kysely, type Transaction } from 'kysely';
import { z } from 'zod';

import { enableOwnerRls } from '../../migrations/_helpers/rls.js';
import type { Database } from '../../src/platform/db/kysely.js';
import { NotFoundError } from '../../src/platform/errors/app-error.js';
import { zUuid } from '../../src/platform/http/user-tx.js';
import { newId } from '../../src/platform/ids.js';
import { registerIdorBody, registerIdorParam } from './registry.js';

interface ProbeRow {
  id: string;
  owner_id: string;
  note: string;
}

export async function createProbeTable(db: Kysely<Database>): Promise<void> {
  await sql`
    CREATE TABLE idor_probe (
      id uuid PRIMARY KEY,
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      note text NOT NULL
    )`.execute(db);
  await enableOwnerRls(db, 'idor_probe');
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON idor_probe TO app_rw, app_worker`.execute(db);
}

/**
 * Repository của route thử. `filterOwner = false` là biến thể cố ý lỗi (quên lọc `owner_id`):
 * RLS vẫn phải chặn để route trả 404.
 */
function probeRepository(filterOwner: boolean) {
  const ownerCond = (userId: string) =>
    filterOwner ? sql`AND owner_id = ${userId}` : sql`AND TRUE`;
  return {
    async find(trx: Transaction<Database>, userId: string, id: string): Promise<ProbeRow | null> {
      const { rows } = await sql<ProbeRow>`
        SELECT id, owner_id, note FROM idor_probe WHERE id = ${id} ${ownerCond(userId)}`.execute(
        trx,
      );
      return rows[0] ?? null;
    },
    async update(
      trx: Transaction<Database>,
      userId: string,
      id: string,
      note: string,
    ): Promise<ProbeRow | null> {
      const { rows } = await sql<ProbeRow>`
        UPDATE idor_probe SET note = ${note} WHERE id = ${id} ${ownerCond(userId)}
        RETURNING id, owner_id, note`.execute(trx);
      return rows[0] ?? null;
    },
    async remove(trx: Transaction<Database>, userId: string, id: string): Promise<boolean> {
      const { rows } = await sql<{ id: string }>`
        DELETE FROM idor_probe WHERE id = ${id} ${ownerCond(userId)} RETURNING id`.execute(trx);
      return rows.length > 0;
    },
  };
}

const zProbe = z.object({ id: z.string(), note: z.string() });
const zParams = z.object({ id: zUuid });

/** `GET/PATCH/DELETE /__test/idor-probe/:id` và biến thể `/__test/idor-probe-broken/:id`. */
export function probeRoutes(app: FastifyInstance): Promise<void> {
  const api = app.withTypeProvider<ZodTypeProvider>();
  for (const [prefix, filterOwner] of [
    ['/__test/idor-probe', true],
    ['/__test/idor-probe-broken', false],
  ] as const) {
    const repo = probeRepository(filterOwner);
    const userIdOf = (req: { auth?: { userId: string } }): string => req.auth?.userId ?? '';

    api.get(
      `${prefix}/:id`,
      { schema: { hide: true, params: zParams, response: { 200: zProbe } } },
      async (req) => {
        const row = await req.withTx((trx) => repo.find(trx, userIdOf(req), req.params.id));
        if (!row) throw new NotFoundError();
        return { id: row.id, note: row.note };
      },
    );
    api.patch(
      `${prefix}/:id`,
      {
        schema: {
          hide: true,
          params: zParams,
          body: z.object({ note: z.string().max(200) }),
          response: { 200: zProbe },
        },
      },
      async (req) => {
        const row = await req.withTx((trx) =>
          repo.update(trx, userIdOf(req), req.params.id, req.body.note),
        );
        if (!row) throw new NotFoundError();
        return { id: row.id, note: row.note };
      },
    );
    api.delete(
      `${prefix}/:id`,
      { schema: { hide: true, params: zParams, response: { 204: z.null() } } },
      async (req, reply) => {
        const ok = await req.withTx((trx) => repo.remove(trx, userIdOf(req), req.params.id));
        if (!ok) throw new NotFoundError();
        return reply.code(204).send(null);
      },
    );
  }
  return Promise.resolve();
}

// Fixture IDOR cho route thử: tạo bằng kết nối app_worker, chụp mọi dòng của owner.
registerIdorParam(/^\/__test\/idor-probe(-broken)?\/:id$/, 'id', {
  async create({ db, owner }) {
    const id = newId();
    await sql`INSERT INTO idor_probe (id, owner_id, note) VALUES (${id}, ${owner.userId}, 'của chủ')`.execute(
      db,
    );
    return id;
  },
  async snapshot({ db, ownerId }) {
    const { rows } = await sql<ProbeRow>`
      SELECT id, owner_id, note FROM idor_probe WHERE owner_id = ${ownerId} ORDER BY id`.execute(
      db,
    );
    return rows;
  },
});
registerIdorBody('PATCH', '/__test/idor-probe/:id', () => ({ note: 'bị sửa' }));
registerIdorBody('PATCH', '/__test/idor-probe-broken/:id', () => ({ note: 'bị sửa' }));
