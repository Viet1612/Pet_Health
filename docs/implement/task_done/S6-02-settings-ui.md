# S6-02 · Giao diện SCR-18, menu tài khoản — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S6-02](../tasks/S6-02-settings-ui.md) |
| Trạng thái | Xong, E2E giao diện Pass ở phone và tablet |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **`/settings?section=account|time|security|danger`** (`features/settings/SettingsScreen.tsx`):
  - **Tài khoản:** dòng Email "… · đã xác minh / chưa xác minh" kèm "Đang chờ xác minh: …", "Đổi email", mục Ngôn ngữ (chuyển từ S4-07 vào nhóm này).
  - **Thời gian:** "Múi giờ" · "Asia/Ho_Chi_Minh (GMT+7) · bây giờ 10:24".
  - **Bảo mật:** "Đổi mật khẩu", "Đăng xuất".
  - **Vùng nguy hiểm:** "Xóa tài khoản" chữ đỏ + mô tả.
  - Chân trang "Pet Health · phiên bản web {VITE_APP_VERSION | dev}".
  - Phone: nhóm xếp dọc. ≥ 768 px: menu nhóm 220/240 px (`aria-current`) + nội dung tối đa 760 px. Skeleton khi tải, `ErrorState` khi lỗi.
- **Dialog** (`dialogs.tsx`):
  - **Đổi email:** `type=email`, `autocomplete`; 202 → toast "Đã gửi liên kết xác minh tới …".
  - **Đổi mật khẩu:** kiểm 8–128 ký tự ở client; 204 → toast "Đã đổi mật khẩu".
  - **Chọn múi giờ:** tìm không dấu ("ho chi" ra `Asia/Ho_Chi_Minh`), `Asia/Ho_Chi_Minh` ghim đầu, `listbox`, dấu check ở mục đang chọn. Lưu → toast "Đã lưu" + `invalidateQueries()` toàn bộ.
  - **Xóa tài khoản:** icon cảnh báo, câu có số thú cưng; nút chỉ bật khi đã nhập mật khẩu; "Hủy" nhận focus. 204 → xóa cache, CSRF, `ph.selectedPetId`, `ph.dashboardFilter`, `ph.draft.*` → `/login?reason=account-deleted` ("Tài khoản đã được xóa.").
  - **Lỗi về đúng trường:** `WRONG_PASSWORD` → "Mật khẩu không đúng", `EMAIL_TAKEN`, `SAME_EMAIL`. `429` → "Bạn đã thử quá nhiều lần. Thử lại sau N phút" dưới nút. Form không bị xóa khi lỗi.
- **`api/client.ts`:** `401 WRONG_PASSWORD` không còn kích hoạt "phiên hết hạn".
- **SCR-05:** `purpose: CHANGE_EMAIL` → "Đã cập nhật email tài khoản" + "Về Cài đặt"; cache phiên cập nhật email mới.
- **AccountMenu** (`app/shell/AccountMenu.tsx`, thay menu ☰ cũ):
  - Dòng email + "Múi giờ GMT+7"; Cài đặt, Thú cưng của tôi, kẻ ngang, Đăng xuất (đỏ).
  - `role="menu"`: ↑/↓/Home/End, Esc đóng và trả focus về nút ☰.
- **`IconButton`** nhận `ref` (React 19, `ComponentPropsWithRef`).
- **i18n:** nhóm `settings` mở rộng, `auth.verify.changed*`, `auth.login.accountDeleted` (vi + en).
- **E2E** `e2e/ui/settings.ui.spec.ts` (phone + tablet):
  - Mở Cài đặt (☰ hoặc SideRail) → đổi múi giờ UTC.
  - Đổi mật khẩu sai → lỗi dưới trường, vẫn ở `/settings`.
  - Đổi email → "Đang chờ xác minh" → mở liên kết Mailpit → "Đã cập nhật email tài khoản" → Cài đặt hiện email mới "đã xác minh".
  - Xóa tài khoản (nút tắt khi trống) → `/login` "Tài khoản đã được xóa." → đăng nhập lại báo sai.
- **Bundle:** JS ban đầu 135,4 KB gzip.

## Tiêu chí chấp nhận

**Đã kiểm (E2E):** mở từ ☰ và từ ⚙; đổi email đủ vòng; lỗi đúng trường; đổi múi giờ có toast; xóa tài khoản; không lưu mật khẩu vào storage hay URL. Toàn bộ E2E 38/38.

**Chưa kiểm:**
- Đổi mật khẩu với 2 context trên giao diện (đã có ở E2E API S6-01).
- Dashboard đổi "hôm nay" sau khi đổi múi giờ (đã có ở API).
- So khớp Figma, axe-core.

## Khác với file task

- **Form dùng `useState`** như các dialog khác trong repo, không dùng React Hook Form.
- **Route không có loader:** `GET /me` gọi trong màn hình (skeleton khi chờ).
- **Mục Ngôn ngữ** (S4-07/S4-09) đặt trong nhóm Tài khoản.
- **Chưa có test component** (repo chưa cài Testing Library).
