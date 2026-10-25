import type { FastifyRequest } from 'fastify';
import type { Transaction } from 'kysely';

import type { ClockPort } from '../../../platform/clock/clock.js';
import type { Database } from '../../../platform/db/kysely.js';
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../platform/errors/app-error.js';
import {
  TargetGoneError,
  thumbKeyOf,
  userAvatarKey,
  userAvatarPrefix,
  type MediaService,
  type TargetResolver,
} from '../../media/index.js';
import { profileRepository, type ProfileRow } from '../adapters/persistence/profile.repository.js';
import {
  BIO_MAX,
  daysUntilUsernameChange,
  DISPLAY_NAME_MAX,
  normalizeUsername,
  usernameProblem,
} from '../domain/username.js';

type Trx = Transaction<Database>;

export interface SocialDeps {
  clock: ClockPort;
  media: MediaService;
}

export interface ProfileView {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  avatarThumbUrl: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isMe: boolean;
  followedByMe: boolean;
}

/** Hồ sơ của mình (không số đếm): sửa hồ sơ, kiểm đã có hồ sơ chưa. */
export interface MyProfileView {
  username: string;
  displayName: string;
  bio: string | null;
  avatarThumbUrl: string | null;
  /** Còn bao nhiêu ngày mới đổi được username; 0 = đổi được. */
  usernameChangeInDays: number;
}

const profileNotSet = (): AppError =>
  new AppError(404, 'PROFILE_NOT_SET', 'Bạn chưa tạo hồ sơ công khai');

const isUniqueViolation = (error: unknown): boolean =>
  (error as { code?: string } | null)?.code === '23505';

function myView(deps: SocialDeps, row: ProfileRow, now: Date): MyProfileView {
  return {
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarThumbUrl: row.avatar_key ? deps.media.signUrl(thumbKeyOf(row.avatar_key)) : null,
    usernameChangeInDays: daysUntilUsernameChange(row.username_changed_at, now),
  };
}

export async function getMyProfile(
  deps: SocialDeps,
  trx: Trx,
  userId: string,
): Promise<MyProfileView> {
  const row = await profileRepository.findByUser(trx, userId);
  if (!row) throw profileNotSet();
  return myView(deps, row, deps.clock.now());
}

/** Kiểm username cho ô nhập (debounce ở client). */
export async function checkUsername(
  trx: Trx,
  userId: string,
  raw: string,
): Promise<{ valid: boolean; available: boolean }> {
  const username = normalizeUsername(raw);
  if (usernameProblem(username)) return { valid: false, available: false };
  const owner = await profileRepository.findByUsername(trx, username);
  return { valid: true, available: !owner || owner.user_id === userId };
}

/** `PUT /me/profile`: tạo lần đầu hoặc sửa; đổi username tối đa 1 lần/14 ngày. */
export async function upsertMyProfile(
  deps: SocialDeps,
  trx: Trx,
  userId: string,
  input: { username: string; displayName: string; bio?: string | null | undefined },
): Promise<MyProfileView> {
  const username = normalizeUsername(input.username);
  const problem = usernameProblem(username);
  if (problem) {
    throw new ValidationError([
      {
        field: 'username',
        code: problem === 'RESERVED' ? 'USERNAME_RESERVED' : 'USERNAME_INVALID',
        message:
          problem === 'RESERVED'
            ? 'Username này không dùng được'
            : 'Username 3–30 ký tự: chữ thường, số, dấu chấm, gạch dưới',
      },
    ]);
  }
  const displayName = input.displayName.normalize('NFC').trim();
  if (displayName === '' || Array.from(displayName).length > DISPLAY_NAME_MAX) {
    throw new ValidationError([
      {
        field: 'displayName',
        code: displayName === '' ? 'REQUIRED' : 'TOO_LONG',
        message: displayName === '' ? 'Trường bắt buộc' : 'Tối đa 50 ký tự',
        ...(displayName === '' ? {} : { params: { max: DISPLAY_NAME_MAX } }),
      },
    ]);
  }
  const bio = input.bio?.normalize('NFC').trim() ?? '';
  if (Array.from(bio).length > BIO_MAX) {
    throw new ValidationError([
      { field: 'bio', code: 'TOO_LONG', message: 'Tối đa 150 ký tự', params: { max: BIO_MAX } },
    ]);
  }

  const now = deps.clock.now();
  const current = await profileRepository.findByUser(trx, userId);
  try {
    if (!current) {
      const row = await profileRepository.insert(trx, {
        userId,
        username,
        displayName,
        bio: bio || null,
        now,
      });
      return myView(deps, row, now);
    }
    const changing = current.username.toLowerCase() !== username;
    if (changing) {
      const days = daysUntilUsernameChange(current.username_changed_at, now);
      if (days > 0) {
        throw new AppError(
          429,
          'USERNAME_CHANGE_TOO_SOON',
          `Bạn chỉ đổi được username sau ${String(days)} ngày nữa`,
          { params: { days } },
        );
      }
    }
    const row = await profileRepository.update(trx, userId, {
      ...(changing ? { username } : {}),
      displayName,
      bio: bio || null,
      now,
    });
    if (!row) throw profileNotSet();
    return myView(deps, row, now);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError('USERNAME_TAKEN', 'Username đã có người dùng', {
        errors: [
          { field: 'username', code: 'USERNAME_TAKEN', message: 'Username đã có người dùng' },
        ],
      });
    }
    throw error;
  }
}

