import type { Selectable } from 'kysely';

import type { Uploads } from '../../../../platform/db/database.types.js';
import type {
  FailReason,
  TargetKind,
  UploadRecord,
  UploadRepository,
  UploadStatus,
} from '../../application/ports.js';

function toRecord(row: Selectable<Uploads>): UploadRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    targetKind: row.target_kind as TargetKind,
    targetId: row.target_id,
    incomingKey: row.incoming_key,
    status: row.status as UploadStatus,
    failReason: row.fail_reason as FailReason | null,
  };
}

export const kyselyUploadRepository: UploadRepository = {
  async insert(q, upload) {
    await q
      .insertInto('uploads')
      .values({
        id: upload.id,
        owner_id: upload.ownerId,
        target_kind: upload.targetKind,
        target_id: upload.targetId,
        incoming_key: upload.incomingKey,
      })
      .execute();
  },

  async findForOwner(q, ownerId, id) {
    const row = await q
      .selectFrom('uploads')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .executeTakeFirst();
    return row && toRecord(row);
  },

  async findById(q, id) {
    const row = await q.selectFrom('uploads').selectAll().where('id', '=', id).executeTakeFirst();
    return row && toRecord(row);
  },

  async markReady(q, id) {
    await q
      .updateTable('uploads')
      .set({ status: 'READY', fail_reason: null })
      .where('id', '=', id)
      .execute();
  },

  async markFailed(q, id, reason) {
    await q
      .updateTable('uploads')
      .set({ status: 'FAILED', fail_reason: reason })
      .where('id', '=', id)
      .execute();
  },
};
