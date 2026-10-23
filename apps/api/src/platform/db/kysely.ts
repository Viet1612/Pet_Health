import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

import type { DB } from './database.types.js';

export type Database = DB;

// `date` giữ nguyên chuỗi YYYY-MM-DD (ngày lịch, không có múi giờ). `numeric` mặc định đã là chuỗi.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

/** Giới hạn thời gian cho kết nối của api/worker (SAD §2.3, §4.2.3). Migration không dùng. */
export const APP_SESSION_OPTIONS =
  '-c statement_timeout=5000 -c idle_in_transaction_session_timeout=10000';

const logIdleClientError = (error: Error): void => {
  process.stderr.write(`[db] kết nối rảnh bị đóng: ${error.message}\n`);
};

/**
 * Pool kết nối. Luôn gắn handler `error`: khi PostgreSQL khởi động lại, kết nối đang rảnh phát
 * lỗi; không có handler thì tiến trình Node bị dừng. Pool tự mở kết nối mới ở lần dùng sau.
 */
export function createPool(
  connectionString: string,
  max: number,
  options: string | undefined = APP_SESSION_OPTIONS,
  onIdleClientError: (error: Error) => void = logIdleClientError,
): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 2000,
    ...(options ? { options } : {}),
  });
  pool.on('error', onIdleClientError);
  return pool;
}

export function createDb(pool: pg.Pool): Kysely<Database> {
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}
