import { AlertCircle, ImageIcon, Loader2, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { vi } from '../../i18n/vi';
import { cx } from '../../ui/cx';
import type { UploadItem } from './upload-store';

const t = vi.photos;
const TILE = 'relative size-[76px] shrink-0 overflow-hidden rounded-md xl:size-[96px]';

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="bg-surface/90 text-text absolute top-0.5 right-0.5 inline-flex size-6 items-center justify-center rounded-full shadow"
    >
      <X size={14} aria-hidden />
    </button>
  );
}

/** Ảnh đã có trên server: thumbnail hoặc ô "Đang xử lý". */
export function ServerPhotoTile({
  thumbUrl,
  alt,
  onOpen,
  onRemove,
  removeLabel,
  onImageError,
}: {
  thumbUrl: string | null;
  alt: string;
  onOpen?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  onImageError?: () => void;
}) {
  const body: ReactNode = thumbUrl ? (
    <img src={thumbUrl} alt={alt} className="size-full object-cover" onError={onImageError} />
  ) : (
    <span className="bg-surface-2 text-text-muted text-caption flex size-full flex-col items-center justify-center gap-1">
      <Loader2 size={18} aria-hidden className="animate-spin" />
      {t.processing}
    </span>
  );
  return (
    <div className={TILE}>
      {onOpen && thumbUrl ? (
        <button type="button" onClick={onOpen} className="size-full">
          {body}
        </button>
      ) : (
        body
      )}
      {onRemove && removeLabel && <RemoveButton label={removeLabel} onClick={onRemove} />}
    </div>
  );
}

/** Ảnh đang tải lên / xử lý / lỗi / bị từ chối từ kho tải ảnh. */
export function UploadTile({
  item,
  onRetry,
  onDismiss,
}: {
  item: UploadItem;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const failed = item.state === 'error' || item.state === 'rejected';
  return (
    <div className={cx(TILE, 'bg-surface-2', failed && 'border-danger border-2')}>
      {item.previewUrl ? (
        <img src={item.previewUrl} alt="" className="size-full object-cover opacity-60" />
      ) : (
        <span className="text-text-muted flex size-full items-center justify-center">
          <ImageIcon size={24} aria-hidden />
        </span>
      )}
      <div
        aria-live="polite"
        className="text-caption absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-center"
      >
        {item.state === 'queued' && <Loader2 size={18} aria-hidden className="animate-spin" />}
        {item.state === 'uploading' && (
          <>
            <span className="font-bold">{t.uploading(item.progress)}</span>
            <span className="bg-surface h-1 w-3/4 overflow-hidden rounded-full">
              <span
                className="bg-primary block h-full"
                style={{ width: `${String(item.progress)}%` }}
              />
            </span>
          </>
        )}
        {item.state === 'processing' && (
          <>
            <Loader2 size={18} aria-hidden className="animate-spin" />
            {t.processing}
          </>
        )}
        {failed && (
          <>
            <AlertCircle size={16} aria-hidden className="text-danger" />
            <span className="text-danger leading-tight">{item.error}</span>
            {item.retryable && (
              <button type="button" onClick={onRetry} className="text-primary font-bold underline">
                {t.retry}
              </button>
            )}
          </>
        )}
      </div>
      {failed && <RemoveButton label={t.dismiss} onClick={onDismiss} />}
    </div>
  );
}

/** Ô cuối "+ Thêm ảnh" (viền nét đứt); không đặt `capture` để điện thoại mở cả camera và thư viện. */
export function AddPhotoTile({
  inputId,
  onFiles,
  accept,
}: {
  inputId: string;
  onFiles: (files: File[]) => void;
  accept: string;
}) {
  return (
    <>
      <label
        htmlFor={inputId}
        className={cx(
          TILE,
          'border-border text-primary text-caption hover:bg-surface-2 flex cursor-pointer items-center justify-center border-2 border-dashed font-bold',
        )}
      >
        {t.add}
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}
