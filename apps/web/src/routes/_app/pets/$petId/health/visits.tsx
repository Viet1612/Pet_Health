import { createFileRoute } from '@tanstack/react-router';

import { VisitList, visitsQuery } from '../../../../../features/visits';
import { m } from '../../../../../i18n';

/** SCR-11 · Sổ y tế (10:911). ≥ 768 px: danh sách bên trái, khung chi tiết bên phải. */
function VisitsPage() {
  const { petId } = Route.useParams();
  return (
    <div className="md:grid md:grid-cols-[360px_1fr] md:items-start md:gap-6 xl:grid-cols-[440px_1fr]">
      <VisitList petId={petId} />
      <div className="border-divider text-text-muted hidden min-h-64 items-center justify-center rounded-xl border border-dashed p-6 text-center md:flex">
        {m.visits.pickHint}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_app/pets/$petId/health/visits')({
  loader: ({ context, params }) => context.queryClient.infiniteQuery(visitsQuery(params.petId)),
  staticData: { title: m.health.title },
  component: VisitsPage,
});
