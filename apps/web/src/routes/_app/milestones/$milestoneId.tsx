import { ApiError } from '@ph/api-client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { useState } from 'react';

import {
  MilestoneDetail,
  MilestoneList,
  milestoneQuery,
  type MilestoneTab,
} from '../../../features/milestones';
import { vi } from '../../../i18n/vi';
import { Skeleton } from '../../../ui/Skeleton';

/**
 * SCR-15 · Chi tiết mốc. < 768 px: trang riêng; ≥ 768 px: khung chi tiết cạnh danh sách mốc của
 * thú cưng (mở thẳng `/milestones/:id` vẫn đúng bố cục). `?from=notification` → tô khối hành động.
 */
function MilestonePage() {
  const { milestoneId } = Route.useParams();
  const { from } = Route.useSearch();
  const { data } = useSuspenseQuery(milestoneQuery(milestoneId));
  const [tab, setTab] = useState<MilestoneTab | undefined>();
  return (
    <div className="md:grid md:grid-cols-[1fr_340px] md:items-start md:gap-6 xl:grid-cols-[1fr_420px]">
      <div className="hidden md:block">
        <MilestoneList
          petId={data.milestone.petId}
          petName={data.petName}
          tab={tab}
          onTabChange={setTab}
          selectedId={milestoneId}
        />
      </div>
      <div className="md:bg-surface md:border-divider md:rounded-xl md:border md:p-5">
        <MilestoneDetail detail={data} highlight={from === 'notification'} />
      </div>
    </div>
  );
}

function MilestonePending() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton shape="card" />
      <Skeleton shape="card" />
    </div>
  );
}

export const Route = createFileRoute('/_app/milestones/$milestoneId')({
  validateSearch: (search: Record<string, unknown>): { from?: 'notification' } =>
    search.from === 'notification' ? { from: 'notification' } : {},
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query(milestoneQuery(params.milestoneId));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound({ throw: true });
      throw error;
    }
  },
  staticData: { title: vi.milestones.detail.title },
  pendingComponent: MilestonePending,
  component: MilestonePage,
});
