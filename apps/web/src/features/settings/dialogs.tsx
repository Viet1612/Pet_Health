import { ApiError } from '@ph/api-client';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, Check } from 'lucide-react';
import { useMemo, useState, type SyntheticEvent } from 'react';

import { fieldErrorText, toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { PasswordField } from '../../ui/PasswordField';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { minutesFrom } from '../session';
import { useChangeEmail, useChangePassword, useDeleteAccount, useUpdateTimezone } from './queries';
import { timezoneLabel, timezoneOptions } from './timezones';

const t = m.settings;

type Errors = Record<string, string | undefined>;

/**
 * Lỗi API → đúng trường (FR-GEN-010): sai mật khẩu, email đã dùng, trùng email; 429 → dưới nút.
 * Trả `null` nếu lỗi đã được hiện (toast).
 */
function useFormErrors(passwordField: string) {
  const toast = useToast();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handle = (err: unknown, retry: () => void) => {
    if (err instanceof ApiError) {
      const { problem } = err;
      if (problem.code === 'WRONG_PASSWORD') {
        setErrors({ [passwordField]: t.errors.wrongPassword });
        return;
      }
      if (problem.code === 'EMAIL_TAKEN') {
        setErrors({ newEmail: t.errors.emailTaken });
        return;
      }
      if (problem.status === 429) {
        setFormError(t.errors.tooMany(minutesFrom(problem.retryAfter ?? 900)));
        return;
      }
      if (problem.status === 422 && problem.errors?.length) {
        setErrors(
          Object.fromEntries(
            problem.errors.map((e) => [
              e.field,
              e.code === 'SAME_EMAIL' ? t.errors.sameEmail : fieldErrorText(e),
            ]),
          ),
        );
        return;
      }
    }
    const msg = toUserMessage(err);
    toast.show({
      kind: 'error',
      message: 'message' in msg ? msg.message : m.error.serverToast,
      ...(msg.kind === 'retryable' ? { onRetry: retry } : {}),
    });
  };

  const clear = (field: string) => {
    setErrors((e) => ({ ...e, [field]: undefined }));
    setFormError(null);
  };
  const reset = () => {
    setErrors({});
    setFormError(null);
  };
  const set = (field: string, message: string) => {
    setErrors({ [field]: message });
  };
  return { errors, formError, handle, clear, reset, set };
}

/** Sheet Đổi email (14:2014). */
export function ChangeEmailDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const change = useChangeEmail();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const form = useFormErrors('password');

  const submit = async (e?: SyntheticEvent) => {
    e?.preventDefault();
    form.reset();
    const email = newEmail.trim().toLowerCase();
    try {
      await change.mutateAsync({ newEmail: email, password });
      toast.show({ kind: 'success', message: t.emailDialog.sent(email) });
      onClose();
    } catch (err) {
      form.handle(err, () => void submit());
    }
  };

  return (
    <ResponsiveDialog open onClose={onClose} title={t.emailDialog.title}>
      <p className="text-small text-text-muted mb-4">{t.emailDialog.subtitle}</p>
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <TextField
          label={t.emailDialog.newEmail}
          type="email"
          autoComplete="email"
          value={newEmail}
          error={form.errors.newEmail}
          onChange={(e) => {
            setNewEmail(e.target.value);
            form.clear('newEmail');
          }}
        />
        <PasswordField
          label={t.emailDialog.password}
          autoComplete="current-password"
          value={password}
          error={form.errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            form.clear('password');
          }}
        />
        {form.formError && <Alert tone="danger">{form.formError}</Alert>}
        <Button
          type="submit"
          fullWidth
          loading={change.isPending}
          disabled={!newEmail.trim() || !password}
        >
          {t.emailDialog.submit}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}

