import { AlertCircle } from 'lucide-react';
import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

import { cx } from './cx';

export interface TextAreaCounterProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'value'
> {
  label: string;
  value: string;
  max: number;
  /** Đếm ký tự (mặc định code point sau NFC, khớp server). */
  count?: (value: string) => number;
  error?: string | undefined;
}

const codePointsNfc = (s: string): number => Array.from(s.normalize('NFC')).length;

/**
 * CMP-18: ô nhập nhiều dòng có bộ đếm "n / max". Vượt giới hạn → bộ đếm đỏ, `aria-invalid`.
 * Bộ đếm đọc cho trình đọc màn hình khi còn ≤ 10% giới hạn.
 */
export const TextAreaCounter = forwardRef<HTMLTextAreaElement, TextAreaCounterProps>(
  function TextAreaCounter(
    { label, value, max, count = codePointsNfc, error, className, ...rest },
    ref,
  ) {
    const id = useId();
    const n = count(value);
    const over = n > max;
    const near = n >= max * 0.9;
    return (
      <div className={cx('flex flex-col gap-1', className)}>
        <label htmlFor={id} className="text-small font-semibold">
          {label}
        </label>
        <textarea
          ref={ref}
          id={id}
          rows={4}
          value={value}
          aria-invalid={error || over ? true : undefined}
          aria-describedby={`${id}-count${error ? ` ${id}-error` : ''}`}
          className={cx(
            'bg-surface text-body rounded-md border px-3 py-2',
            error || over ? 'border-danger border-2' : 'border-border',
          )}
          {...rest}
        />
        <div className="flex justify-between gap-2">
          <span id={`${id}-error`} className="text-small text-danger flex items-center gap-1">
            {error && <AlertCircle size={16} aria-hidden />}
            {error}
          </span>
          <span
            id={`${id}-count`}
            aria-live={near ? 'polite' : 'off'}
            className={cx(
              'text-small shrink-0',
              over ? 'text-danger font-bold' : 'text-text-muted',
            )}
          >
            {String(n)} / {String(max)}
          </span>
        </div>
      </div>
    );
  },
);
