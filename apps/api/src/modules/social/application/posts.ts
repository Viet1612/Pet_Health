import type { FastifyRequest } from 'fastify';
import type { Transaction } from 'kysely';

import type { ClockPort } from '../../../platform/clock/clock.js';
import type { Database } from '../../../platform/db/kysely.js';
import {
  AppError,
  NotFoundError,
  RateLimitedError,
  ValidationError,
} from '../../../platform/errors/app-error.js';
import {
  findStoredResponse,
  runIdempotent,
  type IdempotencyInput,
  type IdempotentResult,
} from '../../../platform/idempotency/run-idempotent.js';
import { newId } from '../../../platform/ids.js';
import type { RateLimiter } from '../../../platform/rate-limit/rate-limiter.js';
import {
  postPhotoKey,
  postPrefix,
  TargetGoneError,
  thumbKeyOf,
  type MediaService,
  type TargetResolver,
} from '../../media/index.js';
import { petQuery } from '../../pets/index.js';
import {
  postRepository,
  type PostPhotoRow,
  type PostWithAuthor,
} from '../adapters/persistence/post.repository.js';
import { profileRepository } from '../adapters/persistence/profile.repository.js';
import { normalizeUsername } from '../domain/username.js';

type Trx = Transaction<Database>;

export const CAPTION_MAX = 2200;
export const MAX_PHOTOS = 5;
export const MAX_PETS = 5;
export const POSTS_PER_DAY = 30;
export const GRID_PAGE = 18;

export interface PostsDeps {
  clock: ClockPort;
  media: MediaService;
  rateLimiter: RateLimiter;
}

export interface PostView {
  id: string;
  status: 'DRAFT' | 'PUBLISHED';
  author: { username: string; displayName: string; avatarThumbUrl: string | null };
  caption: string | null;
  pets: { id: string; name: string }[];
  photos: {
    id: string;
    position: number;
    status: 'PROCESSING' | 'READY' | 'FAILED';
    url: string | null;
    thumbUrl: string | null;
    width: number | null;
    height: number | null;
  }[];
  photoCount: number;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
  isMine: boolean;
}

const codePoints = (s: string): number => Array.from(s).length;

function checkCaption(raw: string | null | undefined): string | null {
  const caption = raw?.normalize('NFC').trim() ?? '';
  if (codePoints(caption) > CAPTION_MAX) {
    throw new ValidationError([
      {
        field: 'caption',
        code: 'TOO_LONG',
        message: `Tối đa ${String(CAPTION_MAX)} ký tự`,
        params: { max: CAPTION_MAX },
      },
    ]);
  }
  return caption || null;
}

/** 0–5 thú cưng, không trùng, đều là của người đăng (D5). */
async function checkPets(trx: Trx, ownerId: string, raw: string[] | undefined): Promise<string[]> {
  const ids = [...new Set(raw ?? [])];
  if (ids.length > MAX_PETS) {
    throw new ValidationError([
      {
        field: 'petIds',
        code: 'OUT_OF_RANGE',
        message: `Gắn tối đa ${String(MAX_PETS)} thú cưng`,
        params: { max: MAX_PETS },
      },
    ]);
  }
  if (ids.length === 0) return [];
  const names = await petQuery.getNames(trx, ownerId, ids);
  if (names.size !== ids.length) {
    throw new ValidationError([
      { field: 'petIds', code: 'PET_NOT_OWNED', message: 'Thú cưng không thuộc tài khoản của bạn' },
    ]);
  }
  return ids;
}

const profileRequired = () =>
  new AppError(409, 'PROFILE_NOT_SET', 'Bạn cần tạo hồ sơ công khai trước khi đăng bài');

/**
 * `POST /posts` (bước 1): tạo bài nháp, client tải từng ảnh sau. Giới hạn 30 bài/ngày tính khi
 * tạo (kể cả bài nháp bị bỏ), không tính lần "Thử lại" cùng Idempotency-Key.
 */
