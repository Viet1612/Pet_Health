import { ApiError } from '@ph/api-client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useState } from 'react';

import { PhotoUploader, useVisitUploads } from '../../../../features/photos';
import { useSession } from '../../../../features/session';
import {
  DeleteVisitDialog,
  formatVisitDate,
  useDeletePhoto,
  useUpdateVisit,
  VisitForm,
  visitQuery,
} from '../../../../features/visits';
import { todayIn } from '../../../../features/weights';
import { m } from '../../../../i18n';
import { useToast } from '../../../../ui/toast';

const t = m.visits.form;

/** SCR-13 · Sửa lần khám (23:3061). Ảnh tải/xóa ngay, độc lập với "Lưu thay đổi". */
function EditVisitPage() {
  const { visitId } = Route.useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: session } = useSession();
  const { data: visit } = useSuspenseQuery(visitQuery(visitId));
  const update = useUpdateVisit(visit.petId, visitId);
  const deletePhoto = useDeletePhoto(visit.petId, visitId);
  const uploads = useVisitUploads(visitId);
  const [deleting, setDeleting] = useState(false);
  const active = uploads.filter((u) => u.state !== 'error' && u.state !== 'rejected').length;

  const backToDetail = () => navigate({ to: '/visits/$visitId', params: { visitId } });

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Link
          to="/visits/$visitId"
          params={{ visitId }}
          aria-label={t.close}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full"
        >
          <X size={24} aria-hidden />
        </Link>
        <h1 className="text-h1 min-w-0 flex-1 truncate">
          {t.editTitle(formatVisitDate(visit.visitedOn))}
        </h1>
      </div>
      <VisitForm
        mode="edit"
        initial={visit}
        today={todayIn(session?.user.timezone)}
        photosHeader={m.photos.header(visit.photos.length + active)}
        photos={
          <PhotoUploader
            visitId={visitId}
            photos={visit.photos}
            onDeletePhoto={(photoId) => deletePhoto.mutateAsync(photoId)}
          />
        }
        extraActions={
          <button
            type="button"
            className="text-danger text-body min-h-11 self-start font-semibold"
            onClick={() => {
              setDeleting(true);
            }}
          >
            {m.visits.delete}
          </button>
        }
        onCancel={() => void backToDetail()}
        onSubmit={async (values) => {
          await update.mutateAsync(values);
          toast.show({ kind: 'success', message: m.toast.saved });
          await backToDetail();
        }}
      />
      {deleting && (
        <DeleteVisitDialog
          visit={visit}
          onClose={() => {
            setDeleting(false);
          }}
        />
      )}
    </>
  );
}

export const Route = createFileRoute('/_app/visits/$visitId/edit')({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query(visitQuery(params.visitId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound({ throw: true });
      throw error;
    }
  },
  staticData: { title: m.visits.form.addTitle },
  component: EditVisitPage,
});
