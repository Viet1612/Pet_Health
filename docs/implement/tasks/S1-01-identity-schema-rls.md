# S1-01 · Schema `users`, `sessions`, `auth_tokens`; RLS và role `app_rw`/`app_worker`

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S1 · T3–4 |
| Story | US-006 |
| Yêu cầu | AD-011, AD-012, NFR-SEC-004, FR-AUTH-013, SD-001→003 |
| Phụ thuộc | [S0-05](S0-05-idempotency-ratelimit.md) |
| Ước lượng | 1 |
| Màn hình Figma | — |

## Mục tiêu
Tạo ba bảng của mô-đun `identity`, ba role CSDL (`app_owner`, `app_rw`, `app_worker`) và mẫu RLS dùng chung cho mọi bảng nghiệp vụ về sau. Khi xong, mọi request đã xác thực chạy trong transaction có `app.user_id`, và các migration từ S2 chỉ cần gọi một helper để bật RLS.

## Phạm vi
**Trong phạm vi:**
- Migration `users`, `sessions`, `auth_tokens` đúng SAD §3.1.3.
- Script tạo role và quyền; `GRANT` cho schema `public` và `pgboss`.
- Helper migration `enableOwnerRls(table)` và wrapper transaction `withUserTx`.
- Hàm sinh ID UUIDv7 `newId()`.
- Repository Kysely cơ bản của `identity` (`UserRepository`, `SessionRepository`, `AuthTokenRepository`) với các truy vấn theo khóa duy nhất.

**Ngoài phạm vi:**
- Logic đăng ký, đăng nhập, token email: [S1-03](S1-03-register-api.md) → [S1-06](S1-06-password-reset-api.md).
- Middleware `requireSession` đọc cookie: [S1-04](S1-04-login-session-api.md).
- Bộ test IDOR qua HTTP: [S1-08](S1-08-idor-suite.md).
- Job dọn `sessions`, `auth_tokens` hết hạn: [S6-06](S6-06-maintenance-job.md).

## Chi tiết kỹ thuật

### 1. Role CSDL
Tạo bằng script init, không bằng migration (migration không giữ mật khẩu): `infra/postgres/init/01-roles.sh`, được mount vào `/docker-entrypoint-initdb.d/` của `compose.dev.yml` và chạy lại trong setup Testcontainers.

| Role | Thuộc tính | Dùng cho | Biến môi trường |
|---|---|---|---|
| `app_owner` | `LOGIN`, sở hữu mọi bảng | Kysely Migrator, pg-boss tạo schema | `MIGRATION_DATABASE_URL` |
| `app_rw` | `LOGIN NOBYPASSRLS` | tiến trình `api` | `DATABASE_URL` |
| `app_worker` | `LOGIN BYPASSRLS` | tiến trình `worker`, job dọn dẹp | `WORKER_DATABASE_URL` |

```sh
psql -v ON_ERROR_STOP=1 <<SQL
CREATE ROLE app_owner  LOGIN PASSWORD '${APP_OWNER_PASSWORD}';
CREATE ROLE app_rw     LOGIN NOBYPASSRLS PASSWORD '${APP_RW_PASSWORD}';
CREATE ROLE app_worker LOGIN BYPASSRLS   PASSWORD '${APP_WORKER_PASSWORD}';
CREATE EXTENSION IF NOT EXISTS citext;
GRANT CREATE, USAGE ON SCHEMA public TO app_owner;
SQL
```

Migration đầu của S1 (`apps/api/migrations/0100_identity_roles_grants.ts`, chạy bằng `app_owner`):

```sql
GRANT USAGE ON SCHEMA public TO app_rw, app_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw, app_worker;
GRANT USAGE ON SCHEMA pgboss TO app_rw, app_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pgboss TO app_rw, app_worker;
```

Thêm 3 biến mật khẩu và 3 URL vào `infra/*.env.example` (đã có từ [S0-02](S0-02-dev-environment.md)). Pool: `api` 10, `worker` 5 (SAD §2.3).

### 2. Migration `apps/api/migrations/0101_identity_tables.ts`
ID sinh ở ứng dụng (không có `DEFAULT` cho `id`).

