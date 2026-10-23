# Pet_Health

Nhật ký sức khỏe thú cưng (web). Tài liệu: [docs/](docs/), kế hoạch: [docs/implement/Implement_plan.md](docs/implement/Implement_plan.md).

## Chạy trên máy dev

Yêu cầu: Node 22, Docker Desktop, PostgreSQL 16 chạy ở `127.0.0.1:5432` (bản của ServBay), `gitleaks`.

1. Bật pnpm và cài dependency:
   ```sh
   corepack enable
   pnpm install
   ```
2. Tạo user và database dev (chỉ làm một lần, bằng superuser của PostgreSQL):
   ```sh
   psql -h 127.0.0.1 -p 5432 -U <superuser> -d postgres -f infra/dev/init-db.sql
   ```
   Lệnh này tạo role `ph_owner` (mật khẩu dev `ph_owner_dev`) và database `pethealth`.
3. Sao chép `apps/api/.env.example` → `apps/api/.env` và `apps/web/.env.example` → `apps/web/.env`.
4. Bật Mailpit (nhận email thử): `pnpm dev:up`. Giao diện Mailpit ở <http://localhost:8025>.
5. Chạy migration và ứng dụng: `pnpm db:migrate`, rồi `pnpm dev`.

| Lệnh                                                            | Việc làm                                 |
| --------------------------------------------------------------- | ---------------------------------------- |
| `pnpm dev:up` / `pnpm dev:down`                                 | Bật / tắt Mailpit                        |
| `pnpm dev:reset`                                                | Xóa sạch và tạo lại database `pethealth` |
| `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` | Kiểm tra mã                              |
