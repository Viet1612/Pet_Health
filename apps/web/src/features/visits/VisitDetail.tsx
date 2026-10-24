import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { vi } from '../../i18n/vi';
import { buttonClassName } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { IconButton } from '../../ui/IconButton';
import { useToast } from '../../ui/toast';
import { PhotoGrid } from '../photos';
import { formatDateTime, formatVisitDate } from './format';
import { useDeleteVisit, visitKey, type Visit } from './queries';

const t = vi.visits;

function TextBlock({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <section>
      <h2 className="text-caption text-text-muted mb-1 uppercase">{title}</h2>
      <p className="text-body break-words whitespace-pre-wrap">{text}</p>
    </section>
  );
}

function OptionsMenu({ visitId, onDelete }: { visitId: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const item = 'text-body hover:bg-surface-2 flex min-h-11 w-full items-center px-4 text-left';
  return (
    <div ref={ref} className="relative">
      <IconButton
        aria-label={t.options}
        aria-haspopup="menu"
        aria-expanded={open}
        icon={<MoreVertical size={22} />}
        onClick={() => {
          setOpen((v) => !v);
        }}
      />
      {open && (
        <div
          role="menu"
          className="border-divider bg-surface shadow-overlay absolute top-11 right-0 z-20 min-w-36 rounded-md border py-1"
        >
          <Link role="menuitem" to="/visits/$visitId/edit" params={{ visitId }} className={item}>
            {t.edit}
          </Link>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-danger`}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            {t.deleteAction}
          </button>
        </div>
      )}
    </div>
  );
}

/** Hộp xác nhận xóa lần khám (dùng ở SCR-12 và SCR-13 sửa). */
export function DeleteVisitDialog({ visit, onClose }: { visit: Visit; onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const remove = useDeleteVisit(visit.petId, visit.id);
  return (
    <ConfirmDialog
      open
      title={t.deleteConfirm(visit.photos.length)}
      confirmLabel={t.deleteAction}
      loading={remove.isPending}
      onClose={onClose}
      onConfirm={() => {
        remove.mutate(undefined, {
          onSuccess: () => {
            toast.show({ kind: 'success', message: t.deleted });
            void navigate({
              to: '/pets/$petId/health/visits',
              params: { petId: visit.petId },
              replace: true,
            });
          },
          onError: (err) => {
            const m = toUserMessage(err);
            toast.show({
              kind: 'error',
              message: 'message' in m ? m.message : vi.error.serverToast,
            });
          },
        });
      }}
    />
  );
}

/** SCR-12 · Chi tiết lần khám (10:1056). */
export function VisitDetail({
  visit,
  petName,
  timeZone,
}: {
  visit: Visit;
  petName: string;
  timeZone: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const date = formatVisitDate(visit.visitedOn);
  const ready = visit.photos.filter((p) => p.status === 'READY').length;

  return (
    <article className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/pets/$petId/health/visits"
          params={{ petId: visit.petId }}
          aria-label={t.back}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full md:hidden"
        >
          <ArrowLeft size={24} aria-hidden />
        </Link>
        <p className="text-h2 flex-1">{t.detailTitle}</p>
        <OptionsMenu
          visitId={visit.id}
          onDelete={() => {
            setDeleting(true);
          }}
        />
      </div>
      <header>
        <h1 className="text-h1">{date}</h1>
        <p className="text-small text-text-muted">
          {t.recordedAt(petName, formatDateTime(visit.createdAt, timeZone))}
        </p>
      </header>
      <TextBlock title={t.symptoms} text={visit.symptoms} />
      <TextBlock title={t.diagnosis} text={visit.diagnosis} />
      <TextBlock title={t.prescription} text={visit.prescription} />
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-caption text-text-muted uppercase">{t.photos}</h2>
          {ready > 0 && <span className="text-small text-text-muted">{t.photosHint(ready)}</span>}
        </div>
        <PhotoGrid
          visitId={visit.id}
          visitDate={date}
          photos={visit.photos}
          onImageError={() => void queryClient.invalidateQueries({ queryKey: visitKey(visit.id) })}
        />
      </section>
      <div className="border-divider flex flex-wrap items-center gap-3 border-t pt-4">
        <Link
          to="/visits/$visitId/edit"
          params={{ visitId: visit.id }}
          className={buttonClassName('secondary')}
        >
          {t.edit}
        </Link>
        <button
          type="button"
          className="text-danger text-body min-h-11 font-semibold"
          onClick={() => {
            setDeleting(true);
          }}
        >
          {t.delete}
        </button>
      </div>
      {deleting && (
        <DeleteVisitDialog
          visit={visit}
          onClose={() => {
            setDeleting(false);
          }}
        />
      )}
    </article>
  );
}
