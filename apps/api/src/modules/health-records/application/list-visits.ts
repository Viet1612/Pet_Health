import { AppError, NotFoundError } from '../../../platform/errors/app-error.js';
import { decodeVisitCursor, encodeVisitCursor, summarizeVisitText } from '../domain/visit.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';

export const VISIT_PAGE_DEFAULT = 20;

export interface VisitSummaryView {
  id: string;
  visitedOn: string;
  diagnosis: string | null;
  symptoms: string | null;
  /** Số ảnh `READY`. */
  photoCount: number;
}

/**
 * `GET /pets/{petId}/visits` (US-031): mới nhất trước, phân trang keyset (không trùng, không sót
 * kể cả nhiều bản ghi cùng ngày).
 */
export async function listVisits(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
  page: { limit: number; cursor?: string | undefined },
): Promise<{ items: VisitSummaryView[]; nextCursor: string | null; totalCount: number }> {
  const after = page.cursor === undefined ? null : decodeVisitCursor(page.cursor);
  if (page.cursor !== undefined && after === null) {
    throw new AppError(400, 'INVALID_CURSOR', 'Con trỏ phân trang không hợp lệ');
  }
  const pet = await deps.pets.getOwnedPet(trx, ownerId, petId);
  if (!pet) throw new NotFoundError();

  const rows = await deps.visits.list(trx, ownerId, petId, after, page.limit + 1);
  const hasMore = rows.length > page.limit;
  const pageRows = hasMore ? rows.slice(0, page.limit) : rows;
  const last = pageRows.at(-1);
  return {
    items: pageRows.map((r) => ({
      id: r.id,
      visitedOn: r.visitedOn,
      diagnosis: summarizeVisitText(r.diagnosis),
      symptoms: summarizeVisitText(r.symptoms),
      photoCount: r.photoCount,
    })),
    nextCursor:
      hasMore && last
        ? encodeVisitCursor({ v: last.visitedOn, c: last.createdAtText, i: last.id })
        : null,
    totalCount: await deps.visits.count(trx, ownerId, petId),
  };
}
