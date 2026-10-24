import { useId, useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useToast } from '../../ui/toast';
import { useVisitUploads } from './hooks';
import { AddPhotoTile, ServerPhotoTile, UploadTile } from './PhotoTile';
import {
  dismissUpload,
  enqueuePhotos,
  MAX_PHOTOS,
  PHOTO_ACCEPT,
  retryUpload,
} from './upload-store';

const t = m.photos;

/**
 * Ô ảnh ở form sửa lần khám: chọn là tải ngay (tối đa 2 ảnh song song, % riêng từng ảnh); ảnh cũ có
 * ✕ xóa qua xác nhận.
 */
export function PhotoUploader({
  visitId,
  photos,
  onDeletePhoto,
}: {
  visitId: string;
  photos: { id: string; thumbUrl: string | null }[];
  onDeletePhoto: (photoId: string) => Promise<void>;
}) {
  const inputId = useId();
  const toast = useToast();
  const uploads = useVisitUploads(visitId);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const active = uploads.filter((u) => u.state !== 'error' && u.state !== 'rejected').length;
  const used = photos.length + active;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <ServerPhotoTile
            key={p.id}
            thumbUrl={p.thumbUrl}
            alt=""
            removeLabel={t.remove(i + 1)}
            onRemove={() => {
              setConfirm(p.id);
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
        {used < MAX_PHOTOS && (
          <AddPhotoTile
            inputId={inputId}
            accept={PHOTO_ACCEPT}
            onFiles={(files) => {
              enqueuePhotos(visitId, files, photos.length);
            }}
          />
        )}
      </div>
      {confirm && (
        <ConfirmDialog
          open
          title={t.removeConfirm}
          confirmLabel={t.removeAction}
          loading={deleting}
          onClose={() => {
            setConfirm(null);
          }}
          onConfirm={() => {
            setDeleting(true);
            onDeletePhoto(confirm)
              .then(() => {
                setConfirm(null);
              })
              .catch((err: unknown) => {
                const msg = toUserMessage(err);
                toast.show({
                  kind: 'error',
                  message: 'message' in msg ? msg.message : m.error.serverToast,
                });
              })
              .finally(() => {
                setDeleting(false);
              });
          }}
        />
      )}
    </div>
  );
}
