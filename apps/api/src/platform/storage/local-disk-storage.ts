import { createReadStream, createWriteStream, type Dirent } from 'node:fs';
import { mkdir, open, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { newId } from '../ids.js';
import type { ObjectStoragePort } from './object-storage.port.js';

const isNotFound = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

/** Lưu tệp dưới `root`. Mọi khóa phải nằm trong `root` (chặn path traversal). */
export class LocalDiskStorage implements ObjectStoragePort {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private pathOf(key: string): string {
    const full = resolve(this.root, key);
    if (!full.startsWith(this.root + sep)) throw new Error(`Khóa ngoài MEDIA_ROOT: ${key}`);
    return full;
  }

  async writeStream(
    key: string,
    src: Readable,
    opts: { maxBytes: number },
  ): Promise<{ bytes: number; truncated: boolean }> {
    const path = this.pathOf(key);
    await mkdir(dirname(path), { recursive: true });
    let bytes = 0;
    let truncated = false;
    const limiter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        if (truncated) {
          cb();
          return;
        }
        bytes += chunk.length;
        if (bytes > opts.maxBytes) {
          truncated = true;
          cb();
          return;
        }
        cb(null, chunk);
      },
    });
    await pipeline(src, limiter, createWriteStream(path));
    // @fastify/multipart báo cắt qua `file.truncated`; người gọi kiểm thêm.
    return { bytes, truncated };
  }

  async readStream(key: string): Promise<Readable | null> {
    const path = this.pathOf(key);
    try {
      const handle = await open(path, 'r');
      return handle.createReadStream();
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathOf(key));
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async readHead(key: string, n: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of createReadStream(this.pathOf(key), { start: 0, end: n - 1 })) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.pathOf(key);
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.${newId()}.tmp`;
    const handle = await open(tmp, 'w');
    try {
      await handle.writeFile(data);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tmp, path);
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<void> {
    await rm(this.pathOf(prefix), { recursive: true, force: true });
  }

  async list(prefix: string): Promise<{ key: string; modifiedAt: Date }[]> {
    const dir = this.pathOf(prefix);
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (isNotFound(error)) return [];
      throw error;
    }
    const files = entries.filter((e) => e.isFile());
    return Promise.all(
      files.map(async (e) => ({
        key: `${prefix.replace(/\/$/, '')}/${e.name}`,
        modifiedAt: (await stat(join(dir, e.name))).mtime,
      })),
    );
  }
}
