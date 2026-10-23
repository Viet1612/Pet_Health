import { AlertCircle } from 'lucide-react';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cx } from './cx';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  /** Phần tử bên phải ô nhập (ví dụ nút "Hiện"). */
  trailing?: ReactNode;
}

/** Ô nhập có nhãn, gợi ý và lỗi dưới trường (gắn aria-describedby, aria-invalid). */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, trailing, className, ...rest },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-small font-semibold">
        {label}
      </label>
      <div
        className={cx(
          'bg-surface flex min-h-12 items-center rounded-md border',
          error ? 'border-danger border-2' : 'border-border',
          'focus-within:outline-focus focus-within:outline-2 focus-within:outline-offset-2',
        )}
      >
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="text-body min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
          {...rest}
        />
        {trailing}
      </div>
      {error && (
        <p id={errorId} className="text-small text-danger flex items-center gap-1">
          <AlertCircle size={16} aria-hidden />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-small text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
