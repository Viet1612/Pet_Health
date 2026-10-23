import type { Kysely } from 'kysely';
import type { Logger } from 'pino';
import sharp from 'sharp';

import type { Database } from '../../../platform/db/kysely.js';
import type { ObjectStoragePort } from '../../../platform/storage/object-storage.port.js';
import { thumbKeyOf } from '../domain/media-key.js';
import type { FailReason, TargetResolvers, UploadRepository } from './ports.js';

export const MAX_INPUT_PIXELS = 50_000_000;
const MAIN_EDGE = 2048;
const THUMB_EDGE = 320;
const JPEG_QUALITY = 82;

/** Ảnh hỏng hoặc quá lớn: đánh dấu FAILED, không thử lại. */
export class ImageRejectedError extends Error {
  constructor(readonly reason: 'CORRUPT' | 'TOO_MANY_PIXELS') {
    super(reason);
    this.name = 'ImageRejectedError';
  }
}

/**
 * HEIC/PNG/JPEG → JPEG q82 cạnh dài ≤ 2048 (không phóng to) + thumbnail ≤ 320. Xoay theo EXIF
 * Orientation rồi bỏ toàn bộ metadata (sharp mặc định không ghi EXIF/XMP/IPTC/GPS, SD-007).
 */
export async function transformImage(
  input: Buffer,
  limitInputPixels = MAX_INPUT_PIXELS,
): Promise<{ main: Buffer; thumb: Buffer }> {
  const render = (edge: number) =>
    sharp(input, { limitInputPixels, failOn: 'error' })
      .rotate()
      .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  try {
    return { main: await render(MAIN_EDGE), thumb: await render(THUMB_EDGE) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ImageRejectedError(/pixel limit/i.test(message) ? 'TOO_MANY_PIXELS' : 'CORRUPT');
  }
}

export interface ProcessImageDeps {
  /** Kết nối app_worker (BYPASSRLS). */
  db: Kysely<Database>;
  storage: ObjectStoragePort;
  uploads: UploadRepository;
  resolvers: TargetResolvers;
  logger: Logger;
}

/**
 * Job `media.process`. Idempotent: upload không còn hoặc đã xử lý thì bỏ qua. Ảnh hỏng/quá lớn →
 * FAILED ngay; lỗi khác ném để pg-boss thử lại, lần cuối → FAILED `PROCESSING_ERROR`.
 */
export async function processImage(
  deps: ProcessImageDeps,
  uploadId: string,
  isLastAttempt: boolean,
): Promise<void> {
  const upload = await deps.uploads.findById(deps.db, uploadId);
  if (upload?.status !== 'PROCESSING') return;

  const resolver = deps.resolvers[upload.targetKind];
  if (!resolver) throw new Error(`Chưa đăng ký TargetResolver cho ${upload.targetKind}`);

  const fail = async (reason: FailReason): Promise<void> => {
    await deps.storage.delete(upload.incomingKey);
    await deps.uploads.markFailed(deps.db, upload.id, reason);
    await resolver.onFailed?.(deps.db, upload, reason);
    deps.logger.warn({ uploadId, reason }, 'media.process failed');
  };

  try {
    const finalKey = await resolver.finalKey(deps.db, upload);
    if (!finalKey) {
      await fail('PROCESSING_ERROR');
      return;
    }
    const input = await deps.storage.read(upload.incomingKey);
    if (!input) {
      await fail('PROCESSING_ERROR');
      return;
    }

    let output: { main: Buffer; thumb: Buffer };
    try {
      output = await transformImage(input);
    } catch (error) {
      if (error instanceof ImageRejectedError) {
        await fail(error.reason);
        return;
      }
      throw error;
    }

    await deps.storage.put(finalKey, output.main);
    await deps.storage.put(thumbKeyOf(finalKey), output.thumb);
    await deps.db.transaction().execute(async (trx) => {
      await deps.uploads.markReady(trx, upload.id);
      await resolver.onReady(trx, upload, finalKey);
    });
    await deps.storage.delete(upload.incomingKey);
  } catch (error) {
    if (!isLastAttempt) throw error;
    deps.logger.error({ err: error, uploadId }, 'media.process lần thử cuối thất bại');
    await fail('PROCESSING_ERROR');
  }
}
