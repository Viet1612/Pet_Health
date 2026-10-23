# S0-02 · Môi trường dev — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S0-02](../tasks/S0-02-dev-environment.md) |
| Trạng thái | Xong |
| Ngày hoàn thành | 2026-10-23 |
| Commit | xem [README](README.md) |

## Kết quả

Máy dev có PostgreSQL 16 (bản ServBay, `127.0.0.1:5432`) với role `ph_owner` và database `pethealth`, Mailpit chạy bằng Docker để nhận email thử, đủ mẫu biến môi trường cho dev và staging/production, cùng các script `dev:up`, `dev:down`, `dev:reset`, `db:migrate`, `dev`.

## Tiêu chí chấp nhận

| Tiêu chí | Kết quả |
|---|---|
| `pnpm dev:up` dựng dịch vụ ở trạng thái healthy | Đạt: `ph-dev-mailpit-1` healthy. PostgreSQL dùng ServBay (xem "Khác với file task") |
| Kết nối `ph_owner` tới `pethealth` trả PostgreSQL 16.x | Đạt: PostgreSQL 16.14 |
| Gửi email thử tới `localhost:1025`, thấy trong Mailpit | Đạt: gửi bằng `curl smtp://`, API Mailpit trả 1 thư "S0-02 test" |
| Cổng 5432, 1025, 8025 chỉ nghe trên localhost | Đạt: `127.0.0.1` (5432 thêm `::1`, đều là loopback) |
| `pnpm dev:reset` xóa sạch DB dev | Đạt: bảng thử `reset_probe` mất sau reset |
| Không có tệp `.env` trong repo; gitleaks sạch với `*.env.example` | Đạt |
| Không biến `VITE_` nào chứa bí mật | Đạt: không có biến `VITE_` |

## Tệp đã tạo / sửa

- `infra/compose.dev.yml`: chỉ có `mailpit` (`axllent/mailpit:v1.29`), cổng `127.0.0.1:1025` và `127.0.0.1:8025`, có healthcheck
- `infra/dev/init-db.sql`: tạo role `ph_owner` (LOGIN, CREATEDB, CREATEROLE) và database `pethealth`; chạy lại nhiều lần không lỗi
- `infra/dev/db-reset.sql`: `DROP DATABASE ... WITH (FORCE)` rồi tạo lại
- `apps/api/.env.example`, `apps/web/.env.example`, `infra/env/app.env.example`
- `package.json`: script `dev:up`, `dev:down`, `dev:reset`, `db:migrate`, `dev`
- `README.md`: mục "Chạy trên máy dev"

## Khác với file task

- **PostgreSQL dùng bản ServBay thay vì container Docker** (Việt chọn, vì ServBay đã chiếm cổng 5432). Compose chỉ còn Mailpit.
- `dev:reset` xóa và tạo lại database bằng `psql` + `infra/dev/db-reset.sql`, thay cho `docker compose down -v`.
- Thêm `infra/dev/init-db.sql` (task gốc không cần vì container tự tạo user/database).
- `ph_owner` có thêm `CREATEROLE` để S1-01 tạo được role `app_rw`, `app_worker` trên máy dev.

## Ghi chú môi trường

- Đã chạy `init-db.sql` bằng superuser `postgres` của ServBay. Mật khẩu superuser không lưu trong repo.
- `psql` trên Windows bỏ qua mọi tùy chọn đứng sau URL kết nối; trong script phải đặt `-v`, `-q`, `-f` trước URL.
- Node của ServBay chạy qua shim `.cmd`: lệnh `node -e` có ký tự `>` (ví dụ `=>`) bị `cmd` hiểu là chuyển hướng. Khi cần chạy script Node ngắn thì viết ra tệp `.mjs`.
- Integration test sau này dùng Testcontainers (Docker), không dùng DB ServBay ([S0-09](../tasks/S0-09-ci-pipeline.md)).
