import { getCsrfToken } from './client';

// Analytics tự lưu (S6-05): hàng đợi trong bộ nhớ, gửi khi đủ 20 event, sau 5 s hoặc khi tab ẩn
// (`keepalive`). Không retry, mọi lỗi bị nuốt: analytics không bao giờ làm hỏng chức năng chính
// (FR-ANL-005). Server lọc theo danh sách trắng; client chỉ gửi enum, số, boolean.

type Props = Record<string, string | number | boolean | null>;

interface QueuedEvent {
  name: string;
  props: Props;
  occurredAt: string;
}

const MAX_BATCH = 20;
const FLUSH_MS = 5_000;
const MAX_CLIENT_ERRORS = 10;

const queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let clientErrors = 0;

function flush(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (queue.length === 0) return;
  const events = queue.splice(0, MAX_BATCH);
  const csrf = getCsrfToken();
  try {
    void fetch('/api/v1/analytics/events', {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) },
      body: JSON.stringify({ viewportW: Math.round(window.innerWidth), events }),
    }).catch(() => undefined);
  } catch {
    // Bỏ qua.
  }
  if (queue.length > 0) flush();
}

export function track(name: string, props: Props = {}): void {
  try {
    queue.push({ name, props, occurredAt: new Date().toISOString() });
    if (queue.length >= MAX_BATCH) flush();
    else timer ??= setTimeout(flush, FLUSH_MS);
  } catch {
    // Bỏ qua.
  }
}

export const deviceClass = (): 'phone' | 'tablet' | 'desktop' =>
  window.innerWidth < 768 ? 'phone' : window.innerWidth < 1280 ? 'tablet' : 'desktop';

/** ID màn hình cố định từ đường dẫn (không gửi URL có ID). */
export function screenOf(pathname: string): string {
  if (pathname === '/') return 'dashboard';
  if (/^\/pets\/[^/]+\/health\/weight/.test(pathname)) return 'weight';
  if (/^\/pets\/[^/]+\/health\/visits/.test(pathname)) return 'visits';
  if (/\/visits\/(new|[^/]+\/edit)$/.test(pathname)) return 'visit_form';
  if (pathname.startsWith('/visits/')) return 'visit_detail';
  if (/^\/pets\/[^/]+\/milestones/.test(pathname)) return 'milestones';
  if (pathname.startsWith('/milestones/')) return 'milestone_detail';
  if (/^\/pets\/[^/]+\/routines/.test(pathname)) return 'routines';
  if (/^\/pets\/[^/]+$/.test(pathname)) return 'pet_profile';
  if (pathname.startsWith('/pets')) return 'pets';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/settings')) return 'settings';
  if (/^\/(login|register|forgot-password|reset-password|verify-email)/.test(pathname))
    return 'auth';
  return 'other';
}

/** Lỗi phía client: chỉ gửi mã, không gửi message hay stack; tối đa 10 lần mỗi lần tải trang. */
export function trackClientError(code: string): void {
  if (clientErrors >= MAX_CLIENT_ERRORS) return;
  clientErrors += 1;
  track('client_error', { screen: screenOf(window.location.pathname), code });
}

/** Gắn một lần ở `main.tsx`: gửi khi tab ẩn, bắt lỗi JS, đo Web Vitals sau khi render. */
export function startAnalytics(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('error', () => {
    trackClientError('JS_ERROR');
  });
  window.addEventListener('unhandledrejection', () => {
    trackClientError('JS_ERROR');
  });
  setTimeout(() => {
    void import('web-vitals')
      .then(({ onCLS, onINP, onLCP }) => {
        const report = (metric: { name: string; value: number; rating: string }) => {
          track('web_vitals', {
            metric: metric.name,
            value: Math.round(metric.value * 1000) / 1000,
            rating: metric.rating,
            screen: screenOf(window.location.pathname),
          });
        };
        onLCP(report);
        onINP(report);
        onCLS(report);
      })
      .catch(() => undefined);
  }, 0);
}
