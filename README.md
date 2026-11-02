# Pet_Health

Nhật ký sức khỏe thú cưng (web). Tài liệu: [docs/](docs/), kế hoạch: [docs/implement/Implement_plan.md](docs/implement/Implement_plan.md).

**Hướng dẫn chạy dev và triển khai production (VPS, WSL2):** [docs/deploy/DEPLOY.md](docs/deploy/DEPLOY.md).

## Giới thiệu

> Không chủ nuôi nào phải nhớ lịch y tế của thú cưng bằng trí nhớ.

Pet Health là "sổ sức khỏe" của từng thú cưng: ghi một lần, được nhắc đúng lúc, luôn có đủ lịch sử để mang theo khi đi khám. Ứng dụng web ưu tiên điện thoại, dùng được trên máy tính bảng và máy tính, có tiếng Việt / tiếng Anh, giao diện sáng / tối.

Bản chạy thật: <https://pet.vietdeptrai.io.vn>.

### Chức năng

**Giai đoạn 1: nhật ký sức khỏe**

| Nhóm | Chức năng |
|---|---|
| Tài khoản | Đăng ký, xác minh email, đăng nhập trên nhiều thiết bị, quên mật khẩu, đổi email, xóa vĩnh viễn tài khoản và dữ liệu |
| Hồ sơ thú cưng | Tối đa 10 bé: tên, giống, giới tính, ngày sinh (tự tính tuổi), đặc điểm nhận dạng, ảnh đại diện; chuyển nhanh giữa các bé |
| Cân nặng | Ghi số đo theo ngày, đặt cân nặng mục tiêu, biểu đồ đường so với mục tiêu |
| Sổ y tế | Bản ghi khám (triệu chứng, chẩn đoán, đơn thuốc) kèm ảnh đơn thuốc / kết quả xét nghiệm (hỗ trợ HEIC) |
| Mốc y tế | Tiêm vaccine, nhỏ gáy, tẩy giun; nhắc trước 7 ngày và 1 ngày, nhắc lại khi quá hạn; tự tạo mốc kế tiếp theo chu kỳ |
| Việc hằng ngày | Checklist việc chăm sóc (cho ăn, dắt đi dạo…), chạm để đánh dấu, tự đặt lại lúc 00:00 theo múi giờ |
| Dashboard | Việc hôm nay, mốc sắp tới / quá hạn, xu hướng cân nặng; lọc theo tất cả hoặc từng bé; banner nhắc chưa xem |
| Thông báo | Chuông và danh sách nhắc nhở, đánh dấu đã xem |

**Giai đoạn 2: Bản tin ảnh thú cưng**

| Nhóm | Chức năng |
|---|---|
| Hồ sơ công khai | Username, tên hiển thị, giới thiệu, ảnh đại diện; lưới ảnh 3 cột |
| Bài đăng | 1–5 ảnh, chú thích, gắn bé (tùy chọn); sửa, xóa; tự nén ảnh lớn trên thiết bị |
| Theo dõi và bản tin | Tìm người, theo dõi ngay; bản tin bài của mình và người đang theo dõi, mới nhất trước, cuộn vô hạn |
| Tương tác | Thả tim (nhấn đúp vào ảnh), bình luận; thông báo hoạt động tách riêng khỏi nhắc y tế |
| An toàn | Chặn người dùng, giới hạn chống spam; dữ liệu sức khỏe và email không bao giờ lộ qua bản tin |

**Sắp tới:** app điện thoại (Capacitor) có thông báo nhắc mốc trên máy, xem [docs/implement/tasks-mobile/](docs/implement/tasks-mobile/README.md).

### Bảo mật dữ liệu

- Mỗi tài khoản chỉ thấy dữ liệu của mình: PostgreSQL Row-Level Security, truy cập tài nguyên người khác trả 404; có bộ test IDOR riêng.
- Mật khẩu băm Argon2id; phiên bằng cookie `HttpOnly` + chống CSRF; URL ảnh có chữ ký và hết hạn.

### Công nghệ

| Phần | Công nghệ |
|---|---|
| Web | React 19, Vite, TanStack Router + Query, Tailwind v4 |
| API | Node 22, Fastify 5, Zod 4, Kysely, pg-boss, pino |
| Dữ liệu | PostgreSQL 16 (RLS), ảnh trên đĩa hoặc Cloudflare R2 |
| Email | React Email, SMTP (Mailpit ở dev) |
| Kiểm thử | Vitest, Testcontainers, Playwright + axe |
| Triển khai | Docker Compose, Caddy, Cloudflare Tunnel |

Monorepo pnpm: `apps/api`, `apps/web`, `packages/api-client`, `packages/email-templates`, `infra/`.

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
   Sau đó tạo role ứng dụng (cần superuser vì `app_worker` có `BYPASSRLS`):
   ```sh
   psql -h 127.0.0.1 -p 5432 -U <superuser> -d pethealth -f infra/dev/roles.sql
   ```
   `api` kết nối bằng `app_rw` (bị RLS chặn), `worker` bằng `app_worker`, migration bằng `ph_owner`.
3. Sao chép `apps/api/.env.example` → `apps/api/.env` và `apps/web/.env.example` → `apps/web/.env`.
4. Bật Mailpit (nhận email thử): `pnpm dev:up`. Giao diện Mailpit ở <http://localhost:8025>.
5. Chạy migration và ứng dụng: `pnpm db:migrate`, rồi `pnpm dev`.

| Lệnh                                                            | Việc làm                                 |
| --------------------------------------------------------------- | ---------------------------------------- |
| `pnpm dev:up` / `pnpm dev:down`                                 | Bật / tắt Mailpit                        |
| `pnpm dev:reset`                                                | Xóa sạch và tạo lại database `pethealth` |
| `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` | Kiểm tra mã                              |
