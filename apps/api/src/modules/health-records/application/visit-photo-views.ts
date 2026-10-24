import type { VisitPhotoView } from './visit-input.js';

/** Ảnh của một lần khám cho `Visit.photos`. Tải ảnh làm ở S3-04; tới lúc đó luôn rỗng. */
export function visitPhotoViews(): Promise<VisitPhotoView[]> {
  return Promise.resolve([]);
}
