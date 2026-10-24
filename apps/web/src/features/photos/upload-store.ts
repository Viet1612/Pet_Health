import { ApiError, newIdempotencyKey } from '@ph/api-client';

import { api, unwrap } from '../../api/client';
import { uploadFile } from '../../api/upload-file';
import { m } from '../../i18n';

// Hàng đợi tải ảnh lần khám (FLW-07, ST-04): sống ngoài cây route nên ảnh vẫn tải tiếp khi người
// dùng chuyển màn hình (tạo lần khám xong là sang chi tiết ngay, không đợi ảnh).

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5_242_880;
const CONCURRENCY = 2;
const POLL_MS = 1000;
const POLL_TRIES = 20;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);
const ACCEPTED_EXT = /\.(jpe?g|png|heic|heif)$/i;
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/heic,.heic';

export type UploadState = 'queued' | 'uploading' | 'processing' | 'error' | 'rejected';

export interface UploadItem {
  localId: string;
  visitId: string;
  file: File;
  /** Xem trước JPG/PNG; HEIC hiện icon (trình duyệt không vẽ được). */
  previewUrl: string | null;
  state: UploadState;
  progress: number;
  idempotencyKey: string;
  photoId?: string;
  uploadId?: string;
  error?: string;
  /** Lỗi mạng/xử lý → "Thử lại"; 413/415/409 → thử lại cũng lỗi, chỉ "Bỏ". */
  retryable?: boolean;
}

/** Lỗi kiểm ở client (định dạng, dung lượng); `null` nếu tệp hợp lệ. */
export function photoFileError(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type) && !ACCEPTED_EXT.test(file.name)) return m.photos.unsupported;
  if (file.size > MAX_PHOTO_BYTES) return m.photos.tooLarge;
  return null;
}

const previewable = (file: File) => file.type === 'image/jpeg' || file.type === 'image/png';

let items: UploadItem[] = [];
const listeners = new Set<() => void>();
let onPhotoChanged: (visitId: string) => void = () => undefined;

function emit(): void {
  for (const l of listeners) l();
}

function patch(localId: string, changes: Partial<UploadItem>): void {
  items = items.map((i) => (i.localId === localId ? { ...i, ...changes } : i));
  emit();
}

function remove(localId: string): void {
  const item = items.find((i) => i.localId === localId);
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
  items = items.filter((i) => i.localId !== localId);
  emit();
}

export function subscribeUploads(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getUploads = (): UploadItem[] => items;

/** Gọi một lần ở AppShell: ảnh xong/xóa → làm mới query của lần khám. */
export function setPhotoChangedHandler(handler: (visitId: string) => void): void {
  onPhotoChanged = handler;
}

/** Số ô đang chiếm chỗ trong giới hạn 5 (không tính ô lỗi/bị từ chối). */
export const activeCount = (visitId: string): number =>
  items.filter(
    (i) =>
      i.visitId === visitId &&
      (i.state === 'queued' || i.state === 'uploading' || i.state === 'processing'),
  ).length;

/**
 * Thêm tệp vào hàng đợi của lần khám. Mỗi tệp kiểm riêng; tệp sai hoặc vượt 5 ảnh hiện lỗi ở ô
 * của nó, không chặn tệp hợp lệ. `existing` = số ảnh đã có trên server (không tính lỗi).
 */
export function enqueuePhotos(visitId: string, files: File[], existing: number): void {
  let slots = MAX_PHOTOS - existing - activeCount(visitId);
  for (const file of files) {
    let error = photoFileError(file);
    if (!error && slots <= 0) error = m.photos.limit;
    if (!error) slots -= 1;
    items = [
      ...items,
      {
        localId: newIdempotencyKey(),
        visitId,
        file,
        previewUrl: previewable(file) ? URL.createObjectURL(file) : null,
        state: error ? 'rejected' : 'queued',
        progress: 0,
        idempotencyKey: newIdempotencyKey(),
        ...(error ? { error } : {}),
      },
    ];
  }
  emit();
  pump();
}

export function dismissUpload(localId: string): void {
  remove(localId);
}

/**
 * "Thử lại": lỗi mạng → gửi lại cùng key (server có thể đã nhận). Ảnh đã nhận nhưng xử lý lỗi/quá
 * 20 s → xóa ảnh dở trên server rồi gửi lại với key mới.
 */
export async function retryUpload(localId: string): Promise<void> {
  const item = items.find((i) => i.localId === localId);
  if (!item) return;
  let key = item.idempotencyKey;
  if (item.photoId) {
    try {
      await api.DELETE('/photos/{id}', { params: { path: { id: item.photoId } } });
    } catch {
      // Ảnh không còn (đã ẩn hoặc đã xóa): vẫn gửi lại.
    }
    key = newIdempotencyKey();
  }
  items = items.map((i) =>
    i.localId === localId
      ? {
          localId: i.localId,
          visitId: i.visitId,
          file: i.file,
          previewUrl: i.previewUrl,
          state: 'queued',
          progress: 0,
          idempotencyKey: key,
        }
      : i,
  );
  emit();
  pump();
}

function pump(): void {
  const running = items.filter((i) => i.state === 'uploading').length;
  for (const item of items.filter((i) => i.state === 'queued').slice(0, CONCURRENCY - running)) {
    patch(item.localId, { state: 'uploading', progress: 0 });
    void run(item);
  }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

async function run(item: UploadItem): Promise<void> {
  try {
    const accepted = await uploadFile<{ photoId: string; uploadId: string }>({
      method: 'POST',
      path: `/visits/${item.visitId}/photos`,
      file: item.file,
      headers: { 'Idempotency-Key': item.idempotencyKey },
      onProgress: (progress) => {
        patch(item.localId, { progress });
      },
    });
    patch(item.localId, {
      state: 'processing',
      photoId: accepted.photoId,
      uploadId: accepted.uploadId,
    });
    pump();
    onPhotoChanged(item.visitId);

    for (let i = 0; i < POLL_TRIES; i += 1) {
      await sleep(POLL_MS);
      if (!items.some((x) => x.localId === item.localId)) return;
      const { status } = unwrap(
        await api.GET('/uploads/{uploadId}', { params: { path: { uploadId: accepted.uploadId } } }),
      );
      if (status === 'READY') {
        remove(item.localId);
        onPhotoChanged(item.visitId);
        return;
      }
      if (status === 'FAILED') break;
    }
    patch(item.localId, { state: 'error', error: m.photos.failed, retryable: true });
  } catch (err) {
    const final = err instanceof ApiError && [409, 413, 415].includes(err.status);
    const message =
      err instanceof ApiError && err.status === 413
        ? m.photos.tooLarge
        : err instanceof ApiError && err.status === 415
          ? m.photos.unsupported
          : err instanceof ApiError && err.status === 409
            ? m.photos.limit
            : m.photos.failed;
    patch(item.localId, { state: final ? 'rejected' : 'error', error: message, retryable: !final });
  } finally {
    pump();
  }
}
