# S0-04 · Platform: `ClockPort`/`FakeClock`, logging `pino` redact, lỗi `problem+json` có `ref`

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S0 · T1–2 |
| Story | — |
| Yêu cầu | FR-GEN-011, NFR-SEC-009, FR-AUTH-013, NFR-MNT-005, SAD P6, P7, §2.4.1, §2.4.3, §3.1.2, §4.1.7, §4.3 |
| Phụ thuộc | [S0-03](S0-03-backend-skeleton.md) |
| Ước lượng | 1 |
| Màn hình Figma | — |

## Mục tiêu
Các thành phần xuyên suốt mà mọi route và use case dùng: đồng hồ tiêm được (thật/giả), log JSON không lộ dữ liệu nhạy cảm, mã `ref` 8 ký tự gắn mỗi request, lỗi thống nhất RFC 9457 và chính sách deny-by-default.

## Phạm vi
**Trong phạm vi:**
- `ClockPort`, `SystemClock`, `FakeClock`, route `POST /api/v1/__test/clock` (chỉ khi `NODE_ENV=test`).
- Logger `pino` có `redact`; request id `ref`; một dòng log mỗi request.
- Lớp lỗi ứng dụng, error handler, not-found handler trả `application/problem+json`.
- Deny-by-default: route cần đăng nhập trừ khi khai báo `config.public = true`; `SessionResolverPort` (bản S0 luôn trả `null`).
- `withUserTx(db, userId, fn)` đặt `app.user_id` cho RLS; `newId()` sinh UUIDv7.

**Ngoài phạm vi:**
- Bảng `sessions`, cookie, CSRF, resolver thật → S1-04. Policy RLS → S1-01.
- `userIdHash` trong log → S1-04 (khi có phiên). Idempotency, rate limit → [S0-05](S0-05-idempotency-ratelimit.md).

## Chi tiết kỹ thuật
1. **Clock** (`src/platform/clock/`):
   ```ts
   export interface ClockPort { now(): Date }
   export class SystemClock implements ClockPort { now() { return new Date(); } }
   export class FakeClock implements ClockPort {
     set(instant: Date, opts?: { frozen?: boolean }): void; // mặc định chạy tiếp từ instant (giữ offset)
     advance(ms: number): void;
     reset(): void;                                           // về giờ thật
   }
   ```
   Use case và repository **không** gọi `new Date()`/`Date.now()` trực tiếp (thêm `no-restricted-syntax` cho `apps/api/src/modules/**`). `composition-root.ts` dùng `FakeClock` khi `NODE_ENV=test`, ngược lại `SystemClock`.
