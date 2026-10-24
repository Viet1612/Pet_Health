import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  ImageRejectedError,
  transformImage,
} from '../src/modules/media/application/process-image.js';
import { detectImageFormat } from '../src/modules/media/domain/magic-bytes.js';
import {
  avatarKey,
  isMediaKey,
  isPurgePrefix,
  thumbKeyOf,
} from '../src/modules/media/domain/media-key.js';
import {
  signedExpiry,
  signMediaUrl,
  verifyMediaSignature,
} from '../src/modules/media/domain/signed-url.js';
import { purgePrefix } from '../src/modules/media/application/purge-prefix.js';
import { LocalDiskStorage } from '../src/platform/storage/local-disk-storage.js';

const U1 = '01a16a77-ba1a-7c34-9b39-a53332ba4d26';
const U2 = '01a16a93-00b6-700d-93b3-497f1c5aac0f';
const U3 = '01a16a93-00b6-700d-93b3-497f1c5aac10';

const head = (...parts: (string | number[])[]): Buffer =>
  Buffer.concat(
    parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))),
  );

describe('detectImageFormat', () => {
  it('nhận JPEG, PNG, HEIC (heic/heix/mif1)', () => {
    expect(detectImageFormat(head([0xff, 0xd8, 0xff, 0xe0]))).toBe('JPEG');
    expect(detectImageFormat(head([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe('PNG');
    for (const brand of ['heic', 'heix', 'mif1']) {
      expect(detectImageFormat(head([0, 0, 0, 0x18], 'ftyp', brand))).toBe('HEIC');
    }
  });

  it('từ chối AVIF, văn bản và tệp < 12 byte', () => {
    expect(detectImageFormat(head([0, 0, 0, 0x18], 'ftyp', 'avif'))).toBeNull();
    expect(detectImageFormat(Buffer.from('xin chao, day la file text'))).toBeNull();
    expect(detectImageFormat(head([0, 0, 0, 0x18], 'ftyp'))).toBeNull();
  });
});

describe('khóa ảnh', () => {
  it('khớp mẫu ảnh đại diện và ảnh khám, có hoặc không _thumb', () => {
    const key = avatarKey(U1, U2, U3);
    expect(isMediaKey(key)).toBe(true);
    expect(isMediaKey(thumbKeyOf(key))).toBe(true);
    expect(isMediaKey(`u/${U1}/p/${U2}/v/${U3}/${U1}.jpg`)).toBe(true);
  });

  it('từ chối path traversal, UUID viết hoa, đuôi khác', () => {
    expect(isMediaKey(`u/${U1}/p/${U2}/avatar/../../${U3}.jpg`)).toBe(false);
    expect(isMediaKey(`u/${U1.toUpperCase()}/p/${U2}/avatar/${U3}.jpg`)).toBe(false);
    expect(isMediaKey(`u/${U1}/p/${U2}/avatar/${U3}.png`)).toBe(false);
    expect(isMediaKey(`incoming/${U1}`)).toBe(false);
  });

  it('prefix xóa hợp lệ', () => {
    expect(isPurgePrefix(`u/${U1}/`)).toBe(true);
    expect(isPurgePrefix(`u/${U1}/p/${U2}/`)).toBe(true);
    expect(isPurgePrefix(`u/${U1}/p/${U2}/avatar/`)).toBe(true);
    expect(isPurgePrefix(`u/${U1}/p/${U2}/v/${U3}/`)).toBe(true);
    expect(isPurgePrefix(`u/${U1}`)).toBe(false);
    expect(isPurgePrefix('u/')).toBe(false);
    expect(isPurgePrefix(`u/${U1}/../`)).toBe(false);
  });
});

describe('URL ký', () => {
  const secret = 'test-media-signing-key-000000000000000';
  const key = avatarKey(U1, U2, U3);
  const now = new Date('2026-10-24T03:00:30Z');
  const parse = (url: string) => {
    const q = new URL(url, 'http://x').searchParams;
    return { exp: q.get('exp') ?? undefined, sig: q.get('sig') ?? undefined };
  };

  it('exp làm tròn xuống phút, hiệu lực 840–900 s', () => {
    const exp = signedExpiry(now);
    const nowSec = now.getTime() / 1000;
    expect(exp % 60).toBe(0);
    expect(exp - nowSec).toBeGreaterThanOrEqual(840);
    expect(exp - nowSec).toBeLessThanOrEqual(900);
  });

  it('chữ ký đúng → OK; sửa 1 ký tự sig → sai; quá hạn → EXPIRED', () => {
    const { exp, sig } = parse(signMediaUrl(secret, key, now));
    expect(verifyMediaSignature(secret, key, exp, sig, now)).toBe('OK');
    const tampered = `${sig?.slice(0, -1) ?? ''}${sig?.endsWith('A') ? 'B' : 'A'}`;
    expect(verifyMediaSignature(secret, key, exp, tampered, now)).toBe('BAD_SIGNATURE');
    expect(verifyMediaSignature(secret, key, exp, `${sig ?? ''}x`, now)).toBe('BAD_SIGNATURE');
    expect(verifyMediaSignature(secret, `${key}x`, exp, sig, now)).toBe('BAD_SIGNATURE');
    expect(verifyMediaSignature(secret, key, exp, undefined, now)).toBe('BAD_SIGNATURE');
    const later = new Date(now.getTime() + 901_000);
    expect(verifyMediaSignature(secret, key, exp, sig, later)).toBe('EXPIRED');
    // Biên: exp = now vẫn nhận.
    expect(verifyMediaSignature(secret, key, exp, sig, new Date(Number(exp) * 1000))).toBe('OK');
  });
});

describe('transformImage', () => {
  it('thu nhỏ cạnh dài về 2048 và thumbnail 320, đầu ra JPEG không metadata', async () => {
    const input = await sharp({
      create: { width: 3000, height: 1000, channels: 3, background: '#c2185b' },
    })
      .png()
      .toBuffer();
    const { main, thumb } = await transformImage(input);
    const m = await sharp(main).metadata();
    const t = await sharp(thumb).metadata();
    expect([m.format, m.width, m.height]).toEqual(['jpeg', 2048, 683]);
    expect(Math.max(t.width, t.height)).toBe(320);
    expect([m.exif, m.xmp, m.iptc, m.orientation]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('xoay theo EXIF Orientation 6 rồi bỏ EXIF; ảnh nhỏ không phóng to', async () => {
    const input = await sharp({
      create: { width: 400, height: 200, channels: 3, background: '#ffffff' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const { main } = await transformImage(input);
    const m = await sharp(main).metadata();
    expect([m.width, m.height, m.orientation, m.exif]).toEqual([200, 400, undefined, undefined]);
  });

  it('vượt giới hạn pixel → TOO_MANY_PIXELS; dữ liệu hỏng → CORRUPT', async () => {
    const input = await sharp({
      create: { width: 100, height: 100, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer();
    await expect(transformImage(input, 5_000)).rejects.toMatchObject({ reason: 'TOO_MANY_PIXELS' });
    const broken = Buffer.concat([input.subarray(0, 40), Buffer.alloc(40)]);
    const err: unknown = await transformImage(broken).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ImageRejectedError);
    expect(err).toMatchObject({ reason: 'CORRUPT' });
  });
});

describe('LocalDiskStorage', () => {
  let root: string;
  let storage: LocalDiskStorage;
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'ph-storage-'));
    storage = new LocalDiskStorage(root);
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('ghi, đọc, xóa theo prefix (chạy 2 lần không lỗi)', async () => {
    const key = avatarKey(U1, U2, U3);
    await storage.put(key, Buffer.from('anh'));
    expect((await storage.read(key))?.toString()).toBe('anh');
    await storage.deletePrefix(`u/${U1}/p/${U2}/`);
    await storage.deletePrefix(`u/${U1}/p/${U2}/`);
    expect(await storage.read(key)).toBeNull();
    expect(await storage.readStream(key)).toBeNull();
  });

  it('purgePrefix dạng tệp: xóa đúng 1 ảnh và thumbnail, giữ ảnh khác', async () => {
    const dir = `u/${U1}/p/${U2}/v/${U3}/`;
    const keep = `${dir}${U2}.jpg`;
    await storage.put(`${dir}${U1}.jpg`, Buffer.from('a'));
    await storage.put(`${dir}${U1}_thumb.jpg`, Buffer.from('a'));
    await storage.put(keep, Buffer.from('b'));
    await purgePrefix(storage, `${dir}${U1}`);
    expect(await storage.read(`${dir}${U1}.jpg`)).toBeNull();
    expect(await storage.read(`${dir}${U1}_thumb.jpg`)).toBeNull();
    expect((await storage.read(keep))?.toString()).toBe('b');
    await expect(purgePrefix(storage, `${dir}${U1}.jpg`)).rejects.toThrow(/không hợp lệ/);
  });

  it('chặn khóa ra ngoài thư mục gốc', async () => {
    await expect(storage.put('../ngoai.txt', Buffer.from('x'))).rejects.toThrow(/ngoài MEDIA_ROOT/);
  });
});
