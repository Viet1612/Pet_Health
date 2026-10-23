# S0-05 · Platform: `Idempotency-Key`, bảng `idempotency_keys`, `rate_limits`

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S0 · T1–2 |
| Story | — |
| Yêu cầu | FR-GEN-005, NFR-SEC-005, SAD P4, §2.4.1, §3.1.3, §4.2.3 |
| Phụ thuộc | [S0-04](S0-04-platform-core.md) |
| Ước lượng | 1 |
| Màn hình Figma | — |

## Mục tiêu
Mọi `POST` tạo mới chống tạo trùng bằng `Idempotency-Key`: gửi lại cùng khóa trong 24 giờ thì nhận lại đúng kết quả cũ. Có bộ đếm giới hạn tần suất fixed window trên PostgreSQL để S1 dùng cho đăng ký, quên mật khẩu, gửi lại xác minh.

## Phạm vi
**Trong phạm vi:**
- Migration `idempotency_keys`, `rate_limits`.
- Tùy chọn route `config.idempotent = true`, hook kiểm header, hàm `runIdempotent` chạy trong transaction nghiệp vụ.
- `RateLimiter.hit(bucket, limit, windowSec)` và `clientIp(req)`.

**Ngoài phạm vi:**
- Áp giới hạn cho từng endpoint auth → S1-03, S1-04, S1-05, S1-06. Khóa tạm sau 5 lần đăng nhập sai (cột trên `users`) → S1-04.
- RLS cho `idempotency_keys` → S1-01. Dọn bản ghi cũ → S6-06 (`maintenance.daily`).
- Helper sinh khóa ở client → [S0-08](S0-08-api-client.md).

## Chi tiết kỹ thuật
1. **Migration** `apps/api/migrations/<ts>_platform_idempotency_ratelimit.ts` (SAD §3.1.3):
   ```sql
   CREATE TABLE idempotency_keys (
     owner_id      uuid        NOT NULL,
     key           uuid        NOT NULL,
     request_hash  bytea       NOT NULL,
     status_code   smallint,              -- NULL chỉ tồn tại bên trong transaction đang chạy
     response_body jsonb,
     created_at    timestamptz NOT NULL,
     PRIMARY KEY (owner_id, key)
   );
   CREATE INDEX idempotency_keys_created_at_idx ON idempotency_keys (created_at);

   CREATE TABLE rate_limits (
     bucket       text        NOT NULL,
     window_start timestamptz NOT NULL,
     count        int         NOT NULL,
     PRIMARY KEY (bucket, window_start)
   );
   ```
   `created_at` lấy từ `ClockPort` (không dùng `now()` của DB) để test được bằng `FakeClock`.
2. **Hook kiểm header** (`platform/idempotency/idempotency.hook.ts`), chạy ở `preHandler` **sau** hook deny-by-default (request chưa đăng nhập nhận 401 trước), cho route có `config.idempotent === true`:
   - Thiếu header → `400 IDEMPOTENCY_KEY_REQUIRED` (SAD §2.4.1). Không phải UUID → `400 IDEMPOTENCY_KEY_INVALID`.
   - Tính `requestHash = SHA-256(method + "\n" + đường dẫn thực (không query) + "\n" + JSON chuẩn hóa của body)`; JSON chuẩn hóa = sắp khóa theo thứ tự chữ cái, đệ quy.
   - Gắn `req.idempotency = { key, requestHash }`.
   - Chỉ dùng cho route cần đăng nhập (`owner_id = req.auth.userId`). Route public như `/auth/*` không bật tùy chọn này vì phản hồi có `Set-Cookie`, không được lưu và phát lại.
3. **`runIdempotent`** (`platform/idempotency/run-idempotent.ts`), gọi bên trong transaction của `withUserTx` ([S0-04](S0-04-platform-core.md)):
   ```ts
   runIdempotent(trx, { ownerId, key, requestHash, now }, async () => ({ status: 201, body }))
     : Promise<{ status: number; body: unknown; replayed: boolean }>
   ```
   Thứ tự:
   1. `DELETE FROM idempotency_keys WHERE owner_id=$1 AND key=$2 AND created_at < $now - interval '24 hours'` (khóa quá 24 giờ coi như mới, FR-GEN-005).
   2. `INSERT INTO idempotency_keys (owner_id, key, request_hash, created_at) VALUES (...) ON CONFLICT DO NOTHING RETURNING key`. Nếu có request song song cùng khóa, câu này **chờ** transaction kia kết thúc.
   3. Không chèn được → đọc dòng hiện có: `request_hash` khác → `422 IDEMPOTENCY_KEY_REUSED`; giống → trả `status_code`, `response_body`, `replayed: true` (handler nghiệp vụ không chạy).
   4. Chèn được → chạy handler → `UPDATE ... SET status_code, response_body` → transaction commit cùng dữ liệu nghiệp vụ.
   - Handler ném lỗi (4xx/5xx) → cả transaction rollback, dòng khóa biến mất, lần "Thử lại" chạy lại từ đầu. Chỉ phản hồi 2xx được lưu.
   - Phản hồi phát lại có header `Idempotency-Replayed: true`.
