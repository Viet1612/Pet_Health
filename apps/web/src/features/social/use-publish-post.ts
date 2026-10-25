import { idempotencyHeaders, newIdempotencyKey } from '@ph/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { api, unwrap } from '../../api/client';
import { uploadFile } from '../../api/upload-file';
import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { GRID_KEY, PROFILE_KEY } from './queries';

const CONCURRENCY = 2;
const POLL_MS = 1000;
const POLL_TRIES = 30;

export type JobState = 'pending' | 'uploading' | 'processing' | 'ready' | 'error';

export interface PhotoJob {
  localId: string;
  file: File;
  position: number;
  state: JobState;
  progress: number;
  idempotencyKey: string;
  photoId?: string;
  error?: string;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Đăng bài (F-05): `POST /posts` (Idempotency-Key giữ qua "Thử lại", đổi khi nội dung đổi) → tải
 * ảnh song song tối đa 2 → chờ worker xử lý. Ảnh cuối READY thì server tự đăng bài.
 */
export function usePublishPost(onPublished: (postId: string) => void) {
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState<PhotoJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const jobsRef = useRef<PhotoJob[]>([]);
  const postIdRef = useRef<string | null>(null);
  const postKeyRef = useRef<{ body: string; key: string } | null>(null);

  const update = useCallback((localId: string, changes: Partial<PhotoJob>) => {
    jobsRef.current = jobsRef.current.map((j) =>
      j.localId === localId ? { ...j, ...changes } : j,
    );
    setJobs(jobsRef.current);
  }, []);

  const finishIfDone = useCallback(async () => {
    const all = jobsRef.current;
    const postId = postIdRef.current;
    if (!postId || all.some((j) => j.state !== 'ready')) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: GRID_KEY }),
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY }),
    ]);
    onPublished(postId);
  }, [onPublished, queryClient]);

  const runJob = useCallback(
    async (job: PhotoJob) => {
      const postId = postIdRef.current;
      if (!postId) return;
      update(job.localId, { state: 'uploading', progress: 0 });
      try {
        const accepted = await uploadFile<{ photoId: string; uploadId: string }>({
          method: 'POST',
          path: `/posts/${postId}/photos?position=${String(job.position)}`,
          file: job.file,
          headers: { 'Idempotency-Key': job.idempotencyKey },
          onProgress: (progress) => {
            update(job.localId, { progress });
          },
        });
        update(job.localId, { state: 'processing', photoId: accepted.photoId });
        for (let i = 0; i < POLL_TRIES; i += 1) {
          await sleep(POLL_MS);
          const { status } = unwrap(
            await api.GET('/uploads/{uploadId}', {
              params: { path: { uploadId: accepted.uploadId } },
            }),
          );
          if (status === 'READY') {
            update(job.localId, { state: 'ready', progress: 100 });
            return;
          }
          if (status === 'FAILED') break;
        }
        update(job.localId, { state: 'error', error: m.social.composer.failed });
      } catch (err) {
        const msg = toUserMessage(err);
        update(job.localId, {
          state: 'error',
          error: 'message' in msg ? msg.message : m.social.composer.failed,
        });
      }
    },
    [update],
  );

  /** Chạy các ảnh đang chờ, tối đa 2 ảnh cùng lúc. */
  const pump = useCallback(async () => {
    const queue = jobsRef.current.filter((j) => j.state === 'pending');
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) await runJob(job);
    });
    await Promise.all(workers);
    await finishIfDone();
  }, [finishIfDone, runJob]);

  /** Bước "Đăng". Lỗi tạo bài ném ra cho màn soạn hiển thị. */
  const publish = useCallback(
    async (input: { files: File[]; caption: string; petIds: string[] }) => {
      setBusy(true);
      try {
        if (!postIdRef.current) {
          const body = {
            caption: input.caption.trim() || null,
            petIds: input.petIds,
            photoCount: input.files.length,
          };
          const bodyJson = JSON.stringify(body);
          if (postKeyRef.current?.body !== bodyJson) {
            postKeyRef.current = { body: bodyJson, key: newIdempotencyKey() };
          }
          const created = unwrap(
            await api.POST('/posts', {
              body,
              headers: idempotencyHeaders(postKeyRef.current.key),
            }),
          );
          postIdRef.current = created.id;
          setStarted(true);
          jobsRef.current = input.files.map((file, position) => ({
            localId: newIdempotencyKey(),
            file,
            position,
            state: 'pending',
            progress: 0,
            idempotencyKey: newIdempotencyKey(),
          }));
          setJobs(jobsRef.current);
        }
        await pump();
      } finally {
        setBusy(false);
      }
    },
    [pump],
  );

  /** "Thử lại": lỗi mạng trước khi server nhận → cùng khóa; ảnh đã nhận nhưng xử lý lỗi → khóa mới. */
  const retry = useCallback(async () => {
    setBusy(true);
    try {
      for (const j of jobsRef.current.filter((x) => x.state === 'error')) {
        update(j.localId, {
          state: 'pending',
          progress: 0,
          ...(j.photoId ? { idempotencyKey: newIdempotencyKey() } : {}),
        });
      }
      await pump();
    } finally {
      setBusy(false);
    }
  }, [pump, update]);

  /** "Bỏ ảnh lỗi rồi đăng": chỉ với ảnh server đã nhận (có `photoId`). */
  const dropFailed = useCallback(async () => {
    setBusy(true);
    try {
      for (const j of jobsRef.current.filter((x) => x.state === 'error' && x.photoId)) {
        await api.DELETE('/post-photos/{id}', { params: { path: { id: j.photoId ?? '' } } });
        jobsRef.current = jobsRef.current.filter((x) => x.localId !== j.localId);
      }
      setJobs(jobsRef.current);
      await finishIfDone();
    } finally {
      setBusy(false);
    }
  }, [finishIfDone]);

  const failed = jobs.filter((j) => j.state === 'error');
  return {
    jobs,
    busy,
    started,
    publish,
    retry,
    dropFailed,
    canDropFailed:
      failed.length > 0 &&
      failed.length < jobs.length &&
      failed.every((j) => j.photoId !== undefined),
  };
}
