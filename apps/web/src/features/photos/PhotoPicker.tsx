import { useEffect, useId, useMemo } from 'react';

import { vi } from '../../i18n/vi';
import { AddPhotoTile, UploadTile } from './PhotoTile';
import { MAX_PHOTOS, PHOTO_ACCEPT, photoFileError, type UploadItem } from './upload-store';

const t = vi.photos;

export interface PickedPhoto {
  id: string;
  file: File;
  error: string | null;
}

/**
 * Ô ảnh ở form tạo lần khám: chỉ chọn và xem trước; ảnh được đưa vào hàng đợi tải sau khi lưu lần
 * khám (người dùng không phải đợi ảnh). Tệp sai báo lỗi riêng, không chặn tệp hợp lệ.
 */
export function PhotoPicker({
  value,
  onChange,
}: {
  value: PickedPhoto[];
  onChange: (next: PickedPhoto[]) => void;
}) {
  const inputId = useId();
  const valid = value.filter((p) => !p.error).length;
  const previews = useMemo(
    () =>
      new Map(
        value.map((p) => [
          p.id,
          p.file.type === 'image/jpeg' || p.file.type === 'image/png'
            ? URL.createObjectURL(p.file)
            : null,
        ]),
      ),
    [value],
  );
  useEffect(
    () => () => {
      for (const url of previews.values()) if (url) URL.revokeObjectURL(url);
    },
    [previews],
  );

  const add = (files: File[]) => {
    let slots = MAX_PHOTOS - valid;
    const next = files.map((file) => {
      let error = photoFileError(file);
      if (!error && slots <= 0) error = t.limit;
      if (!error) slots -= 1;
      return { id: crypto.getRandomValues(new Uint32Array(2)).join('-'), file, error };
    });
    onChange([...value, ...next]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((p) => {
        const item: UploadItem = {
          localId: p.id,
          visitId: '',
          file: p.file,
          previewUrl: previews.get(p.id) ?? null,
          state: p.error ? 'rejected' : 'queued',
          progress: 0,
          idempotencyKey: '',
          ...(p.error ? { error: p.error } : {}),
        };
        return p.error ? (
          <UploadTile
            key={p.id}
            item={item}
            onRetry={() => undefined}
            onDismiss={() => {
              onChange(value.filter((x) => x.id !== p.id));
            }}
          />
        ) : (
          <div key={p.id} className="relative">
            {item.previewUrl ? (
              <img
                src={item.previewUrl}
                alt=""
                className="size-[76px] rounded-md object-cover xl:size-[96px]"
              />
            ) : (
              <span className="bg-surface-2 text-caption text-text-muted flex size-[76px] items-center justify-center rounded-md p-1 text-center break-all xl:size-[96px]">
                {p.file.name}
              </span>
            )}
            <button
              type="button"
              aria-label={t.dismiss}
              onClick={() => {
                onChange(value.filter((x) => x.id !== p.id));
              }}
              className="bg-surface/90 absolute top-0.5 right-0.5 inline-flex size-6 items-center justify-center rounded-full text-sm shadow"
            >
              ✕
            </button>
          </div>
        );
      })}
      {valid < MAX_PHOTOS && <AddPhotoTile inputId={inputId} accept={PHOTO_ACCEPT} onFiles={add} />}
    </div>
  );
}
