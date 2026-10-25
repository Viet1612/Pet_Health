import { Check } from 'lucide-react';

import { cx } from './cx';

/**
 * CMP-19: một dòng checklist. Cả dòng là `role="checkbox"` (vùng chạm ≥ 44 px), Space/Enter bật
 * tắt. Xong: ô tick đặc màu primary, tên gạch ngang màu phụ. `error` rung nhẹ 300 ms.
 */
export function ChecklistItem({
  time,
  label,
  ariaLabel,
  checked,
  error = false,
  meta,
  onToggle,
}: {
  time: string;
  label: string;
  ariaLabel: string;
  checked: boolean;
  error?: boolean;
  /** Dòng phụ, ví dụ tên thú cưng ở Dashboard "Tất cả". */
  meta?: string;
  onToggle: () => void;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cx(
        'hover:bg-surface-2 focus-visible:outline-focus flex min-h-14 cursor-pointer items-center gap-3 rounded-md px-2 select-none focus-visible:outline-2',
        error && 'animate-[ph-shake_300ms]',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'flex size-6 shrink-0 items-center justify-center rounded-md border-2',
          checked ? 'bg-primary border-primary text-on-primary' : 'border-border',
        )}
      >
        {checked && <Check size={16} strokeWidth={3} />}
      </span>
      <span className="text-small text-text-muted w-12 shrink-0 tabular-nums">{time}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cx(
            'text-body truncate',
            checked ? 'text-text-muted line-through' : 'font-semibold',
          )}
        >
          {label}
        </span>
        {meta && <span className="text-caption text-text-muted truncate">{meta}</span>}
      </span>
    </div>
  );
}