2. **`POST /api/v1/__test/clock`** (`platform/clock/test-clock.route.ts`): body `{ now: string | null, frozen?: boolean }` (ISO 8601 UTC có `Z`; `null` = reset) → `204`. Chỉ `register` khi `NODE_ENV === 'test'`; `config: { public: true }`, `schema.hide: true` để không vào `openapi.yaml`.
3. **Request id `ref`**: `genReqId` sinh 8 ký tự Crockford base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`) từ 5 byte `crypto.randomBytes`, ví dụ `7KQ2M9XD`. Không nhận id từ header client (`requestIdHeader: false`). Mọi phản hồi có header `X-Request-Id: <ref>`.
4. **Logger** (`platform/logging/logger.ts`, SAD §4.1.7, §4.3): `pino` JSON ra stdout, `level` từ `LOG_LEVEL` (production `info`), `pino-pretty` chỉ ở dev.
   ```ts
   redact: { censor: '[REDACTED]', paths: [
     '*.password', '*.newPassword', '*.currentPassword', '*.token',
     'req.headers.cookie', 'req.headers.authorization', 'req.headers["x-csrf-token"]',
     'res.headers["set-cookie"]',
     '*.symptoms', '*.diagnosis', '*.prescription', '*.note', '*.description', '*.email',
   ] }
   ```
   `disableRequestLogging: true`; hook `onResponse` ghi đúng 1 dòng `{ reqId, method, route: req.routeOptions.url, status, durationMs }`. Không log body request, không log query string. Worker dùng cùng logger với trường `job`.
5. **Lỗi ứng dụng** (`platform/errors/`): `AppError(status, code, title, { errors?, retryAfter?, headers? })` và các lớp con `NotFoundError` (404 `NOT_FOUND`), `UnauthenticatedError` (401 `UNAUTHENTICATED`), `ConflictError` (409, code tùy), `ValidationError` (422 `VALIDATION_FAILED`), `RateLimitedError` (429 `RATE_LIMITED`, header `Retry-After`).
6. **Error handler** (`setErrorHandler`), phản hồi `Content-Type: application/problem+json; charset=utf-8` theo SAD §2.4.3:
   | Nguồn lỗi | Phản hồi |
   |---|---|
   | Lỗi schema Zod của route | `422 VALIDATION_FAILED`, `title` "Dữ liệu không hợp lệ", `errors[] = { field: path.join('.'), code, message }` |
   | JSON hỏng | `400 MALFORMED_JSON` |
   | Body > 64 KB | `413 PAYLOAD_TOO_LARGE` |
   | Content-Type không hỗ trợ | `415 UNSUPPORTED_MEDIA_TYPE` |
   | `AppError` | `status`, `code`, `title`, `errors` của lỗi |
   | Còn lại | `500 INTERNAL_ERROR`, `title` "Có lỗi xảy ra, vui lòng thử lại sau." — log `error` kèm stack, phản hồi **không** có stack hay SQL |
   Mọi phản hồi lỗi có `type` = `${APP_ORIGIN}/errors/<code-kebab>`, `ref` = request id. `setNotFoundHandler` → `404 NOT_FOUND`. `code` lỗi trường: `REQUIRED`, `INVALID_FORMAT`, `OUT_OF_RANGE`, `TOO_LONG`; `message` tiếng Việt lấy từ schema hoặc bảng mặc định `platform/http/zod-messages.vi.ts`.
7. **Deny-by-default** (SAD P6, §4.1.2):
   - Khai báo kiểu: `declare module 'fastify' { interface FastifyContextConfig { public?: boolean } interface FastifyRequest { auth?: { userId: string; sessionId: string } } }`.
   - Hook `preHandler` toàn cục: nếu `routeOptions.config.public !== true` → `await sessionResolver.resolve(req)`; `null` → `UnauthenticatedError`. Bản S0 của `SessionResolverPort` luôn trả `null`.
   - Hook `onRoute` gom danh sách route public; khởi động in danh sách này ở mức `info`.
8. **RLS helper** (`platform/db/with-user-tx.ts`, SAD §3.1.2): mở transaction, chạy `select set_config('app.user_id', $1, true)` rồi gọi `fn(trx)`. Repository của route cần đăng nhập chỉ dùng `trx` từ helper này.
9. **ID** (`platform/ids.ts`, AD-012): `newId()` trả UUIDv7 (thư viện `uuidv7`).

## Giao diện
Không có.

## Tiêu chí chấp nhận
- [ ] Mọi phản hồi lỗi có `Content-Type: application/problem+json`, đủ `type`, `title`, `status`, `code`, `ref`; `ref` khớp `^[0-9A-HJKMNP-TV-Z]{8}$` và trùng `X-Request-Id`.
- [ ] Lỗi không lường trước trả 500 với `title` tiếng Việt, không có stack trace/SQL; dòng log lỗi có cùng `reqId` = `ref` (tra được bằng `grep <ref>`).
- [ ] Route test không khai báo `public` trả `401 UNAUTHENTICATED`; route có `public: true` trả 200.
- [ ] Đường dẫn không tồn tại dưới `/api/v1` trả `404 NOT_FOUND` dạng problem+json.
- [ ] Log một body chứa `password`, `token`, `email`, `symptoms`, `diagnosis`, `prescription`, `note`, `description` và header `cookie`, `authorization` đều hiện `[REDACTED]`.
- [ ] Mỗi request sinh đúng 1 dòng log truy cập có `reqId`, `route`, `status`, `durationMs`.
- [ ] Với `NODE_ENV=test`, `POST /api/v1/__test/clock {now:"2026-11-08T00:00:00Z", frozen:true}` làm `clock.now()` trả đúng thời điểm đó; với `NODE_ENV=production` route trả 404 và không có trong `openapi.yaml`.
- [ ] `withUserTx` đặt được `current_setting('app.user_id')` trong transaction và giá trị biến mất sau commit.

## Kiểm thử
- **Unit**: `genReqId` (độ dài, bảng chữ, 10.000 lần không trùng); `FakeClock` (`set`, `frozen`, `advance`, `reset`); bảng ánh xạ lỗi Zod → `errors[]`.
- **Unit với `app.inject`**: từng dòng của bảng ở bước 6; deny-by-default; `X-Request-Id`.
- **Unit logger**: ghi vào stream bộ nhớ, kiểm từng path redact (kể cả lồng một cấp như `body.password`).
- **Integration (Testcontainers)**: `withUserTx` và `set_config` cục bộ theo transaction.

## Ghi chú
- Wildcard `*.password` của pino chỉ khớp **một cấp**; không log đối tượng lồng sâu chứa dữ liệu người dùng. Vì vậy quy tắc "không log body request" là bắt buộc, `redact` chỉ là lớp phòng hờ.
- Thông điệp lỗi phía client (toast "Có lỗi xảy ra, vui lòng thử lại sau. Mã: …") do [S0-07](S0-07-web-shell.md) và [S0-08](S0-08-api-client.md) hiển thị từ `ref`.
