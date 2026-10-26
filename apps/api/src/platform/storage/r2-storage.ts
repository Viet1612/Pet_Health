import { Readable } from 'node:stream';

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  type S3ServiceException,
} from '@aws-sdk/client-s3';

import type { ObjectStoragePort } from './object-storage.port.js';

export interface R2Options {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const isMissing = (error: unknown): boolean =>
  error instanceof NoSuchKey ||
  (error as Partial<S3ServiceException> | null)?.$metadata?.httpStatusCode === 404 ||
  (error as { name?: string } | null)?.name === 'NoSuchKey';

async function toBuffer(body: unknown): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/**
 * Kho ảnh trên Cloudflare R2 (F-01), API tương thích S3. Bucket **không** công khai: client vẫn xem
 * ảnh qua `/media/*` (URL ký 15 phút), API đọc từ R2 rồi stream về.
 */
export class R2Storage implements ObjectStoragePort {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(opts: R2Options) {
    this.bucket = opts.bucket;
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${opts.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    });
  }

  /** Đọc hết vào bộ nhớ để giới hạn kích thước (ảnh ≤ 5 MB) rồi ghi một lần. */
  async writeStream(
    key: string,
    src: Readable,
    opts: { maxBytes: number },
  ): Promise<{ bytes: number; truncated: boolean }> {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let truncated = false;
    for await (const chunk of src as AsyncIterable<Buffer>) {
      bytes += chunk.length;
      if (bytes > opts.maxBytes) {
        truncated = true;
        continue;
      }
      chunks.push(chunk);
    }
    await this.put(key, Buffer.concat(chunks));
    return { bytes, truncated };
  }

  async readStream(key: string): Promise<Readable | null> {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return res.Body ? Readable.from(res.Body as AsyncIterable<Uint8Array>) : null;
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return res.Body ? await toBuffer(res.Body) : null;
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  async readHead(key: string, n: number): Promise<Buffer> {
    try {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${String(n - 1)}` }),
      );
      return res.Body ? await toBuffer(res.Body) : Buffer.alloc(0);
    } catch (error) {
      if (isMissing(error)) return Buffer.alloc(0);
      throw error;
    }
  }

  /** PUT của S3/R2 vốn nguyên tử: người đọc thấy bản cũ hoặc bản mới, không thấy bản dở. */
  async put(key: string, data: Buffer): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: key.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream',
      }),
    );
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }

  /** Xóa mọi object dưới `prefix` theo lô 1.000 (giới hạn của DeleteObjects). */
  async deletePrefix(prefix: string): Promise<void> {
    let token: string | undefined;
    do {
      const page = await this.s3.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
      if (keys.length > 0) {
        await this.s3.send(
          new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys, Quiet: true } }),
        );
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }

  /** Object ngay dưới `prefix` (không đệ quy, dùng `Delimiter: '/'`). */
  async list(prefix: string): Promise<{ key: string; modifiedAt: Date }[]> {
    const out: { key: string; modifiedAt: Date }[] = [];
    let token: string | undefined;
    do {
      const page = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          Delimiter: '/',
          ContinuationToken: token,
        }),
      );
      for (const o of page.Contents ?? []) {
        if (o.Key) out.push({ key: o.Key, modifiedAt: o.LastModified ?? new Date(0) });
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return out;
  }
}
