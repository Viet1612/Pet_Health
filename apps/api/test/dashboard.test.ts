import { describe, expect, it } from 'vitest';

import {
  getDashboard,
  type DashboardPorts,
} from '../src/modules/dashboard/application/get-dashboard.js';
import type { LocalDate } from '../src/platform/calendar/local-date.js';
import { FakeClock } from '../src/platform/clock/clock.js';

const PETS = [
  { id: 'p1', name: 'Mochi', avatarThumbUrl: null, weightTargetKg: '9.0' },
  { id: 'p2', name: 'Bơ', avatarThumbUrl: null, weightTargetKg: null },
];

function fakePorts(pets = PETS) {
  const calls: string[] = [];
  const ports: DashboardPorts = {
    clock: new FakeClock(() => Date.parse('2026-11-14T02:00:00Z')),
    ownerTimezone: () => Promise.resolve('Asia/Ho_Chi_Minh'),
    listPets: () => Promise.resolve(pets),
    notificationSummary: () => {
      calls.push('sync+summary');
      return Promise.resolve({ unreadCount: 5, socialUnreadCount: 0 });
    },
    checklistForToday: (_t, _o, petIds) => {
      calls.push(`routines:${petIds.join(',')}`);
      return Promise.resolve([
        { id: 'r1', petId: 'p2', name: 'Cho ăn', timeOfDay: '07:00', done: true },
      ]);
    },
    upcomingMilestones: (_t, _o, petIds) => {
      calls.push(`milestones:${petIds.join(',')}`);
      return Promise.resolve([]);
    },
    weightSummary: (_t, _o, petId, today: LocalDate) => {
      calls.push(`weight:${petId}:${today}`);
      return Promise.resolve({ latest: null, series: [] });
    },
    latestWeights: (_t, _o, petIds) => {
      calls.push(`latest:${petIds.join(',')}`);
      return Promise.resolve(new Map([['p2', { measuredOn: '2026-11-01', weightKg: '9.3' }]]));
    },
  };
  const withTx = <T>(fn: (trx: never) => Promise<T>) => fn(undefined as never);
  return { ports, calls, withTx };
}

describe('getDashboard', () => {
  it('đồng bộ thông báo trước, rồi 3 truy vấn đọc; "Tất cả" trả cân nặng hiện tại từng thú cưng', async () => {
    const { ports, calls, withTx } = fakePorts();
    const view = await getDashboard(ports, withTx, 'u1', true, 'all');
    expect(calls[0]).toBe('sync+summary');
    expect(calls.slice(1).sort()).toEqual(['latest:p1,p2', 'milestones:p1,p2', 'routines:p1,p2']);
    expect(view.weight).toBeNull();
    expect(view.weights).toEqual([
      { petId: 'p1', petName: 'Mochi', measuredOn: null, weightKg: null, target: '9.0' },
      { petId: 'p2', petName: 'Bơ', measuredOn: '2026-11-01', weightKg: '9.3', target: null },
    ]);
    expect(view.routines).toMatchObject({ doneCount: 1, totalCount: 1 });
    expect(view.routines.items[0]?.petName).toBe('Bơ');
    // Không có banner trong phạm vi → unreadCount của phạm vi = 0.
    expect(view.notifications).toEqual({ unreadCount: 0, banner: null });
    expect(view.account.emailVerified).toBe(true);
  });

  it('lọc một thú cưng: chỉ truy vấn thú cưng đó', async () => {
    const { ports, calls, withTx } = fakePorts();
    await getDashboard(ports, withTx, 'u1', false, 'p2');
    expect(calls).toContain('routines:p2');
    expect(calls).toContain('weight:p2:2026-11-14');
    expect(calls.some((c) => c.startsWith('latest:'))).toBe(false);
  });

  it('không có thú cưng: không gọi port nào khác', async () => {
    const { ports, calls, withTx } = fakePorts([]);
    const view = await getDashboard(ports, withTx, 'u1', false, 'all');
    expect(calls).toEqual([]);
    expect(view.weight).toBeNull();
  });

  it('thú cưng không thuộc tài khoản → 404', async () => {
    const { ports, withTx } = fakePorts();
    await expect(getDashboard(ports, withTx, 'u1', false, 'other')).rejects.toMatchObject({
      status: 404,
    });
  });
});
