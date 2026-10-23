# S6-04 · Dark mode và rà soát trợ năng

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S6 · T13–14 |
| Story | — |
| Yêu cầu | UXD-001, NFR-USA-001, NFR-USA-002, NFR-USA-003, NFR-USA-004, FR-MS-013 |
| Phụ thuộc | [S5-04](S5-04-dashboard-ui.md) |
| Ước lượng | 1 |
| Màn hình Figma | SCR-06 · Dashboard · Dark mode (8:241), SCR-06 · Dashboard (8:3) |

## Mục tiêu

Toàn bộ giao diện tự đổi sang theme tối theo cài đặt hệ thống, dùng đúng token tối của Figma, và mọi màn hình đạt WCAG 2.1 AA: tương phản, nhãn, bàn phím, focus, vùng chạm, văn bản thay thế cho biểu đồ, trạng thái không chỉ bằng màu.

## Phạm vi

**Trong phạm vi:** biến CSS cho 2 theme; rà các component CMP-01→CMP-26 và mọi màn SCR-01→SCR-18 ở cả 2 theme; biểu đồ uPlot đổi màu theo theme; bảng dữ liệu ẩn cho biểu đồ; skip link; kiểm tự động axe + vùng chạm trong CI.

**Ngoài phạm vi:** nút chuyển theme thủ công (không có ở Giai đoạn 1); kiểm thiết bị thật ([S7-05](S7-05-contract-device-test.md)); Lighthouse hiệu năng ([S7-03](S7-03-performance-test.md)).

## Chi tiết kỹ thuật

1. **Token** (`apps/web/src/styles/tokens.css`), Tailwind đọc qua `theme.extend.colors` = `rgb(var(--x) / <alpha-value>)` hoặc `var(--x)`:

```css
:root { color-scheme: light dark;
  --bg:#FDF7F9; --surface:#FFFFFF; --surface-2:#F7EEF2; --text:#1C1B1A; --text-muted:#5F5D58;
  --border:#8A877F; --divider:#F1DCE5; --primary:#C2185B; --on-primary:#FFFFFF;
  --primary-soft:#FCE4EE; --primary-soft-fg:#9D174D; --focus:#2563EB;
  --status-danger-fg:#B42318; --status-danger-bg:#FEE4E2; --status-warning-fg:#93370D; --status-warning-bg:#FEF0C7;
  --status-success-fg:#067647; --status-success-bg:#DCFAE6; --status-neutral-fg:#475467; --status-neutral-bg:#F2F4F7; }
@media (prefers-color-scheme: dark) { :root {
  --bg:#121212; --surface:#1C1C1E; --surface-2:#2A2A2D; --text:#F2F2F0; --text-muted:#A8A6A0;
  --border:#6F6D68; --divider:#2F2F32; --primary:#F5A3C7; --on-primary:#4A0D2B;
  --primary-soft:#3A1A28; --primary-soft-fg:#F5A3C7; --focus:#60A5FA;
  --status-danger-fg:#FDA29B; --status-danger-bg:#55160C; --status-warning-fg:#FEC84B; --status-warning-bg:#4E1D09;
  --status-success-fg:#75E0A7; --status-success-bg:#053321; --status-neutral-fg:#D0D5DD; --status-neutral-bg:#344054; } }
```

2. `index.html`: `<html lang="vi">`, `<meta name="color-scheme" content="light dark">`, 2 thẻ `<meta name="theme-color">` có `media` cho sáng (`#FDF7F9`) và tối (`#121212`). Nền `--bg` đặt trong CSS inline nhỏ để không nháy trắng trước khi tải CSS.
3. Cấm mã màu cứng trong component: ESLint `no-restricted-syntax` / stylelint chặn `#hex` và class Tailwind màu mặc định (`bg-white`, `text-gray-*`) ngoài `tokens.css`.
4. **uPlot:** `useThemeColors()` đọc `getComputedStyle(document.documentElement)` và nghe `matchMedia('(prefers-color-scheme: dark)').addEventListener('change')` → dựng lại series (đường số đo `--primary`, đường mục tiêu nét đứt `--text-muted`, lưới `--divider`, nhãn trục `--text-muted`).
5. **Biểu đồ có văn bản thay thế (CMP-22):** `<figure aria-labelledby>` + `<figcaption>` "Cân nặng của Mochi, 8 số đo từ 12/03/2026 đến 14/11/2026, gần nhất 9,3 kg"; canvas `aria-hidden="true"`; `<table class="sr-only">` caption "Bảng số đo cân nặng", cột "Ngày" (`dd/MM/yyyy`) và "Cân nặng (kg)" (`9,3`), thêm dòng "Mục tiêu" khi có.
6. **Trạng thái không chỉ bằng màu (NFR-USA-003):** `StatusChip` luôn có icon + chữ (bảng §3.2.4); `ReminderBanner` có icon `alert-circle`/`clock` + câu đầy đủ; checklist đã xong có dấu tick + gạch ngang; lỗi trường có icon + chữ; offline có icon `wifi-off`; badge chuông có `aria-label` số. Mục điều hướng đang chọn có chữ đậm + nền viên thuốc, không chỉ đổi màu.
7. **Focus:** `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }` cho mọi phần tử tương tác; không dùng `outline: none` nếu không thay thế. Dialog bẫy focus và trả focus (CMP-12).
8. **Bàn phím:** skip link "Bỏ qua tới nội dung chính" là phần tử focus đầu tiên, trỏ `<main id="main">`; thứ tự Tab theo thứ tự đọc; PetSwitcher, AccountMenu, listbox múi giờ dùng phím mũi tên; ChecklistItem bật/tắt bằng Space.
9. **ARIA:** mọi `IconButton` có `aria-label` (Chuông "Thông báo, 2 chưa xem", "+" "Thêm nhanh", ☰ "Menu tài khoản", ✕ "Đóng nhắc nhở"); icon trang trí `aria-hidden`; landmark `header`, `nav aria-label="Điều hướng chính"`, `main`; `aria-current="page"`; `aria-busy` trên vùng skeleton.
10. **Vùng chạm (NFR-USA-001):** tối thiểu 44 × 44 px; nút `sm` 36 px chỉ dùng ở ≥ 1280 px với con trỏ chuột (`@media (pointer: fine)`).
11. **Chuyển động:** `@media (prefers-reduced-motion: reduce)` đặt mọi `transition`/`animation` = 0 ms.
12. **Cỡ chữ:** đơn vị `rem`; zoom 200% không cuộn ngang ở 360–1366 px.

