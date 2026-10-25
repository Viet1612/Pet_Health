import type { Readable } from 'node:stream';

/**
 * Kho tệp (AD-007). Khóa dạng đường dẫn tương đối: `incoming/{uploadId}`,
 * `u/{userId}/p/{petId}/avatar/{id}.jpg`... Bản hiện tại lưu trên đĩa; có thể thay bằng S3.
 */
export interface ObjectStoragePort {
  /** Ghi stream, dừng khi vượt `maxBytes` (khi đó `truncated = true`, tệp vẫn còn — người gọi xóa). */
  writeStream(
    key: string,
    src: Readable,
    opts: { maxBytes: number },
  ): Promise<{ bytes: number; truncated: boolean }>;
  /** `null` nếu không có tệp. */
  readStream(key: string): Promise<Readable | null>;
  read(key: string): Promise<Buffer | null>;
  readHead(key: string, n: number): Promise<Buffer>;
  /** Ghi tệp `.tmp` rồi rename (nguyên tử). */
  put(key: string, data: Buffer): Promise<void>;
  /** Không lỗi nếu không có. */
  delete(key: string): Promise<void>;
  /** Xóa cả thư mục, idempotent. */
  deletePrefix(prefix: string): Promise<void>;
  /** Tệp ngay dưới `prefix` (không đệ quy) kèm thời điểm sửa; thư mục chưa có → `[]` (S6-06). */
  list(prefix: string): Promise<{ key: string; modifiedAt: Date }[]>;
}
