import { ApiError } from '@ph/api-client';
import { useState, type SyntheticEvent } from 'react';

import { fieldErrorText, toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { deviceToday } from '../pets/format';
import { useSession } from '../session';
import { useUpdatePersonal } from './queries';

const codePoints = (s: string): number => Array.from(s).length;

/**
 * Nickname và ngày sinh (F-02). `required`: lời nhắc cho tài khoản cũ chưa có — không có nút
 * đóng ý nghĩa (đóng rồi sẽ hiện lại lần mở app sau).
 */
export function PersonalInfoDialog({
  initial,
  required = false,
  onClose,
}: {
  initial: { nickname: string | null; birthDate: string | null };
  required?: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const update = useUpdatePersonal();
  const [nickname, setNickname] = useState(initial.nickname ?? '');
  const [birthDate, setBirthDate] = useState(initial.birthDate ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const submit = async (e?: SyntheticEvent) => {
    e?.preventDefault();
    const next: Record<string, string> = {};
    if (!nickname.trim()) next.nickname = m.auth.required;
    else if (codePoints(nickname.trim()) > 50) next.nickname = m.auth.nicknameTooLong;
    if (!birthDate) next.birthDate = m.auth.required;
    else if (birthDate > deviceToday()) next.birthDate = m.auth.futureBirthDate;
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    try {
      await update.mutateAsync({ nickname: nickname.trim(), birthDate });
      if (!required) toast.show({ kind: 'success', message: m.social.saved });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.problem.status === 422 && err.problem.errors?.length) {
        setErrors(Object.fromEntries(err.problem.errors.map((x) => [x.field, fieldErrorText(x)])));
        return;
      }
      const msg = toUserMessage(err);
      toast.show({ kind: 'error', message: 'message' in msg ? msg.message : m.error.serverToast });
    }
  };

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={required ? m.social.complete.title : m.settings.personal}
    >
      {required && <p className="text-small text-text-muted mb-4">{m.social.complete.lead}</p>}
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <TextField
          label={m.auth.nickname}
          autoComplete="nickname"
          maxLength={50}
          hint={m.auth.nicknameHint}
          value={nickname}
          error={errors.nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setErrors((x) => ({ ...x, nickname: undefined }));
          }}
        />
        <TextField
          label={m.auth.birthDate}
          type="date"
          autoComplete="bday"
          min="1900-01-01"
          max={deviceToday()}
          value={birthDate}
          error={errors.birthDate}
          onChange={(e) => {
            setBirthDate(e.target.value);
            setErrors((x) => ({ ...x, birthDate: undefined }));
          }}
        />
        <Button type="submit" fullWidth loading={update.isPending}>
          {required ? m.social.complete.submit : m.social.editSubmit}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}

/** Tài khoản cũ thiếu nickname hoặc ngày sinh → hỏi một lần mỗi lần mở app. */
export function CompleteAccountPrompt() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const user = session?.user;
  if (!user || dismissed || (user.nickname && user.birthDate)) return null;
  return (
    <PersonalInfoDialog
      initial={user}
      required
      onClose={() => {
        setDismissed(true);
      }}
    />
  );
}
