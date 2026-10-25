import { useSyncExternalStore } from 'react';

import { getSelectedPetId } from './selected-pet';

const KEY = 'ph.dashboardFilter';

/** Bộ lọc Dashboard: `'all'` hoặc petId (US-061). */
export type DashboardFilter = 'all' | (string & {});

const listeners = new Set<() => void>();
// Bản sao trong bộ nhớ khi trình duyệt chặn localStorage.
let memory: DashboardFilter | null = null;

/** Lọc đã lưu; mặc định thú cưng đang chọn (`ph.selectedPetId`), không có thì `'all'`. */
export function getDashboardFilter(): DashboardFilter {
  try {
    return window.localStorage.getItem(KEY) ?? memory ?? getSelectedPetId() ?? 'all';
  } catch {
    return memory ?? getSelectedPetId() ?? 'all';
  }
}

export function setDashboardFilter(filter: DashboardFilter): void {
  if (getDashboardFilter() === filter) return;
  memory = filter;
  try {
    window.localStorage.setItem(KEY, filter);
  } catch {
    // Bỏ qua: chỉ mất tính năng nhớ lựa chọn.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDashboardFilter(): DashboardFilter {
  return useSyncExternalStore(subscribe, getDashboardFilter, () => 'all');
}
