import { api, unwrap } from '../../api/client';
import { uploadFile } from '../../api/upload-file';
import { m } from '../../i18n';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);
const ACCEPTED_EXT = /\.(jpe?g|png|heic|heif)$/i;
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/heic,.heic';

const POLL_MS = 1000;
const POLL_LIMIT_MS = 20_000;

/** Kiểm ở client trước khi gửi (server vẫn kiểm lại bằng nội dung tệp). */
export function avatarFileError(file: File): string | null {
  if (file.size > MAX_AVATAR_BYTES) return m.pets.avatar.tooLarge;
  if (!ACCEPTED_TYPES.has(file.type) && !ACCEPTED_EXT.test(file.name)) {
    return m.pets.avatar.unsupported;
  }
  return null;
}

/** Trình duyệt (trừ Safari) không hiển thị HEIC: xem trước bằng icon tới khi ảnh READY. */
export const isPreviewable = (file: File): boolean =>
  file.type === 'image/jpeg' || file.type === 'image/png';

export class AvatarUploadError extends Error {
  constructor() {
    super(m.pets.avatar.failed);
    this.name = 'AvatarUploadError';
  }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Tải ảnh đại diện (có %), rồi hỏi `GET /uploads/{id}` mỗi 1 s, tối đa 20 s. `READY` thì xong;
 * `FAILED` hoặc quá 20 s ném `AvatarUploadError`.
 */
export async function uploadAvatar(
  petId: string,
  file: File,
  on: { progress: (percent: number) => void; processing: () => void },
): Promise<void> {
  const { uploadId } = await uploadFile<{ uploadId: string }>({
    method: 'PUT',
    path: `/pets/${petId}/avatar`,
    file,
    onProgress: on.progress,
  });
  on.processing();
  for (let waited = 0; waited < POLL_LIMIT_MS; waited += POLL_MS) {
    await sleep(POLL_MS);
    const { status } = unwrap(
      await api.GET('/uploads/{uploadId}', { params: { path: { uploadId } } }),
    );
    if (status === 'READY') return;
    if (status === 'FAILED') throw new AvatarUploadError();
  }
  throw new AvatarUploadError();
}

/**
 * Ảnh chọn ở form tạo nhưng tải lỗi: giữ tệp theo petId để trang sửa "Thử lại" không phải chọn
 * lại (chỉ trong phiên trang).
 */
export const pendingAvatarFiles = new Map<string, File>();
