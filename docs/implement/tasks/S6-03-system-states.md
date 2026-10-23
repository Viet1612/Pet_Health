# S6-03 · Mất mạng, timeout, hết phiên giữ bản nháp, 404/5xx, nhất quán đa thiết bị

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S6 · T13–14 |
| Story | US-007 |
| Yêu cầu | FR-GEN-003, FR-GEN-004, FR-GEN-005, FR-GEN-006, FR-GEN-007, FR-GEN-008, FR-GEN-009, FR-GEN-010, FR-GEN-011, FR-AUTH-013 |
| Phụ thuộc | [S5-04](S5-04-dashboard-ui.md) |
| Ước lượng | 1,5 |
| Màn hình Figma | Mất kết nối · đang nhập form (21:2553), Phiên hết hạn · đăng nhập lại (21:2610), Bản nháp được khôi phục (21:2638), Không tìm thấy 404 (23:2916), Lỗi máy chủ 5xx (14:2073), SCR-10 · Sức khỏe / Cân nặng (10:576) |

## Mục tiêu

Mọi form và màn hình xử lý thống nhất các trạng thái hệ thống theo ST-01, ST-02, ST-06 (UI/UX Blueprint §3.7): không mất nội dung đang nhập, không tạo trùng, lỗi rõ ràng có mã `ref`, và dữ liệu luôn mới giữa các thiết bị.

## Phạm vi

**Trong phạm vi:** hook `useOnline` + `SystemBanner` offline; hook `useSubmitForm` (timeout, Thử lại cùng key, 401 → bản nháp); khôi phục bản nháp; `ErrorState` 404/5xx gắn vào router; toast 5xx và "Đã lưu"; rà soát xác nhận xóa; cấu hình Query/Router cho FR-GEN-008; E2E đa thiết bị.

**Ngoài phạm vi:** timeout `AbortController` và đọc `problem+json` trong wrapper fetch ([S0-08](S0-08-api-client.md)); middleware `Idempotency-Key` ở server ([S0-05](S0-05-idempotency-ratelimit.md)); event `offline_banner_shown`, `client_error` ([S6-05](S6-05-analytics.md)); dark mode ([S6-04](S6-04-dark-mode-a11y.md)).

## Chi tiết kỹ thuật

Mã đặt tại `apps/web/src/app/` (shell, router) và `apps/web/src/features/session/` (bản nháp, guard).

**1. `useOnline()`** (`app/useOnline.ts`) — store dùng `useSyncExternalStore`:
1. `offline` khi: sự kiện `window.offline`, hoặc wrapper fetch ném `NetworkError` (TypeError của fetch, không phải timeout).
2. Khi đang offline: thăm dò `GET /healthz` mỗi 5 s (timeout 3 s) và ngay khi có sự kiện `online`. Thành công → `online`, `queryClient.invalidateQueries({ type: 'active' })`.
3. `SystemBanner` biến thể offline hiển thị ≤ 2 s sau khi phát hiện (QS-03), `role="status"`, `aria-live="polite"`.
4. Nút Lưu của mọi form: `disabled={!online || submitting}`, kèm dòng phụ "Cần kết nối mạng để lưu". Nội dung form không bị reset. Màn hình đang `Ready` giữ nguyên dữ liệu.

**2. `useSubmitForm({ formId, mutate, kind: 'create' | 'update' | 'delete' })`** (`app/useSubmitForm.ts`):
1. `create`: sinh `idempotencyKey = crypto.randomUUID()` khi form mount; giữ trong `useRef`; chỉ sinh lại sau khi lưu thành công hoặc đóng form.
2. Gọi `mutate(values, { idempotencyKey })`; wrapper đặt `AbortController` 10 s cho method ghi.
3. Kết quả:
   - `2xx` → toast success "Đã lưu" 3 s (trừ chỗ có toast riêng như "Đã đánh dấu thực hiện"), `invalidateQueries` key liên quan, đóng dialog / điều hướng.
   - `422` → `setError` cho từng `errors[].field`, focus trường lỗi đầu tiên.
   - Timeout hoặc lỗi mạng → toast error "Không lưu được. Kiểm tra kết nối rồi thử lại." + nút "Thử lại" (gửi lại cùng `idempotencyKey`, cùng body); form giữ nguyên.
   - `5xx` → toast error "Có lỗi xảy ra, vui lòng thử lại sau. Mã: {ref}" + "Thử lại"; mã chọn và sao chép được.
   - `401` → bước 3.
