// Bố cục khóa tệp ảnh (SAD §2.3). UUID chữ thường; khóa ảnh luôn kết thúc bằng `.jpg`.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Khóa được phục vụ qua `GET /media/{key}`: ảnh thú cưng, ảnh khám, ảnh đại diện người dùng (F-02). */
export const MEDIA_KEY_RE = new RegExp(
  `^u/${UUID}/(p/${UUID}/(avatar|v/${UUID})|profile/avatar)/${UUID}(_thumb)?\\.jpg$`,
);

/** Prefix hợp lệ cho `media.purge-prefix`: cả user, một thú cưng, ảnh đại diện hoặc một lần khám. */
export const PURGE_PREFIX_RE = new RegExp(
  `^u/${UUID}/((p/${UUID}/((avatar|v/${UUID})/)?)|profile/avatar/)?$`,
);

/** Một ảnh (bỏ đuôi): `…/v/{visit}/{photoId}` → xóa `{photoId}.jpg` và `{photoId}_thumb.jpg`. */
export const PURGE_FILE_RE = new RegExp(`^u/${UUID}/p/${UUID}/(avatar|v/${UUID})/${UUID}$`);

export const isMediaKey = (key: string): boolean => MEDIA_KEY_RE.test(key);
export const isPurgePrefix = (prefix: string): boolean =>
  PURGE_PREFIX_RE.test(prefix) || PURGE_FILE_RE.test(prefix);

export const incomingKey = (uploadId: string): string => `incoming/${uploadId}`;

export function avatarKey(ownerId: string, petId: string, imageId: string): string {
  return `u/${ownerId}/p/${petId}/avatar/${imageId}.jpg`;
}

/** Ảnh đại diện người dùng (hồ sơ công khai, F-02). */
export function userAvatarKey(ownerId: string, imageId: string): string {
  return `u/${ownerId}/profile/avatar/${imageId}.jpg`;
}

export const userAvatarPrefix = (ownerId: string): string => `u/${ownerId}/profile/avatar/`;

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