export async function createPost(
  deps: PostsDeps,
  trx: Trx,
  ownerId: string,
  input: { caption?: string | null | undefined; petIds?: string[] | undefined; photoCount: number },
  idem: IdempotencyInput,
): Promise<IdempotentResult> {
  return runIdempotent(trx, idem, async () => {
    if (!(await profileRepository.findByUser(trx, ownerId))) throw profileRequired();
    const caption = checkCaption(input.caption);
    const petIds = await checkPets(trx, ownerId, input.petIds);
    try {
      await deps.rateLimiter.hit(`post:${ownerId}`, POSTS_PER_DAY, 86_400);
    } catch (error) {
      if (!(error instanceof RateLimitedError)) throw error;
      throw new AppError(429, 'POST_LIMIT_REACHED', 'Bạn đã đăng tối đa 30 bài hôm nay', {
        retryAfter: error.options.retryAfter ?? 3600,
        params: { max: POSTS_PER_DAY },
      });
    }
    const post = await postRepository.insert(trx, {
      id: newId(),
      ownerId,
      caption,
      petIds,
      photoCount: input.photoCount,
      now: deps.clock.now(),
    });
    return { status: 201, body: { id: post.id, status: 'DRAFT' } };
  });
}

/**
 * `POST /posts/{id}/photos?position=` (bước 2): một ảnh mỗi request, xử lý nền. Kiểm bài nháp của
 * mình và vị trí **trước** khi nhận tệp. Vị trí đã có ảnh lỗi → thay bằng ảnh mới (Thử lại).
 */
export async function attachPostPhoto(
  deps: PostsDeps & { withTx: <T>(fn: (trx: Trx) => Promise<T>) => Promise<T> },
  req: FastifyRequest,
  ownerId: string,
  postId: string,
  position: number,
  idem: Omit<IdempotencyInput, 'ownerId' | 'now'>,
): Promise<IdempotentResult> {
  const idemInput = { ...idem, ownerId, now: deps.clock.now() };
  const check = async (trx: Trx) => {
    const post = await postRepository.lockOwned(trx, ownerId, postId);
    if (!post) throw new NotFoundError();
    if (post.status !== 'DRAFT') {
      throw new AppError(409, 'POST_ALREADY_PUBLISHED', 'Bài đã đăng, không thêm ảnh được');
    }
    if (position >= post.photo_count) {
      throw new ValidationError([
        { field: 'position', code: 'OUT_OF_RANGE', message: 'Vị trí ảnh không hợp lệ' },
      ]);
    }
    const existing = (await postRepository.listPhotos(trx, [postId])).find(
      (p) => p.position === position,
    );
    if (existing && existing.status !== 'FAILED') {
      throw new AppError(409, 'PHOTO_POSITION_TAKEN', 'Vị trí này đã có ảnh');
    }
    return existing;
  };

  const pre = await deps.withTx(async (trx) => {
    const stored = await findStoredResponse(trx, idemInput);
    if (stored) return stored;
    await check(trx);
    return null;
  });
  if (pre) return pre;

  const upload = await deps.media.receive(req);
  try {
    const result = await deps.withTx((trx) =>
      runIdempotent(trx, idemInput, async () => {
        const failed = await check(trx);
        if (failed) await postRepository.deletePhoto(trx, failed.id);
        const photoId = newId();
        const storageKey = postPhotoKey(ownerId, postId, photoId);
        await postRepository.insertPhoto(trx, {
          id: photoId,
          ownerId,
          postId,
          position,
          storageKey,
          thumbKey: thumbKeyOf(storageKey),
          now: deps.clock.now(),
        });
        await deps.media.accept(trx, {
          ...upload,
          ownerId,
          targetKind: 'POST_PHOTO',
          targetId: photoId,
        });
        return { status: 202, body: { photoId, uploadId: upload.uploadId, status: 'PROCESSING' } };
      }),
    );
    if (result.replayed) await deps.media.discard(upload);
    return result;
  } catch (error) {
    await deps.media.discard(upload);
    throw error;
  }
}

/**
 * `DELETE /post-photos/{id}`: bỏ một ảnh (thường là ảnh lỗi) khỏi bài **nháp** rồi đăng
 * với số ảnh còn lại. Bài phải còn ít nhất 1 ảnh.
 */
