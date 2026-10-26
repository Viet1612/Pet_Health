import { z } from 'zod';

const configSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    APP_ORIGIN: z.url(),
    DATABASE_URL: z.string().min(1),
    WORKER_DATABASE_URL: z.string().min(1),
    MIGRATION_DATABASE_URL: z.string().min(1),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    WORKER_DB_POOL_MAX: z.coerce.number().int().positive().default(5),
    HEARTBEAT_FILE: z.string().min(1).default('/tmp/alive'),
    /** Request đi qua cloudflared: tin header CF-Connecting-IP (SAD §4.2.3). */
    TRUST_CF_CONNECTING_IP: z.stringbool().default(false),
    // Email tài khoản (AD-008): Mailpit ở local/staging, SMTP Gmail ở production.
    SMTP_HOST: z.string().min(1).default('localhost'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(1025),
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    SMTP_FROM: z.string().min(1).default('Pet Health <no-reply@pethealth.example>'),
    SMTP_DAILY_LIMIT: z.coerce.number().int().positive().default(400),
    /** Khóa HMAC cho userIdHash (analytics, FR-ANL-002). */
    ANALYTICS_HMAC_KEY: z.string().min(16),

    // Ảnh (S2-02): thư mục gốc lưu tệp và khóa ký URL /media (≥ 32 ký tự, openssl rand -base64 32).
    MEDIA_ROOT: z.string().min(1).default('./.data/media'),
    MEDIA_SIGNING_KEY: z.string().min(32),
    // Kho ảnh (F-01): `disk` (máy dev) hoặc `r2` (production; `incoming/` vẫn trên đĩa).
    STORAGE_DRIVER: z.enum(['disk', 'r2']).default('disk'),
    R2_ACCOUNT_ID: z.string().default(''),
    R2_BUCKET: z.string().default(''),
    R2_ACCESS_KEY_ID: z.string().default(''),
    R2_SECRET_ACCESS_KEY: z.string().default(''),

    // Chỉ cho máy dev: mở web bằng IP mạng LAN (http://192.168.x.x:5173). Origin thêm được CSRF chấp
    // nhận; cookie phiên bỏ `Secure` (đổi tên `__Host-ph_sid` → `ph_sid`) vì trình duyệt chỉ nhận
    // cookie Secure qua http ở localhost.
    EXTRA_ORIGINS: z
      .string()
      .default('')
      .transform((s) =>
        s
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url())),
    SESSION_COOKIE_SECURE: z.stringbool().default(true),
  })
  .refine((c) => c.NODE_ENV !== 'production' || c.SESSION_COOKIE_SECURE, {
    error: 'SESSION_COOKIE_SECURE=false chỉ dùng cho máy dev',
    path: ['SESSION_COOKIE_SECURE'],
  })
  .refine(
    (c) =>
      c.STORAGE_DRIVER !== 'r2' ||
      [c.R2_ACCOUNT_ID, c.R2_BUCKET, c.R2_ACCESS_KEY_ID, c.R2_SECRET_ACCESS_KEY].every(Boolean),
    {
      error:
        'STORAGE_DRIVER=r2 cần R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY',
      path: ['STORAGE_DRIVER'],
    },
  );

export type Config = z.infer<typeof configSchema>;

export class ConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(`Cấu hình môi trường không hợp lệ:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  return result.data;
}

/** Đọc config cho entrypoint; sai thì in danh sách biến lỗi rồi thoát ngay. */
export function loadConfigOrExit(): Config {
  try {
    return loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}
