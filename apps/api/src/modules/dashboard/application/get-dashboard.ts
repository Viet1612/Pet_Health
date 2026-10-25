import type { Transaction } from 'kysely';

import type { LocalDate } from '../../../platform/calendar/local-date.js';
import { todayIn } from '../../../platform/calendar/today.js';
import type { ClockPort } from '../../../platform/clock/clock.js';
import type { Database } from '../../../platform/db/kysely.js';
import { NotFoundError, UnauthenticatedError } from '../../../platform/errors/app-error.js';
import type { WeightDashboardSummary } from '../../health-records/index.js';
import type { NotificationSummary } from '../../notifications/index.js';
import type { PetListItem } from '../../pets/index.js';
import type { RoutineItem } from '../../routines/index.js';
import type { UpcomingMilestone } from '../../scheduling/index.js';

type Trx = Transaction<Database>;
type WithTx = <T>(fn: (trx: Trx) => Promise<T>) => Promise<T>;

/** Mô-đun dashboard không có bảng; chỉ đọc qua port của mô-đun khác (SAD §2.2.2). */
export interface DashboardPorts {
  clock: ClockPort;
  ownerTimezone(trx: Trx, ownerId: string): Promise<string | undefined>;
  listPets(trx: Trx, ownerId: string): Promise<PetListItem[]>;
  /** Đồng bộ thông báo (bỏ qua nếu đã đồng bộ hôm nay) rồi đọc chuông + banner. */
  notificationSummary(withTx: WithTx, ownerId: string, pet: string): Promise<NotificationSummary>;
  checklistForToday(
    trx: Trx,
    ownerId: string,
    petIds: string[],
    today: LocalDate,
  ): Promise<RoutineItem[]>;
  upcomingMilestones(
    trx: Trx,
    ownerId: string,
    petIds: string[],
    today: LocalDate,
  ): Promise<UpcomingMilestone[]>;
  weightSummary(
    trx: Trx,
    ownerId: string,
    petId: string,
    today: LocalDate,
  ): Promise<WeightDashboardSummary>;
  latestWeights(
    trx: Trx,
    ownerId: string,
    petIds: string[],
  ): Promise<Map<string, { measuredOn: string; weightKg: string }>>;
}

type Banner = NonNullable<NotificationSummary['banner']>;

export interface DashboardView {
  today: string;
  account: { emailVerified: boolean };
  notifications: { unreadCount: number; banner: Banner | null };
  pets: { id: string; name: string; avatarThumbUrl: string | null }[];
  routines: {
    doneCount: number;
    totalCount: number;
    items: (RoutineItem & { petName: string })[];
  };
  upcomingMilestones: (UpcomingMilestone & { petName: string })[];
  /** Một thú cưng: số đo, chênh lệch, biểu đồ 6 tháng. Lọc "Tất cả" → `null`. */
  weight:
    (WeightDashboardSummary & { petId: string; petName: string; target: string | null }) | null;
  /** Lọc "Tất cả": cân nặng hiện tại của từng thú cưng (theo thứ tự `pets`); một thú cưng → `null`. */
  weights:
    | {
        petId: string;
        petName: string;
        measuredOn: string | null;
        weightKg: string | null;
        target: string | null;
      }[]
    | null;
}

/**
 * `GET /dashboard?pet=all|{petId}` (FR-DSH-001→007): đồng bộ thông báo trước, rồi đọc checklist,
 * mốc sắp tới và cân nặng song song, mỗi phần một transaction ngắn (RLS). `unreadCount` và banner
 * chỉ tính thông báo của thú cưng trong phạm vi lọc (US-061).
 */
export async function getDashboard(
  ports: DashboardPorts,
  withTx: WithTx,
  ownerId: string,
  emailVerified: boolean,
  pet: string,
): Promise<DashboardView> {
  const { today, pets } = await withTx(async (trx) => {
    const tz = await ports.ownerTimezone(trx, ownerId);
    if (tz === undefined) throw new UnauthenticatedError();
    return { today: todayIn(tz, ports.clock.now()), pets: await ports.listPets(trx, ownerId) };
  });
  if (pet !== 'all' && !pets.some((p) => p.id === pet)) throw new NotFoundError();

  const base = {
    today,
    account: { emailVerified },
    pets: pets.map(({ id, name, avatarThumbUrl }) => ({ id, name, avatarThumbUrl })),
  };
  if (pets.length === 0) {
    return {
      ...base,
      notifications: { unreadCount: 0, banner: null },
      routines: { doneCount: 0, totalCount: 0, items: [] },
      upcomingMilestones: [],
      weight: null,
      weights: null,
    };
  }

  const scope = pet === 'all' ? pets.map((p) => p.id) : [pet];
  const weightPet = pet === 'all' ? undefined : pets.find((p) => p.id === pet);
  const nameOf = new Map(pets.map((p) => [p.id, p.name]));
  const withName = <T extends { petId: string }>(x: T) => ({
    ...x,
    petName: nameOf.get(x.petId) ?? '',
  });

  // Đồng bộ trước (tuần tự), sau đó 3 truy vấn đọc song song.
  const summary = await ports.notificationSummary(withTx, ownerId, pet);
  const [routines, milestones, weight, latest] = await Promise.all([
    withTx((trx) => ports.checklistForToday(trx, ownerId, scope, today)),
    withTx((trx) => ports.upcomingMilestones(trx, ownerId, scope, today)),
    weightPet
      ? withTx((trx) => ports.weightSummary(trx, ownerId, weightPet.id, today))
      : Promise.resolve(null),
    weightPet ? Promise.resolve(null) : withTx((trx) => ports.latestWeights(trx, ownerId, scope)),
  ]);

  const banner = summary.banner ?? null;
  return {
    ...base,
    notifications: { unreadCount: banner ? banner.moreCount + 1 : 0, banner },
    routines: {
      doneCount: routines.filter((r) => r.done).length,
      totalCount: routines.length,
      items: routines.map(withName),
    },
    upcomingMilestones: milestones.map(withName),
    weight:
      weightPet && weight
        ? {
            petId: weightPet.id,
            petName: weightPet.name,
            target: weightPet.weightTargetKg,
            ...weight,
          }
        : null,
    weights: latest
      ? pets.map((p) => ({
          petId: p.id,
          petName: p.name,
          measuredOn: latest.get(p.id)?.measuredOn ?? null,
          weightKg: latest.get(p.id)?.weightKg ?? null,
          target: p.weightTargetKg,
        }))
      : null,
  };
}
