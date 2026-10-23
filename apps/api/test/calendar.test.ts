import { describe, expect, it } from 'vitest';

import {
  appearOn,
  dueLevel,
  levelLabel,
  type ReminderSubject,
} from '../src/modules/notifications/domain/reminder-level.js';
import { displayStatus } from '../src/modules/scheduling/domain/display-status.js';
import { ageInMonths, formatAge } from '../src/platform/calendar/age.js';
import { parseLocalDate as d } from '../src/platform/calendar/local-date.js';
import { addCalendarMonths } from '../src/platform/calendar/months.js';
import { todayIn } from '../src/platform/calendar/today.js';

const pending = (dueSetOn: string, dueOn: string): ReminderSubject => ({
  status: 'PENDING',
  dueSetOn: d(dueSetOn),
  dueOn: d(dueOn),
});

describe('dueLevel + levelLabel — 9 ca SRS §2.6', () => {
  it.each([
    [1, '2026-11-01', '2026-11-15', '2026-11-07', null, null],
    [2, '2026-11-01', '2026-11-15', '2026-11-08', 'D7', 'còn 7 ngày'],
    [3, '2026-11-01', '2026-11-15', '2026-11-11', 'D7', 'còn 4 ngày'],
    [4, '2026-11-01', '2026-11-15', '2026-11-14', 'D1', 'ngày mai'],
    [5, '2026-11-01', '2026-11-15', '2026-11-14', 'D1', 'ngày mai'],
    [6, '2026-11-11', '2026-11-15', '2026-11-11', null, null],
    [7, '2026-11-11', '2026-11-12', '2026-11-11', null, null],
    [8, '2026-11-11', '2026-11-12', '2026-11-13', 'OVERDUE', 'quá hạn 1 ngày'],
    [9, '2026-11-11', '2026-11-01', '2026-11-11', null, null],
  ] as const)('ca %i', (_n, dueSetOn, dueOn, today, level, label) => {
    const m = pending(dueSetOn, dueOn);
    const got = dueLevel(m, d(today));
    expect(got).toBe(level);
    if (got) expect(levelLabel(got, m.dueOn, d(today))).toBe(label);
  });

  it('ca 9: không bao giờ có nhắc nhưng hiển thị Quá hạn', () => {
    const m = pending('2026-11-11', '2026-11-01');
    for (const today of ['2026-11-20', '2027-01-01']) {
      expect(dueLevel(m, d(today))).toBeNull();
      expect(displayStatus(m, d(today))).toBe('OVERDUE');
    }
  });

  it('DONE/CANCELLED → null; overdueEnabled=false bỏ mức OVERDUE', () => {
    expect(
      dueLevel({ ...pending('2026-11-01', '2026-11-15'), status: 'DONE' }, d('2026-11-14')),
    ).toBeNull();
    expect(
      dueLevel({ ...pending('2026-11-01', '2026-11-15'), status: 'CANCELLED' }, d('2026-11-14')),
    ).toBeNull();
    expect(dueLevel(pending('2026-11-11', '2026-11-12'), d('2026-11-13'), false)).toBeNull();
  });

  it('appearOn qua tháng', () => {
    expect(appearOn('D7', d('2026-03-03'))).toBe('2026-02-24');
    expect(appearOn('D1', d('2026-03-01'))).toBe('2026-02-28');
    expect(appearOn('OVERDUE', d('2026-12-31'))).toBe('2027-01-01');
  });

  it.each([
    [8, 'còn 8 ngày'],
    [2, 'còn 2 ngày'],
    [1, 'ngày mai'],
    [0, 'hôm nay'],
    [-1, 'quá hạn 1 ngày'],
    [-30, 'quá hạn 30 ngày'],
  ])('levelLabel N=%i', (n, label) => {
    const today = d('2026-11-15');
    const due = d(new Date(Date.UTC(2026, 10, 15 + n)).toISOString().slice(0, 10));
    expect(levelLabel('D7', due, today)).toBe(label);
  });
});

