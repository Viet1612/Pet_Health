import type { MilestoneRepository } from '../../application/ports.js';

export const milestoneRepository: MilestoneRepository = {
  listByPet(trx, ownerId, petId) {
    return trx
      .selectFrom('milestones')
      .selectAll()
      .where('owner_id', '=', ownerId)
      .where('pet_id', '=', petId)
      .execute();
  },

  findById(q, ownerId, id) {
    return q
      .selectFrom('milestones')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .executeTakeFirst();
  },

  lock(trx, ownerId, id) {
    return trx
      .selectFrom('milestones')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .forUpdate()
      .executeTakeFirst();
  },

  insert(trx, row) {
    return trx.insertInto('milestones').values(row).returningAll().executeTakeFirstOrThrow();
  },

  update(trx, ownerId, id, set) {
    return trx
      .updateTable('milestones')
      .set(set)
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .returningAll()
      .executeTakeFirst();
  },

  cancelIfPending(trx, ownerId, id, now) {
    return trx
      .updateTable('milestones')
      .set({ status: 'CANCELLED', updated_at: now })
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .where('status', '=', 'PENDING')
      .returningAll()
      .executeTakeFirst();
  },

  completeIfPending(trx, ownerId, id, doneOn, now) {
    return trx
      .updateTable('milestones')
      .set({ status: 'DONE', done_on: doneOn, completed_at: now, updated_at: now })
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .where('status', '=', 'PENDING')
      .returningAll()
      .executeTakeFirst();
  },

  insertNext(trx, row) {
    return trx
      .insertInto('milestones')
      .values(row)
      .onConflict((oc) => oc.column('previous_id').doNothing())
      .returningAll()
      .executeTakeFirst();
  },

  findByPrevious(trx, ownerId, previousId) {
    return trx
      .selectFrom('milestones')
      .selectAll()
      .where('previous_id', '=', previousId)
      .where('owner_id', '=', ownerId)
      .executeTakeFirst();
  },

  async deleteAutoNext(trx, ownerId, previousId) {
    const rows = await trx
      .deleteFrom('milestones')
      .where('previous_id', '=', previousId)
      .where('owner_id', '=', ownerId)
      .where('origin', '=', 'AUTO')
      .where('status', '=', 'PENDING')
      .returning('id')
      .execute();
    return rows.length;
  },

  listPendingDueBy(q, ownerId, dueBy) {
    return q
      .selectFrom('milestones')
      .selectAll()
      .where('owner_id', '=', ownerId)
      .where('status', '=', 'PENDING')
      .where('due_on', '<=', dueBy)
      .execute();
  },

  async findMany(q, ownerId, ids) {
    if (ids.length === 0) return [];
    return q
      .selectFrom('milestones')
      .selectAll()
      .where('owner_id', '=', ownerId)
      .where('id', 'in', ids)
      .execute();
  },
};
