import type { PetRepository } from '../../application/ports.js';

/**
 * Repository Kysely cho `pets`. Luôn lọc `owner_id` dù RLS đã chặn (hai lớp, AD-011).
 * Đọc `users.timezone` của chính chủ để tính "hôm nay".
 */
export const kyselyPetRepository: PetRepository = {
  async lockOwnerTimezone(trx, ownerId) {
    const row = await trx
      .selectFrom('users')
      .select('timezone')
      .where('id', '=', ownerId)
      .forUpdate()
      .executeTakeFirst();
    return row?.timezone;
  },

  async ownerTimezone(trx, ownerId) {
    const row = await trx
      .selectFrom('users')
      .select('timezone')
      .where('id', '=', ownerId)
      .executeTakeFirst();
    return row?.timezone;
  },

  async countByOwner(trx, ownerId) {
    const row = await trx
      .selectFrom('pets')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('owner_id', '=', ownerId)
      .executeTakeFirstOrThrow();
    return Number(row.n);
  },

  listByOwner(trx, ownerId) {
    return trx
      .selectFrom('pets')
      .selectAll()
      .where('owner_id', '=', ownerId)
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .execute();
  },

  findById(trx, ownerId, id) {
    return trx
      .selectFrom('pets')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .executeTakeFirst();
  },

  insert(trx, pet) {
    return trx
      .insertInto('pets')
      .values({
        id: pet.id,
        owner_id: pet.ownerId,
        name: pet.name,
        breed: pet.breed,
        sex: pet.sex,
        birth_date: pet.birthDate,
        description: pet.description,
        created_at: pet.now,
        updated_at: pet.now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  update(trx, ownerId, id, patch, now) {
    return trx
      .updateTable('pets')
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.breed !== undefined ? { breed: patch.breed } : {}),
        ...(patch.sex !== undefined ? { sex: patch.sex } : {}),
        ...(patch.birthDate !== undefined ? { birth_date: patch.birthDate } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        updated_at: now,
      })
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .returningAll()
      .executeTakeFirst();
  },
};
