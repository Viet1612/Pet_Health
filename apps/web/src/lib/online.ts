import { useSyncExternalStore } from 'react';

// Trạng thái kết nối (S6-03, ST-01): offline khi trình duyệt báo `offline` hoặc một request ném
// `NetworkError`. Trong lúc offline thăm dò `/healthz` mỗi 5 s (timeout 3 s) và ngay khi có sự kiện
// `online`; thành công → online và gọi `onReconnect` (làm mới dữ liệu đang hiện).

const POLL_MS = 5_000;

let online = typeof navigator === 'undefined' ? true : navigator.onLine;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let onReconnect: (() => void) | null = null;

function set(next: boolean): void {
  if (online === next) return;
  online = next;
  for (const listener of listeners) listener();
  if (next) {
    stopPolling();
    onReconnect?.();
  } else {
    startPolling();
  }
}

let check: () => Promise<boolean> = () => Promise.resolve(true);

async function probe(): Promise<void> {
  if (await check()) set(true);
}

function startPolling(): void {
  if (timer) return;
  timer = setInterval(() => void probe(), POLL_MS);
}

function stopPolling(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Một request bị lỗi mạng (không phải timeout): coi như mất kết nối. */
export function markOffline(): void {
  set(false);
}

/** Gắn sự kiện trình duyệt; gọi một lần ở `main.tsx` (`probe` gọi `/healthz` qua src/api/). */
export function watchConnection(probeFn: () => Promise<boolean>, reconnect: () => void): void {
  check = probeFn;
  onReconnect = reconnect;
  window.addEventListener('offline', () => {
    set(false);
  });
  window.addEventListener('online', () => void probe());
  if (!online) startPolling();
}

export function isOnline(): boolean {
  return online;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, () => true);
}