4. **Rate limit** (`platform/rate-limit/rate-limiter.ts`, SAD §4.2.3):
   ```sql
   INSERT INTO rate_limits (bucket, window_start, count) VALUES ($1, $2, 1)
   ON CONFLICT (bucket, window_start) DO UPDATE SET count = rate_limits.count + 1
   RETURNING count;
   ```
   - `window_start = floor(now / windowSec) * windowSec` (từ `ClockPort`). Chạy ngoài transaction nghiệp vụ (autocommit) để request bị lỗi vẫn được đếm.
   - `count > limit` → `RateLimitedError` (`429 RATE_LIMITED`, `title` "Bạn thao tác quá nhiều lần, vui lòng thử lại sau", header `Retry-After` = số giây tới hết cửa sổ, làm tròn lên; body có `retryAfter`).
   - Bucket chuẩn (dùng ở S1): `register:ip:<ip>` 10/3600 s, `forgot:email:<sha256(lowercase email)>` 5/3600 s, `verify-resend:user:<userId>` 5/3600 s. Email luôn băm, không lưu dạng rõ.
5. **`clientIp(req)`**: `TRUST_CF_CONNECTING_IP=true` → header `CF-Connecting-IP`; ngược lại `req.ip`. Production đặt `true` vì mọi request đi qua `cloudflared` (SAD §4.2.3).

## Giao diện
Không có.

## Tiêu chí chấp nhận
- [ ] Route test có `idempotent: true` thiếu header → `400 IDEMPOTENCY_KEY_REQUIRED`; header `abc` → `400 IDEMPOTENCY_KEY_INVALID`.
- [ ] Gửi 2 lần cùng khóa, cùng body → chỉ 1 bản ghi nghiệp vụ được tạo; lần 2 trả cùng status và body, có `Idempotency-Replayed: true`.
- [ ] Cùng khóa, body khác → `422 IDEMPOTENCY_KEY_REUSED`, không tạo bản ghi.
- [ ] 2 request song song cùng khóa → đúng 1 bản ghi nghiệp vụ; cả hai nhận cùng body.
- [ ] Sau 24 giờ + 1 giây (`FakeClock`) gửi lại cùng khóa → xử lý như yêu cầu mới.
- [ ] Handler trả lỗi 409 → không còn dòng `idempotency_keys`; gửi lại cùng khóa thì handler chạy lại.
- [ ] Hai tài khoản dùng cùng một UUID làm khóa không ảnh hưởng nhau.
- [ ] `hit('register:ip:1.2.3.4', 10, 3600)` lần 1–10 qua, lần 11 → 429 có `Retry-After` > 0; sang cửa sổ mới thì qua lại.
- [ ] 20 lời gọi `hit` song song cho cùng bucket → `count` cuối = 20.

## Kiểm thử
- **Unit**: JSON chuẩn hóa (thứ tự khóa khác nhau cho cùng hash; mảng giữ thứ tự); tính `window_start` và `Retry-After` ở biên cửa sổ (giây 0, giây 3599).
- **Integration (Testcontainers)**: route test giả lập "tạo bản ghi" trong bảng tạm; toàn bộ tiêu chí trên, gồm ca song song (`Promise.all` 2 request) và ca 24 giờ với `FakeClock`.
- **Integration rate limit**: 11 lần tuần tự, 20 lần song song, chuyển cửa sổ.

## Ghi chú
- Cơ chế chống trùng chính vẫn là ràng buộc unique trong DB (SAD P4); `Idempotency-Key` xử lý trường hợp "Thử lại" sau timeout 10 s ở client (FR-GEN-004).
- Ảnh tải lên (`POST /visits/{id}/photos`, multipart) không băm nội dung tệp; S3-04 quyết định `requestHash` cho multipart (method + path + `Content-Length`).
