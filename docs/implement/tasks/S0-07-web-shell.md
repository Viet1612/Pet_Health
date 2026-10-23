# S0-07 · Khung web: Vite, React 19, Tailwind token Figma, Router, Query, layout và component lõi

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S0 · T1–2 |
| Story | — (nền cho mọi story có giao diện) |
| Yêu cầu | UXD-001→UXD-009, FR-GEN-008, FR-GEN-009, FR-GEN-011, FR-GEN-012, NFR-USA-001, NFR-USA-002, NFR-PRT-002, NFR-PERF-003, AD-004, SAD §2.1.1, §2.1.2 |
| Phụ thuộc | [S0-01](S0-01-monorepo.md) |
| Ước lượng | 2 |
| Màn hình Figma | Trang *Foundations* và *Components* (CMP-01→26); AppShell theo SCR-06 · Dashboard (node 8:3); ErrorState theo Không tìm thấy 404 (node 23:2916) |

## Mục tiêu
`apps/web` chạy được với token màu, kiểu chữ, khoảng cách từ Figma; router lazy, Query luôn lấy dữ liệu mới; `AuthLayout` và `AppShell` (TopBar, BottomNav/SideRail) đúng 3 breakpoint; bộ component lõi dùng lại cho mọi màn hình từ S1.

## Phạm vi
**Trong phạm vi:**
- Vite + React 19 + TypeScript, Tailwind với token UI Blueprint §3.2.2–3.2.5, font hệ thống, `lucide-react`.
- TanStack Router (file-based, `autoCodeSplitting`) + TanStack Query; route giữ chỗ cho 4 mục điều hướng; 404.
- Component: Button (CMP-01), IconButton (CMP-02), TopBar (CMP-03, khung), BellButton (CMP-07, chỉ hiển thị), BottomNav/SideRail (CMP-08), Card/Panel (CMP-09), Toast + ToastRegion (CMP-10), Skeleton (CMP-11), ResponsiveDialog (CMP-12), ErrorState (CMP-24), EmptyState (CMP-25).
- `i18n/vi.ts`, tiêu đề trang, focus `h1` khi đổi route, dev proxy.

**Ngoài phạm vi:**
- Gọi API, CSRF, timeout → [S0-08](S0-08-api-client.md). Route guard và màn hình SCR-01→05 → S1-07.
- PetSwitcher (CMP-04) → S2-04; số trên chuông → S4-05; ReminderBanner → S5-04; SystemBanner offline, hết phiên → S6-03.
- Rà soát dark mode và trợ năng đầy đủ → S6-04 (S0 đã khai báo token tối).

## Chi tiết kỹ thuật
1. **Cấu trúc** (UI Blueprint §3.1.1): `apps/web/src/{app/,app/shell/,routes/,features/,ui/,api/,lib/,i18n/vi.ts}`. `index.html`: `<html lang="vi">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
2. **Vite** (`vite.config.ts`): `@vitejs/plugin-react`, `@tanstack/router-plugin/vite` với `autoCodeSplitting: true`, `@tailwindcss/vite`. Dev proxy `/api` và `/media` → `process.env.DEV_API_TARGET` (mặc định `http://localhost:3000`) để trình duyệt thấy cùng origin như production. Build ra `dist/`, asset có hash trong `dist/assets/`.
3. **Token** (`src/ui/tokens.css`, Tailwind `@theme`), giá trị từ UI Blueprint §3.2.4 (trùng Figma *Foundations*):
   | Token | Sáng | Tối |
   |---|---|---|
   | `--bg` | `#FDF7F9` | `#121212` |
   | `--surface` / `--surface-2` | `#FFFFFF` / `#F7EEF2` | `#1C1C1E` / `#2A2A2D` |
   | `--text` / `--text-muted` | `#1C1B1A` / `#5F5D58` | `#F2F2F0` / `#A8A6A0` |
   | `--border` / `--divider` | `#8A877F` / `#F1DCE5` | `#6F6D68` / `#2F2F32` |
   | `--primary` / `--on-primary` | `#C2185B` / `#FFFFFF` | `#F5A3C7` / `#4A0D2B` |
   | `--primary-soft` / `--primary-soft-fg` | `#FCE4EE` / `#9D174D` | `#3A1A28` / `#F5A3C7` |
   | `--focus` | `#2563EB` | `#60A5FA` |
   | `--status-{danger,warning,success,neutral}-{fg,bg}` | theo §3.2.4 | theo §3.2.4 |
   Tối áp dụng qua `@media (prefers-color-scheme: dark)`. Khoảng cách gốc 4 px (`space-1`…`space-12`), bo góc `sm 6 / md 8 / lg 12 / xl 16 / full`, chữ `text-display 28/36 700`, `text-h1 24/32 700`, `text-h2 20/28 600`, `text-body 16/24`, `text-small 14/20`, `text-caption 12/16 600`, `motion-fast 120ms`, `motion-base 200ms`, `shadow-card`, `shadow-overlay`, scrim `rgb(0 0 0 / .4)`. Font: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. `prefers-reduced-motion: reduce` → mọi chuyển động 0 ms. Không dùng giá trị màu/khoảng cách tùy ý ngoài token (class `[...]`).
