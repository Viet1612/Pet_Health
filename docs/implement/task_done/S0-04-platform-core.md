# S0-04 · Platform: Clock, logging, lỗi problem+json, deny-by-default — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S0-04](../tasks/S0-04-platform-core.md) |
| Trạng thái | Xong |
| Ngày hoàn thành | 2026-10-23 |
| Commit | xem [README](README.md) |

## Kết quả

Mọi route và use case từ S1 dùng được các thành phần xuyên suốt:
- **Đồng hồ:** `ClockPort` (`SystemClock` / `FakeClock`) và route `POST /api/v1/__test/clock`, chỉ có khi `NODE_ENV=test`.
- **Mã `ref`:** 8 ký tự Crockford base32 cho mỗi request, trả về ở header `X-Request-Id`.
- **Log:** logger pino che dữ liệu nhạy cảm, mỗi request đúng một dòng log.
- **Lỗi:** mọi lỗi trả `application/problem+json`, thông điệp tiếng Việt.
- **Chặn mặc định:** route cần đăng nhập trừ khi khai báo `public: true`.
- **Tiện ích DB:** `withUserTx` cho RLS và `newId()` sinh UUIDv7.

56 test qua (32 test mới cho S0-04).

## Tiêu chí chấp nhận

| Tiêu chí | Kết quả |
|---|---|
| Mọi phản hồi lỗi là `application/problem+json`, đủ `type`, `title`, `status`, `code`, `ref`; `ref` khớp mẫu và trùng `X-Request-Id` | Đạt (422, 400, 413, 415, 409, 429, 500, 404, 401) |
| Lỗi không lường trước → 500, title tiếng Việt, không lộ stack/SQL; log lỗi có `reqId` = `ref` | Đạt |
| Route không khai báo `public` → 401 `UNAUTHENTICATED`; route `public: true` → 200 | Đạt |
| Đường dẫn không tồn tại dưới `/api/v1` → 404 `NOT_FOUND` problem+json | Đạt (cả khi chạy thật) |
| Log che `password`, `token`, `email`, `symptoms`, `diagnosis`, `prescription`, `note`, `description` và header `cookie`, `authorization` | Đạt, ở gốc và lồng một cấp; thêm `x-csrf-token`, `set-cookie`, `newPassword`, `currentPassword` |
| Mỗi request đúng 1 dòng log có `reqId`, `route`, `status`, `durationMs` | Đạt; không ghi query string |
| `NODE_ENV=test`: `POST /__test/clock` đặt được giờ; `production`: 404 và không có trong `openapi.yaml` | Đạt |
| `withUserTx` đặt `app.user_id` trong transaction, mất sau commit | Đạt (Testcontainers), kể cả 2 transaction song song |

## Tệp đã tạo / sửa

- `src/platform/clock/`: `clock.ts` (`ClockPort`, `SystemClock`, `FakeClock`), `test-clock.route.ts`
- `src/platform/logging/logger.ts`: cấu hình pino + `redact`, pino-pretty khi `NODE_ENV=development`
- `src/platform/errors/app-error.ts`: `AppError`, `NotFoundError`, `UnauthenticatedError`, `ConflictError`, `ValidationError`, `RateLimitedError`
- `src/platform/http/`:
  - `error-handler.ts`: error handler và not-found handler
  - `zod-messages.vi.ts`: mã lỗi trường và thông điệp tiếng Việt mặc định cho Zod
  - `request-id.ts`: `genReqId`
  - `auth.ts`: `SessionResolverPort`, `NullSessionResolver`, chặn mặc định
  - `route-config.ts`: thêm `request.auth`
- `src/platform/db/with-user-tx.ts`, `src/platform/ids.ts`
- `src/app.ts`: logger, `genReqId`, `X-Request-Id`, access log, error handler, auth guard, route đặt giờ cho test
- `src/composition-root.ts`: tạo `clock` và `logger` (worker có trường `job`); `main-api.ts`, `main-worker.ts` dùng logger; `scripts/gen-openapi.ts` dựng app ở chế độ production
- `eslint.config.js`: cấm `new Date()` / `Date.now()` trong `apps/api/src/modules/**`
- Test: `helpers.ts`, `platform-units.test.ts`, `logger.test.ts`, `errors.test.ts`; cập nhật `app`, `shutdown`, `db.int`
- Dependency: `pino` 10.4.0, `uuidv7` 1.2.1, `pino-pretty` 13.2.0 (dev)

## Khác với file task

- **Thông điệp tiếng Việt cho Zod:** đặt bằng `z.config({ customError })`. Thông điệp khai báo riêng trong schema vẫn được ưu tiên; error handler dùng thẳng `issue.message`.
- **Redact thêm ở gốc:** che cả các trường nhạy cảm ở mức gốc (`password`, `email`…), không chỉ dạng lồng `*.x` như task ghi.
- **Bỏ qua chặn mặc định với đường dẫn không tồn tại** (`request.is404`), để trả 404 thay vì 401.
- **Luật ESLint ngày giờ:** chỉ cấm `new Date()` không tham số và `Date.now()`; `new Date(chuỗi)` để chuyển đổi vẫn được phép.
- **Mã lỗi `too_small` cho chuỗi:** độ dài tối thiểu 1 → `REQUIRED`, lớn hơn 1 → `INVALID_FORMAT` (task không nêu cụ thể).

## Ghi chú

- Sửa lỗi phát hiện khi viết: `createRuntime` truyền `undefined` cho `options` sẽ làm mất `statement_timeout`; đã truyền `APP_SESSION_OPTIONS`.
- `request.auth` chỉ có khi resolver trả phiên; resolver thật làm ở S1-04.