/** `GET /profiles/{username}`: không có hoặc đã chặn nhau → 404. Không lộ email hay dữ liệu sức khỏe. */
export async function getProfile(
  deps: SocialDeps,
  trx: Trx,
  viewerId: string,
  rawUsername: string,
): Promise<ProfileView> {
  const row = await profileRepository.findByUsername(trx, normalizeUsername(rawUsername));
  if (!row) throw new NotFoundError();
  const isMe = row.user_id === viewerId;
  const [counts, followedByMe] = await Promise.all([
    profileRepository.counts(trx, row.user_id),
    isMe ? Promise.resolve(false) : profileRepository.isFollowing(trx, viewerId, row.user_id),
  ]);
  return {
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_key ? deps.media.signUrl(row.avatar_key) : null,
    avatarThumbUrl: row.avatar_key ? deps.media.signUrl(thumbKeyOf(row.avatar_key)) : null,
    ...counts,
    isMe,
    followedByMe,
  };
}

/** `PUT /me/avatar`: cần có hồ sơ; ảnh xử lý nền như ảnh đại diện thú cưng. */
export async function setUserAvatar(
  deps: SocialDeps,
  withTx: <T>(fn: (trx: Trx) => Promise<T>) => Promise<T>,
  req: FastifyRequest,
  userId: string,
): Promise<{ uploadId: string; status: 'PROCESSING' }> {
  const profile = await withTx((trx) => profileRepository.findByUser(trx, userId));
  if (!profile) throw profileNotSet();
  const upload = await deps.media.receive(req);
  try {
    await withTx((trx) =>
      deps.media.accept(trx, {
        ...upload,
        ownerId: userId,
        targetKind: 'USER_AVATAR',
        targetId: userId,
      }),
    );
  } catch (error) {
    await deps.media.discard(upload);
    throw error;
  }
  return { uploadId: upload.uploadId, status: 'PROCESSING' };
}

/** `DELETE /me/avatar`: có ảnh cũ thì xóa thư mục ảnh đại diện cùng transaction. */
export async function removeUserAvatar(deps: SocialDeps, trx: Trx, userId: string): Promise<void> {
  const current = await profileRepository.lockAvatarKey(trx, userId);
  if (!current) throw profileNotSet();
  await profileRepository.setAvatarKey(trx, userId, null, deps.clock.now());
  if (current.avatarKey) await deps.media.enqueuePurge(trx, userAvatarPrefix(userId));
}

/** Worker `media.process` (kết nối app_worker): gắn ảnh đại diện người dùng; ảnh sau cùng thắng. */
export function userAvatarTargetResolver(clock: ClockPort): TargetResolver {
  return {
    async finalKey(q, upload) {
      const profile = await profileRepository.findByUser(q, upload.ownerId);
      return profile ? userAvatarKey(upload.ownerId, upload.id) : null;
    },
    async onReady(trx, upload, key) {
      const current = await profileRepository.lockAvatarKey(trx, upload.ownerId);
      if (!current) throw new TargetGoneError();
      await profileRepository.setAvatarKey(trx, upload.ownerId, key, clock.now());
      return current.avatarKey && current.avatarKey !== key ? [current.avatarKey] : [];
    },
  };
}
