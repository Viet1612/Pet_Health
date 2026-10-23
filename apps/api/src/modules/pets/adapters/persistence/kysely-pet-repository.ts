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

  async setWeightTarget(trx, ownerId, id, kg, now) {
    const row = await trx
      .updateTable('pets')
      .set({ weight_target_kg: kg, updated_at: now })
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .returning('id')
      .executeTakeFirst();
    return row !== undefined;
  },

  lockForDelete(trx, ownerId, id) {
    return trx
      .selectFrom('pets')
      .select('name')
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .forUpdate()
      .executeTakeFirst();
  },

  async delete(trx, ownerId, id) {
    await trx.deleteFrom('pets').where('id', '=', id).where('owner_id', '=', ownerId).execute();
  },

  async lockAvatarKey(trx, ownerId, id) {
    const row = await trx
      .selectFrom('pets')
      .select('avatar_key')
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .forUpdate()
      .executeTakeFirst();
    return row && { avatarKey: row.avatar_key };
  },

  async setAvatarKey(trx, ownerId, id, key, now) {
    // Khóa dòng, đọc khóa cũ rồi ghi khóa mới.
    const old = await trx
      .selectFrom('pets')
      .select('avatar_key')
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .forUpdate()
      .executeTakeFirst();
    if (!old) return undefined;
    await trx
      .updateTable('pets')
      .set({ avatar_key: key, updated_at: now })
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .execute();
    return { oldKey: old.avatar_key };
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
