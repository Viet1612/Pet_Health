# S6-02 · Giao diện SCR-18, menu tài khoản

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S6 · T13–14 |
| Story | US-005, US-008 |
| Yêu cầu | FR-AUTH-007, FR-AUTH-010, FR-AUTH-011, FR-AUTH-015, FR-AUTH-016, FR-GEN-009, FR-GEN-010, NFR-USA-001, NFR-USA-002 |
| Phụ thuộc | [S6-01](S6-01-settings-api.md) |
| Ước lượng | 1,5 |
| Màn hình Figma | SCR-18 · Cài đặt tài khoản (14:1921), SCR-18 · Đổi email (sheet) (14:2014), SCR-18 · Đổi mật khẩu (sheet) (23:2716), SCR-18 · Xóa tài khoản (23:2776), Menu tài khoản (21:2394) |

## Mục tiêu

Người dùng mở Cài đặt từ menu tài khoản (phone) hoặc mục ⚙ (tablet/desktop) để đổi múi giờ, đổi email, đổi mật khẩu, đăng xuất và xóa tài khoản.

## Phạm vi

**Trong phạm vi:** route `/settings` (`apps/web/src/features/settings/`); 4 nhóm SCR-18; sheet Đổi email, Đổi mật khẩu, Chọn múi giờ; `TypeToConfirmDialog` xóa tài khoản; `AccountMenu` trên `TopBar` phone; mục ⚙ cuối `SideRail`; trang xác minh SCR-05 hiển thị kết quả đổi email.

**Ngoài phạm vi:** API ([S6-01](S6-01-settings-api.md)); dark mode và rà soát trợ năng toàn app ([S6-04](S6-04-dark-mode-a11y.md)); xử lý timeout/401/offline chung ([S6-03](S6-03-system-states.md)); event analytics ([S6-05](S6-05-analytics.md)).

## Chi tiết kỹ thuật

1. **Route:** `/settings?section=account|time|security|danger` (TanStack Router, lazy chunk). Loader `fetchQuery(['me'])` → `GET /me` và `['pets']` (lấy số thú cưng cho câu xóa tài khoản). Phone bỏ qua `section`, hiển thị các nhóm xếp dọc.
2. **Thành phần** trong `features/settings/`: `SettingsPage.tsx`, `SettingsSectionNav.tsx` (≥ 768), `ChangeEmailDialog.tsx`, `ChangePasswordDialog.tsx`, `TimezonePickerDialog.tsx`, `DeleteAccountDialog.tsx`; `app/AccountMenu.tsx`.
3. **Form:** React Hook Form + schema sinh từ OpenAPI. Mỗi dialog mở ra là form mới; ô mật khẩu có nút "Hiện"/"Ẩn" (`aria-pressed`), `autocomplete="current-password"` / `"new-password"`, `type="email"` + `autocomplete="email"` cho email mới. Giá trị mật khẩu không bao giờ vào bản nháp `sessionStorage` (S6-03).
4. **Map lỗi API → trường:** `WRONG_PASSWORD` → ô mật khẩu "Mật khẩu không đúng"; `EMAIL_TAKEN` → "Email đã được sử dụng"; `SAME_EMAIL` → "Email mới trùng email hiện tại"; `INVALID_TIMEZONE` → toast lỗi; `RATE_LIMITED` → dưới nút "Bạn đã thử quá nhiều lần. Thử lại sau {n} phút".
5. **Múi giờ:** danh sách từ `Intl.supportedValuesOf('timeZone')`, nhãn `"{zone} (GMT±h)"` tính bằng `Intl.DateTimeFormat(..., { timeZoneName: 'shortOffset' })`; `Asia/Ho_Chi_Minh` ghim đầu; ô tìm lọc theo chuỗi con không dấu. Chọn → `PATCH /me` → toast "Đã lưu" → `queryClient.invalidateQueries()` toàn bộ (mọi "hôm nay" đổi). Giờ hiện tại chỉ để hiển thị, không dùng cho logic nghiệp vụ.
6. **Đổi email thành công (`202`):** đóng sheet, toast "Đã gửi liên kết xác minh tới {email}", invalidate `['me']`; dòng Email hiện thêm "Đang chờ xác minh: {pendingEmail}".
7. **Đổi mật khẩu thành công (`204`):** đóng sheet, toast "Đã đổi mật khẩu".
8. **Đăng xuất** (Cài đặt và menu): `POST /auth/logout` → `queryClient.clear()` → xóa CSRF token trong bộ nhớ → `navigate('/login')`.
9. **Xóa tài khoản (`204`):** `queryClient.clear()`, xóa `localStorage` `ph.selectedPetId`, mọi khóa `sessionStorage` `ph.draft.*` → `/login?reason=account-deleted` hiển thị "Tài khoản đã được xóa."
10. **SCR-05:** khi `POST /auth/verify-email` trả `purpose: "CHANGE_EMAIL"` → tiêu đề "Đã cập nhật email tài khoản", nút "Về Cài đặt".
11. **AccountMenu:** nút ☰ `IconButton` `aria-label="Menu tài khoản"`, `aria-haspopup="menu"`, `aria-expanded`; popover `role="menu"`, mục `role="menuitem"`, phím ↑/↓/Home/End, Esc đóng và trả focus về nút.

## Giao diện

**SCR-18 · Cài đặt tài khoản (14:1921)** — tiêu đề "Cài đặt"; danh sách nhóm, mỗi dòng cao ≥ 56 px, mũi tên `chevron-right`:
- **TÀI KHOẢN:** "Email" · "viet@example.com · đã xác minh" (hoặc "· chưa xác minh"); "Đổi email".
- **THỜI GIAN:** "Múi giờ" · "Asia/Ho_Chi_Minh (GMT+7) · bây giờ 10:24".
- **BẢO MẬT:** "Đổi mật khẩu"; "Đăng xuất".
- **VÙNG NGUY HIỂM:** "Xóa tài khoản" (chữ `--status-danger-fg`) · "Xóa vĩnh viễn mọi thú cưng, sổ y tế và ảnh".
- Chân trang: "Pet Health · phiên bản web {VITE_APP_VERSION}".

