import { ApiError } from '@ph/api-client';
import { MailWarning } from 'lucide-react';

import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/toast';
import { useResendVerification } from '../session';

const t = m.dashboard.verify;

/** CMP-05 SystemBanner (verify-email): nhắc xác minh, không chặn chức năng (FR-DSH-007). */
export function VerifyEmailBanner() {
  const toast = useToast();
  const resend = useResendVerification();
  return (
    <div role="status" className="bg-neutral-bg flex flex-wrap items-center gap-3 rounded-lg p-3">
      <MailWarning size={22} aria-hidden className="text-neutral shrink-0" />
      <p className="text-body min-w-0 flex-1">{t.text}</p>
      <Button
        variant="secondary"
        loading={resend.isPending}
        onClick={() => {
          resend.mutate(undefined, {
            onSuccess: () => {
              toast.show({ kind: 'success', message: t.sent });
            },
            onError: (err) => {
              toast.show({
                kind: 'error',
                message:
                  err instanceof ApiError && err.status === 429 ? t.tooMany : m.error.serverToast,
              });
            },
          });
        }}
      >
        {t.resend}
      </Button>
    </div>
  );
}
