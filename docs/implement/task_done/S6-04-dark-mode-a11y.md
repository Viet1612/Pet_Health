# S6-04 · Dark mode và rà soát trợ năng — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S6-04](../tasks/S6-04-dark-mode-a11y.md) |
| Trạng thái | Xong phần trợ năng (axe 0 lỗi serious/critical trên 14 màn). **Dark mode không làm** theo quyết định chỉ dùng giao diện sáng |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

- **Dark mode: không bật.** Chủ dự án đã chọn chỉ dùng giao diện sáng (`tokens.css`: `color-scheme: light`). Token màu đã tập trung ở `:root`, nên khi cần chỉ phải thêm khối `@media (prefers-color-scheme: dark)` theo bảng màu trong file task.
- **Skip link** "Bỏ qua tới nội dung chính" (`ui/SkipLink.tsx`): phần tử focus đầu tiên ở AppShell và AuthLayout, trỏ `#main`.
- **Vùng chạm 44 px:**
  - Ô nhập `TextField` lấp đầy khung 48 px (`self-stretch`).
  - Segmented Cân nặng/Sổ y tế, tab mốc, chọn giới tính: `min-h-10` → `min-h-11`.
  - Link "Quên mật khẩu?", "Sửa" hồ sơ: đủ 44 × 44.
- **Tên đọc chứa chữ đang hiện (WCAG 2.5.3, `label-content-name-mismatch`):**
  - PetSwitcher bỏ `aria-label`, dùng tiền tố/hậu tố `sr-only` quanh tên ("Thú cưng đang chọn: Mochi. Đổi thú cưng").
  - Nút "Đánh dấu đã xem" có `aria-label` "Đánh dấu đã xem tất cả".
- **Danh sách mốc:** `role="tabpanel"` chuyển ra `div` bọc ngoài `ul` (lỗi `listitem`).
- **Biểu đồ cân nặng:** `figcaption` thêm câu tóm tắt "N số đo từ dd/MM/yyyy đến dd/MM/yyyy, gần nhất X kg". Bảng `sr-only` đã có từ trước (sửa caption lọt ra ngoài ở bản fix trước).
- **Kiểm tự động** `e2e/ui/a11y.ui.spec.ts` (`@axe-core/playwright`, phone + tablet):
  - 14 màn: đăng nhập, đăng ký, Tổng quan, Thú cưng, hồ sơ, Cân nặng, Sổ y tế, Lịch mốc, chi tiết mốc, Việc hằng ngày, Thông báo, Cài đặt, Thêm thú cưng, Thêm lần khám.
  - Tag WCAG 2.0/2.1 A + AA, không cho lỗi serious/critical.
  - Trên phone thêm kiểm vùng chạm ≥ 44 × 44 cho button, link, checkbox, menuitem, option, ô nhập (bỏ phần tử ẩn trực quan và link trong đoạn văn).
- `e2e/tsconfig.json` thêm lib `DOM` (code chạy trong `page.evaluate`).

## Tiêu chí chấp nhận

**Đã kiểm:**
- axe 0 lỗi serious/critical trên 14 màn ở 2 viewport (giao diện sáng).
- Vùng chạm ≥ 44 px trên phone.
- Trạng thái có icon + chữ (StatusChip, banner, checklist, offline, lỗi trường đã có từ trước).
- Unit 194, E2E toàn bộ 46/46.

**Chưa kiểm:**
- Mọi tiêu chí dark mode (không làm).
- Dialog chính chưa có trong bản quét axe.
- Đi luồng G-3 chỉ bằng bàn phím, VoiceOver/NVDA, zoom 200%: cần thử bằng tay.

## Khác với file task

- **Không làm dark mode** (theo quyết định trước đó của chủ dự án).
- Chưa có ESLint/stylelint chặn mã màu cứng.
- `index.html` giữ `color-scheme` sáng, chưa có `theme-color` cho 2 theme.
