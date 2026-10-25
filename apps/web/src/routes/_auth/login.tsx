import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@ph/api-client';
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { toUserMessage } from '../../api/to-user-message';
import {
  nowMs,
  loginSchema,
  minutesFrom,
  safeNext,
  useLogin,
  type LoginValues,
} from '../../features/session';
import { m } from '../../i18n';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { PasswordField } from '../../ui/PasswordField';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';

const t = m.auth.login;

interface LoginSearch {
  next?: string;
  expired?: 1;
  /** Sau khi xóa tài khoản (S6-02). */
  reason?: 'account-deleted';
}

/** SCR-01 · Đăng nhập (14:1772), sai mật khẩu (23:2828), tạm khóa (23:2868). */
function LoginPage() {
  const { next, expired, reason } = Route.useSearch();
  const router = useRouter();
  // Tên màn hình sẽ quay lại sau khi đăng nhập (FLW-06).
  const returnTitle =
    expired === 1 && next
      ? [...router.matchRoutes(safeNext(next).split('?')[0] ?? '/')]
          .reverse()
          .find((match) => match.staticData.title)?.staticData.title
      : undefined;
  const navigate = useNavigate();
  const toast = useToast();
  const login = useLogin();
  const [error, setError] = useState<'invalid' | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(nowMs);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  // Cập nhật số phút còn khóa mỗi 30 s; hết thời gian thì bỏ hộp cảnh báo.
  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = setInterval(() => {
      setNow(nowMs());
    }, 30_000);
    return () => {
      clearInterval(timer);
    };
  }, [lockedUntil]);
  const locked = lockedUntil !== null && lockedUntil > now;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await login.mutateAsync(values);
      await navigate({ to: safeNext(next) });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
        setError('invalid');
        form.setFocus('password');
        return;
      }
      if (err instanceof ApiError && err.code === 'ACCOUNT_LOCKED') {
        form.setValue('password', '');
        const at = nowMs();
        setNow(at);
        setLockedUntil(at + (err.problem.retryAfter ?? 900) * 1000);
        return;
      }
      const message = toUserMessage(err);
      if ('message' in message) toast.show({ kind: 'error', message: message.message });
    }
  });

  return (
    <>
      <h1 className="text-h1 mb-1">{t.title}</h1>
      <p className="text-body text-text-muted mb-6">{m.auth.tagline}</p>

      <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        {expired === 1 && !error && !locked && (
          <Alert tone="warning">
            {m.system.expiredDraft}
            {returnTitle && <span className="mt-1 block">{m.system.returnTo(returnTitle)}</span>}
          </Alert>
        )}
        {reason === 'account-deleted' && !error && <Alert tone="info">{t.accountDeleted}</Alert>}
        {error === 'invalid' && <Alert tone="danger">{t.invalid}</Alert>}
        {locked && (
          <Alert tone="warning">{t.locked(minutesFrom((lockedUntil - now) / 1000))}</Alert>
        )}

        <TextField
          label={m.auth.email}
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <PasswordField
          label={m.auth.password}
          autoComplete="current-password"
          error={form.formState.errors.password?.message ?? (error === 'invalid' ? ' ' : undefined)}
          {...form.register('password')}
        />

        <Button type="submit" fullWidth loading={login.isPending} disabled={locked}>
          {t.submit}
        </Button>
        <Link to="/forgot-password" className="text-primary text-body self-center font-semibold">
          {t.forgot}
        </Link>
      </form>

      <p className="text-body text-text-muted mt-8 text-center">
        {t.noAccount}{' '}
        <Link to="/register" className="text-primary font-bold">
          {t.toRegister}
        </Link>
      </p>
    </>
  );
}

export const Route = createFileRoute('/_auth/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    ...(typeof search.next === 'string' ? { next: search.next } : {}),
    ...(search.expired === 1 || search.expired === '1' ? { expired: 1 as const } : {}),
    ...(search.reason === 'account-deleted' ? { reason: 'account-deleted' as const } : {}),
  }),
  staticData: { title: t.title },
  component: LoginPage,
});
