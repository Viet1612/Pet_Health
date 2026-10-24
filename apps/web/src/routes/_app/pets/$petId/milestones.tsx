import { ApiError } from '@ph/api-client';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';

import {
  MILESTONE_TABS,
  MilestoneList,
  milestonesQuery,
  type MilestoneTab,
} from '../../../../features/milestones';
import { petQuery } from '../../../../features/pets';
import { vi } from '../../../../i18n/vi';

/** SCR-14 · Lịch mốc y tế. ≥ 768 px: danh sách + khung "Chọn một mốc để xem chi tiết". */
function MilestonesPage() {
  const { petId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { data: pet } = useQuery(petQuery(petId));
  return (
    <div className="md:grid md:grid-cols-[1fr_340px] md:items-start md:gap-6 xl:grid-cols-[1fr_420px]">
      <MilestoneList
        petId={petId}
        petName={pet?.name ?? ''}
        tab={tab}
        onTabChange={(next) =>
          void navigate({ to: '.', search: { tab: next }, replace: true } as never)
        }
      />
      <div className="border-divider text-text-muted hidden min-h-64 items-center justify-center rounded-xl border border-dashed p-6 text-center md:flex">
        {vi.milestones.pickHint}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_app/pets/$petId/milestones')({
  validateSearch: (search: Record<string, unknown>): { tab?: MilestoneTab } =>
    MILESTONE_TABS.includes(search.tab as MilestoneTab) ? { tab: search.tab as MilestoneTab } : {},
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query(milestonesQuery(params.petId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound({ throw: true });
      throw error;
    }
  },
  staticData: { title: vi.milestones.title },
  component: MilestonesPage,
});
