import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-2',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
  danger: 'bg-danger text-surface hover:opacity-90',
};

/** Class giao diện nút, dùng cho cả `<Link>` trông như nút (tránh lồng button trong a). */
export function buttonClassName(variant: ButtonVariant = 'primary', fullWidth = false): string {
  return cx(
    'relative inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-body font-semibold',
    'transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    fullWidth && 'w-full',
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

/** CMP-01: cao 44 px; khi loading giữ nguyên bề rộng và khóa thao tác. */
export function Button({
  variant = 'primary',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={Boolean(disabled) || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClassName(variant, fullWidth), className)}
      {...rest}
    >
      <span className={cx('inline-flex items-center gap-2', loading && 'invisible')}>
        {icon}
        {children}
      </span>
      {loading && (
        <span
          aria-hidden
          className="absolute size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
    </button>
  );
}
