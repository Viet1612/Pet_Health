import { X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { vi } from '../i18n/vi';
import { cx } from './cx';
import { IconButton } from './IconButton';

export type ToastInput =
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string; onRetry?: () => void }
  | { kind: 'undo'; message: string; onUndo: () => void; durationMs?: number };

type Toast = ToastInput & { id: number };

const SUCCESS_MS = 3000;
const UNDO_MS = 10_000;

interface ToastApi {
  show: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast phải nằm trong ToastProvider');
  return api;
}

/** CMP-10 (UXD-007): đáy màn hình trên BottomNav (phone), góc dưới phải (≥ 768 px). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { ...toast, id }]);
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className={cx(
          'pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4',
          'bottom-[calc(64px+env(safe-area-inset-bottom)+12px)]',
          'md:inset-x-auto md:right-6 md:bottom-6 md:items-end md:px-0',
        )}
      >
        <div aria-live="polite" className="flex flex-col gap-2">
          {toasts
            .filter((t) => t.kind !== 'error')
            .map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
        </div>
        <div aria-live="assertive" className="flex flex-col gap-2">
          {toasts
            .filter((t) => t.kind === 'error')
            .map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [hasFocus, setHasFocus] = useState(false);
  const duration =
    toast.kind === 'success'
      ? SUCCESS_MS
      : toast.kind === 'undo'
        ? (toast.durationMs ?? UNDO_MS)
        : null;

  // Tự ẩn (success 3 s, undo 10 s); lỗi không tự ẩn; tạm dừng khi toast đang có focus.
  useEffect(() => {
    if (duration === null || hasFocus) return;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => {
      clearTimeout(timer);
    };
  }, [duration, hasFocus, onDismiss, toast.id]);

  const tone =
    toast.kind === 'error'
      ? 'bg-danger-bg text-danger'
      : toast.kind === 'success'
        ? 'bg-success-bg text-success'
        : 'bg-surface text-text';

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      onFocus={() => {
        setHasFocus(true);
      }}
      onBlur={() => {
        setHasFocus(false);
      }}
      // Không tự ẩn khi đang rê chuột (đọc hoặc định bấm Hoàn tác).
      onMouseEnter={() => {
        setHasFocus(true);
      }}
      onMouseLeave={() => {
        setHasFocus(false);
      }}
      className={cx(
        'shadow-overlay pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-lg py-2 pr-1 pl-4 md:w-96',
        tone,
      )}
    >
      <span className="text-small flex-1 font-semibold">{toast.message}</span>
      {toast.kind === 'error' && toast.onRetry && (
        <button
          type="button"
          className="text-small min-h-11 px-3 font-bold underline"
          onClick={() => {
            onDismiss(toast.id);
            toast.onRetry?.();
          }}
        >
          {vi.toast.retry}
        </button>
      )}
      {toast.kind === 'undo' && (
        <button
          type="button"
          className="text-small text-primary min-h-11 px-3 font-bold"
          onClick={() => {
            onDismiss(toast.id);
            toast.onUndo();
          }}
        >
          {vi.toast.undo}
        </button>
      )}
      <IconButton
        aria-label={vi.toast.close}
        icon={<X size={18} />}
        onClick={() => {
          onDismiss(toast.id);
        }}
      />
      {toast.kind === 'undo' && duration !== null && (
        <span
          aria-hidden
          className="bg-primary absolute bottom-0 left-0 h-1"
          style={{ animation: `ph-countdown ${String(duration)}ms linear forwards` }}
        />
      )}
    </div>
  );
}
