import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from './cx';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Bắt buộc: nút chỉ có icon phải có tên đọc được (NFR-USA). */
  'aria-label': string;
  icon: ReactNode;
}

/** CMP-02: vùng chạm 44 × 44 px. */
export function IconButton({ icon, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'text-text inline-flex size-11 items-center justify-center rounded-full',
        'duration-fast hover:bg-surface-2 transition-colors disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      <span aria-hidden className="inline-flex">
        {icon}
      </span>
    </button>
  );
}
