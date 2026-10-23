import { ApiError } from '@ph/api-client';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  minutesFrom,
  takeFragmentToken,
  useResendVerification,
  useSession,
  useVerifyEmail,
} from '../../features/session';
import {
  LinkProblem,
  linkProblemOf,
  type LinkProblemKind,
} from '../../features/session/LinkProblem';
import { vi } from '../../i18n/vi';
import { Alert } from '../../ui/Alert';
import { Button, buttonClassName } from '../../ui/Button';
import { Skeleton } from '../../ui/Skeleton';

const t = vi.auth.verify;

type VerifyState =
  | { kind: 'verifying' }
  | { kind: 'success'; email: string }
  | { kind: 'problem'; problem: LinkProblemKind }
  | { kind: 'resend-only' };

/** SCR-05 · Xác minh email (14:1906), liên kết hết hạn (23:2902). Mở cho mọi người. */
function VerifyEmailPage() {
  const { resend } = Route.useSearch();
  const navigate = useNavigate();
  const session = useSession();
  const verify = useVerifyEmail();
  const resendMutation = useResendVerification();
  const [token] = useState(takeFragmentToken);
  const [state, setState] = useState<VerifyState>(
    token
      ? { kind: 'verifying' }
      : resend
        ? { kind: 'resend-only' }
        : { kind: 'problem', problem: 'invalid' },
  );
  const [resendResult, setResendResult] = useState<
    { ok: true } | { ok: false; text: string } | null
  >(null);
  const started = useRef(false);

  // Gọi xác minh đúng một lần (kể cả StrictMode chạy effect hai lần).
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verify.mutate(token, {
      onSuccess: ({ user }) => {
        setState({ kind: 'success', email: user.email });
      },
      onError: (err) => {
        setState({
          kind: 'problem',
          problem: linkProblemOf(err instanceof ApiError ? err.code : undefined),
        });
      },
    });
  }, [token, verify]);

  const loggedIn = Boolean(session.data);

  const doResend = async (): Promise<void> => {
    if (!loggedIn) {
      await navigate({ to: '/login', search: { next: '/verify-email?resend=1' } });
      return;
    }
    try {
      await resendMutation.mutateAsync();
      setResendResult({ ok: true });
    } catch (err) {
      const minutes =
        err instanceof ApiError && err.status === 429
          ? minutesFrom(err.problem.retryAfter ?? 3600)
          : null;
      setResendResult({ ok: false, text: minutes ? t.tooMany(minutes) : vi.error.serverToast });
    }
  };

  // Quay lại từ /login?next=/verify-email?resend=1: tự gửi lại một lần.
  const autoResent = useRef(false);
  useEffect(() => {
    if (state.kind !== 'resend-only' || !loggedIn || autoResent.current) return;
    autoResent.current = true;
    void doResend();
  });

  const homeLink = (
    <Link
      to={loggedIn ? '/' : '/login'}
      {...(loggedIn ? {} : { search: { next: '/' } })}
      className={buttonClassName('primary', true)}
    >
      {t.toHome}
    </Link>
  );

  if (state.kind === 'verifying') {
    return (
      <div aria-busy="true" className="flex flex-col items-center gap-3 py-6">
        <Skeleton className="size-16 rounded-full" />
        <p className="text-body text-text-muted">{t.verifying}</p>
      </div>
    );
  }

  if (state.kind === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div
          aria-hidden
          className="bg-success-bg text-success flex size-16 items-center justify-center rounded-full"
        >
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-h1">{t.successTitle}</h1>
        <p className="text-body text-text-muted">{t.successBody(state.email)}</p>
        <div className="mt-2 w-full">{homeLink}</div>
      </div>
    );
  }

  const resendBlock = (
    <>
      {resendResult?.ok === true && <Alert tone="success">{t.resent}</Alert>}
      {resendResult?.ok === false && <Alert tone="danger">{resendResult.text}</Alert>}
      <Button fullWidth loading={resendMutation.isPending} onClick={() => void doResend()}>
        {t.resend}
      </Button>
      <Link to={loggedIn ? '/' : '/login'} className="text-primary text-body font-semibold">
        {t.toHome}
      </Link>
    </>
  );

  if (state.kind === 'resend-only') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <h1 className="text-h1">{t.pageTitle}</h1>
        {resendBlock}
      </div>
    );
  }

  return (
    <LinkProblem
      kind={state.problem}
      {...(state.problem === 'expired' ? { description: t.expiredBody } : {})}
      action={resendBlock}
    />
  );
}

export const Route = createFileRoute('/_auth/verify-email')({
  validateSearch: (search: Record<string, unknown>): { resend?: 1 } =>
    search.resend === 1 || search.resend === '1' ? { resend: 1 } : {},
  staticData: { title: t.pageTitle },
  component: VerifyEmailPage,
});
