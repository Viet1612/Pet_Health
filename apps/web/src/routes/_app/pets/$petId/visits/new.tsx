import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useState } from 'react';

import { useIdempotencyKey } from '../../../../../api/use-idempotency-key';
import { enqueuePhotos, PhotoPicker, type PickedPhoto } from '../../../../../features/photos';
import { useSession } from '../../../../../features/session';
import { useCreateVisit, VisitForm } from '../../../../../features/visits';
import { todayIn } from '../../../../../features/weights';
import { m } from '../../../../../i18n';
import { ConfirmDialog } from '../../../../../ui/ConfirmDialog';
import { IconButton } from '../../../../../ui/IconButton';
import { useToast } from '../../../../../ui/toast';

const t = m.visits.form;

/**
 * SCR-13 · Thêm lần khám (10:1206). Lưu xong chuyển ngay sang chi tiết; ảnh đã chọn được đưa vào
 * hàng đợi và tải tiếp ở nền (không phải đợi).
 */
function NewVisitPage() {
  const { petId } = Route.useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: session } = useSession();
  const create = useCreateVisit(petId);
  const idempotency = useIdempotencyKey();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const today = todayIn(session?.user.timezone);
  const validCount = photos.filter((p) => !p.error).length;

  const leave = () => navigate({ to: '/pets/$petId/health/visits', params: { petId } });
  const close = () => {
    if (dirty || photos.length) setConfirmDiscard(true);
    else void leave();
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <IconButton aria-label={t.close} icon={<X size={24} />} onClick={close} />
        <h1 className="text-h1 flex-1">{t.addTitle}</h1>
      </div>
      <VisitForm
        mode="create"
        today={today}
        photosHeader={m.photos.header(validCount)}
        photos={<PhotoPicker value={photos} onChange={setPhotos} />}
        onDirtyChange={setDirty}
        onCancel={close}
        onSubmit={async (values) => {
          const visit = await create.mutateAsync({ values, key: idempotency.key });
          idempotency.reset();
          const files = photos.filter((p) => !p.error).map((p) => p.file);
          if (files.length) enqueuePhotos(visit.id, files, 0);
          toast.show({ kind: 'success', message: m.toast.saved });
          await navigate({ to: '/visits/$visitId', params: { visitId: visit.id } });
        }}
      />
      {confirmDiscard && (
        <ConfirmDialog
          open
          title={t.discardConfirm}
          confirmLabel={t.discard}
          onClose={() => {
            setConfirmDiscard(false);
          }}
          onConfirm={() => void leave()}
        />
      )}
    </>
  );
}

export const Route = createFileRoute('/_app/pets/$petId/visits/new')({
  staticData: { title: t.addTitle },
  component: NewVisitPage,
});
