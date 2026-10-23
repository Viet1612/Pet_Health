export type ImageFormat = 'JPEG' | 'PNG' | 'HEIC';

const HEIC_BRANDS = new Set(['heic', 'heix', 'mif1']);

/**
 * Nhận dạng định dạng ảnh từ các byte đầu (cần ≥ 12 byte). Không tin `Content-Type` hay đuôi tệp.
 * AVIF (`ftypavif`) và mọi định dạng khác trả `null`.
 */
export function detectImageFormat(head: Buffer): ImageFormat | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'JPEG';
  if (
    head.length >= 4 &&
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47
  ) {
    return 'PNG';
  }
  if (head.length >= 12 && head.toString('latin1', 4, 8) === 'ftyp') {
    return HEIC_BRANDS.has(head.toString('latin1', 8, 12)) ? 'HEIC' : null;
  }
  return null;
}