4. **Query** (`app/query-client.ts`, SAD §2.1.2): `staleTime: 0`, `refetchOnMount: 'always'`, `refetchOnWindowFocus: true`, `gcTime: 5 * 60_000`, không retry lỗi 4xx, retry tối đa 1 lần lỗi mạng/5xx khi đọc, mutation không retry. Loader route dùng `queryClient.fetchQuery` (không `ensureQueryData`) để luôn lấy dữ liệu mới (FR-GEN-008).
5. **Router** (`src/routes/`): `__root.tsx` (ErrorBoundary + `notFoundComponent` = ErrorState 404), layout `_auth` (AuthLayout) và `_app` (AppShell). Route giữ chỗ: `/` (Tổng quan), `/pets` (Thú cưng); mục Sức khỏe và Lịch trỏ tới route của thú cưng đang chọn (`/pets/:petId/health/weight`, `/pets/:petId/milestones`), khi chưa có thú cưng thì về `/pets`. Mỗi route khai báo tiêu đề; khi đổi route đặt `document.title = "<Tên màn hình> · Pet Health"` và chuyển focus tới `h1`.
6. **AppShell** (UI Blueprint §3.1.4, UXD-004):
   | | Phone < 768 px | Tablet 768–1279 px | Desktop ≥ 1280 px |
   |---|---|---|---|
   | TopBar 56 px | khe PetSwitcher · Chuông · "+" · Menu (☰) | tiêu đề màn hình · khe PetSwitcher · Chuông · "+ Thêm" | như tablet |
   | Điều hướng | BottomNav 64 px + `env(safe-area-inset-bottom)` | SideRail trái 88 px, icon + nhãn nhỏ, ⚙ "Cài đặt" ở đáy | như tablet |
   | Nội dung | 1 cột, lề 16 px | lề 24 px | tối đa 1280 px, căn giữa |
   4 mục: Tổng quan (`home`), Sức khỏe (`heart`), Lịch (`calendar`), Thú cưng (`paw-print`). Mục đang chọn: nền viên thuốc `--primary-soft`, icon và chữ `--primary-soft-fg`, chữ đậm, `aria-current="page"`. `<nav aria-label="Điều hướng chính">`, TopBar là `<header>`.
7. **ResponsiveDialog** (CMP-12, UXD-006): dựng trên `<dialog>` + `showModal()`. Phone: bottom sheet, góc trên `radius-xl`, cao theo nội dung tối đa `90vh`, kéo xuống để đóng; ≥ 768 px: modal 480 px giữa màn hình trên scrim. `aria-modal`, bẫy focus, Esc đóng, trả focus về nút mở. Hook `useDialogParam(name)` đồng bộ với query `?dialog=<name>` để nút Back đóng dialog.
8. **Toast** (CMP-10, UXD-007): `ToastRegion` `aria-live="polite"` (lỗi dùng `assertive`). Phone: đáy màn hình, nằm trên BottomNav; ≥ 768 px: góc dưới phải. Biến thể: success (tự ẩn 3 s, FR-GEN-009), error (nút "Thử lại", không tự ẩn), undo (nút "Hoàn tác" + thanh đếm 10 s). Không tự ẩn khi toast đang có focus.
9. **ErrorState** (CMP-24), **EmptyState** (CMP-25), **Skeleton** (CMP-11: text, card, list item, chart; kích thước cố định; vùng cha `aria-busy="true"`), **Button** (primary, secondary, ghost, danger; cao 44 px; loading giữ bề rộng), **IconButton** (44 × 44, `aria-label` bắt buộc qua kiểu TypeScript).

