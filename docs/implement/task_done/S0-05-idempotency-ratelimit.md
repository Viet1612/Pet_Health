# S0-05 · Platform: Idempotency-Key, rate limit — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S0-05](../tasks/S0-05-idempotency-ratelimit.md) |
| Trạng thái | Xong (code), chưa kiểm thử tích hợp |
| Ngày hoàn thành | 2026-10-23 |
| Commit | `28c1343` |

## Kết quả

- **Migration** `202610232100_platform_idempotency_ratelimit`: bảng `idempotency_keys` và `rate_limits`.
- **Tùy chọn route `config.idempotent = true`:**
  - Hook kiểm header `Idempotency-Key`: thiếu → 400 `IDEMPOTENCY_KEY_REQUIRED`, không phải UUID → 400 `IDEMPOTENCY_KEY_INVALID`.
  - Hook tính `requestHash` = SHA-256(method, đường dẫn, JSON chuẩn hóa của body) và gắn vào `req.idempotency`.
- **`runIdempotent(trx, …)`**, chạy trong transaction nghiệp vụ:
  - Xóa khóa quá 24 giờ.
  - Chèn khóa với `ON CONFLICT DO NOTHING` (request song song sẽ chờ).
  - Khóa đã có với body khác → 422 `IDEMPOTENCY_KEY_REUSED`; cùng body → phát lại kết quả cũ.
  - Chỉ lưu phản hồi khi handler chạy xong không lỗi.
  - `sendIdempotent` gắn header `Idempotency-Replayed: true` khi phát lại.
- **`RateLimiter.hit(bucket, limit, windowSec)`:**
  - Đếm theo cửa sổ cố định bằng `INSERT … ON CONFLICT DO UPDATE`.
  - Vượt giới hạn → 429 `RATE_LIMITED` kèm `Retry-After`.
  - Có sẵn 3 bucket chuẩn cho S1: đăng ký theo IP, quên mật khẩu theo email đã băm, gửi lại xác minh theo user.
- **`clientIp(req, trust)`:** lấy `CF-Connecting-IP` khi `TRUST_CF_CONNECTING_IP=true`.

## Tiêu chí chấp nhận

Theo yêu cầu của Việt ("cứ code đi"), task này chỉ kiểm typecheck và lint. Các tiêu chí cần DB thật **chưa được kiểm**:

| Tiêu chí | Kết quả |
|---|---|
| Thiếu header → 400 `IDEMPOTENCY_KEY_REQUIRED`; `abc` → 400 `IDEMPOTENCY_KEY_INVALID` | Code xong, chưa test |
| Gửi lại cùng khóa + body → không tạo thêm, trả lại kết quả cũ, `Idempotency-Replayed: true` | Code xong, chưa test |
| Cùng khóa, body khác → 422 `IDEMPOTENCY_KEY_REUSED` | Code xong, chưa test |
| 2 request song song cùng khóa → đúng 1 bản ghi | Code xong (dựa vào khóa dòng của PostgreSQL), chưa test |
| Sau 24 giờ + 1 giây gửi lại → xử lý như mới | Code xong, chưa test |
| Handler lỗi 409 → không còn dòng khóa | Code xong (rollback cả transaction), chưa test |
| Hai tài khoản dùng cùng UUID không ảnh hưởng nhau | Đạt theo thiết kế (khóa chính `owner_id, key`) |
| Rate limit: lần 11 → 429 có `Retry-After`; cửa sổ mới thì qua | Code xong, chưa test |
| 20 lời gọi `hit` song song → `count` = 20 | Code xong (`ON CONFLICT DO UPDATE` nguyên tử), chưa test |

Nên kiểm các tiêu chí trên khi S1 dùng thật (S1-03 dùng rate limit; route tạo mới đầu tiên dùng idempotency ở S2-01).

## Tệp đã tạo / sửa

- `apps/api/migrations/202610232100_platform_idempotency_ratelimit.ts`
- `apps/api/src/platform/idempotency/`: `canonical-json.ts`, `idempotency.hook.ts`, `run-idempotent.ts`
- `apps/api/src/platform/rate-limit/rate-limiter.ts`
- `apps/api/src/platform/db/database.types.ts`: thêm `IdempotencyKeys`, `RateLimits`
- `apps/api/src/platform/http/route-config.ts`: `config.idempotent`, `request.idempotency`
- `apps/api/src/app.ts`: đăng ký hook idempotency sau auth guard
- `apps/api/src/config.ts`: biến `TRUST_CF_CONNECTING_IP` (mặc định `false`)
- `apps/api/src/platform/errors/app-error.ts`: title 429 theo task

## Khác với file task

- Khóa đã có nhưng `status_code` rỗng (không xảy ra trong luồng bình thường) cũng trả 422 `IDEMPOTENCY_KEY_REUSED`, thay vì phát lại kết quả rỗng.
- Hook idempotency viết dạng callback (`done`) thay vì `async` để qua luật ESLint `require-await`.
