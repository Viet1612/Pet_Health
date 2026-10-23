import { createHash } from 'node:crypto';

/** JSON chuẩn hóa: khóa object sắp theo chữ cái (đệ quy), mảng giữ thứ tự. */
export function canonicalJson(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
  return `{${entries.join(',')}}`;
}

/** SHA-256(method + "\n" + path (không query) + "\n" + JSON chuẩn hóa của body). */
export function requestHash(method: string, path: string, body: unknown): Buffer {
  return createHash('sha256')
    .update(`${method.toUpperCase()}\n${path}\n${canonicalJson(body)}`)
    .digest();
}
