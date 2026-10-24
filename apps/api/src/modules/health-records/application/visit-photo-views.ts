import type { HealthRecordsAppDeps, Trx } from './ports.js';
import type { VisitPhotoView } from './visit-input.js';

/** Ảnh của một lần khám cho `Visit.photos`: ẩn ảnh FAILED, ảnh READY có URL ký 15 phút. */
export async function visitPhotoViews(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  visitId: string,
): Promise<VisitPhotoView[]> {
  const rows = await deps.visitPhotos.listForVisit(trx, ownerId, visitId);
  return rows.map((p) => {
    const ready = p.status === 'READY';
    return {
      id: p.id,
      status: ready ? 'READY' : 'PROCESSING',
      thumbUrl: ready ? deps.media.signUrl(p.thumb_key) : null,
      url: ready ? deps.media.signUrl(p.storage_key) : null,
      createdAt: p.created_at.toISOString(),
    };
  });
}
