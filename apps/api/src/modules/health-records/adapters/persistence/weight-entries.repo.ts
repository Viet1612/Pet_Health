import type { WeightRepository } from '../../application/ports.js';

export const weightEntriesRepo: WeightRepository = {
  listByPet(trx, ownerId, petId, range) {
    let q = trx
      .selectFrom('weight_entries')
      .selectAll()
      .where('owner_id', '=', ownerId)
      .where('pet_id', '=', petId);
    if (range.from) q = q.where('measured_on', '>=', range.from);
    if (range.to) q = q.where('measured_on', '<=', range.to);
    return q.orderBy('measured_on', 'desc').orderBy('created_at', 'desc').execute();
  },

  latestTwo(trx, ownerId, petId) {
    return trx
      .selectFrom('weight_entries')
      .selectAll()
      .where('owner_id', '=', ownerId)
      .where('pet_id', '=', petId)
      .orderBy('measured_on', 'desc')
      .orderBy('created_at', 'desc')
      .limit(2)
      .execute();
  },

  findById(trx, ownerId, id) {
    return trx
      .selectFrom('weight_entries')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .executeTakeFirst();
  },

  insert(trx, entry) {
    return trx
      .insertInto('weight_entries')
      .values({
        id: entry.id,
        owner_id: entry.ownerId,
        pet_id: entry.petId,
        measured_on: entry.measuredOn,
        weight_kg: entry.weightKg,
        created_at: entry.createdAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async update(trx, ownerId, id, patch) {
    const set = {
      ...(patch.measuredOn !== undefined ? { measured_on: patch.measuredOn } : {}),
      ...(patch.weightKg !== undefined ? { weight_kg: patch.weightKg } : {}),
    };
    if (Object.keys(set).length === 0) {
      return trx
        .selectFrom('weight_entries')
        .selectAll()
        .where('id', '=', id)
        .where('owner_id', '=', ownerId)
        .executeTakeFirst();
    }
    return trx
      .updateTable('weight_entries')
      .set(set)
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .returningAll()
      .executeTakeFirst();
  },

  async delete(trx, ownerId, id) {
    const row = await trx
      .deleteFrom('weight_entries')
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .returning('id')
      .executeTakeFirst();
    return row !== undefined;
  },
};