**Đổi email (14:2014)** — `ResponsiveDialog`: "Đổi email"; phụ đề "Email mới chỉ có hiệu lực sau khi xác minh (liên kết 60 phút)"; trường "Email mới", "Mật khẩu hiện tại"; nút chính "Gửi liên kết xác minh".

**Đổi mật khẩu (23:2716)** — "Đổi mật khẩu"; phụ đề "Đổi xong sẽ đăng xuất khỏi mọi thiết bị khác"; "Mật khẩu hiện tại", "Mật khẩu mới" (gợi ý "8–128 ký tự"); nút "Đổi mật khẩu".

**Xóa tài khoản (23:2776)** — `TypeToConfirmDialog` biến thể nguy hiểm: icon `alert-circle` trên nền `--status-danger-bg`; "Xóa tài khoản vĩnh viễn?"; "Toàn bộ {n} thú cưng, số đo, sổ y tế, ảnh, lịch mốc và nhắc nhở sẽ bị xóa ngay và không khôi phục được. Bạn sẽ bị đăng xuất khỏi mọi thiết bị."; trường "Nhập mật khẩu để xác nhận"; nút "Xóa tài khoản" (danger, chỉ bật khi ô mật khẩu không rỗng) và "Hủy" (nhận focus mặc định).

**Chọn múi giờ** — sheet "Múi giờ", ô tìm "Tìm thành phố hoặc múi giờ", danh sách `role="listbox"`, mục đang chọn có dấu `check`.

**Menu tài khoản (21:2394)** — popover dưới ☰: dòng email + "Múi giờ GMT+7"; "Cài đặt" (`settings`), "Thú cưng của tôi" (`paw-print`) → `/pets`; kẻ ngang; "Đăng xuất" (`log-out`, chữ danger).

**Trạng thái:** loading dùng skeleton danh sách cố định; nút gửi có spinner + disabled khi đang gửi; lỗi tải trang dùng `ErrorState` (S6-03).

**Responsive (UXD-009, §3.1.5):**
- < 768 px: nhóm xếp dọc, truy cập qua ☰ → "Cài đặt".
- 768–1279 px: 2 cột — `SettingsSectionNav` 220 px (Tài khoản · Thời gian · Bảo mật · Vùng nguy hiểm, mục chọn nền `--primary-soft`, `aria-current`) · nội dung nhóm đang chọn. Truy cập qua ⚙ "Cài đặt" ở đáy `SideRail` 88 px.
- ≥ 1280 px: như tablet, menu 240 px, nội dung tối đa 760 px. Dialog là modal 480 px.

## Tiêu chí chấp nhận

- [ ] **Given** phone, **When** chạm ☰ → "Cài đặt", **Then** mở SCR-18 đúng 4 nhóm như Figma 14:1921. Tablet/desktop: ⚙ cuối thanh bên mở `/settings` dạng 2 cột.
- [ ] **Given** mở Cài đặt, **When** nhập email mới + mật khẩu hiện tại và bấm "Gửi liên kết xác minh", **Then** toast xác nhận, dòng Email vẫn là email cũ kèm "Đang chờ xác minh: …".
- [ ] **When** mở liên kết từ email mới, **Then** SCR-05 báo "Đã cập nhật email tài khoản", Cài đặt hiển thị email mới "· đã xác minh".
- [ ] Sai mật khẩu, email đã dùng hiển thị lỗi ngay dưới đúng trường (FR-GEN-010), form không bị xóa.
- [ ] Đổi mật khẩu thành công → toast "Đã đổi mật khẩu"; thiết bị khác bị đưa về đăng nhập ở lần gọi API kế tiếp.
- [ ] Đổi múi giờ → toast "Đã lưu" 3 s; Dashboard và checklist tải lại theo "hôm nay" mới.
- [ ] **Given** chọn "Xóa tài khoản", **When** chưa nhập mật khẩu, **Then** nút "Xóa tài khoản" bị vô hiệu; **When** nhập đúng và xác nhận, **Then** về `/login` với "Tài khoản đã được xóa.", đăng nhập lại thất bại.
- [ ] Menu tài khoản điều khiển được hoàn toàn bằng bàn phím; mọi vùng chạm ≥ 44 × 44 px.
- [ ] Không có mật khẩu nào trong `sessionStorage`, `localStorage` hay URL.

## Kiểm thử

- **Component (Vitest + Testing Library):** map từng mã lỗi API → đúng trường và câu chữ; nút xóa bật/tắt theo ô mật khẩu; lọc múi giờ "ho chi" ra `Asia/Ho_Chi_Minh`; AccountMenu phím mũi tên + Esc trả focus.
- **E2E (Playwright, viewport 390 × 844 và 1024 × 768):** đổi email → lấy liên kết từ Mailpit API → mở → kiểm email mới và thư "Email tài khoản vừa được đổi" trong hộp thư cũ; đổi mật khẩu với 2 context → context 2 về `/login`; xóa tài khoản → đăng nhập lại báo "Email hoặc mật khẩu không đúng".
- **axe-core** trên `/settings` và 4 dialog: 0 lỗi mức serious/critical.

## Ghi chú

- US-005 là P2: dialog xóa tài khoản làm sau cùng trong task.
- "Thú cưng của tôi" trong menu là lối tắt tới SCR-07, không thay thế mục "Thú cưng" của thanh điều hướng.
