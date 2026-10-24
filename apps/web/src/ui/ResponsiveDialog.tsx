import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { m } from '../i18n';
import { cx } from './cx';
import { IconButton } from './IconButton';

export interface ResponsiveDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

const SWIPE_CLOSE_PX = 80;

/**
 * CMP-12 (UXD-006): bottom sheet ở < 768 px, modal 480 px ở ≥ 768 px. Dựng trên `<dialog>` +
 * `showModal()`: trình duyệt lo bẫy focus, Esc và trả focus về nút mở.
 */
export function ResponsiveDialog({
  open,
  onClose,
  title,
  children,
  footer,
}: ResponsiveDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Bấm vào scrim (ngoài khung) thì đóng.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cx(
        'bg-surface text-text shadow-overlay m-0 w-full max-w-none p-0',
        // Phone: sheet đáy
        'mt-auto max-h-[90vh] rounded-t-xl',
        // ≥ 768 px: modal giữa màn hình
        'md:m-auto md:max-h-[85vh] md:w-[480px] md:rounded-xl',
      )}
    >
      <div
        className="flex max-h-[inherit] flex-col"
        onPointerDown={(e) => {
          dragStart.current = e.clientY;
        }}
        onPointerUp={(e) => {
          if (dragStart.current !== null && e.clientY - dragStart.current > SWIPE_CLOSE_PX) {
            onClose();
          }
          dragStart.current = null;
        }}
      >
        <div aria-hidden className="bg-divider mx-auto mt-2 h-1 w-10 rounded-full md:hidden" />
        <header className="flex items-center justify-between gap-2 px-4 pt-2 pb-1">
          <h2 id={titleId} className="text-h2">
            {title}
          </h2>
          <IconButton aria-label={m.dialog.close} icon={<X size={24} />} onClick={onClose} />
        </header>
        <div className="overflow-y-auto px-4 pb-4">{children}</div>
        {footer && (
          <footer className="border-divider border-t px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}
