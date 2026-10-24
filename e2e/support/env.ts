// Môi trường E2E chạy trên máy dev (S4-06, bản gọn): API + worker ở cổng 3100 dùng DB riêng
// `pethealth_e2e` với NODE_ENV=test (FakeClock); web Vite ở cổng 5174 trỏ tới API đó. Server dev
// thường (3000/5173) vẫn chạy song song, không bị ảnh hưởng.

export const API_PORT = 3100;
export const WEB_PORT = 5174;
export const ORIGIN = `http://localhost:${String(WEB_PORT)}`;
export const API_URL = `http://localhost:${String(API_PORT)}/api/v1`;
export const MAILPIT_URL = 'http://localhost:8025';

const E2E_DB = 'pethealth_e2e';
const url = (user: string, pass: string) => `postgres://${user}:${pass}@localhost:5432/${E2E_DB}`;

/** Ghi đè `.env` của apps/api (biến môi trường đã có thắng `--env-file`). */
export const API_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: String(API_PORT),
  LOG_LEVEL: 'warn',
  APP_ORIGIN: ORIGIN,
  EXTRA_ORIGINS: '',
  DATABASE_URL: url('app_rw', 'app_rw_dev'),
  WORKER_DATABASE_URL: url('app_worker', 'app_worker_dev'),
  MIGRATION_DATABASE_URL: url('ph_owner', 'ph_owner_dev'),
  // Mỗi lần đăng ký gửi một IP giả qua CF-Connecting-IP, để giới hạn 10 lần/giờ/IP không chặn
  // các tài khoản E2E (chạy từ cùng một máy).
  TRUST_CF_CONNECTING_IP: 'true',
  MEDIA_ROOT: './.data/media-e2e',
  HEARTBEAT_FILE: './.data/alive-e2e',
};