```sql
CREATE TABLE users (
  id                         uuid PRIMARY KEY,
  email                      citext NOT NULL,
  password_hash              text NOT NULL,
  email_verified_at          timestamptz NULL,
  timezone                   text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  notifications_synced_on    date NULL,
  failed_login_count         int NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  failed_login_window_start  timestamptz NULL,
  locked_until               timestamptz NULL,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email)
);

CREATE TABLE sessions (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      bytea NOT NULL,
  client_type     text NOT NULL DEFAULT 'web' CHECK (client_type IN ('web','mobile')),
  csrf_secret     bytea NULL,
  refresh_family  uuid NULL,
  last_seen_at    timestamptz NOT NULL,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_token_hash_key UNIQUE (token_hash)
);
CREATE INDEX sessions_user_id_idx    ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE auth_tokens (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('VERIFY_EMAIL','RESET_PASSWORD','CHANGE_EMAIL')),
  token_hash  bytea NOT NULL,
  payload     jsonb NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_tokens_token_hash_key UNIQUE (token_hash)
);
CREATE UNIQUE INDEX auth_tokens_one_active_per_kind
  ON auth_tokens (user_id, kind) WHERE used_at IS NULL;
```

- `failed_login_window_start` là cột bổ sung so với SAD §3.1.3, cần để tính "5 lần sai trong 15 phút" ([S1-04](S1-04-login-session-api.md)).
- `token_hash` = `SHA-256(token)` 32 byte. Token gốc không bao giờ lưu.
- Ràng buộc partial unique buộc mỗi user chỉ có 1 token chưa dùng cho mỗi `kind`: tạo token mới phải `DELETE` token cũ chưa dùng trong cùng transaction.
- `down()` drop 3 bảng theo thứ tự ngược.

### 3. Truy cập bảng `identity` và RLS
- Ba bảng `users`, `sessions`, `auth_tokens` **không bật RLS**: chúng phải được đọc trước khi biết người dùng (tìm theo email khi đăng nhập, theo `token_hash` khi kiểm phiên hoặc xác minh). Bảo vệ bằng hai quy tắc:
  1. Chỉ `modules/identity/adapters/persistence` được import bảng này (thêm luật `dependency-cruiser`).
  2. Mọi truy vấn lọc theo khóa duy nhất (`email`, `token_hash`) hoặc theo `ctx.userId`. Không có truy vấn liệt kê user.
- Mọi bảng nghiệp vụ có `owner_id` (từ S2) **bắt buộc** bật RLS bằng helper `apps/api/migrations/_helpers/rls.ts`:

