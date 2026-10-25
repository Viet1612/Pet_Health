import { sql } from 'kysely';

import type { RoutineRepository } from '../../application/ports.js';

export const routineRepository: RoutineRepository = {
  async listActive(q, ownerId, petIds, localDate) {
    if (petIds.length === 0) return [];
    return q
      .selectFrom('routine_tasks as t')
      .leftJoin('routine_completions as c', (join) =>
        join.onRef('c.task_id', '=', 't.id').on('c.local_date', '=', localDate),
      )
      .selectAll('t')
      .select(sql<boolean>`c.task_id IS NOT NULL`.as('done'))
      .where('t.owner_id', '=', ownerId)
      .where('t.pet_id', 'in', petIds)
      .where('t.deleted_at', 'is', null)
      .orderBy(sql`c.task_id IS NOT NULL`)
      .orderBy('t.time_of_day')
      .orderBy('t.pet_id')
      .orderBy('t.created_at')
      .execute();
  },

  async countActive(trx, ownerId, petId) {
    const row = await trx
      .selectFrom('routine_tasks')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('owner_id', '=', ownerId)
      .where('pet_id', '=', petId)
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();
    return Number(row.n);
  },

  insert(trx, row) {
    return trx.insertInto('routine_tasks').values(row).returningAll().executeTakeFirstOrThrow();
  },

  findActive(q, ownerId, id) {
    return q
      .selectFrom('routine_tasks')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  },

  update(trx, ownerId, id, set) {
    if (Object.keys(set).length === 0) return routineRepository.findActive(trx, ownerId, id);
    return trx
      .updateTable('routine_tasks')
      .set(set)
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  },

  async softDelete(trx, ownerId, id, now) {
    const res = await trx
      .updateTable('routine_tasks')
      .set({ deleted_at: now })
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    return res.numUpdatedRows > 0n;
  },

  async isDone(q, taskId, localDate) {
    const row = await q
      .selectFrom('routine_completions')
      .select('task_id')
      .where('task_id', '=', taskId)
      .where('local_date', '=', localDate)
      .executeTakeFirst();
    return row !== undefined;
  },

  async markDone(trx, ownerId, taskId, localDate, now) {
    await trx
      .insertInto('routine_completions')
      .values({ task_id: taskId, owner_id: ownerId, local_date: localDate, completed_at: now })
      .onConflict((oc) => oc.columns(['task_id', 'local_date']).doNothing())
      .execute();
  },

  async unmarkDone(trx, taskId, localDate) {
    await trx
      .deleteFrom('routine_completions')
      .where('task_id', '=', taskId)
      .where('local_date', '=', localDate)
      .execute();
  },
};
