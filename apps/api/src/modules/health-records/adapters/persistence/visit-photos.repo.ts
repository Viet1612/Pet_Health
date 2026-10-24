import type { VisitPhotoRepository } from '../../application/ports.js';

export const visitPhotosRepo: VisitPhotoRepository = {
  async countActive(trx, ownerId, visitId) {
    const row = await trx
      .selectFrom('visit_photos')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('owner_id', '=', ownerId)
      .where('visit_id', '=', visitId)
      .where('status', '<>', 'FAILED')
      .executeTakeFirstOrThrow();
    return Number(row.n);
  },

  async insert(trx, photo) {
    await trx
      .insertInto('visit_photos')
      .values({
        id: photo.id,
        owner_id: photo.ownerId,
        visit_id: photo.visitId,
        storage_key: photo.storageKey,
        thumb_key: photo.thumbKey,
      })
      .execute();
  },

  listForVisit(trx, ownerId, visitId) {
    return trx
      .selectFrom('visit_photos')
      .selectAll()
      .where('owner_id', '=', ownerId)
      .where('visit_id', '=', visitId)
      .where('status', '<>', 'FAILED')
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .execute();
  },

  findById(q, ownerId, id) {
    return q
      .selectFrom('visit_photos')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .executeTakeFirst();
  },

  lock(trx, ownerId, id) {
    return trx
      .selectFrom('visit_photos')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .forUpdate()
      .executeTakeFirst();
  },

  async delete(trx, ownerId, id) {
    await trx
      .deleteFrom('visit_photos')
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .execute();
  },

  async markReady(trx, ownerId, id, sizeBytes) {
    const row = await trx
      .updateTable('visit_photos')
      .set({ status: 'READY', size_bytes: sizeBytes, fail_reason: null })
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .returning('id')
      .executeTakeFirst();
    return row !== undefined;
  },

  async markFailed(q, ownerId, id, reason) {
    await q
      .updateTable('visit_photos')
      .set({ status: 'FAILED', fail_reason: reason })
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .execute();
  },
};
