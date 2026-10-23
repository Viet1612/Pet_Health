// Bố cục khóa tệp ảnh (SAD §2.3). UUID chữ thường; khóa ảnh luôn kết thúc bằng `.jpg`.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Khóa được phục vụ qua `GET /media/{key}`. */
export const MEDIA_KEY_RE = new RegExp(
  `^u/${UUID}/p/${UUID}/(avatar|v/${UUID})/${UUID}(_thumb)?\\.jpg$`,
);

/** Prefix hợp lệ cho `media.purge-prefix`: cả user, một thú cưng, ảnh đại diện hoặc một lần khám. */
export const PURGE_PREFIX_RE = new RegExp(`^u/${UUID}/(p/${UUID}/((avatar|v/${UUID})/)?)?$`);

export const isMediaKey = (key: string): boolean => MEDIA_KEY_RE.test(key);
export const isPurgePrefix = (prefix: string): boolean => PURGE_PREFIX_RE.test(prefix);

export const incomingKey = (uploadId: string): string => `incoming/${uploadId}`;

export function avatarKey(ownerId: string, petId: string, imageId: string): string {
  return `u/${ownerId}/p/${petId}/avatar/${imageId}.jpg`;
}

export function visitPhotoKey(
  ownerId: string,
  petId: string,
  visitId: string,
  imageId: string,
): string {
  return `u/${ownerId}/p/${petId}/v/${visitId}/${imageId}.jpg`;
}

/** `…/{id}.jpg` → `…/{id}_thumb.jpg`. */
export const thumbKeyOf = (key: string): string => key.replace(/\.jpg$/, '_thumb.jpg');

export const userPrefix = (ownerId: string): string => `u/${ownerId}/`;
export const petPrefix = (ownerId: string, petId: string): string => `u/${ownerId}/p/${petId}/`;
