# S1-08 · Bộ test IDOR dùng chung — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S1-08](../tasks/S1-08-idor-suite.md) |
| Trạng thái | Xong (code), chưa chạy (cần Docker) |
| Ngày hoàn thành | 2026-10-24 |
| Commit | `c61f4ad` |

## Kết quả

- **`buildApp`** nhận thêm `onRoute` (đăng ký hook ngay sau khi tạo Fastify), để bộ test thấy mọi route.
- **Harness `apps/api/test/idor/`:**
  - `route-catalog.ts`: ghi `{ method, url, public, params }` của mọi route, bỏ tiền tố `/api/v1`, bỏ `HEAD`/`OPTIONS`. Có `fillPath` thay `:param` bằng ID.
  - `accounts.ts`: `createTwoAccounts` đăng ký A và B qua `POST /auth/register` thật. Mỗi tài khoản có `cookie`, `csrfToken` và `userId`. `authHeaders` trả cookie, `Origin` và `X-CSRF-Token`.
  - `registry.ts`: `registerIdorParam` (khớp `url` bằng chuỗi hoặc RegExp), `registerIdorBody`, `registerIdorCustom`, `exemptFromIdor` (bắt buộc có lý do).
  - `setup.ts`:
    - Testcontainers `postgres:16`, tạo role `app_rw`/`app_worker`, chạy mọi migration, tạo bảng thử.
    - Ba kết nối: `appDb` (app_rw, chịu RLS), `workerDb` (app_worker, dùng cho fixture/snapshot), `ownerDb` (đọc catalog).
    - `loadModuleFixtures` nạp `src/modules/*/adapters/http/__idor__/*.idor.ts`.
  - `probe.ts`: bảng `idor_probe` (bật `enableOwnerRls`) cùng route `GET/PATCH/DELETE /__test/idor-probe/:id` và biến thể cố ý lỗi `/__test/idor-probe-broken/:id` (repository không lọc `owner_id`). Fixture và body cho cả hai route.
- **`idor.int.test.ts`:**
  - **Meta phủ route:** thiếu fixture → fail, thông điệp `Thiếu fixture IDOR cho <METHOD> <url> (<param>). Thêm file __idor__/*.idor.ts`. Có ca in danh sách route được miễn kèm lý do.
  - **Meta `/__test/*`:** dựng app với `nodeEnv: production` → không có route `/__test/*`.
  - **Meta deny-by-default:**
    - Route `public` phải nằm trong danh sách cho phép cố định.
    - Mỗi route không public gọi không cookie → `401 UNAUTHENTICATED`.
  - **Meta RLS:** mọi bảng `public` có cột `owner_id` phải có `relrowsecurity`, `relforcerowsecurity` và policy `owner_isolation`; danh sách phải chứa `idor_probe`.
  - **Ca IDOR** `IDOR <METHOD> <url> [params]`:
    - A dùng ID của B → `404` problem+json `NOT_FOUND`, snapshot của B không đổi.
    - ID ngẫu nhiên → `404` giống hệt sau khi bỏ `ref`.
    - B gọi tài nguyên mới của mình → khác `404` và < 500.
  - **Ca custom** từ registry.
- **Script:** `pnpm --filter @ph/api test:idor`. Tên file `*.int.test.ts`, nên job integration của CI (`test:integration`) chạy nó; `test:unit` bỏ qua.

## Tiêu chí chấp nhận

Đã kiểm: typecheck, lint; 100 unit test hiện có vẫn qua.

**Chưa kiểm** (cần Docker để chạy Testcontainers): toàn bộ bộ test IDOR. Ba lần kiểm harness trong mục Kiểm thử của task (bỏ lọc + tắt RLS, xóa fixture, bỏ `public` ở `/auth/login`) cũng chưa làm.

## Khác với file task

- **Nạp fixture bằng `readdir` + `import()` động** thay vì `import.meta.glob`, để không cần type của Vite trong `apps/api`.
- **Mỗi route có một ca IDOR** gộp mọi path param (tên ca liệt kê các param), thay vì một ca cho mỗi param.
- **`POST /__test/clock`** (chỉ có khi NODE_ENV=test) nằm trong danh sách route public cho phép.
- **Job queue giả** thay pg-boss trong bộ test này: đăng ký vẫn đi qua Argon2, phiên và CSRF thật, chỉ không ghi job email.
- **Route thử nằm trong `test/`**, được đăng ký qua `registerRoutes` của bộ test, nên không có ở `main-api` dù `NODE_ENV` là gì.

## Việc còn tồn

`test/db.int.test.ts` (S0-03) vẫn kỳ vọng chỉ có migration `202610231700_init` và không tạo role `app_rw`/`app_worker`, nên sẽ fail từ S1-01. Cần sửa khi chạy được Docker.
