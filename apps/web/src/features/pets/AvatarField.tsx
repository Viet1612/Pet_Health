import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ImagePlus, Loader2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/toast';
import { PetAvatar } from './PetAvatar';
import { PETS_KEY, useRemoveAvatar, type Pet } from './queries';
import {
  AVATAR_ACCEPT,
  avatarFileError,
  isPreviewable,
  pendingAvatarFiles,
  uploadAvatar,
} from './upload-avatar';

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; percent: number }
  | { kind: 'processing' }
  | { kind: 'error'; message: string };

const t = m.pets.avatar;

/** Xem trước tệp vừa chọn (JPG/PNG); thu hồi object URL khi đổi tệp. */
function usePreview(file: File | null): string | null {
  const url = useMemo(
    () => (file && isPreviewable(file) ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

function PickerCircle({ file, label }: { file: File | null; label: string }) {
  const preview = usePreview(file);
  if (preview) {
    return <img src={preview} alt="" className="size-28 rounded-full object-cover" />;
  }
  return (
    <span className="border-border text-text-muted flex size-28 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed">
      <ImagePlus size={28} aria-hidden />
      <span className="text-caption px-2 text-center">{label}</span>
    </span>
  );
}

/**
 * Ô ảnh ở form tạo (CMP-23): chỉ chọn và xem trước; ảnh được tải sau khi `POST /pets` thành công.
 */
export function AvatarPicker({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <label htmlFor={inputId} className="cursor-pointer rounded-full">
        <PickerCircle file={file} label={t.add} />
      </label>
      <input
        id={inputId}
        type="file"
        accept={AVATAR_ACCEPT}
        className="sr-only"
        aria-describedby={`${inputId}-hint`}
        onChange={(e) => {
          const chosen = e.target.files?.[0] ?? null;
          e.target.value = '';
          if (!chosen) return;
          const problem = avatarFileError(chosen);
          setError(problem);
          onChange(problem ? null : chosen);
        }}
      />
      <label htmlFor={inputId} className="text-primary text-body cursor-pointer font-semibold">
        {file ? t.change : t.add}
      </label>
      {error ? (
        <p role="alert" className="text-small text-danger flex items-center gap-1">
          <AlertCircle size={16} aria-hidden />
          {error}
        </p>
      ) : (
        <p id={`${inputId}-hint`} className="text-small text-text-muted">
          {file && !isPreviewable(file) ? file.name : t.hint}
        </p>
      )}
    </div>
  );
}

/**
 * Ô ảnh ở form sửa: "Đổi ảnh" tải ngay (có %), "Gỡ ảnh" gỡ ngay; độc lập với nút "Lưu thay đổi".
 * `initialFailed`: ảnh chọn ở form tạo đã tải lỗi → hiện lỗi kèm "Thử lại".
 */
export function AvatarEditor({ pet, initialFailed }: { pet: Pet; initialFailed?: boolean }) {
  const inputId = useId();
  const queryClient = useQueryClient();
  const toast = useToast();
  const remove = useRemoveAvatar(pet.id);
  const [lastFile, setLastFile] = useState<File | null>(pendingAvatarFiles.get(pet.id) ?? null);
  const [state, setState] = useState<UploadState>(
    initialFailed ? { kind: 'error', message: t.failed } : { kind: 'idle' },
  );
  const busy = state.kind === 'uploading' || state.kind === 'processing';

  const start = async (file: File) => {
    const problem = avatarFileError(file);
    if (problem) {
      setState({ kind: 'error', message: problem });
      return;
    }
    setLastFile(file);
    setState({ kind: 'uploading', percent: 0 });
    try {
      await uploadAvatar(pet.id, file, {
        progress: (percent) => {
          setState({ kind: 'uploading', percent });
        },
        processing: () => {
          setState({ kind: 'processing' });
        },
      });
      pendingAvatarFiles.delete(pet.id);
      await queryClient.invalidateQueries({ queryKey: PETS_KEY });
      setState({ kind: 'idle' });
    } catch (err) {
      const message = toUserMessage(err);
      setState({ kind: 'error', message: 'message' in message ? message.message : t.failed });
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative">
        <PetAvatar pet={pet} size={112} />
        {busy && (
          <span className="bg-scrim absolute inset-0 flex items-center justify-center rounded-full text-white">
            <Loader2 size={28} aria-hidden className="animate-spin" />
          </span>
        )}
      </div>
      <p aria-live="polite" className="text-small text-text-muted min-h-5">
        {state.kind === 'uploading' && t.uploading(state.percent)}
        {state.kind === 'processing' && t.processing}
      </p>
      {state.kind === 'error' && (
        <div role="alert" className="text-small text-danger flex flex-col items-center gap-1">
          <span className="flex items-center gap-1">
            <AlertCircle size={16} aria-hidden />
            {state.message}
          </span>
          {lastFile && (
            <button
              type="button"
              className="text-primary min-h-11 font-semibold"
              onClick={() => {
                void start(lastFile);
              }}
            >
              {t.retry}
            </button>
          )}
        </div>
      )}
      <input
        id={inputId}
        type="file"
        accept={AVATAR_ACCEPT}
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const chosen = e.target.files?.[0];
          e.target.value = '';
          if (chosen) void start(chosen);
        }}
      />
      <div className="flex gap-2">
        <label
          htmlFor={inputId}
          aria-disabled={busy}
          className="border-border text-body hover:bg-surface-2 inline-flex min-h-11 cursor-pointer items-center rounded-md border px-4 font-semibold"
        >
          {t.change}
        </label>
        {pet.avatarUrl && (
          <Button
            variant="ghost"
            disabled={busy}
            loading={remove.isPending}
            onClick={() => {
              remove.mutate(undefined, {
                onSuccess: () => toast.show({ kind: 'success', message: t.removed }),
                onError: (err) => {
                  const msg = toUserMessage(err);
                  toast.show({ kind: 'error', message: 'message' in msg ? msg.message : t.failed });
                },
              });
            }}
          >
            {t.remove}
          </Button>
        )}
      </div>
      <p className="text-small text-text-muted">{t.hint}</p>
    </div>
  );
}
