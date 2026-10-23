# S0-07 · Khung web — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S0-07](../tasks/S0-07-web-shell.md) |
| Trạng thái | Xong (code), chưa kiểm thử giao diện |
| Ngày hoàn thành | 2026-10-23 |
| Commit | xem [README](README.md) |

## Kết quả

- **`apps/web`:** chạy bằng Vite 8 + React 19 + TypeScript.
- **Tailwind 4 với token màu từ Figma Foundations** (UI Blueprint §3.2.4–3.2.5): sáng, tối theo `prefers-color-scheme`, giảm chuyển động. Font hệ thống, icon `lucide-react`.
- **Router và Query:**
  - TanStack Router dạng file-based, mỗi route một chunk.
  - TanStack Query luôn lấy dữ liệu mới: `staleTime: 0`, không retry lỗi 4xx.
- **Khung màn hình:**
  - `AppShell` gồm TopBar 56 px; BottomNav 4 mục ở < 768 px; SideRail 88 px có ⚙ Cài đặt ở đáy khi ≥ 768 px.
  - `AuthLayout` cho các màn hình tài khoản.
- **Component lõi trong `src/ui/`:** Button và `buttonClassName`, IconButton (bắt buộc `aria-label`), Card, Skeleton, EmptyState, ErrorState (404 / 5xx có mã `ref` và nút Sao chép), ResponsiveDialog (sheet đáy / modal 480 px) kèm `useDialogParam`, Toast (success 3 s, error có "Thử lại", undo 10 s).
- **Route giữ chỗ:** `/`, `/pets`, `/pets/$petId/health/weight`, `/pets/$petId/milestones`, `/settings`, `/login`; URL không tồn tại → ErrorState 404.
- **Đổi route:** đặt `document.title` = "<Màn hình> · Pet Health" và chuyển focus tới `h1`.
- **Dev proxy:** `/api` và `/media` → `DEV_API_TARGET`.

## Tiêu chí chấp nhận

Theo yêu cầu "cứ code đi", task này chỉ kiểm build, typecheck và lint. Các tiêu chí giao diện **chưa kiểm trên trình duyệt**:

| Tiêu chí | Kết quả |
|---|---|
| `dev` mở được `/`; `build` tạo `dist/` có chunk riêng từng route | Build: Đạt (chunk riêng cho `_app`, `_auth`, `login`, `pets`, `weight`, `milestones`, `settings`). `dev`: chưa mở thử |
| BottomNav ở 360/390 px; SideRail 88 px ở 834/1112/1366 px | Code xong (`md:` = 768 px), chưa kiểm |
| Không cuộn ngang ở các viewport | Chưa kiểm |
| Phần tử tương tác ≥ 44 × 44 px | Code xong (`min-h-11`, `size-11`), chưa kiểm |
| Nền `#FDF7F9`, nút chính `#C2185B`; tối `#F5A3C7` | Code xong |
| ResponsiveDialog: sheet/modal, Esc, bẫy focus, trả focus, nút Back đóng dialog | Code xong (`<dialog>` + `showModal()`, `useDialogParam`), chưa kiểm |
| Toast success tự ẩn 3 s; vị trí trên BottomNav / góc dưới phải | Code xong, chưa kiểm |
| URL không tồn tại → ErrorState 404; "Về Tổng quan" về `/` | Code xong, chưa kiểm |
| Đổi route cập nhật `document.title` và focus `h1` | Code xong, chưa kiểm |
| JS ban đầu < 180 KB gzip | Đạt: ~108 KB JS + 4,3 KB CSS |

Chưa viết unit test (Testing Library) và E2E smoke (Playwright, axe-core) như mục Kiểm thử của task.

## Tệp đã tạo

- `apps/web/index.html`, `vite.config.ts`, `src/main.tsx`, `src/routeTree.gen.ts` (sinh tự động)
- `src/ui/`: `tokens.css`, `cx.ts`, `Button.tsx`, `IconButton.tsx`, `Card.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `ResponsiveDialog.tsx`, `use-dialog-param.ts`, `toast.tsx`
- `src/app/`: `query-client.ts`, `route-meta.ts`, `shell/AppShell.tsx`, `shell/TopBar.tsx`, `shell/Navigation.tsx`
- `src/routes/`: `__root.tsx`, `_app.tsx`, `_auth.tsx`, `_auth/login.tsx`, `_app/index.tsx`, `_app/pets/index.tsx`, `_app/pets/$petId/health/weight.tsx`, `_app/pets/$petId/milestones.tsx`, `_app/settings.tsx`
- `src/i18n/vi.ts`, `src/lib/selected-pet.ts`
- Gốc: ESLint và Prettier bỏ qua `routeTree.gen.ts`

## Phiên bản

React 19.3.1, Vite 8.3.5, TanStack Router 1.170, TanStack Query 5.104, Tailwind 4.3.3, lucide-react 1.61.

## Khác với file task

- **Link trông như nút dùng `buttonClassName()`** thay vì bọc `<Button>` trong `<Link>`, để không lồng phần tử tương tác.
- **Có thêm `/login` giữ chỗ** để layout `_auth` có route con; màn hình thật làm ở S1-07.
- **Kéo xuống để đóng sheet** làm đơn giản: kéo quá 80 px thì đóng, không có hiệu ứng theo ngón tay.
- **Một số kích thước bố cục dùng giá trị tùy ý của Tailwind** (`md:w-[480px]`, `max-h-[90vh]`, `calc(64px+env(safe-area-inset-bottom))`); màu và khoảng cách vẫn theo token.
- Lúc cài, pnpm báo `@tanstack/router-plugin` có "agent skills awaiting approval"; chưa phê duyệt (không cần cho build).
