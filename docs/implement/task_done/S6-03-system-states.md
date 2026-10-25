# S6-03 · Mất mạng, timeout, hết phiên giữ bản nháp, 404/5xx, nhất quán đa thiết bị — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S6-03](../tasks/S6-03-system-states.md) |
| Trạng thái | Xong, E2E Pass ở phone và tablet |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **Mất mạng (`lib/online.ts`, `ui/OfflineBanner.tsx`, `api/health.ts`):**
  - Store `useOnline` (`useSyncExternalStore`). Offline khi có sự kiện `offline` hoặc query/mutation nào ném `NetworkError` (`QueryCache`/`MutationCache.onError` trong `query-client.ts`).
  - Khi offline: thăm dò `GET /healthz` mỗi 5 s (timeout 3 s) và ngay khi có sự kiện `online`. Có mạng lại → ẩn banner + `invalidateQueries({ type: 'active' })`.
  - Banner vàng `role="status"` `aria-live="polite"`, icon wifi-off: "Mất kết nối — thay đổi chưa được lưu" + "Nội dung đang nhập được giữ nguyên…". Hiện dưới TopBar (AppShell) và trên form đăng nhập (AuthLayout).
  - **Mọi nút `type="submit"`** (component `Button`) tự tắt khi offline, `title` "Cần kết nối mạng để lưu"; nội dung form giữ nguyên.
- **Hết phiên giữ bản nháp (`lib/draft.ts`, FLW-06):**
  - `saveDraft` / `readDraft` / `clearDraft`, khóa `ph.draft.{pathname}{search}` trong `sessionStorage`.
  - Bỏ trường có tên chứa "password" và giá trị không phải chuỗi/số/boolean (ví dụ `File`); sai `formId` hoặc JSON hỏng → xóa, bỏ qua.
  - Gắn vào **form lần khám** (`VisitForm`, thêm/sửa): `401` khi lưu → lưu nháp theo vị trí lúc bấm Lưu. Mở lại form → điền lại, xóa khóa, toast "Đã khôi phục nội dung đang nhập" (một lần, kể cả StrictMode).
  - `/login?expired=1`: banner cảnh báo "…nội dung đang nhập vẫn được giữ" + "Sau khi đăng nhập sẽ quay lại: {tên màn hình}" (lấy `staticData.title` của route `next`). `next` vẫn qua `safeNext` (chặn `//`, `/\`).
- **404/5xx:** đã có từ S0-07/S1-07 (`notFoundComponent`, `errorComponent` có mã `ref` và "Sao chép"); toast 5xx có mã từ S4-08. Không đổi.
- **Đa thiết bị (FR-GEN-007/008):** cấu hình Query đã đúng spec từ trước (`staleTime 0`, `refetchOnMount: 'always'`, refetch khi focus, không persist cache).
- **i18n:** nhóm `system` (vi + en).
- **E2E:**
  - Hạn mức SMTP của môi trường E2E nâng lên 1.000.000/ngày (`SMTP_DAILY_LIMIT` trong `e2e/support/env.ts`). Trước đó sau nhiều lần chạy, bộ đếm trong DB E2E vượt 80% của 400 thư/ngày nên worker bỏ qua thư xác minh, và test đổi email chờ tới hết giờ.
  - Spec Cài đặt chọn nhóm theo bề rộng màn hình thay vì `isVisible()` (tránh đua với lúc tải `/me`).
- **Khác:** `.gitignore` thêm `apps/web/.tanstack/` (thư mục tạm của plugin router).

## Tiêu chí chấp nhận

Đã kiểm bằng `e2e/ui/system-states.ui.spec.ts` (phone + tablet):
- **Mất mạng:** `context.setOffline(true)` khi đang nhập lần khám → banner ≤ 2 s, nút Lưu tắt, nội dung giữ; có mạng lại → banner ẩn, nút bật.
- **Hết phiên:** xóa cookie phiên rồi bấm Lưu → `/login` có banner + tên màn hình quay lại; đăng nhập lại → về đúng form, nội dung điền sẵn, toast khôi phục, không còn khóa `ph.draft.*`.
- **2 thiết bị:** thiết bị A ghi 9,4 kg → thiết bị B (tablet) tải lại thấy 9,4 kg. A sửa 9,5 rồi 9,6 → B thấy 9,6 (last-write-wins).

Unit `lib/draft.test.ts`: bỏ mật khẩu/tệp, sai `formId`, JSON hỏng.

Toàn bộ: unit 194, E2E 44/44, typecheck, lint, depcruise, bundle 136,1 KB.

## Khác với file task

- **Không có hook `useSubmitForm` chung.** Các form đã xử lý timeout/422/5xx/"Thử lại cùng Idempotency-Key" riêng từ các task trước. Task này thêm 2 lớp chung (nút submit tắt khi offline, banner) và bản nháp cho form lần khám.
- **Bản nháp mới gắn cho form lần khám** (ví dụ của spec). Các form ngắn (cân nặng, mốc, việc) chưa gắn.
- **Chưa có E2E timeout 10 s + "Thử lại" 1 bản ghi** (Idempotency-Key đã có test ở S0-05/S4-06). Không có test component MSW.
- **Rà soát xác nhận xóa:** các thao tác xóa đều đã qua `ConfirmDialog` hoặc nhập lại tên/mật khẩu từ các task trước; không có thay đổi.