4. Nút Lưu disabled + spinner từ lần bấm đầu tới khi có phản hồi.

**3. Hết phiên giữ bản nháp (FLW-06):**
1. `401` lúc submit → `saveDraft(key, { v: 1, formId, savedAt, values })` với `key = "ph.draft." + location.pathname + location.search` (dialog có `?dialog=...` nên route mở lại đúng dialog).
2. Bỏ mọi trường `type="password"` và trường `File` trước khi lưu; chỉ lưu giá trị chuỗi/số/boolean.
3. `navigate('/login', { search: { next: pathname + search, reason: 'session-expired' } })`.
4. `/login` hiển thị banner warning "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục — nội dung đang nhập vẫn được giữ." và dòng "Sau khi đăng nhập sẽ quay lại: {tên màn hình}".
5. `next` chỉ chấp nhận đường dẫn bắt đầu bằng `/` và không bắt đầu bằng `//` hoặc `/\`; sai → `/`.
6. Form mount: `loadDraft(key)` khớp `formId` → `reset(values)`, xóa khóa, toast success "Đã khôi phục nội dung đang nhập". Khóa không khớp hoặc JSON hỏng → xóa, bỏ qua.
7. `401` khi tải trang (GET) → chuyển `/login?next=` như guard S1-07, không có bản nháp.

**4. 404 và 5xx khi tải màn hình (ST-02):**
- Loader nhận `404` → `throw notFound()`; route không khớp → cùng component. `ErrorState` biến thể 404, giữ TopBar/BottomNav.
- Loader nhận `5xx` → `errorComponent` = `ErrorState` 5xx có `ref` và "Thử lại" (`router.invalidate()`).
- Lỗi mạng khi tải → `ErrorState` "Không tải được dữ liệu" + "Thử lại", kèm banner offline.

**5. Nhất quán đa thiết bị (FR-GEN-007, 008):**
```ts
new QueryClient({ defaultOptions: { queries: {
  staleTime: 0, gcTime: 5 * 60_000, refetchOnMount: 'always',
  refetchOnWindowFocus: true, refetchOnReconnect: true, retry: 1 } } });
