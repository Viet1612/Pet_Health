import type { Readable } from 'node:stream';

import type { Config } from '../../config.js';
import { LocalDiskStorage } from './local-disk-storage.js';
import type { ObjectStoragePort } from './object-storage.port.js';
import { R2Storage } from './r2-storage.js';

const INCOMING = 'incoming/';

/**
 * F-01: tệp tạm `incoming/` (vừa nhận từ client, worker đọc ngay) nằm trên đĩa; ảnh đã xử lý nằm
 * trên R2. Chọn kho theo khóa nên code nghiệp vụ không đổi.
 */
export class HybridStorage implements ObjectStoragePort {
  constructor(
    private readonly disk: ObjectStoragePort,
    private readonly remote: ObjectStoragePort,
  ) {}

  private of(key: string): ObjectStoragePort {
    return key.startsWith(INCOMING) ? this.disk : this.remote;
  }

  writeStream(key: string, src: Readable, opts: { maxBytes: number }) {
    return this.of(key).writeStream(key, src, opts);
  }
  readStream(key: string) {
    return this.of(key).readStream(key);
  }
  read(key: string) {
    return this.of(key).read(key);
  }
  readHead(key: string, n: number) {
    return this.of(key).readHead(key, n);
  }
  put(key: string, data: Buffer) {
    return this.of(key).put(key, data);
  }
  delete(key: string) {
    return this.of(key).delete(key);
  }
  deletePrefix(prefix: string) {
    return this.of(prefix).deletePrefix(prefix);
  }
  list(prefix: string) {
    return this.of(prefix).list(prefix);
  }
}

/** `STORAGE_DRIVER=disk` (mặc định, máy dev) hoặc `r2` (production). */
export function createStorage(config: Config): ObjectStoragePort {
  const disk = new LocalDiskStorage(config.MEDIA_ROOT);
  if (config.STORAGE_DRIVER === 'disk') return disk;
  return new HybridStorage(
    disk,
    new R2Storage({
      accountId: config.R2_ACCOUNT_ID,
      bucket: config.R2_BUCKET,
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    }),
  );
}