export async function removeDraftPhoto(
  deps: PostsDeps,
  trx: Trx,
  ownerId: string,
  photoId: string,
): Promise<void> {
  const photo = await postRepository.findPhoto(trx, photoId);
  if (!photo) throw new NotFoundError();
  const postId = photo.post_id;
  const post = await postRepository.lockOwned(trx, ownerId, postId);
  if (!post) throw new NotFoundError();
  if (post.status !== 'DRAFT') {
    throw new AppError(409, 'POST_ALREADY_PUBLISHED', 'Bài đã đăng, không đổi ảnh được');
  }
  if (post.photo_count <= 1) {
    throw new AppError(409, 'LAST_PHOTO', 'Bài cần ít nhất một ảnh');
  }
  const now = deps.clock.now();
  await postRepository.deletePhoto(trx, photoId);
  await postRepository.setPhotoCount(trx, postId, post.photo_count - 1, now);
  if (photo.storage_key) {
    await deps.media.enqueuePurge(trx, photo.storage_key.replace(/\.jpg$/, ''));
  }
  await postRepository.publishIfComplete(trx, postId, now);
}

/** `PATCH /posts/{id}`: chỉ sửa chú thích và thú cưng gắn kèm. */
export async function updatePost(
  deps: PostsDeps,
  trx: Trx,
  ownerId: string,
  postId: string,
  input: { caption?: string | null | undefined; petIds?: string[] | undefined },
): Promise<void> {
  const post = await postRepository.lockOwned(trx, ownerId, postId);
  if (!post) throw new NotFoundError();
  await postRepository.update(trx, postId, {
    ...(input.caption === undefined ? {} : { caption: checkCaption(input.caption) }),
    ...(input.petIds === undefined ? {} : { petIds: await checkPets(trx, ownerId, input.petIds) }),
    now: deps.clock.now(),
  });
}

/** `DELETE /posts/{id}`: xóa bài (tim, bình luận, thông báo theo CASCADE) và thư mục ảnh. */
export async function deletePost(
  deps: PostsDeps,
  trx: Trx,
  ownerId: string,
  postId: string,
): Promise<void> {
  const post = await postRepository.lockOwned(trx, ownerId, postId);
  if (!post) throw new NotFoundError();
  await postRepository.delete(trx, postId);
  await deps.media.enqueuePurge(trx, postPrefix(ownerId, postId));
}

/** Ghép bài + ảnh + tên thú cưng + số tim/bình luận thành `PostView` (URL ký 15 phút). */
export async function toPostViews(
  deps: Pick<PostsDeps, 'media'>,
  trx: Trx,
  viewerId: string,
  posts: PostWithAuthor[],
): Promise<PostView[]> {
  const ids = posts.map((p) => p.id);
  const [photos, pets, engagement] = await Promise.all([
    postRepository.listPhotos(trx, ids),
    postRepository.petNames(trx, ids),
    postRepository.engagement(trx, viewerId, ids),
  ]);
  const sign = (key: string | null) => (key ? deps.media.signUrl(key) : null);
  const photoView = (ph: PostPhotoRow) => {
    const ready = ph.status === 'READY';
    return {
      id: ph.id,
      position: ph.position,
      status: ph.status as PostView['photos'][number]['status'],
      url: ready ? sign(ph.storage_key) : null,
      thumbUrl: ready ? sign(ph.thumb_key) : null,
      width: ph.width,
      height: ph.height,
    };
  };
  return posts.map((p) => {
    const e = engagement.get(p.id);
    const petOrder = new Map(p.pet_ids.map((id, i) => [id, i]));
    return {
      id: p.id,
      status: p.status as PostView['status'],
      author: {
        username: p.username,
        displayName: p.display_name,
        avatarThumbUrl: p.author_avatar_key ? sign(thumbKeyOf(p.author_avatar_key)) : null,
      },
      caption: p.caption,
      pets: pets
        .filter((x) => x.post_id === p.id)
        .sort((a, b) => (petOrder.get(a.pet_id) ?? 0) - (petOrder.get(b.pet_id) ?? 0))
        .map((x) => ({ id: x.pet_id, name: x.name })),
      photos: photos.filter((ph) => ph.post_id === p.id).map(photoView),
      photoCount: p.photo_count,
      likeCount: e?.likes ?? 0,
      commentCount: e?.comments ?? 0,
      likedByMe: e?.liked ?? false,
      createdAt: p.created_at.toISOString(),
      isMine: p.owner_id === viewerId,
    };
  });
}

/** `GET /posts/{id}`: bài nháp chỉ chủ thấy; không có hoặc đã chặn nhau → 404 (RLS). */
export async function getPost(
  deps: Pick<PostsDeps, 'media'>,
  trx: Trx,
  viewerId: string,
  postId: string,
): Promise<PostView> {
  const post = await postRepository.findWithAuthor(trx, postId);
  if (!post) throw new NotFoundError();
  const [view] = await toPostViews(deps, trx, viewerId, [post]);
  if (!view) throw new NotFoundError();
  return view;
}