## Giao diện
- **Chuỗi tiếng Việt** (đặt trong `i18n/vi.ts`, khớp Figma *Components*):
  - ErrorState 5xx: tiêu đề "Có lỗi xảy ra"; mô tả "Vui lòng thử lại sau. Nếu vẫn lỗi, gửi mã bên dưới cho người hỗ trợ."; "Mã: 7KQ2M9XD" + nút "Sao chép"; nút "Thử lại".
  - ErrorState 404: "Không tìm thấy"; "Trang hoặc dữ liệu không tồn tại, hoặc không thuộc tài khoản của bạn."; nút "Về Tổng quan".
  - Toast: "Đã lưu"; "Không lưu được. Kiểm tra kết nối rồi thử lại." + "Thử lại"; "Đã đánh dấu thực hiện" + "Hoàn tác".
  - EmptyState mẫu trên `/`: "Thêm thú cưng đầu tiên để bắt đầu" / "Ghi cân nặng, sổ y tế và lịch tiêm cho từng bé." / "+ Thêm thú cưng".
  - Nhãn điều hướng: "Tổng quan", "Sức khỏe", "Lịch", "Thú cưng", "Cài đặt".
- **Trạng thái màn hình** (ST-02): Loading = skeleton đúng hình khối, không spinner toàn trang; Empty = EmptyState; Error = ErrorState trong vùng nội dung, AppShell vẫn dùng được; NotFound = ErrorState 404.
- Mã `ref` chọn và sao chép được (QS-08); ErrorState có `h1`.

## Tiêu chí chấp nhận
- [ ] `pnpm --filter @ph/web dev` mở được `/`; `pnpm --filter @ph/web build` tạo `dist/` có chunk riêng cho từng route.
- [ ] Ở 360 px và 390 px có BottomNav 4 mục; ở 834, 1112, 1366 px có SideRail 88 px với ⚙ ở đáy, không có BottomNav.
- [ ] Không có thanh cuộn ngang ở 360, 834, 1112, 1366 px, cả hướng đứng và ngang (NFR-PRT-002).
- [ ] Mọi phần tử tương tác ≥ 44 × 44 px (NFR-USA-001).
- [ ] Màu nền trang `#FDF7F9`, nút chính `#C2185B`; ở chế độ tối nút chính `#F5A3C7`.
- [ ] ResponsiveDialog: sheet đáy ở < 768 px, modal 480 px ở ≥ 768 px; Esc đóng; focus không thoát khỏi dialog; đóng xong focus về nút mở; nút Back của trình duyệt đóng dialog.
- [ ] Toast success tự ẩn sau 3 s; toast nằm trên BottomNav (phone) và góc dưới phải (≥ 768 px).
- [ ] URL không tồn tại hiện ErrorState 404 đúng chuỗi trên; nút "Về Tổng quan" về `/`.
- [ ] Đổi route cập nhật `document.title` dạng "Tổng quan · Pet Health" và focus vào `h1`.
- [ ] JS ban đầu của shell + `/` < 180 KB gzip (ngân sách UI Blueprint §3.8; giới hạn cứng 250 KB ở [S0-09](S0-09-ci-pipeline.md)).

## Kiểm thử
- **Unit (Vitest + Testing Library, jsdom)**: ResponsiveDialog (Esc, bẫy focus, trả focus, `?dialog=`); Toast (3 s với fake timers, không ẩn khi focus, `aria-live`); BottomNav `aria-current`; ErrorState nút "Sao chép" gọi `navigator.clipboard.writeText('7KQ2M9XD')`; IconButton thiếu `aria-label` là lỗi typecheck.
- **E2E smoke (Playwright, chạy local)** ở 4 viewport 360, 834, 1112, 1366: không cuộn ngang (`scrollWidth ≤ innerWidth`), đúng loại điều hướng, kích thước vùng chạm, `axe-core` không có vi phạm mức serious/critical trên `/` và trang 404.

## Ghi chú
- Không thêm thư viện UI kit; dialog, toast, combobox tự viết trong `ui/` (UI Blueprint §3.3). `ui/` không import `api/` hay `features/`.
- Màu đỏ "Quá hạn" gần tông hồng đậm (UXD-001): màu chủ đạo không bao giờ dùng để báo trạng thái.
