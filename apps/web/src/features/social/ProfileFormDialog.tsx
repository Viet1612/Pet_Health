import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@ph/api-client';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { useEffect, useId, useState, type SyntheticEvent } from 'react';

import { fieldErrorText, toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { TextAreaCounter } from '../../ui/TextAreaCounter';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { AVATAR_ACCEPT, avatarFileError, uploadImageAt } from '../pets';
import { checkUsername, useRemoveProfileAvatar, useSaveProfile, type MyProfile } from './queries';
import { UserAvatar } from './UserAvatar';

const t = m.social;
const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
const BIO_MAX = 150;
const codePoints = (s: string): number => Array.from(s.normalize('NFC')).length;

export const usernameFormatOk = (u: string): boolean =>
  USERNAME_RE.test(u) && !u.startsWith('.') && !u.endsWith('.') && !u.includes('..');

type Check = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/** Kiểm username sau 400 ms ngừng gõ (server giới hạn 30 lần/phút). */
function useUsernameCheck(username: string, current: string | undefined): Check {
  const [settled, setSettled] = useState(username);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(username);
    }, 400);
    return () => {
      clearTimeout(timer);
    };
  }, [username]);
  const needed = Boolean(username) && username !== current && usernameFormatOk(username);
  const result = useQuery({
    queryKey: ['social', 'check', settled],
    queryFn: () => checkUsername(settled),
    enabled: needed && settled === username,
    staleTime: 30_000,
  });

  if (!username || username === current) return 'idle';
  if (!usernameFormatOk(username)) return 'invalid';
  if (settled !== username || result.isFetching) return 'checking';
  if (!result.data) return 'idle';
  return !result.data.valid ? 'invalid' : result.data.available ? 'available' : 'taken';
}

/** Ảnh đại diện hồ sơ: tải ngay khi chọn (như ảnh thú cưng), gỡ ngay. */
function ProfileAvatarEditor({ profile }: { profile: MyProfile }) {
  const inputId = useId();
  const queryClient = useQueryClient();
  const remove = useRemoveProfileAvatar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (file: File) => {
    const problem = avatarFileError(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await uploadImageAt('/me/avatar', file, {
        progress: () => undefined,
        processing: () => undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['social'] });
    } catch (err) {
      const message = toUserMessage(err);
      setError('message' in message ? message.message : m.pets.avatar.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <UserAvatar profile={profile} size={64} />
        {busy && (
          <span className="bg-scrim absolute inset-0 flex items-center justify-center rounded-full text-white">
            <Loader2 size={24} aria-hidden className="animate-spin" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
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
            {m.pets.avatar.change}
          </label>
          {profile.avatarThumbUrl && (
            <Button
              type="button"
              variant="ghost"
              loading={remove.isPending}
              disabled={busy}
              onClick={() => {
                remove.mutate();
              }}
            >
              {m.pets.avatar.remove}
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-small text-danger flex items-center gap-1">
            <AlertCircle size={16} aria-hidden />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Tạo / sửa hồ sơ công khai (F-02). `profile = null`: tạo mới, gợi ý tên hiển thị từ nickname.
 * Username kiểm định dạng ở client, kiểm trùng qua `GET /profiles/check`; server vẫn kiểm lại.
 */
export function ProfileFormDialog({
  profile,
  suggestedName,
  onClose,
  onSaved,
}: {
  profile: MyProfile | null;
  suggestedName?: string | null | undefined;
  onClose: () => void;
  onSaved?: (profile: MyProfile) => void;
}) {
  const toast = useToast();
  const save = useSaveProfile();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? suggestedName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const normalized = username.trim().toLowerCase();
  const check = useUsernameCheck(normalized, profile?.username);
  const locked = profile !== null && profile.usernameChangeInDays > 0;

  const submit = async (e?: SyntheticEvent) => {
    e?.preventDefault();
    const next: Record<string, string> = {};
    if (!usernameFormatOk(normalized)) next.username = t.usernameInvalid;
    if (!displayName.trim()) next.displayName = m.auth.required;
    else if (codePoints(displayName.trim()) > 50) next.displayName = t.displayNameTooLong;
    if (codePoints(bio.trim()) > BIO_MAX)
      next.bio = m.apiErrors.field('TOO_LONG', 'bio', { max: BIO_MAX }) ?? '';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    try {
      const saved = await save.mutateAsync({
        username: normalized,
        displayName: displayName.trim(),
        bio: bio.trim() || null,
      });
      toast.show({ kind: 'success', message: t.saved });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const { problem } = err;
        if (problem.code === 'USERNAME_TAKEN') {
          setErrors({ username: t.usernameTaken });
          return;
        }
        if (problem.code === 'USERNAME_CHANGE_TOO_SOON') {
          const days = Number(problem.params?.days ?? 14);
          setErrors({ username: t.usernameLocked(days) });
          return;
        }
        if (problem.status === 422 && problem.errors?.length) {
          setErrors(Object.fromEntries(problem.errors.map((x) => [x.field, fieldErrorText(x)])));
          return;
        }
      }
      const msg = toUserMessage(err);
      toast.show({ kind: 'error', message: 'message' in msg ? msg.message : m.error.serverToast });
    }
  };

  const usernameStatus =
    errors.username ??
    (check === 'invalid' ? t.usernameInvalid : check === 'taken' ? t.usernameTaken : undefined);

  return (
    <ResponsiveDialog open onClose={onClose} title={profile ? t.editTitle : t.createTitle}>
      {!profile && <p className="text-small text-text-muted mb-4">{t.createLead}</p>}
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        {profile && <ProfileAvatarEditor profile={profile} />}
        <div className="flex flex-col gap-1">
          <TextField
            label={t.username}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={30}
            value={username}
            disabled={locked}
            hint={locked ? t.usernameLocked(profile.usernameChangeInDays) : t.usernameHint}
            error={usernameStatus}
            onChange={(e) => {
              setUsername(e.target.value);
              setErrors((x) => ({ ...x, username: undefined }));
            }}
          />
          <p aria-live="polite" className="text-small text-text-muted min-h-5">
            {check === 'checking' && t.usernameChecking}
            {check === 'available' && (
              <span className="text-success inline-flex items-center gap-1">
                <Check size={16} aria-hidden />
                {t.usernameAvailable}
              </span>
            )}
          </p>
        </div>
        <TextField
          label={t.displayName}
          maxLength={50}
          value={displayName}
          error={errors.displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setErrors((x) => ({ ...x, displayName: undefined }));
          }}
        />
        <TextAreaCounter
          label={t.bio}
          max={BIO_MAX}
          rows={3}
          value={bio}
          error={errors.bio}
          onChange={(e) => {
            setBio(e.target.value);
            setErrors((x) => ({ ...x, bio: undefined }));
          }}
        />
        <Button
          type="submit"
          fullWidth
          loading={save.isPending}
          disabled={check === 'taken' || check === 'invalid'}
        >
          {profile ? t.editSubmit : t.createSubmit}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
