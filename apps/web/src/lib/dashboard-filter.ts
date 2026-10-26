import { useSyncExternalStore } from 'react';

import { getSelectedPetId, setSelectedPetId, subscribeSelectedPet } from './selected-pet';

const KEY = 'ph.dashboardFilter';

/** Bộ lọc Dashboard: `'all'` hoặc petId (US-061). */
export type DashboardFilter = 'all' | (string & {});

const listeners = new Set<() => void>();
// Bản sao trong bộ nhớ khi trình duyệt chặn localStorage.
let memory: 'all' | 'pet' | null = null;

function readMode(): 'all' | 'pet' | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    // Giá trị cũ là petId: coi như chế độ một thú cưng.
    if (raw !== null) return raw === 'all' ? 'all' : 'pet';
  } catch {
    // dùng bản trong bộ nhớ
  }
  return memory;
}

/**
 * Chỉ lưu chế độ "Tất cả" hay "một thú cưng"; thú cưng cụ thể luôn là thú cưng đang chọn
 * (`ph.selectedPetId`), nên chọn bé ở màn khác thì Dashboard cũng đổi theo.
 */
export function getDashboardFilter(): DashboardFilter {
  if (readMode() === 'all') return 'all';
  return getSelectedPetId() ?? 'all';
}

export function setDashboardFilter(filter: DashboardFilter): void {
  const mode = filter === 'all' ? 'all' : 'pet';
  // Đổi thú cưng tự báo cho người nghe qua `subscribeSelectedPet`.
  if (filter !== 'all') setSelectedPetId(filter);
  if (readMode() === mode) return;
  memory = mode;
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    // Bỏ qua: chỉ mất tính năng nhớ lựa chọn.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const unsubscribePet = subscribeSelectedPet(listener);
  return () => {
    listeners.delete(listener);
    unsubscribePet();
  };
}

export function useDashboardFilter(): DashboardFilter {
  return useSyncExternalStore(subscribe, getDashboardFilter, () => 'all');
}

// Dashboard đăng ký hàm tải trước; PetSwitcher gọi khi mở sheet để đổi bộ lọc hiện ngay
// (lib không phụ thuộc feature nào).
let prefetcher: ((filters: DashboardFilter[]) => void) | null = null;

export function registerDashboardPrefetch(fn: (filters: DashboardFilter[]) => void): () => void {
  prefetcher = fn;
  return () => {
    if (prefetcher === fn) prefetcher = null;
  };
}

export function prefetchDashboard(filters: DashboardFilter[]): void {
  prefetcher?.(filters);
}