interface GridCursor {
  t: string;
  id: string;
}

function decodeGridCursor(raw: string): { createdAt: Date; id: string } {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<GridCursor>;
    if (typeof c.t === 'string' && typeof c.id === 'string' && /^[0-9a-f-]{36}$/i.test(c.id)) {
      const createdAt = new Date(c.t);
      if (!Number.isNaN(createdAt.getTime())) return { createdAt, id: c.id };
    }
  } catch {
    // rơi xuống lỗi bên dưới
  }
  throw new AppError(400, 'INVALID_CURSOR', 'Con trỏ phân trang không hợp lệ');
}

export const FEED_PAGE = 10;

/**
 * `GET /feed`: bài của mình và người mình theo dõi, 10 bài/trang, mới nhất trước. Ghép ảnh, tên
 * thú cưng, số tim/bình luận bằng 3 truy vấn phụ cho cả trang (không N+1).
 */
export async function listFeed(
  deps: Pick<PostsDeps, 'media'>,
  trx: Trx,
  viewerId: string,
  cursor: string | undefined,
): Promise<{ items: PostView[]; nextCursor: string | null }> {
  const after = cursor === undefined ? null : decodeGridCursor(cursor);
  const rows = await postRepository.feed(trx, viewerId, after, FEED_PAGE + 1);
  const hasMore = rows.length > FEED_PAGE;
  const page = hasMore ? rows.slice(0, FEED_PAGE) : rows;
  const last = page.at(-1);
  return {
    items: await toPostViews(deps, trx, viewerId, page),
    nextCursor:
      hasMore && last
        ? Buffer.from(JSON.stringify({ t: last.created_at.toISOString(), id: last.id })).toString(
            'base64url',
          )
        : null,
  };
}

/** `GET /feed/new-count?since=`: số bài mới của người mình theo dõi (nút "Có bài mới"). */
export async function feedNewCount(trx: Trx, viewerId: string, since: Date): Promise<number> {
  return postRepository.feedNewCount(trx, viewerId, since);
}

/** `GET /profiles/{username}/posts`: lưới 18 bài/trang, chỉ bài đã đăng. */
export async function listProfilePosts(
  deps: Pick<PostsDeps, 'media'>,
  trx: Trx,
  rawUsername: string,
  cursor: string | undefined,
): Promise<{
  items: { id: string; thumbUrl: string | null; photoCount: number }[];
  nextCursor: string | null;
}> {
  const after = cursor === undefined ? null : decodeGridCursor(cursor);
  const profile = await profileRepository.findByUsername(trx, normalizeUsername(rawUsername));
  if (!profile) throw new NotFoundError();
  const rows = await postRepository.grid(trx, profile.user_id, after, GRID_PAGE + 1);
  const hasMore = rows.length > GRID_PAGE;
  const page = hasMore ? rows.slice(0, GRID_PAGE) : rows;
  const last = page.at(-1);
  return {
    items: page.map((r) => ({
      id: r.id,
      thumbUrl: r.thumb_key ? deps.media.signUrl(r.thumb_key) : null,
      photoCount: r.photo_count,
    })),
    nextCursor:
      hasMore && last
        ? Buffer.from(JSON.stringify({ t: last.created_at.toISOString(), id: last.id })).toString(
            'base64url',
          )
        : null,
  };
}

/**
 * Worker `media.process` (app_worker): ảnh READY → ghi kích thước; đủ ảnh thì bài chuyển
 * `PUBLISHED`. Ảnh hay bài đã bị xóa → `TargetGoneError` (worker xóa tệp vừa ghi).
 */
export function postPhotoTargetResolver(clock: ClockPort): TargetResolver {
  return {
    async finalKey(q, upload) {
      const photo = await postRepository.findPhoto(q, upload.targetId);
      return photo?.owner_id === upload.ownerId ? photo.storage_key : null;
    },
    async onReady(trx, upload, _key, output) {
      const postId = await postRepository.markPhotoReady(trx, upload.targetId, output);
      if (!postId) throw new TargetGoneError();
      await postRepository.publishIfComplete(trx, postId, clock.now());
      return [];
    },
    async onFailed(q, upload) {
      await postRepository.markPhotoFailed(q, upload.targetId);
    },
  };
}
