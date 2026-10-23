# S1-01 · Schema identity, RLS và role CSDL — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S1-01](../tasks/S1-01-identity-schema-rls.md) |
| Trạng thái | Xong (code), chưa chạy migration |
| Ngày hoàn thành | 2026-10-24 |
| Commit | xem [README](README.md) |

## Kết quả

- **Role CSDL:**
  - `infra/postgres/init/01-roles.sh`: tạo `app_owner`, `app_rw` (`NOBYPASSRLS`), `app_worker` (`BYPASSRLS`) cho container PostgreSQL (staging/prod/Testcontainers), mật khẩu từ biến môi trường.
  - `infra/dev/roles.sql`: tạo `app_rw`, `app_worker` trên DB ServBay; `ph_owner` đóng vai `app_owner`.
- **Migration** (theo quy ước tên `YYYYMMDDHHmm_*` của migrator):
  - `202610241000_identity_roles_grants`: dừng với thông báo rõ nếu thiếu role; cấp quyền schema `public` + default privileges cho `app_rw`, `app_worker`.
  - `202610241010_identity_tables`: `users` (có thêm `failed_login_window_start`), `sessions`, `auth_tokens` đúng cột, CHECK, UNIQUE, index, partial unique "1 token chưa dùng mỗi loại", `ON DELETE CASCADE`.
  - `202610241020_idempotency_rls`: bật RLS cho `idempotency_keys`.
- **Helper `migrations/_helpers/rls.ts`:** `enableOwnerRls` (ENABLE + FORCE + policy `owner_isolation` với `NULLIF(current_setting('app.user_id', true), '')`) và `disableOwnerRls` cho `down`.
- **`main-migrate.ts`:** sau khi pg-boss tạo schema, cấp quyền `pgboss` (bảng, sequence, function, default privileges) cho `app_rw`, `app_worker`.
- **Repository `modules/identity/adapters/persistence/`:**
  - `userRepository`: `findByEmail`, `findById`, `lockForUpdate`, `insert`, `markEmailVerified`, `resetPassword`, `updateLoginState`; `isEmailTaken(error)`.
  - `sessionRepository`: `insert`, `findValidByTokenHash` (JOIN users), `touch`, `deleteById`, `deleteAllForUser`.
  - `authTokenRepository`: `replaceActive` (xóa cũ + chèn mới), `findByHash`, `consume` (`UPDATE ... WHERE used_at IS NULL RETURNING`).
- **`platform/http/user-tx.ts`:** `request.withTx(fn)` = `withUserTx` của phiên, thử lại 1 lần khi xung đột; `zUuid`. `buildApp` nhận thêm `db`.
- **`database.types.ts`:** thêm `Users`, `Sessions`, `AuthTokens`.
- **`apps/api/.env.example`:** `DATABASE_URL` dùng `app_rw`, `WORKER_DATABASE_URL` dùng `app_worker`. README có thêm bước chạy `roles.sql`.

## Tiêu chí chấp nhận

Theo cách làm "cứ code đi", task này chỉ kiểm typecheck và lint. Các tiêu chí cần DB **chưa được kiểm**: migrate trên DB rỗng và `down`/`up`; `citext` chặn email trùng hoa thường; partial unique token; cascade khi xóa user; `rolbypassrls`; RLS chéo chủ; `set_config` không rò giữa transaction; `consume` song song.

## Việc bạn cần làm trên máy dev

1. `psql -h 127.0.0.1 -p 5432 -U postgres -d pethealth -f infra/dev/roles.sql`
2. Cập nhật `apps/api/.env`: `DATABASE_URL` và `WORKER_DATABASE_URL` theo `.env.example` mới.
3. `pnpm db:migrate`, rồi `pnpm --filter @ph/api db:types` để sinh lại kiểu từ DB thật (thay bản viết tay).

## Khác với file task

- **Tên migration theo quy ước timestamp** của migrator (`202610241000_…`) thay vì `0100_…`.
- **Quyền schema `pgboss` cấp trong `main-migrate.ts`,** không cấp trong migration, vì schema này chỉ có sau khi pg-boss khởi tạo, chạy sau các migration.
- **Không tạo `app_owner` trên máy dev:** `ph_owner` đóng vai này.
- **Không làm unit test `newId()`:** đã có từ S0-04.
