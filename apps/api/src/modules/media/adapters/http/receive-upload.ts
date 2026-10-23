import type { FastifyRequest } from 'fastify';

import { AppError } from '../../../../platform/errors/app-error.js';
import { MAX_UPLOAD_BYTES } from '../../../../platform/http/multipart.js';
import { newId } from '../../../../platform/ids.js';
import type { ObjectStoragePort } from '../../../../platform/storage/object-storage.port.js';
import { detectImageFormat } from '../../domain/magic-bytes.js';
import { incomingKey } from '../../domain/media-key.js';

export interface ReceivedUpload {
  uploadId: string;
  incomingKey: string;
}

const fileTooLarge = () => new AppError(413, 'FILE_TOO_LARGE', 'Ảnh vượt 5 MB');

/**
 * Nhận field `file` của multipart, ghi vào `incoming/{uploadId}` và kiểm định dạng bằng nội dung
 * tệp. Lỗi thì xóa tệp vừa ghi rồi ném 413/415/422.
 */
export async function receiveUploadFile(
  req: FastifyRequest,
  storage: ObjectStoragePort,
): Promise<ReceivedUpload> {
  let file: Awaited<ReturnType<FastifyRequest['file']>>;
  try {
    file = await req.file();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, 'INVALID_UPLOAD', 'Tệp tải lên không hợp lệ');
  }
  if (file?.fieldname !== 'file') {
    file?.file.resume();
    throw new AppError(422, 'FILE_REQUIRED', 'Chưa chọn ảnh', {
      errors: [{ field: 'file', code: 'REQUIRED', message: 'Chưa chọn ảnh' }],
    });
  }

  const uploadId = newId();
  const key = incomingKey(uploadId);
  try {
    const written = await storage.writeStream(key, file.file, { maxBytes: MAX_UPLOAD_BYTES });
    if (written.truncated || file.file.truncated) throw fileTooLarge();
    if (!detectImageFormat(await storage.readHead(key, 16))) {
      throw new AppError(415, 'UNSUPPORTED_FORMAT', 'Định dạng không hỗ trợ (chỉ JPG, PNG, HEIC)');
    }
    return { uploadId, incomingKey: key };
  } catch (error) {
    await storage.delete(key);
    throw error;
  }
}
