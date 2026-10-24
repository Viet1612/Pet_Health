# S4-06 · E2E luồng cốt lõi với `FakeClock`, test song song — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S4-06](../tasks/S4-06-e2e-core-flow.md) |
| Trạng thái | Xong (bản chạy local), 17/17 Pass trên máy dev |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **Đồng hồ giả** `POST /__test/clock` (chỉ đăng ký khi `NODE_ENV=test`): body `{ now?, frozen?, advanceMs?, reset? }`, trả `200 { now }`.
- **Hạ tầng E2E** (`e2e/`):
  - `playwright.config.ts`: project `api`, `ui-phone` (390 × 844), `ui-tablet` (834 × 1112); `workers: 1` vì đồng hồ giả dùng chung tiến trình API. Playwright tự bật API cổng 3100 (`NODE_ENV=test`) và web cổng 5174.
  - `global-setup.ts`: migrate DB `pethealth_e2e`, kiểm Mailpit, bật worker email (log ở `.data/e2e-worker.log`), tắt cả cây tiến trình khi xong.
  - `support/env.ts`, `support/api.ts`: `setClock`/`advanceClock`/`resetClock`, `ApiSession` (mỗi phiên một "thiết bị"), lấy link xác minh từ Mailpit.
  - `infra/dev/e2e-db.sql`: tạo DB `pethealth_e2e`, cấp CONNECT cho `app_rw`, `app_worker`.
  - Lệnh: `pnpm e2e` (tất cả), `pnpm e2e:api` (chỉ API). Báo cáo HTML ở `.data/e2e-report`.
- **Spec API (15 ca):**
  - `core-flow`: G-3 qua API: tạo mốc → D7 → D1 → đánh dấu → mốc 14/11/2027 → hoàn tác → hết 15 s trả `409 UNDO_WINDOW_EXPIRED`.
  - `srs-2-6-table`: 9 ca bảng SRS §2.6 + US-041 (a) đổi hạn, (b) đánh dấu sớm.
  - `concurrency`: 2 phiên × 10 request song song → mỗi `(mốc, mức, hạn)` đúng 1 thông báo; complete song song → đúng 1 mốc kế tiếp.
  - `timezone`: ranh giới 00:00 ở `Asia/Ho_Chi_Minh` và `America/Los_Angeles`.
- **Spec giao diện (2 ca):** G-3 qua trình duyệt ở phone và tablet, kể cả nhánh Hoàn tác.
- **Sửa kèm:**
  - Worker email poll 0,5 s (`batchSize: 1`) để email xác minh không bị dồn.
  - IDOR: đăng ký body hợp lệ cho `POST /notifications/read` và `read-all` (deny-by-default trả 422) → 79/79 Pass.
  - `db.int.test.ts`: tạo role `app_rw`/`app_worker` trong container trước khi migrate, dọn dẹp an toàn khi setup lỗi → 6/6 Pass.
  - ESLint: tắt nhóm `no-unsafe-*` cho `e2e/**` (body JSON thô).

## Tiêu chí chấp nhận

**Đã kiểm trên máy dev:** G-3 qua API; G-3 qua giao diện ở 2 viewport; 9/9 ca SRS + 2 ca US-041; song song; hoàn tác và 409 sau 15 s; ranh giới múi giờ. Toàn bộ khoảng 1,2 phút. Ngoài ra typecheck, lint, 160 unit test, IDOR 79/79, db.int 6/6.

**Chưa làm:** job CI, `compose.e2e.yml`, kiểm image `ph-app` không chứa `dist/platform/testing` (không dựng staging/CI theo thỏa thuận).

## Khác với file task

- **Chạy local thay vì compose trong CI:** dùng PostgreSQL ServBay (DB riêng `pethealth_e2e`) + Mailpit của `pnpm dev:up`; API/web/worker chạy bằng `tsx`/`vite` thay vì image `app-test`.
- **Không có axe-core** ở mỗi màn hình.
- **Múi giờ:** 2 múi (VN, LA) thay vì 3; chưa có ca đổi múi giờ giữa chừng (chưa có API đổi múi giờ).
- **Giới hạn đăng ký theo IP:** API E2E bật `TRUST_CF_CONNECTING_IP=true`, mỗi lần đăng ký gửi IP giả qua `CF-Connecting-IP`.
- **Phiên hết hạn sau 30 ngày:** ca API nhảy sang 2027 phải đăng nhập lại.
- **Chưa chạy 3 lần liên tiếp** để kiểm flaky.

## Cách chạy

1. `pnpm dev:up` (Mailpit) và PostgreSQL ServBay đang chạy.
2. Lần đầu: chạy `infra/dev/e2e-db.sql` bằng superuser.
3. `pnpm e2e`.
