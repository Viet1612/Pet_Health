import { m } from '../i18n';
import { Button } from './Button';
import { ResponsiveDialog } from './ResponsiveDialog';

/**
 * CMP-13 ConfirmDialog: hỏi lại trước thao tác không hoàn tác. Nút "Hủy" nhận focus mặc định
 * (`autofocus` + `showModal()`), nút xác nhận màu đỏ khi `danger`.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = m.confirm.cancel,
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ResponsiveDialog open={open} onClose={onClose} title={title}>
      {description && <p className="text-body text-text-muted mb-4">{description}</p>}
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button
          variant="secondary"
          // Spec: "Hủy" nhận focus mặc định.
          autoFocus
          disabled={loading}
          onClick={onClose}
        >
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
