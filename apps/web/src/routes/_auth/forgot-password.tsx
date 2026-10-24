import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@ph/api-client';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { toUserMessage } from '../../api/to-user-message';
import {
  forgotSchema,
  minutesFrom,
  useForgotPassword,
  type ForgotValues,
} from '../../features/session';
import { m } from '../../i18n';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';

const t = m.auth.forgot;

/** SCR-03 · Quên mật khẩu (14:1854). Phản hồi luôn như nhau dù email có tài khoản hay không. */
function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [state, setState] = useState<
    | { kind: 'sent' }
    | { kind: 'limited'; minutes: number }
    | { kind: 'error'; message: string }
    | null
  >(null);

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { email: '' },
  });

  const send = form.handleSubmit(async (values) => {
    try {
      await forgot.mutateAsync(values);
      setState({ kind: 'sent' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setState({ kind: 'limited', minutes: minutesFrom(err.problem.retryAfter ?? 3600) });
        return;
      }
      const message = toUserMessage(err);
      setState({
        kind: 'error',
        message: 'message' in message ? message.message : m.error.serverToast,
      });
    }
  });

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Link
          to="/login"
          aria-label={t.back}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full"
        >
          <ArrowLeft size={24} aria-hidden />
        </Link>
        <h1 className="text-h1">{t.title}</h1>
      </div>
      <p className="text-body text-text-muted mb-6">{t.lead}</p>

      <form noValidate onSubmit={(e) => void send(e)} className="flex flex-col gap-4">
        {state?.kind === 'sent' && (
          <Alert tone="success">
            <p>{t.sent}</p>
            <button
              type="button"
              className="mt-2 min-h-11 font-bold underline"
              onClick={() => void send()}
            >
              {t.resend}
            </button>
          </Alert>
        )}
        {state?.kind === 'limited' && <Alert tone="danger">{t.tooMany(state.minutes)}</Alert>}
        {state?.kind === 'error' && <Alert tone="danger">{state.message}</Alert>}

        <TextField
          label={m.auth.email}
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Button type="submit" fullWidth loading={forgot.isPending}>
          {t.submit}
        </Button>
      </form>
    </>
  );
}

export const Route = createFileRoute('/_auth/forgot-password')({
  staticData: { title: t.title },
  component: ForgotPasswordPage,
});