createRouter({ defaultPreloadStaleTime: 0, defaultPendingMs: 0 /* hiện skeleton ngay */ });
```
- Mọi loader dùng `queryClient.fetchQuery` (không dùng `ensureQueryData`) để luôn chờ dữ liệu mới trước khi render.
- Không persist cache, không service worker (DC-002).
- `PATCH` gửi toàn bộ trường của form, server ghi đè, không kiểm phiên bản (last-write-wins).

**6. Rà soát xác nhận xóa (FR-GEN-010):** checklist các thao tác: xóa số đo, bản ghi khám, ảnh, hủy mốc, xóa việc dùng `ConfirmDialog` (focus mặc định "Hủy"); xóa thú cưng, xóa tài khoản dùng `TypeToConfirmDialog`. Không có thao tác xóa nào gọi API trực tiếp từ một lần chạm.

## Giao diện

- **Mất kết nối (21:2553):** banner vàng cố định dưới TopBar, icon `wifi-off`, "Mất kết nối — thay đổi chưa được lưu"; dưới form "Nội dung đang nhập được giữ nguyên. Nút Lưu bật lại khi có mạng."; nút "Lưu" disabled + "Cần kết nối mạng để lưu".
- **Phiên hết hạn (21:2610):** SCR-01 kèm banner warning như bước 3.4.
- **Bản nháp được khôi phục (21:2638):** form điền sẵn, toast success icon `check-circle-2` "Đã khôi phục nội dung đang nhập".
- **404 (23:2916):** icon `x-circle` trên nền tròn `--status-neutral-bg`; h1 "Không tìm thấy"; "Trang hoặc dữ liệu không tồn tại, hoặc không thuộc tài khoản của bạn."; nút "Về Tổng quan".
- **5xx (14:2073):** icon `alert-circle` danger; h1 "Có lỗi xảy ra"; "Vui lòng thử lại sau. Nếu vẫn lỗi, gửi mã bên dưới cho người hỗ trợ."; hộp "Mã: 7KQ2M9XD" + "Sao chép" (`navigator.clipboard`, toast "Đã sao chép"); nút "Thử lại".
- **Toast:** đáy màn hình trên BottomNav (phone), góc dưới phải (≥ 768) theo UXD-007; success tự ẩn 3 s, error không tự ẩn khi đang focus.

## Tiêu chí chấp nhận

- [ ] **Given** đang nhập form, **When** mất mạng, **Then** ≤ 2 s banner "Mất kết nối — thay đổi chưa được lưu" hiện, nút Lưu disabled, nội dung giữ nguyên; có mạng lại thì banner tự ẩn, nút bật lại.
- [ ] **Given** server không phản hồi, **When** bấm Lưu, **Then** sau 10 s hiện "Không lưu được…" + "Thử lại"; bấm "Thử lại" gửi cùng `Idempotency-Key`, chỉ có 1 bản ghi được tạo.
- [ ] Bấm Lưu 2 lần liên tiếp chỉ gửi 1 request.
- [ ] **Given** phiên hết hạn khi đang nhập "Thêm lần khám", **When** bấm Lưu, **Then** chuyển `/login` có banner; đăng nhập lại thì quay về đúng form, nội dung điền sẵn, toast "Đã khôi phục nội dung đang nhập", khóa `ph.draft.*` bị xóa.
- [ ] Bản nháp không bao giờ chứa mật khẩu; `next=//evil.com` bị thay bằng `/`.
- [ ] Mở `/milestones/{id của B}` → ErrorState 404 như Figma 23:2916.
- [ ] `5xx` khi lưu → toast có mã `ref` trùng `ref` trong log API; khi tải màn hình → ErrorState 5xx sao chép được mã.
- [ ] **Given** đăng nhập trên điện thoại và máy tính bảng, **When** lưu số đo trên điện thoại, thấy "Đã lưu", rồi tải lại màn cân nặng trên máy tính bảng, **Then** số đo hiển thị (US-007).
- [ ] Hai thiết bị sửa cùng số đo: lần lưu sau thắng, không có cảnh báo xung đột.

## Kiểm thử

- **Unit:** `saveDraft`/`loadDraft` (bỏ password, JSON hỏng, sai `formId`); kiểm `next`; reducer `useOnline`.
- **Component:** `useSubmitForm` với `msw`: 201, 422, 500 (có `ref`), 401, treo 11 s (fake timers) → đúng nhánh; "Thử lại" dùng cùng key.
- **E2E Playwright:**
  - `context.setOffline(true)` khi đang nhập → banner, nút disabled; `setOffline(false)` → banner ẩn.
  - `page.route('**/api/v1/pets/*/weights', r => setTimeout(() => r.abort(), 11000))` → toast timeout; bỏ route, "Thử lại" → 1 bản ghi trong DB.
  - Xóa cookie phiên rồi bấm Lưu form khám → đăng nhập → bản nháp khôi phục.
  - **Đa thiết bị:** 2 `browser.newContext()` (390 × 844 và 834 × 1112), cùng tài khoản. Context A thêm 9,4 kg → thấy "Đã lưu"; context B `page.reload()` ở `/pets/:petId/health/weight` → thấy "9,4 kg". Biến thể: B đang mở sẵn, phát `visibilitychange` → số đo xuất hiện không cần reload. Last-write-wins: A sửa 9,5, B sửa 9,6 → cả hai reload thấy 9,6.
- **IDOR:** không thêm route mới.

## Ghi chú

- Lỗi `client_error` và `offline_banner_shown` được gửi từ các điểm này ở [S6-05](S6-05-analytics.md); task này chỉ cần phát sự kiện nội bộ (`onOffline`, `onClientError`) để S6-05 gắn vào.
- Bản nháp có thể chứa nội dung y tế; chỉ nằm trong `sessionStorage` của tab, xóa khi khôi phục hoặc đóng tab (DC-002).