```ts
export async function enableOwnerRls(db: Kysely<any>, table: string) {
  await sql`ALTER TABLE ${sql.table(table)} ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE ${sql.table(table)} FORCE ROW LEVEL SECURITY`.execute(db);
  await sql`CREATE POLICY owner_isolation ON ${sql.table(table)}
    USING (owner_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
    WITH CHECK (owner_id = NULLIF(current_setting('app.user_id', true), '')::uuid)`.execute(db);
}
```

  `NULLIF(..., '')` + `missing_ok = true`: thiếu `app.user_id` thì policy trả 0 dòng thay vì lỗi cast. `FORCE` để chính `app_owner` cũng bị chặn khi lỡ chạy app bằng role này.
- Áp helper ngay cho bảng `idempotency_keys` (đã có `owner_id` từ [S0-05](S0-05-idempotency-ratelimit.md)) trong migration `0102_idempotency_rls.ts`. `rate_limits` không có chủ, không bật RLS.

### 4. Wrapper transaction `apps/api/src/platform/db/with-user-tx.ts`

```ts
export function withUserTx<T>(db: Kysely<DB>, userId: string, fn: (tx: Transaction<DB>) => Promise<T>) {
  return db.transaction().execute(async (tx) => {
    await sql`SELECT set_config('app.user_id', ${userId}, true)`.execute(tx);
    return fn(tx);
  });
}
```

- `is_local = true` nên giá trị chỉ sống trong transaction, không rò sang request khác dùng cùng kết nối pool.
- Fastify plugin `platform/http/user-tx.ts` cung cấp `req.withTx(fn)` = `withUserTx(db, req.ctx.userId, fn)` cho route có phiên. Route công khai dùng `db.transaction()` thường.
- Retry 1 lần khi lỗi `40001` / `40P01` (SAD §4.2.3).

### 5. ID
`apps/api/src/platform/ids.ts`: `newId()` dùng package `uuidv7`. Zod schema dùng chung `zUuid = z.string().uuid()` cho path param.

### 6. Repository `apps/api/src/modules/identity/adapters/persistence/`
- `user-repository.ts`: `findByEmail(email)`, `findById(id)`, `insert(user)`, `markEmailVerified(id, at)`, `updatePassword(id, hash)`, `updateLoginState(id, {...})`, `lockForUpdate(id)`.
- `session-repository.ts`: `insert`, `findValidByTokenHash(hash, now)` (JOIN `users`), `touch(id, now, expiresAt)`, `deleteById`, `deleteAllForUser(userId, exceptId?)`.
- `auth-token-repository.ts`: `replaceActive(userId, kind, row)` (DELETE chưa dùng + INSERT), `findByHash(hash)`, `consume(id, now)` = `UPDATE ... SET used_at = $now WHERE id = $id AND used_at IS NULL RETURNING id`.
- Kiểu bảng thêm vào `apps/api/src/platform/db/schema.ts` (type `DB` của Kysely).

## Giao diện
Không có.

## Tiêu chí chấp nhận
- [ ] `pnpm db:migrate` chạy được trên DB rỗng; `down` rồi `up` lại không lỗi.
- [ ] Ba bảng có đúng cột, CHECK, UNIQUE, index như mục 2 (kiểm bằng `\d+` hoặc test đọc `information_schema`).
- [ ] Chèn 2 user cùng email khác hoa thường (`A@x.vn`, `a@x.vn`) bị lỗi `23505` nhờ `citext`.
- [ ] Không chèn được 2 token `VERIFY_EMAIL` chưa dùng cho cùng user; chèn được khi token cũ đã có `used_at`.
- [ ] Xóa user thì `sessions` và `auth_tokens` của user bị xóa theo.
- [ ] `app_rw` có `rolbypassrls = false`; `app_worker` có `rolbypassrls = true`.
- [ ] `api` kết nối bằng `app_rw`, `worker` bằng `app_worker`, Migrator bằng `app_owner`.
- [ ] Bảng có RLS qua `enableOwnerRls`: với `app_rw`, transaction đặt `app.user_id = A` không đọc, không sửa, không chèn được dòng `owner_id = B`; transaction không đặt `app.user_id` thấy 0 dòng và không lỗi.
- [ ] `set_config` không rò: hai transaction liên tiếp trên cùng kết nối, transaction thứ hai không đặt `app.user_id` thì thấy 0 dòng.

## Kiểm thử
- **Integration (Vitest + Testcontainers PostgreSQL 16)**, chạy script role trước migration:
  - Ràng buộc: email trùng (citext), `client_type = 'tablet'` bị CHECK chặn, `kind = 'OTHER'` bị chặn, partial unique của `auth_tokens`, cascade khi xóa user.
  - RLS: tạo bảng thử `rls_probe(id uuid, owner_id uuid)` trong test, gọi `enableOwnerRls`; kết nối bằng `app_rw` kiểm SELECT/UPDATE/DELETE/INSERT chéo chủ (0 dòng, `UPDATE` 0 dòng, `INSERT` lỗi `42501`); kết nối `app_worker` thấy mọi dòng.
  - `withUserTx`: pool 1 kết nối, kiểm không rò `app.user_id` giữa 2 transaction.
  - Repository: `consume` gọi 2 lần song song chỉ 1 lần trả về dòng.
- **Unit:** `newId()` trả UUID phiên bản 7, tăng dần theo thời gian.

## Ghi chú
- Không dùng `SET app.user_id` (không `LOCAL`) vì giá trị dính vào kết nối pool.
- Migration của các sprint sau phải gọi `enableOwnerRls` cho mọi bảng có `owner_id`; [S1-08](S1-08-idor-suite.md) có meta-test bắt lỗi quên.
