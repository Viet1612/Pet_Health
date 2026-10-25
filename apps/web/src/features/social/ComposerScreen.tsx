import { ApiError } from '@ph/api-client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { clearDraft, readDraft, saveDraft } from '../../lib/draft';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { TextAreaCounter } from '../../ui/TextAreaCounter';
import { useToast } from '../../ui/toast';
import { petsQuery } from '../pets';
import { PHOTO_ACCEPT } from '../photos/upload-store';
import { addPhotos, CAPTION_MAX, movePhoto, type ComposerPhoto } from './composer';
import { PetChips } from './PetChips';
import { myProfileQuery } from './queries';
import { usePublishPost, type PhotoJob } from './use-publish-post';

const t = m.social.composer;
const FORM_ID = 'post-composer';
const newLocalId = () => crypto.getRandomValues(new Uint32Array(2)).join('-');
const previewable = (f: File) => f.type === 'image/jpeg' || f.type === 'image/png';

function usePreviews(photos: ComposerPhoto[]): Map<string, string | null> {
  const previews = useMemo(
    () =>
      new Map(photos.map((p) => [p.id, previewable(p.file) ? URL.createObjectURL(p.file) : null])),
    [photos],
  );
  useEffect(
    () => () => {
      for (const url of previews.values()) if (url) URL.revokeObjectURL(url);
    },
    [previews],
  );
  return previews;
}

function JobOverlay({ job }: { job: PhotoJob | undefined }) {
  if (!job || job.state === 'pending') return null;
  if (job.state === 'ready') return null;
  if (job.state === 'error') {
    return (
      <span className="bg-danger/80 absolute inset-0 flex items-center justify-center gap-1 text-white">
        <AlertCircle size={18} aria-hidden />
        <span className="text-caption font-semibold">{t.failed}</span>
      </span>
    );
  }
  return (
    <span className="bg-scrim absolute inset-0 flex flex-col items-center justify-center gap-1 text-white">
      <Loader2 size={20} aria-hidden className="animate-spin" />
      <span className="text-caption font-semibold">
        {job.state === 'uploading' ? t.uploading(job.progress) : t.processing}
      </span>
    </span>
  );
}

/**
 * Màn soạn bài `/feed/new` (F-05). Phone: bước 1 chọn ảnh → bước 2 chú thích, gắn bé → Đăng.
 * ≥ 768 px: hai cột trên cùng một màn. Đang đăng thì khóa chỉnh sửa; ảnh lỗi có "Thử lại" hoặc
 * "Bỏ ảnh lỗi rồi đăng".
 */
