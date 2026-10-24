import { ApiError } from '@ph/api-client';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { petQuery } from '../../../../features/pets';
import { useSession } from '../../../../features/session';
import { VisitDetail, VisitList, visitQuery } from '../../../../features/visits';
import { m } from '../../../../i18n';
import { Skeleton } from '../../../../ui/Skeleton';

/**
 * SCR-12 · Chi tiết lần khám. < 768 px: trang riêng; ≥ 768 px: nằm cạnh danh sách lần khám của
 * thú cưng (mở `/visits/:id` trực tiếp vẫn đúng bố cục).
 */
function VisitPage() {
  const { visitId } = Route.useParams();
  const { data: visit } = useSuspenseQuery(visitQuery(visitId));
  const { data: pet } = useQuery(petQuery(visit.petId));
  const { data: session } = useSession();
  return (
    <div className="md:grid md:grid-cols-[360px_1fr] md:items-start md:gap-6 xl:grid-cols-[440px_1fr]">
      <div className="hidden md:block">
        <VisitList petId={visit.petId} selectedId={visit.id} />
      </div>
      <div className="md:bg-surface md:border-divider md:rounded-xl md:border md:p-6">
        <VisitDetail visit={visit} petName={pet?.name ?? ''} timeZone={session?.user.timezone} />
      </div>
    </div>
  );
}

function VisitPending() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton shape="card" />
      <Skeleton shape="card" />
    </div>
  );
}

export const Route = createFileRoute('/_app/visits/$visitId/')({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query(visitQuery(params.visitId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound({ throw: true });
      throw error;
    }
  },
  staticData: { title: m.visits.detailTitle },
  pendingComponent: VisitPending,
  component: VisitPage,
});
