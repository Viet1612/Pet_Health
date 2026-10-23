# S0-08 · Package `api-client`: sinh type, wrapper fetch (timeout, lỗi, idempotency)

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S0 · T1–2 |
| Story | — |
| Yêu cầu | FR-GEN-004, FR-GEN-005, FR-GEN-011, NFR-MNT-001, NFR-SEC-002, SAD §2.1.2, §2.1.3, §2.4.3, §4.2.3 |
| Phụ thuộc | [S0-03](S0-03-backend-skeleton.md), [S0-07](S0-07-web-shell.md) |
| Ước lượng | 0,5 |
| Màn hình Figma | — |

## Mục tiêu
Web gọi API chỉ qua một client có type sinh từ `openapi.yaml`; client lo timeout, CSRF, `Idempotency-Key` và đọc lỗi `problem+json` ở một chỗ, để mọi feature xử lý lỗi giống nhau.

## Phạm vi
**Trong phạm vi:**
- `packages/api-client`: sinh `schema.d.ts` bằng `openapi-typescript`, `createApiClient()` bọc `openapi-fetch`, kiểu lỗi, helper idempotency.
- `apps/web/src/api/`: khởi tạo client cho web, hook `useIdempotencyKey()`, hàm `toUserMessage(error)`.

**Ngoài phạm vi:**
- Lấy `csrfToken` từ `GET /auth/session` và route guard → S1-07.
- Xử lý 401 (lưu bản nháp, chuyển `/login?next=`), banner offline → S6-03. S0 chỉ cung cấp callback.
- Tải ảnh multipart có tiến trình → S2-04, S3-05.

## Chi tiết kỹ thuật
1. **Sinh type**: script `generate` trong `packages/api-client`: `openapi-typescript ../../openapi.yaml -o src/schema.d.ts`. Commit `schema.d.ts`; CI chạy lại và kiểm diff ([S0-09](S0-09-ci-pipeline.md)). Package không chứa logic nghiệp vụ (SAD §4.4.2).
2. **Kiểu lỗi** (`src/errors.ts`):
   ```ts
   export type Problem = { type: string; title: string; status: number; code: string;
     errors?: { field: string; code: string; message: string }[]; ref?: string; retryAfter?: number };
   export class ApiError extends Error { constructor(readonly problem: Problem) {} get status() {…} }
   export class TimeoutError extends Error {}   // quá hạn AbortController
   export class NetworkError extends Error {}   // fetch ném TypeError (mất mạng, DNS)
   ```
   - Phản hồi có `Content-Type` chứa `application/problem+json` → parse thành `Problem`.
   - Phản hồi lỗi không phải problem+json (ví dụ 502 từ Caddy/Cloudflare) → `Problem` tổng hợp `{ status, code: 'UNEXPECTED_RESPONSE', title: '' }`.
   - Header `Retry-After` (429) → `retryAfter` (giây).
3. **`createApiClient(opts)`** (`src/client.ts`):
   ```ts
   createApiClient({ baseUrl: '/api/v1', getCsrfToken: () => string | undefined,
     onUnauthorized?: (p: Problem) => void, fetch?: typeof fetch })
   ```
   - `createClient<paths>({ baseUrl, credentials: 'same-origin' })` + middleware `openapi-fetch`.
   - `onRequest`: method `POST|PUT|PATCH|DELETE` → thêm `X-CSRF-Token` nếu có token; luôn `Accept: application/json`.
   - Timeout bằng `AbortController`: **10 s cho ghi**, **15 s cho đọc** (SAD §4.2.3); kết hợp với `signal` người gọi truyền vào (hủy từ TanStack Query vẫn hoạt động). Quá hạn → `TimeoutError`.
   - Mọi phản hồi không 2xx → ném `ApiError`; 401 gọi `onUnauthorized` trước khi ném.
   - Trả về hàm tiện ích có type: `api.GET('/healthz')`, `api.POST(path, { body, idempotencyKey })` — `idempotencyKey` được đặt vào header `Idempotency-Key`.
4. **Idempotency** (`src/idempotency.ts`): `newIdempotencyKey() = crypto.randomUUID()`. Ở web, `useIdempotencyKey()` tạo khóa khi form mở, giữ nguyên qua các lần "Thử lại", tạo khóa mới sau khi lưu thành công hoặc khi form đóng (FR-GEN-005, UI Blueprint §3.4.1).
5. **Web** (`apps/web/src/api/client.ts`): một instance dùng chung; `getCsrfToken` đọc biến trong bộ nhớ (S1-07 gán giá trị); `onUnauthorized` phát sự kiện `session-expired` (S6-03 lắng nghe). `toUserMessage(err)`:
   | Lỗi | Nội dung hiển thị |
   |---|---|
   | `TimeoutError`, `NetworkError` khi ghi | "Không lưu được. Kiểm tra kết nối rồi thử lại." + "Thử lại" (FR-GEN-004) |
   | `ApiError` 5xx | "Có lỗi xảy ra, vui lòng thử lại sau. Mã: {ref}" (FR-GEN-011) |
   | `ApiError` 422 có `errors[]` | trả về map `field → message` để hiển thị dưới trường |
   | `ApiError` 4xx khác | `problem.title` |
6. Chỉ `apps/web/src/api/**` được gọi `fetch` (luật ESLint từ [S0-01](S0-01-monorepo.md)).

## Giao diện
Không có màn hình. Chuỗi thông báo dùng ở bảng bước 5, lấy từ `i18n/vi.ts`.

## Tiêu chí chấp nhận
- [ ] `pnpm --filter @ph/api-client generate` sinh `schema.d.ts` từ `openapi.yaml`; `api.GET('/healthz')` có type phản hồi `{ status: string }`.
- [ ] Yêu cầu ghi không có phản hồi sau 10 s ném `TimeoutError`; yêu cầu đọc sau 15 s.
- [ ] `POST`/`PUT`/`PATCH`/`DELETE` có header `X-CSRF-Token`; `GET` không có.
- [ ] Lỗi 422 problem+json được parse đủ `errors[]`; lỗi 500 có `ref` hiển thị thành "Có lỗi xảy ra, vui lòng thử lại sau. Mã: 7KQ2M9XD".
- [ ] Phản hồi 502 dạng HTML không làm client ném lỗi parse JSON mà trả `ApiError` với `code: 'UNEXPECTED_RESPONSE'`.
- [ ] "Thử lại" sau timeout gửi lại đúng `Idempotency-Key` cũ; lần mở form mới có khóa mới.
- [ ] 401 gọi `onUnauthorized` đúng 1 lần.
- [ ] Kích thước thêm vào bundle ban đầu ≤ 3 KB gzip.

## Kiểm thử
- **Unit (Vitest)** với `fetch` giả và fake timers: timeout ghi 10 s / đọc 15 s (biên 9.999 ms không ném); hủy bằng `signal` người gọi; CSRF theo method; parse problem+json (422, 404, 429 kèm `Retry-After: 120`, 500 có `ref`); 502 HTML; `TypeError` → `NetworkError`; header `Idempotency-Key`.
- **Unit hook** (`@testing-library/react`): `useIdempotencyKey` giữ khóa qua re-render và "Thử lại", đổi khóa sau `reset()`.
- **Integration nhẹ**: gọi `GET /api/v1/healthz` thật của `buildApp` qua `app.inject` bọc thành `fetch` để xác nhận type và đường dẫn khớp.

## Ghi chú
- Client phải bỏ qua trường lạ trong phản hồi (SAD §2.4.1); không validate phản hồi bằng Zod ở client để giữ bundle nhỏ.