export function ComposerScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const inputId = useId();
  const pets = useQuery(petsQuery);
  const profile = useQuery(myProfileQuery);
  const [draft] = useState(() => readDraft(FORM_ID));
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  const [caption, setCaption] = useState(typeof draft?.caption === 'string' ? draft.caption : '');
  const [petIds, setPetIds] = useState<string[]>(
    typeof draft?.petIds === 'string' && draft.petIds ? draft.petIds.split(',') : [],
  );
  const [step, setStep] = useState<'pick' | 'details'>('pick');
  const [pickError, setPickError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const restored = useRef(false);
  const previews = usePreviews(photos);

  const publisher = usePublishPost((postId) => {
    clearDraft();
    toast.show({ kind: 'success', message: t.posted });
    const username = profile.data?.username;
    void navigate(
      username
        ? { to: '/u/$username', params: { username } }
        : { to: '/p/$postId', params: { postId } },
    );
  });
  const locked = publisher.started;

  useEffect(() => {
    if (!draft || restored.current) return;
    restored.current = true;
    clearDraft();
    toast.show({ kind: 'success', message: t.reselect });
  }, [draft, toast]);

  // Chưa có hồ sơ công khai → về Bản tin để tạo trước.
  useEffect(() => {
    if (profile.isSuccess && !profile.data) void navigate({ to: '/feed', replace: true });
  }, [profile.isSuccess, profile.data, navigate]);

  const add = (files: File[]) => {
    const r = addPhotos(photos, files, newLocalId);
    setPhotos(r.photos);
    setPickError(r.overLimit ? t.maxPhotos : r.error);
  };

  const submit = async () => {
    setFormError(null);
    if (photos.length === 0) {
      setPickError(t.needPhoto);
      setStep('pick');
      return;
    }
    const here = { pathname: window.location.pathname, search: window.location.search };
    try {
      await publisher.publish({ files: photos.map((p) => p.file), caption, petIds });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        saveDraft(FORM_ID, { caption, petIds: petIds.join(',') }, here);
        return;
      }
      const msg = toUserMessage(err);
      if (msg.kind === 'fields') setFormError(Object.values(msg.fields).join(' · '));
      else setFormError(msg.message);
    }
  };

  const jobOf = (index: number) => publisher.jobs.find((j) => j.position === index);
  const done = publisher.jobs.filter((j) => j.state === 'ready').length;
  const failed = publisher.jobs.some((j) => j.state === 'error');

  const picker = (
    <section className={cx('flex flex-col gap-3', step !== 'pick' && 'hidden md:flex')}>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div
            key={p.id}
            className="bg-surface-2 relative aspect-square overflow-hidden rounded-md"
          >
            {previews.get(p.id) ? (
              <img
                src={previews.get(p.id) ?? ''}
                alt={m.social.post.photo(i + 1, photos.length)}
                className="size-full object-cover"
              />
            ) : (
              <span className="text-text-muted text-caption flex size-full items-center justify-center p-1 text-center">
                {p.file.name}
              </span>
            )}
            <JobOverlay job={jobOf(i)} />
            {!locked && (
              <>
                <button
                  type="button"
                  aria-label={t.remove(i + 1)}
                  onClick={() => {
                    setPhotos(photos.filter((x) => x.id !== p.id));
                    setPickError(null);
                  }}
                  className="bg-surface/90 absolute top-1 right-1 inline-flex size-8 items-center justify-center rounded-full shadow"
                >
                  <X size={16} aria-hidden />
                </button>
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <button
                    type="button"
                    aria-label={t.moveBack(i + 1)}
                    disabled={i === 0}
                    onClick={() => {
                      setPhotos(movePhoto(photos, i, -1));
                    }}
                    className="bg-surface/90 inline-flex size-8 items-center justify-center rounded-full shadow disabled:invisible"
                  >
                    <ChevronLeft size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={t.moveForward(i + 1)}
                    disabled={i === photos.length - 1}
                    onClick={() => {
                      setPhotos(movePhoto(photos, i, 1));
                    }}
                    className="bg-surface/90 inline-flex size-8 items-center justify-center rounded-full shadow disabled:invisible"
                  >
                    <ChevronRight size={16} aria-hidden />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {!locked && photos.length < 5 && (
          <label
            htmlFor={inputId}
            className="border-border text-text-muted hover:bg-surface-2 flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-center"
          >
            <ImagePlus size={28} aria-hidden />
            <span className="text-caption px-1 font-semibold">{t.choose}</span>
          </label>
        )}
      </div>
      <input
        id={inputId}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        className="sr-only"
        disabled={locked}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          add(files);
        }}
      />
      <p className="text-small text-text-muted">{t.hint}</p>
      {pickError && (
        <p role="alert" className="text-small text-danger flex items-center gap-1">
          <AlertCircle size={16} aria-hidden />
          {pickError}
        </p>
      )}
    </section>
  );

  const details = (
    <section className={cx('flex flex-col gap-4', step !== 'details' && 'hidden md:flex')}>
      <TextAreaCounter
        label={t.caption}
        max={CAPTION_MAX}
        rows={5}
        value={caption}
        disabled={locked}
        onChange={(e) => {
          setCaption(e.target.value);
        }}
      />
      {!locked && <PetChips pets={pets.data ?? []} value={petIds} onChange={setPetIds} />}
      {publisher.jobs.length > 0 && (
        <p aria-live="polite" className="text-small text-text-muted">
          {t.progress(done, publisher.jobs.length)}
        </p>
      )}
      {formError && <Alert tone="danger">{formError}</Alert>}
      {failed && !publisher.busy && (
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => void publisher.retry()}>
            {t.retry}
          </Button>
          {publisher.canDropFailed && (
            <Button variant="ghost" onClick={() => void publisher.dropFailed()}>
              {t.dropFailed}
            </Button>
          )}
        </div>
      )}
    </section>
  );

  const nextOrPublish =
    step === 'pick' ? (
      <>
        <Button
          className="md:hidden"
          disabled={photos.length === 0}
          onClick={() => {
            setStep('details');
          }}
        >
          {t.next}
        </Button>
        <Button
          className="hidden md:inline-flex"
          loading={publisher.busy}
          disabled={locked}
          onClick={() => void submit()}
        >
          {t.publish}
        </Button>
      </>
    ) : (
      <Button loading={publisher.busy} disabled={locked} onClick={() => void submit()}>
        {t.publish}
      </Button>
    );

  return (
    <div className="mx-auto flex w-full max-w-[935px] flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          disabled={publisher.busy}
          onClick={() => {
            if (step === 'details' && !locked) setStep('pick');
            else void navigate({ to: '/feed' });
          }}
        >
          {t.cancel}
        </Button>
        <h1 className="text-h2">{t.title}</h1>
        {nextOrPublish}
      </div>
      <div className="bg-surface shadow-card grid gap-6 rounded-lg p-4 md:grid-cols-2 md:p-6">
        {picker}
        {details}
      </div>
    </div>
  );
}
