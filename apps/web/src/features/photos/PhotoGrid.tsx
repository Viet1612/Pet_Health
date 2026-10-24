import { lazy, Suspense, useRef, useState } from 'react';

import { useVisitUploads } from './hooks';
import { ServerPhotoTile, UploadTile } from './PhotoTile';
import { dismissUpload, retryUpload } from './upload-store';

// Lightbox chỉ tải khi mở ảnh.
const Lightbox = lazy(() => import('./Lightbox'));

/**
 * Lưới ảnh ở chi tiết lần khám (SCR-12): thumbnail 3 cột, ảnh đang xử lý; kèm ảnh đang tải từ
 * form tạo (tiếp tục tải sau khi chuyển màn hình). Chạm thumbnail mở lightbox.
 */
export function PhotoGrid({
  visitId,
  visitDate,
  photos,
  onImageError,
}: {
  visitId: string;
  visitDate: string;
  photos: { id: string; thumbUrl: string | null; url: string | null }[];
  /** URL ký hết hạn (403) → tải lại chi tiết một lần. */
  onImageError: () => void;
}) {
  const uploads = useVisitUploads(visitId);
  const [open, setOpen] = useState<number | null>(null);
  const refetched = useRef(false);
  const ready = photos.filter((p) => p.url);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 xl:grid-cols-[repeat(auto-fill,160px)]">
        {photos.map((p) => (
          <ServerPhotoTile
            key={p.id}
            thumbUrl={p.thumbUrl}
            alt=""
            onOpen={() => {
              setOpen(ready.findIndex((r) => r.id === p.id));
            }}
            onImageError={() => {
              if (refetched.current) return;
              refetched.current = true;
              onImageError();
            }}
          />
        ))}
        {uploads.map((item) => (
          <UploadTile
            key={item.localId}
            item={item}
            onRetry={() => void retryUpload(item.localId)}
            onDismiss={() => {
              dismissUpload(item.localId);
            }}
          />
        ))}
      </div>
      {open !== null && open >= 0 && (
        <Suspense fallback={null}>
          <Lightbox
            photos={ready}
            startIndex={open}
            visitDate={visitDate}
            onClose={() => {
              setOpen(null);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
