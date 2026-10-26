import { ApiError } from '@ph/api-client';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { PawPrint } from 'lucide-react';
import { useEffect, useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import {
  registerDashboardPrefetch,
  setDashboardFilter,
  useDashboardFilter,
} from '../../lib/dashboard-filter';
import { buttonClassName } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { cx } from '../../ui/cx';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';
import { useToast } from '../../ui/toast';
import {
  CompleteMilestoneDialog,
  MilestoneFormDialog,
  milestoneQuery,
  type MilestoneDetailData,
} from '../milestones';
import { PetPickDialog } from '../pets';
import { RoutineFormDialog } from '../routines';
import { WeightEntryDialog } from '../weights';
import { MilestonesPanel, RoutinesPanel, WeightListPanel, WeightPanel } from './panels';
import { dashboardQuery, type DashboardData } from './queries';
import { ReminderBanner } from './ReminderBanner';
import { VerifyEmailBanner } from './VerifyEmailBanner';

type Pet = DashboardData['pets'][number];
type Action = 'routine' | 'milestone' | 'weight';

/** Skeleton cùng lưới với nội dung thật (21:2473), kích thước cố định để không xô lệch. */
function DashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <Skeleton className="h-24 rounded-lg md:col-span-2" />
      <div className="flex flex-col gap-4 md:order-2">
        <div className="bg-surface flex flex-col gap-2 rounded-lg p-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4 md:order-1">
        <Skeleton className="h-[200px] rounded-lg" />
        <div className="bg-surface flex flex-col gap-2 rounded-lg p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Người dùng mới (8:281): thêm thú cưng đầu tiên + 3 bước. */
function DashboardEmpty({ emailVerified }: { emailVerified: boolean }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      {!emailVerified && <VerifyEmailBanner />}
      <EmptyState
        icon={<PawPrint size={32} />}
        title={m.empty.firstPetTitle}
        description={m.empty.firstPetDescription}
        action={
          <Link to="/pets/new" className={buttonClassName()}>
            {m.empty.firstPetAction}
          </Link>
        }
      />
      <Card title={<span className="text-caption uppercase">{m.dashboard.steps.title}</span>}>
        <ol className="text-body m-0 flex list-decimal flex-col gap-2 pl-5">
          {m.dashboard.steps.items.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

/**
 * SCR-06 Dashboard (8:3): toàn bộ dữ liệu từ 1 request `GET /dashboard`. Phone 1 cột: banner →
 * Việc hôm nay → Mốc sắp tới → Cân nặng. ≥ 768 px: banner trải 2 cột; trái 60% (Cân nặng, Mốc),
 * phải 40% (Việc hôm nay).
 */
export function DashboardScreen({ timezoneToday }: { timezoneToday: string }) {
  const filter = useDashboardFilter();
  // Đổi bộ lọc: giữ nội dung cũ (làm mờ) trong lúc tải, không nháy về skeleton.
  const query = useQuery({ ...dashboardQuery(filter), placeholderData: keepPreviousData });
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<{ action: Action; pet?: Pet } | null>(null);
  const [completing, setCompleting] = useState<MilestoneDetailData | null>(null);

  useEffect(
    () =>
      registerDashboardPrefetch((filters) => {
        for (const f of filters) void queryClient.query(dashboardQuery(f)).catch(() => undefined);
      }),
    [queryClient],
  );

  // Thú cưng đã bị xóa ở thiết bị khác → về "Tất cả".
  const gone = query.error instanceof ApiError && query.error.status === 404;
  useEffect(() => {
    if (gone) setDashboardFilter('all');
  }, [gone]);

  if (query.isPending || gone) return <DashboardSkeleton />;
  if (query.isError) {
    return <ErrorState kind="server" onRetry={() => void query.refetch()} />;
  }

  const data = query.data;
  if (data.pets.length === 0) return <DashboardEmpty emailVerified={data.account.emailVerified} />;

  const all = filter === 'all';
  const scopePet = all ? undefined : data.pets.find((p) => p.id === filter);
  const firstPet = data.pets[0];
  const linkPet = scopePet ?? firstPet;
  const today = data.today || timezoneToday;

  const start = (action: Action) => {
    if (scopePet || data.pets.length === 1) {
      setPending({ action, pet: scopePet ?? firstPet });
    } else {
      setPending({ action });
    }
  };

  const openComplete = async (milestoneId: string) => {
    try {
      setCompleting(await queryClient.query(milestoneQuery(milestoneId)));
    } catch (err) {
      const msg = toUserMessage(err);
      toast.show({ kind: 'error', message: 'message' in msg ? msg.message : m.error.serverToast });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  };

  const hasTop = Boolean(data.notifications.banner) || !data.account.emailVerified;

  const close = () => {
    setPending(null);
  };
  const pet = pending?.pet;

  return (
    <>
      <div
        aria-busy={query.isPlaceholderData || undefined}
        className={cx(
          // minmax(0, …): nội dung dài (tên việc không có dấu cách…) không kéo giãn cột ra ngoài màn hình.
          'grid grid-cols-1 items-start gap-4 transition-opacity md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]',
          query.isPlaceholderData && 'pointer-events-none opacity-60',
          hasTop
            ? "md:[grid-template-areas:'top_top'_'weight_routines'_'milestones_routines']"
            : "md:[grid-template-areas:'weight_routines'_'milestones_routines']",
        )}
      >
        {hasTop && (
          <div className="flex flex-col gap-3 md:[grid-area:top]">
            {data.notifications.banner && (
              <ReminderBanner
                banner={data.notifications.banner}
                onDone={(id) => void openComplete(id)}
              />
            )}
            {!data.account.emailVerified && <VerifyEmailBanner />}
          </div>
        )}
        <RoutinesPanel
          className="md:row-span-2 md:[grid-area:routines]"
          routines={data.routines}
          all={all}
          manageTo={linkPet ? `/pets/${linkPet.id}/routines` : null}
          onAdd={() => {
            start('routine');
          }}
        />
        <MilestonesPanel
          className="md:[grid-area:milestones]"
          items={data.upcomingMilestones}
          all={all}
          viewAllTo={linkPet ? `/pets/${linkPet.id}/milestones` : null}
          onComplete={(item) => void openComplete(item.id)}
          onCreate={() => {
            start('milestone');
          }}
        />
        {data.weights ? (
          <WeightListPanel
            className="md:[grid-area:weight]"
            rows={data.weights}
            onAdd={() => {
              start('weight');
            }}
          />
        ) : (
          data.weight && (
            <WeightPanel
              className="md:[grid-area:weight]"
              weight={data.weight}
              all={all}
              onAdd={() => {
                start('weight');
              }}
            />
          )
        )}
      </div>

      {pending && !pet && (
        <PetPickDialog
          pets={data.pets}
          onClose={close}
          onPick={(p) => {
            setPending({ action: pending.action, pet: { ...p, avatarThumbUrl: null } });
          }}
        />
      )}
      {pending?.action === 'routine' && pet && (
        <RoutineFormDialog petId={pet.id} petName={pet.name} onClose={close} />
      )}
      {pending?.action === 'milestone' && pet && (
        <MilestoneFormDialog petId={pet.id} petName={pet.name} today={today} onClose={close} />
      )}
      {pending?.action === 'weight' && pet && (
        <WeightEntryDialog
          petId={pet.id}
          petName={pet.name}
          target={data.weight?.petId === pet.id ? data.weight.target : null}
          today={today}
          onClose={close}
        />
      )}
      {completing && (
        <CompleteMilestoneDialog
          petId={completing.milestone.petId}
          petName={completing.petName}
          milestone={completing.milestone}
          today={completing.today}
          onClose={() => {
            setCompleting(null);
          }}
        />
      )}
    </>
  );
}