describe('displayStatus', () => {
  it('biên hôm nay', () => {
    expect(displayStatus({ status: 'PENDING', dueOn: d('2026-11-15') }, d('2026-11-15'))).toBe(
      'UPCOMING',
    );
    expect(displayStatus({ status: 'PENDING', dueOn: d('2026-11-14') }, d('2026-11-15'))).toBe(
      'OVERDUE',
    );
    expect(displayStatus({ status: 'DONE', dueOn: d('2026-11-14') }, d('2026-11-15'))).toBe('DONE');
    expect(displayStatus({ status: 'CANCELLED', dueOn: d('2026-11-14') }, d('2026-11-15'))).toBe(
      'CANCELLED',
    );
  });
});

describe('ageInMonths + formatAge — SRS §2.10.1', () => {
  it.each([
    ['2019-03-15', '2026-10-22', '7 năm 7 tháng'],
    ['2019-03-25', '2026-10-22', '7 năm 6 tháng'],
    ['2026-05-01', '2026-10-22', '5 tháng'],
    ['2026-10-10', '2026-10-22', '0 tháng'],
    ['2024-02-29', '2025-02-28', '11 tháng'],
    ['2024-02-29', '2025-03-01', '1 năm 0 tháng'],
    ['2026-10-22', '2026-10-22', '0 tháng'],
  ])('%s → %s = %s', (birth, today, text) => {
    expect(formatAge(ageInMonths(d(birth), d(today)))).toBe(text);
  });

  it('sinh sau hôm nay → lỗi', () => {
    expect(() => ageInMonths(d('2026-10-23'), d('2026-10-22'))).toThrow();
  });
});

describe('addCalendarMonths — SRS §2.10.2', () => {
  it.each([
    ['2026-11-14', 12, '2027-11-14'],
    ['2028-02-29', 12, '2029-02-28'],
    ['2026-11-14', 3, '2027-02-14'],
    ['2026-01-31', 1, '2026-02-28'],
    ['2026-12-31', 2, '2027-02-28'],
    ['2027-11-30', 3, '2028-02-29'],
    ['2026-01-31', 60, '2031-01-31'],
  ])('%s + %i = %s', (date, n, expected) => {
    expect(addCalendarMonths(d(date), n)).toBe(expected);
  });

  it('n âm hoặc không nguyên → lỗi', () => {
    expect(() => addCalendarMonths(d('2026-01-01'), -1)).toThrow();
    expect(() => addCalendarMonths(d('2026-01-01'), 1.5)).toThrow();
  });
});

describe('todayIn', () => {
  it.each([
    ['Asia/Ho_Chi_Minh', '2026-11-07T16:59:59Z', '2026-11-07'],
    ['Asia/Ho_Chi_Minh', '2026-11-07T17:00:00Z', '2026-11-08'],
    ['Pacific/Kiritimati', '2026-11-07T10:00:00Z', '2026-11-08'],
    ['Pacific/Pago_Pago', '2026-11-07T10:00:00Z', '2026-11-06'],
    ['Asia/Kathmandu', '2026-11-07T18:14:59Z', '2026-11-07'],
    ['Asia/Kathmandu', '2026-11-07T18:15:00Z', '2026-11-08'],
    ['America/Los_Angeles', '2026-11-01T06:59:59Z', '2026-10-31'],
    ['America/Los_Angeles', '2026-11-02T07:59:59Z', '2026-11-01'],
    ['America/Los_Angeles', '2026-11-02T08:00:00Z', '2026-11-02'],
  ])('%s %s → %s', (tz, instant, expected) => {
    expect(todayIn(tz, new Date(instant))).toBe(expected);
  });

  it('múi giờ không hợp lệ → lỗi', () => {
    expect(() => todayIn('Mars/Base', new Date())).toThrow();
  });

  it('parseLocalDate từ chối ngày không tồn tại', () => {
    expect(() => d('2026-02-30')).toThrow();
    expect(() => d('2026-2-3')).toThrow();
  });
});
