import { MailWarning } from 'lucide-react';
import type { ReactNode } from 'react';

import { m } from '../../i18n';

export type LinkProblemKind = 'expired' | 'used' | 'invalid';

export function linkProblemOf(code: string | undefined): LinkProblemKind {
  if (code === 'TOKEN_EXPIRED') return 'expired';
  if (code === 'TOKEN_USED') return 'used';
  return 'invalid';
}

/** Trạng thái liên kết email hết hạn / đã dùng / không hợp lệ (SCR-04, SCR-05 · 23:2902). */
export function LinkProblem({
  kind,
  description,
  action,
}: {
  kind: LinkProblemKind;
  description?: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div
        aria-hidden
        className="bg-warning-bg text-warning flex size-16 items-center justify-center rounded-full"
      >
        <MailWarning size={32} />
      </div>
      <h1 className="text-h1">{m.auth.link[kind]}</h1>
      {description && <p className="text-body text-text-muted">{description}</p>}
      <div className="mt-2 flex w-full flex-col items-center gap-3">{action}</div>
    </div>
  );
}
