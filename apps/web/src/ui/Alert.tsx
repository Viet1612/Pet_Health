import { AlertCircle, CheckCircle2, Info, Lock, Mail } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx } from './cx';

export type AlertTone = 'danger' | 'warning' | 'success' | 'info';

const TONES: Record<AlertTone, string> = {
  danger: 'bg-danger-bg text-danger',
  warning: 'bg-warning-bg text-warning',
  success: 'bg-success-bg text-success',
  info: 'bg-neutral-bg text-neutral',
};

const ICONS = {
  danger: AlertCircle,
  warning: Lock,
  success: Mail,
  info: Info,
  check: CheckCircle2,
};

/** Hộp thông báo trong form: lỗi dùng role="alert", còn lại role="status". */
export function Alert({
  tone,
  children,
  icon,
}: {
  tone: AlertTone;
  children: ReactNode;
  icon?: keyof typeof ICONS;
}) {
  const Icon = ICONS[icon ?? tone];
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cx(
        'text-small flex items-start gap-2 rounded-md px-3 py-3 font-semibold',
        TONES[tone],
      )}
    >
      <Icon size={20} aria-hidden className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
