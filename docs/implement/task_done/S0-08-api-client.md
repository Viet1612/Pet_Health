# S0-08 · Package api-client — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S0-08](../tasks/S0-08-api-client.md) |
| Trạng thái | Xong (code), chưa có unit test |
| Ngày hoàn thành | 2026-10-24 |
| Commit | xem [README](README.md) |

## Kết quả

- **`packages/api-client`:**
  - `schema.d.ts` sinh từ `openapi.yaml` bằng `openapi-typescript` (script `generate`).
  - `createApiClient()` bọc `openapi-fetch`, các lỗi gom về một chỗ trong wrapper fetch:
    - timeout 10 s cho ghi, 15 s cho đọc (`AbortSignal.timeout` kết hợp `signal` của người gọi);
    - header `X-CSRF-Token` cho `POST/PUT/PATCH/DELETE`, luôn có `Accept: application/json`;
    - phản hồi không 2xx → `ApiError`, đọc `problem+json`; phản hồi lạ như 502 HTML → `code: 'UNEXPECTED_RESPONSE'`; `Retry-After` → `retryAfter`; 401 gọi `onUnauthorized`;
    - `TimeoutError` khi quá hạn, `NetworkError` khi mất mạng.
  - `newIdempotencyKey()` và `idempotencyHeaders(key)`.
- **`apps/web/src/api/`:**
  - `client.ts`: instance `api` dùng chung, `setCsrfToken()` (S1-07 gọi), sự kiện `ph:session-expired` khi 401 (S6-03 lắng nghe).
  - `use-idempotency-key.ts`: khóa giữ nguyên qua "Thử lại", `reset()` khi lưu xong hoặc đóng form.
  - `to-user-message.ts`: lỗi → nội dung hiển thị (timeout/mạng → "Không lưu được…", 5xx → "Có lỗi xảy ra… Mã: {ref}", 422 → map trường → thông điệp, 4xx khác → `title`).

## Tiêu chí chấp nhận

| Tiêu chí | Kết quả |
|---|---|
| `generate` sinh `schema.d.ts`; `GET('/healthz')` có type phản hồi | Đạt (sinh được; type có trong `paths`) |
| Ghi quá 10 s → `TimeoutError`; đọc quá 15 s | Code xong, chưa test |
| Ghi có `X-CSRF-Token`, `GET` không có | Code xong, chưa test |
| 422 parse đủ `errors[]`; 500 có `ref` → "Có lỗi xảy ra, vui lòng thử lại sau. Mã: …" | Code xong, chưa test |
| 502 HTML → `ApiError` `UNEXPECTED_RESPONSE`, không lỗi parse JSON | Code xong, chưa test |
| "Thử lại" dùng lại khóa cũ; form mới có khóa mới | Code xong (`useIdempotencyKey`), chưa test |
| 401 gọi `onUnauthorized` đúng 1 lần | Code xong, chưa test |
| Bundle ban đầu thêm ≤ 3 KB gzip | Chưa đo được: client chưa được màn hình nào import nên chưa vào bundle |

## Tệp đã tạo / sửa

- `packages/api-client/src/`: `schema.d.ts` (sinh), `errors.ts`, `client.ts`, `idempotency.ts`, `index.ts`; `package.json` (script `generate`, `typecheck`); `tsconfig.json` (thêm lib DOM)
- `apps/web/src/api/`: `client.ts`, `use-idempotency-key.ts`, `to-user-message.ts`
- `apps/web/src/i18n/vi.ts`: thêm `error.serverToast`
- `eslint.config.js`: bỏ qua `schema.d.ts`
- Dependency: `openapi-fetch` 0.x, `openapi-typescript` 7.13.0 (dev)

## Khác với file task

- Khóa idempotency gửi qua `headers: idempotencyHeaders(key)`, không qua tùy chọn `idempotencyKey` riêng. Bọc lại kiểu của `openapi-fetch` để thêm tùy chọn này phức tạp mà không thêm giá trị.
- Lỗi được ném từ wrapper `fetch` truyền vào `openapi-fetch`, không dùng middleware; vì vậy `data` của lời gọi thành công luôn có giá trị.
