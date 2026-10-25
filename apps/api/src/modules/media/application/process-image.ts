import type { Kysely } from 'kysely';
import type { Logger } from 'pino';
import sharp from 'sharp';

import type { Database } from '../../../platform/db/kysely.js';
import type { ObjectStoragePort } from '../../../platform/storage/object-storage.port.js';
import { thumbKeyOf } from '../domain/media-key.js';
import {
  TargetGoneError,
  type FailReason,
  type TargetResolvers,
  type UploadRepository,
} from './ports.js';

export const MAX_INPUT_PIXELS = 50_000_000;
const JPEG_QUALITY = 82;

/**
 * Kích thước đầu ra. Mặc định (ảnh thú cưng, ảnh khám): cạnh dài ≤ 2048, thumbnail ≤ 320. Ảnh bài
 * đăng (F-04): cạnh dài ≤ 1080, thumbnail vuông 360 cắt giữa cho lưới hồ sơ.
 */
export interface ImageVariant {
  mainEdge: number;
  thumbEdge: number;
  squareThumb: boolean;
}
export const DEFAULT_VARIANT: ImageVariant = { mainEdge: 2048, thumbEdge: 320, squareThumb: false };
export const POST_VARIANT: ImageVariant = { mainEdge: 1080, thumbEdge: 360, squareThumb: true };

/** Ảnh hỏng hoặc quá lớn: đánh dấu FAILED, không thử lại. */
export class ImageRejectedError extends Error {
  constructor(readonly reason: 'CORRUPT' | 'TOO_MANY_PIXELS') {
    super(reason);
    this.name = 'ImageRejectedError';
  }
}

/**
 * HEIC/PNG/JPEG → JPEG q82 theo `variant` (không phóng to). Xoay theo EXIF Orientation rồi bỏ
 * toàn bộ metadata (sharp mặc định không ghi EXIF/XMP/IPTC/GPS, SD-007).
 */
export async function transformImage(
  input: Buffer,
  limitInputPixels = MAX_INPUT_PIXELS,
  variant: ImageVariant = DEFAULT_VARIANT,
): Promise<{ main: Buffer; thumb: Buffer; width: number; height: number }> {
  const render = (edge: number, square: boolean) =>
    sharp(input, { limitInputPixels, failOn: 'error' })
      .rotate()
      .resize(
        square
          ? { width: edge, height: edge, fit: 'cover', position: 'centre' }
          : { width: edge, height: edge, fit: 'inside', withoutEnlargement: true },
      )
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer({ resolveWithObject: true });
  try {
    const main = await render(variant.mainEdge, false);
    const thumb = await render(variant.thumbEdge, variant.squareThumb);
    return {
      main: main.data,
      thumb: thumb.data,
      width: main.info.width,
      height: main.info.height,
    };
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

    let output: Awaited<ReturnType<typeof transformImage>>;
    try {
      output = await transformImage(
        input,
        MAX_INPUT_PIXELS,
        upload.targetKind === 'POST_PHOTO' ? POST_VARIANT : DEFAULT_VARIANT,
      );
    } catch (error) {
      if (error instanceof ImageRejectedError) {
        await fail(error.reason);
        return;
      }
      throw error;
    }

    await deps.storage.put(finalKey, output.main);
    await deps.storage.put(thumbKeyOf(finalKey), output.thumb);
    let staleKeys: string[];
    try {
      staleKeys = await deps.db.transaction().execute(async (trx) => {
        await deps.uploads.markReady(trx, upload.id);
        return resolver.onReady(trx, upload, finalKey, {
          bytes: output.main.length,
          width: output.width,
          height: output.height,
        });
      });
    } catch (error) {
      if (!(error instanceof TargetGoneError)) throw error;
      await deps.storage.delete(finalKey);
      await deps.storage.delete(thumbKeyOf(finalKey));
      await fail('PROCESSING_ERROR');
      return;
    }
    await deps.storage.delete(upload.incomingKey);
    // Ảnh cũ (ảnh đại diện bị thay): xóa sau commit, kèm thumbnail.
    for (const key of staleKeys) {
      await deps.storage.delete(key);
      await deps.storage.delete(thumbKeyOf(key));
    }
  } catch (error) {
    if (!isLastAttempt) throw error;
    deps.logger.error({ err: error, uploadId }, 'media.process lần thử cuối thất bại');
    await fail('PROCESSING_ERROR');
  }
}