/** Sheet Đổi mật khẩu (23:2716). */
export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const change = useChangePassword();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');
  const form = useFormErrors('currentPassword');
  const length = Array.from(newPassword).length;

  const submit = async (e?: SyntheticEvent) => {
    e?.preventDefault();
    form.reset();
    if (length < 8 || length > 128 || newPassword.trim() === '') {
      form.set('newPassword', m.auth.passwordLength);
      return;
    }
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      toast.show({ kind: 'success', message: t.passwordDialog.done });
      onClose();
    } catch (err) {
      form.handle(err, () => void submit());
    }
  };

  return (
    <ResponsiveDialog open onClose={onClose} title={t.passwordDialog.title}>
      <p className="text-small text-text-muted mb-4">{t.passwordDialog.subtitle}</p>
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <PasswordField
          label={t.passwordDialog.current}
          autoComplete="current-password"
          value={currentPassword}
          error={form.errors.currentPassword}
          onChange={(e) => {
            setCurrent(e.target.value);
            form.clear('currentPassword');
          }}
        />
        <PasswordField
          label={t.passwordDialog.next}
          autoComplete="new-password"
          hint={t.passwordDialog.nextHint}
          value={newPassword}
          error={form.errors.newPassword}
          onChange={(e) => {
            setNext(e.target.value);
            form.clear('newPassword');
          }}
        />
        {form.formError && <Alert tone="danger">{form.formError}</Alert>}
        <Button
          type="submit"
          fullWidth
          loading={change.isPending}
          disabled={!currentPassword || !newPassword}
        >
          {t.passwordDialog.submit}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}

/** Sheet chọn múi giờ: tìm không dấu, `Asia/Ho_Chi_Minh` ghim đầu. */
export function TimezonePickerDialog({
  current,
  onClose,
}: {
  current: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const update = useUpdateTimezone();
  const [query, setQuery] = useState('');
  const options = useMemo(() => timezoneOptions(query).slice(0, 200), [query]);

  const choose = (tz: string) => {
    if (tz === current) {
      onClose();
      return;
    }
    update.mutate(tz, {
      onSuccess: () => {
        toast.show({ kind: 'success', message: m.toast.saved });
        onClose();
      },
      onError: (err) => {
        const msg = toUserMessage(err);
        toast.show({
          kind: 'error',
          message: msg.kind === 'fields' ? (Object.values(msg.fields)[0] ?? '') : msg.message,
        });
      },
    });
  };

  return (
    <ResponsiveDialog open onClose={onClose} title={t.timezoneDialog.title}>
      <TextField
        label={t.timezoneDialog.search}
        type="search"
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
        }}
      />
      {options.length === 0 ? (
        <p className="text-body text-text-muted mt-4">{t.timezoneDialog.empty}</p>
      ) : (
        <ul
          role="listbox"
          aria-label={t.timezoneDialog.title}
          aria-busy={update.isPending || undefined}
          className="m-0 mt-3 flex max-h-[50vh] list-none flex-col overflow-y-auto p-0"
        >
          {options.map((tz) => {
            const selected = tz === current;
            return (
              <li
                key={tz}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => {
                  choose(tz);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    choose(tz);
                  }
                }}
                className={cx(
                  'text-body flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3',
                  selected ? 'bg-primary-soft font-semibold' : 'hover:bg-surface-2',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{timezoneLabel(tz)}</span>
                {selected && <Check size={18} aria-hidden className="text-primary" />}
              </li>
            );
          })}
        </ul>
      )}
    </ResponsiveDialog>
  );
}

/** Xóa tài khoản (23:2776): nút chỉ bật khi đã nhập mật khẩu; "Hủy" nhận focus mặc định. */
export function DeleteAccountDialog({
  petCount,
  onClose,
}: {
  petCount: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const remove = useDeleteAccount();
  const [password, setPassword] = useState('');
  const form = useFormErrors('password');

  const submit = async (e?: SyntheticEvent) => {
    e?.preventDefault();
    form.reset();
    try {
      await remove.mutateAsync(password);
      await navigate({ to: '/login', search: { reason: 'account-deleted' } });
    } catch (err) {
      form.handle(err, () => void submit());
    }
  };

  return (
    <ResponsiveDialog open onClose={onClose} title={t.deleteDialog.title}>
      <div className="bg-danger-bg text-danger mb-3 flex size-12 items-center justify-center rounded-full">
        <AlertCircle size={24} aria-hidden />
      </div>
      <p className="text-body text-text-muted mb-4">{t.deleteDialog.body(petCount)}</p>
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <PasswordField
          label={t.deleteDialog.password}
          autoComplete="current-password"
          value={password}
          error={form.errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            form.clear('password');
          }}
        />
        {form.formError && <Alert tone="danger">{form.formError}</Alert>}
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button variant="secondary" autoFocus disabled={remove.isPending} onClick={onClose}>
            {m.confirm.cancel}
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={remove.isPending}
            disabled={password === ''}
          >
            {t.deleteDialog.submit}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