## Giao diện

**SCR-06 · Dashboard · Dark mode (8:241)** là chuẩn đối chiếu: nền `#121212`, card `#1C1C1E`, banner quá hạn nền `--status-danger-bg` `#55160C` viền trái `--status-danger-fg`, nút "Đã thực hiện" viền `--primary` `#F5A3C7`, liên kết "Xem tất cả", "+ Thêm việc", "2/4 xong" màu `#F5A3C7`, checkbox đã tick nền `#F5A3C7` dấu `#4A0D2B`, chip "Quá hạn 2 ngày" nền `--status-danger-bg` chữ `--status-danger-fg`, mục "Tổng quan" đang chọn nền `#3A1A28`.

Các màn còn lại không có frame tối riêng: áp token theo bảng UI/UX Blueprint §3.2.4, không thêm màu mới. Ảnh thú cưng và ảnh khám giữ nguyên; avatar chữ cái đầu dùng `--primary-soft` / `--primary-soft-fg`. Scrim dialog `rgb(0 0 0 / .4)` ở sáng, `.6` ở tối.

## Tiêu chí chấp nhận

- [ ] **Given** hệ điều hành đặt chế độ tối, **When** mở Dashboard, **Then** giao diện khớp Figma 8:241, không có khối nền trắng hay chữ đen nào sót; đổi chế độ khi đang mở thì app đổi ngay, kể cả biểu đồ.
- [ ] Không nháy nền trắng khi tải trang ở chế độ tối.
- [ ] Chữ thường đạt ≥ 4,5:1, chữ lớn và thành phần UI ≥ 3:1 ở cả 2 theme (số đã tính ở §3.2.4).
- [ ] Mọi trạng thái mốc, nhắc, checklist, lỗi, offline đều có icon hoặc chữ ngoài màu.
- [ ] Biểu đồ cân nặng có `figcaption` và bảng `sr-only` đọc được bằng VoiceOver/NVDA.
- [ ] Đi hết luồng G-3 (tạo mốc → thấy nhắc → đánh dấu đã thực hiện) chỉ bằng bàn phím; focus luôn nhìn thấy.
- [ ] Mọi phần tử tương tác trên phone ≥ 44 × 44 px; mọi nút chỉ icon có `aria-label`.
- [ ] axe-core: 0 lỗi mức serious/critical trên SCR-01→SCR-18 ở cả 2 theme.

## Kiểm thử

- **Playwright + `@axe-core/playwright`:** lặp danh sách route (SCR-01→18, kèm dialog chính: thêm cân nặng, tạo mốc, đánh dấu đã thực hiện, đổi email, xóa tài khoản) × `colorScheme: 'light' | 'dark'` × viewport 390 × 844 và 1024 × 768. Chạy trong job E2E của CI.
- **Kiểm vùng chạm tự động:** script duyệt `button, a, [role=checkbox], [role=menuitem], input` ở 390 × 844, báo lỗi nếu `boundingBox` < 44 × 44.
- **Screenshot so sánh:** Dashboard tối 390 × 844 với dữ liệu seed giống Figma; duyệt thủ công so với 8:241.
- **Thủ công:** VoiceOver (iOS Safari) đọc biểu đồ và banner; NVDA + Chrome đi luồng G-3; zoom 200%; bật Reduce Motion.
- **Unit:** `useThemeColors` trả màu đúng sau khi giả lập `matchMedia` đổi.

## Ghi chú

- Màu chủ đạo hồng không bao giờ dùng để báo trạng thái (UXD-001): đỏ "Quá hạn" chỉ chênh 1,1:1 với hồng đậm, nên icon + chữ là bắt buộc.
- Lỗi axe mức moderate/minor ghi vào danh sách và sửa nếu còn thời gian; không chặn merge.
