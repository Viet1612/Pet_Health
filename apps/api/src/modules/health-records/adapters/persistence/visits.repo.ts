import { sql } from 'kysely';

import type { VisitRepository } from '../../application/ports.js';

export const visitsRepo: VisitRepository = {
  async list(trx, ownerId, petId, after, limit) {
    let q = trx
      .selectFrom('visits as v')
      .select((eb) => [
        'v.id',
        'v.visited_on',
        sql<string>`v.created_at::text`.as('created_at_text'),
        // Rút gọn 120 code point ở application (sau khi gộp xuống dòng).
        'v.symptoms',
        'v.diagnosis',
        eb
          .selectFrom('visit_photos as p')
          .select((e) => e.fn.countAll<string>().as('n'))
          .whereRef('p.visit_id', '=', 'v.id')
          .where('p.status', '=', 'READY')
          .as('photo_count'),
      ])
      .where('v.owner_id', '=', ownerId)
      .where('v.pet_id', '=', petId);
    if (after) {
      q = q.where(
        sql<boolean>`(v.visited_on, v.created_at, v.id) < (${after.v}::date, ${after.c}::timestamptz, ${after.i}::uuid)`,
      );
    }
    const rows = await q
      .orderBy('v.visited_on', 'desc')
      .orderBy('v.created_at', 'desc')
      .orderBy('v.id', 'desc')
      .limit(limit)
      .execute();
    return rows.map((r) => ({
      id: r.id,
      visitedOn: r.visited_on,
      createdAtText: r.created_at_text,
      symptoms: r.symptoms,
      diagnosis: r.diagnosis,
      photoCount: Number(r.photo_count ?? 0),
    }));
  },

  async count(trx, ownerId, petId) {
    const row = await trx
      .selectFrom('visits')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('owner_id', '=', ownerId)
      .where('pet_id', '=', petId)
      .executeTakeFirstOrThrow();
    return Number(row.n);
  },

  findById(trx, ownerId, id) {
    return trx
      .selectFrom('visits')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .executeTakeFirst();
  },

  lock(trx, ownerId, id) {
    return trx
      .selectFrom('visits')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .forUpdate()
      .executeTakeFirst();
  },

  insert(trx, visit) {
    return trx
      .insertInto('visits')
      .values({
        id: visit.id,
        owner_id: visit.ownerId,
        pet_id: visit.petId,
        visited_on: visit.visitedOn,
        symptoms: visit.symptoms,
        diagnosis: visit.diagnosis,
        prescription: visit.prescription,
        created_at: visit.now,
        updated_at: visit.now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  update(trx, ownerId, id, fields, now) {
    return trx
      .updateTable('visits')
      .set({
        visited_on: fields.visitedOn,
        symptoms: fields.symptoms,
        diagnosis: fields.diagnosis,
        prescription: fields.prescription,
        updated_at: now,
      })
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .returningAll()
      .executeTakeFirst();
  },

  async delete(trx, ownerId, id) {
    await trx.deleteFrom('visits').where('id', '=', id).where('owner_id', '=', ownerId).execute();
  },
};
