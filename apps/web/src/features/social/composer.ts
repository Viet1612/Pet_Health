// Logic thuần của màn soạn bài (F-05): thêm ảnh có giới hạn, đổi thứ tự, gắn thú cưng.

import { photoFileError } from '../photos/upload-store';

export const MAX_POST_PHOTOS = 5;
export const MAX_POST_PETS = 5;
export const CAPTION_MAX = 2200;

export interface ComposerPhoto {
  id: string;
  file: File;
}

/**
 * Thêm tệp vào danh sách, bỏ tệp sai định dạng / quá 50 MB và phần vượt 5 ảnh (ảnh > 5 MB được
 * nén khi gửi). Trả lỗi đầu tiên (để báo một lần) hoặc `null`.
 */
export function addPhotos(
  current: ComposerPhoto[],
  files: File[],
  makeId: () => string,
): { photos: ComposerPhoto[]; error: string | null; overLimit: boolean } {
  const next = [...current];
  let error: string | null = null;
  let overLimit = false;
  for (const file of files) {
    const problem = photoFileError(file);
    if (problem) {
      error ??= problem;
      continue;
    }
    if (next.length >= MAX_POST_PHOTOS) {
      overLimit = true;
      continue;
    }
    next.push({ id: makeId(), file });
  }
  return { photos: next, error, overLimit };
}

/** Đổi chỗ ảnh `index` với ảnh bên cạnh (`-1` lên trước, `1` ra sau); ra ngoài biên thì giữ nguyên. */
export function movePhoto<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  const a = next[index] as T;
  next[index] = next[target] as T;
  next[target] = a;
  return next;
}

/** Bật/tắt gắn một bé; đã đủ 5 thì không thêm nữa. */
export function togglePet(selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  return selected.length >= MAX_POST_PETS ? selected : [...selected, id];
}
