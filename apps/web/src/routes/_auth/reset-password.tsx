import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@ph/api-client';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { toUserMessage } from '../../api/to-user-message';
import {
  resetSchema,
  takeFragmentToken,
  useResetPassword,
  type ResetValues,
} from '../../features/session';
import {
  LinkProblem,
  linkProblemOf,
  type LinkProblemKind,
} from '../../features/session/LinkProblem';
import { m } from '../../i18n';
import { buttonClassName, Button } from '../../ui/Button';
import { PasswordField } from '../../ui/PasswordField';
import { useToast } from '../../ui/toast';

const t = m.auth.reset;

/** SCR-04 · Đặt lại mật khẩu (14:1883), mở từ liên kết `/reset-password#token=...`. */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const reset = useResetPassword();
  // Đọc token một lần rồi xóa fragment khỏi thanh địa chỉ.
  const [token] = useState(takeFragmentToken);
  const [problem, setProblem] = useState<LinkProblemKind | null>(token ? null : 'invalid');

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { newPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!token) return;
    try {
      await reset.mutateAsync({ token, newPassword: values.newPassword });
      toast.show({ kind: 'success', message: t.done });
      await navigate({ to: '/login' });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 410)) {
        setProblem(linkProblemOf(err.code));
        return;
      }
      const message = toUserMessage(err);
      if (message.kind === 'fields' && message.fields.newPassword) {
        form.setError(
          'newPassword',
          { message: message.fields.newPassword },
          { shouldFocus: true },
        );
        return;
      }
      if ('message' in message) toast.show({ kind: 'error', message: message.message });
    }
  });

  if (problem) {
    return (
      <LinkProblem
        kind={problem}
        action={
          <Link to="/forgot-password" className={buttonClassName('primary', true)}>
            {t.requestNew}
          </Link>
        }
      />
    );
  }

  return (
    <>
      <h1 className="text-h1 mb-6">{t.title}</h1>
      <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <PasswordField
          label={m.auth.newPassword}
          autoComplete="new-password"
          hint={t.hint}
          error={form.formState.errors.newPassword?.message}
          {...form.register('newPassword')}
        />
        <Button type="submit" fullWidth loading={reset.isPending}>
          {t.submit}
        </Button>
        <p className="text-small text-text-muted">{t.note}</p>
      </form>
    </>
  );
}

export const Route = createFileRoute('/_auth/reset-password')({
  staticData: { title: t.title },
  component: ResetPasswordPage,
});
