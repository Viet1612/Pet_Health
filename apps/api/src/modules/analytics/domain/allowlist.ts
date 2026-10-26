// Danh sách trắng event và thuộc tính (S6-05, PRD §5.2, FR-ANL-003). Chỉ enum, số, boolean: không
// bao giờ lưu chuỗi tự do (tên, email, nội dung y tế).

type Rule =
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'int'; min?: number; max?: number; nullable?: boolean }
  | { kind: 'number' }
  | { kind: 'bool' };

const e = (...values: string[]): Rule => ({ kind: 'enum', values });
const int = (min?: number, max?: number, nullable = false): Rule => ({
  kind: 'int',
  ...(min === undefined ? {} : { min }),
  ...(max === undefined ? {} : { max }),
  nullable,
});
const bool: Rule = { kind: 'bool' };

const TYPE = e('vaccine', 'flea', 'deworm');
const LEVEL = e('d7', 'd1', 'overdue');
const DEVICE = e('phone', 'tablet', 'desktop');
/** ID route cố định, không phải URL có ID. */
const SCREEN = e(
  'dashboard',
  'pets',
  'pet_profile',
  'weight',
  'visits',
  'visit_detail',
  'visit_form',
  'milestones',
  'milestone_detail',
  'routines',
  'notifications',
  'settings',
  'auth',
  'feed',
  'composer',
  'social_profile',
  'post_detail',
  'search',
  'other',
);

export const ALLOWLIST: Record<string, Record<string, Rule>> = {
  signup_started: { source: e('direct', 'login_page', 'other') },
  signup_completed: {},
  post_liked: {},
  profile_created: {},
  post_created: { photo_count: int(1, 5), has_caption: bool, pet_count: int(0, 5) },
  user_followed: {},
  /** Ghi cho chủ bài khi có tim mới (bước "nhận tim đầu" của funnel bản tin). */
  post_like_received: {},
  feed_viewed: { items_seen_bucket: e('0', '1_10', '11_30', '31_plus') },
  user_blocked: {},
  post_commented: { length_bucket: e('short', 'medium', 'long') },
  pet_limit_reached: {},
  weight_target_set: {},
  email_verified: { hours_since_signup: int(0) },
  login: { device_class: DEVICE },
  app_opened: { device_class: DEVICE, orientation: e('portrait', 'landscape') },
  pet_created: { pet_count_after: int(1, 10), has_photo: bool },
  weight_logged: {
    has_target: bool,
    days_since_last_log: int(0, undefined, true),
    entry_point: e('dashboard', 'weight_page'),
  },
  weight_chart_viewed: { points_count: int(0) },
  visit_created: { has_prescription: bool, photo_count: int(0, 5) },
  visit_photo_uploaded: { size_kb: int(0), format: e('jpg', 'png', 'heic') },
  visit_photo_failed: { reason: e('size', 'format', 'network') },
  milestone_created: {
    type: TYPE,
    days_until_due: int(),
    has_cycle: bool,
    auto_generated: bool,
  },
  milestone_completed: { type: TYPE, days_from_due: int() },
  milestone_completed_undone: { type: TYPE },
  milestone_auto_created: { type: TYPE, cycle_months: int(1, 60) },
  notification_created: { level: LEVEL, type: TYPE, days_until_due: int() },
  banner_shown: { level: LEVEL, unread_count: int(0) },
  banner_dismissed: { unread_count: int(0) },
  notification_center_opened: { unread_count: int(0), entry_point: e('bell', 'banner') },
  notification_opened: {
    level: LEVEL,
    type: TYPE,
    days_until_due: int(),
    entry_point: e('banner', 'list'),
  },
  routine_created: { task_count_after: int(1, 20) },
  routine_checked: { minutes_from_scheduled: int() },
  routine_unchecked: { minutes_from_scheduled: int() },
  offline_banner_shown: { screen: SCREEN },
  client_error: { screen: SCREEN, code: { kind: 'enum', values: [] } },
  web_vitals: {
    metric: e('LCP', 'INP', 'CLS'),
    value: { kind: 'number' },
    rating: e('good', 'needs-improvement', 'poor'),
    screen: SCREEN,
  },
};

export type EventProps = Record<string, string | number | boolean | null>;

const CODE = /^([A-Z0-9_]{1,40}|[1-5]\d\d)$/;

function valid(rule: Rule, value: unknown, key: string, event: string): boolean {
  if (event === 'client_error' && key === 'code')
    return typeof value === 'string' && CODE.test(value);
  switch (rule.kind) {
    case 'enum':
      return typeof value === 'string' && rule.values.includes(value);
    case 'int':
      if (value === null) return rule.nullable === true;
      return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        (rule.min === undefined || value >= rule.min) &&
        (rule.max === undefined || value <= rule.max)
      );
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'bool':
      return typeof value === 'boolean';
  }
}

/**
 * Lọc một event: tên lạ → `null`; chỉ giữ khóa được phép có giá trị đúng kiểu (bỏ khóa còn lại,
 * kể cả `email`, `petName`, `symptoms`…).
 */
export function sanitizeEvent(
  name: string,
  props: unknown,
): { name: string; props: EventProps } | null {
  const rules = ALLOWLIST[name];
  if (!rules) return null;
  const out: EventProps = {};
  if (props && typeof props === 'object' && !Array.isArray(props)) {
    for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
      const rule = rules[key];
      if (rule && valid(rule, value, key, name)) out[key] = value as EventProps[string];
    }
  }
  return { name, props: out };
}

/** < 768 phone, 768–1279 tablet, ≥ 1280 desktop. */
export function deviceClassOf(viewportW: number): 'phone' | 'tablet' | 'desktop' {
  if (viewportW < 768) return 'phone';
  return viewportW < 1280 ? 'tablet' : 'desktop';
}

/** `occurredAt` ngoài [now − 24 h, now + 5 phút] → dùng `now`. */
export function clampOccurredAt(occurredAt: string | undefined, now: Date): Date {
  const t = occurredAt ? Date.parse(occurredAt) : NaN;
  if (Number.isNaN(t)) return now;
  const n = now.getTime();
  return t < n - 24 * 3600_000 || t > n + 5 * 60_000 ? now : new Date(t);
}
