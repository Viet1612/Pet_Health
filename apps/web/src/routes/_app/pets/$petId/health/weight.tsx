import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { petQuery } from '../../../../../features/pets';
import { useSession } from '../../../../../features/session';
import { todayIn, weightsQuery, WeightScreen } from '../../../../../features/weights';
import { vi } from '../../../../../i18n/vi';
import { Skeleton } from '../../../../../ui/Skeleton';

/** SCR-10 · Sức khỏe / Cân nặng. */
function WeightPage() {
  const { petId } = Route.useParams();
  const { data: pet } = useSuspenseQuery(petQuery(petId));
  const { data: session } = useSession();
  return <WeightScreen petId={petId} petName={pet.name} today={todayIn(session?.user.timezone)} />;
}

function WeightPending() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <Skeleton shape="card" className="h-56" />
        <Skeleton shape="chart" className="h-[260px] md:h-[340px]" />
      </div>
      <Skeleton shape="card" />
    </div>
  );
}

export const Route = createFileRoute('/_app/pets/$petId/health/weight')({
  loader: ({ context, params }) => context.queryClient.query(weightsQuery(params.petId)),
  staticData: { title: vi.health.title },
  pendingComponent: WeightPending,
  component: WeightPage,
});
