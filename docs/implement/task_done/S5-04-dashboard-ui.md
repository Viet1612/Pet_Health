# S5-04 · Giao diện SCR-06: banner, panel, lọc, skeleton, empty state, nút "+" — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S5-04](../tasks/S5-04-dashboard-ui.md) |
| Trạng thái | Xong, E2E giao diện Pass ở phone và tablet; chưa đo Lighthouse |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **Route `/` = Dashboard** (`features/dashboard`). Toàn bộ dữ liệu từ 1 request `GET /dashboard?pet=…` (`dashboardQuery`, key `['dashboard', filter]`, `staleTime` 5 s, refetch khi quay lại tab). Đăng nhập xong về `/` (đã có từ S1-07 qua `safeNext`).
- **Bộ lọc** (`lib/dashboard-filter.ts`):
  - Lưu `localStorage['ph.dashboardFilter']`; mặc định `ph.selectedPetId`, không có thì `'all'`; bọc try/catch, có bản sao trong bộ nhớ.
  - PetSwitcher ở `/` có thêm "Tất cả" (khi ≥ 2 thú cưng). Chọn một thú cưng ghi cả `selectedPetId` lẫn bộ lọc.
  - `404` (thú cưng đã bị xóa) → về "Tất cả".
- **ReminderBanner (CMP-06):**
  - Nội dung: Quá hạn "{loại} của {tên} đã quá hạn N ngày (dd/MM)"; D1/D7 "{loại} (ghi chú) của {tên} — {nhãn}, dd/MM/yyyy"; "+N nhắc khác".
  - Đỏ cho quá hạn, cam cho D1/D7, luôn có icon + chữ; `role="region"` + `aria-label="Nhắc nhở"`.
  - "Đã thực hiện" tải chi tiết mốc rồi mở dialog FLW-04 (S4-04). "Xem" → SCR-17.
  - "✕" ẩn ngay → `POST /notifications/read { ids, reason: BANNER }` → invalidate; lỗi thì hiện lại + toast "Thử lại".
- **VerifyEmailBanner (CMP-05):** `role="status"`, nằm dưới banner nhắc. "Gửi lại" → toast 202 / 429.
- **Panel** (`panels.tsx`, mỗi panel `<section aria-labelledby>`):
  - **Việc hôm nay:** dùng lại `RoutineChecklist` (tick lạc quan của S5-02). "Tất cả" có tên thú cưng dưới mỗi dòng. "+ Thêm việc", "Quản lý việc →".
  - **Mốc sắp tới:** tối đa 5, `StatusChip`, nút ✓ mở FLW-04, "Xem tất cả" → SCR-14, empty state + "+ Tạo mốc y tế". `StatusChip`/`statusChip` nhận kiểu `ChipInput` gọn hơn để dùng được với dữ liệu Dashboard.
  - **Cân nặng:** số mới nhất, chênh lệch, mục tiêu; `WeightChart` thêm chế độ `compact` (cao 120 px, uPlot vẫn lazy); "+ Cân nặng".
- **Bố cục:**
  - Phone 1 cột: banner → Việc → Mốc → Cân nặng.
  - ≥ 768 px dùng `grid-template-areas`: banner trải 2 cột; trái 60% Cân nặng rồi Mốc, phải 40% Việc hôm nay. Không có banner thì không chừa chỗ.
- **Skeleton:** kích thước cố định, cùng lưới, `aria-busy`. Lỗi → `ErrorState` + "Thử lại".
- **Tài khoản mới:** banner xác minh, EmptyState "Thêm thú cưng đầu tiên…", card "3 bước để được nhắc lịch". Ẩn nút "+".
- **QuickAdd (UXD-004):**
  - 4 mục: Cân nặng (sheet FLW-02), Lần khám (sang form SCR-13), Mốc y tế (dialog tạo mốc), Việc hằng ngày (`RoutineFormDialog`).
  - Ở `/` khi lọc "Tất cả" và ≥ 2 thú cưng → `PetPickDialog` hỏi chọn thú cưng trước.
- **i18n:** nhóm `dashboard`, thêm `quickAdd.visit/milestone/routine` (vi + en).
- **E2E** `e2e/ui/dashboard.ui.spec.ts` (phone + tablet):
  - Đăng nhập → `/`; "Tất cả": banner đỏ "Tẩy giun của Bơ đã quá hạn 4 ngày (10/11)" + "+1 nhắc khác", không cuộn ngang.
  - Lọc Mochi → banner D1 của Mochi; "✕" → reload không còn banner, tải trang chỉ 1 request `GET /dashboard`, SCR-17 vẫn còn 2 mục.
  - Tài khoản mới: empty state, 3 bước, không có "+", banner xác minh.
- **Bundle:** JS ban đầu 132,5 KB gzip (mục tiêu ≤ 180 KB).

## Tiêu chí chấp nhận

**Đã kiểm (E2E):** Dashboard là màn đầu sau đăng nhập; banner đúng mức/màu/chữ và "+N"; "✕" đánh dấu đã xem nhưng Thông báo còn nguyên; lọc "Tất cả" ↔ từng thú cưng chỉ tính dữ liệu trong phạm vi; empty state; 1 request khi tải; không cuộn ngang ở 390 và 834 px.

**Chưa kiểm** (cần bấm thử):
- "Đã thực hiện" từ banner và nút ✓ ở panel mốc.
- Nút "+" đủ 4 mục và bước chọn thú cưng.
- Panel cân nặng có biểu đồ.
- Viewport 360 và 1440.
- So khớp Figma.

## Khác với file task

- **Route `/` không có loader:** `useQuery` trong màn hình là nơi duy nhất gọi `GET /dashboard`, để đúng 1 request (loader + observer từng gây 2 request). Skeleton giữ chỗ trong lúc chờ.
- **Không có test component MSW, axe-core, Lighthouse CI** (chưa có staging, chưa cài MSW/Testing Library). Bundle kiểm bằng size-limit.
- **Vị trí file:** `features/dashboard/{DashboardScreen,ReminderBanner,VerifyEmailBanner,panels,queries}.ts(x)`. QuickAdd giữ ở `app/shell/QuickAdd.tsx` (đã có từ S3-02).
- **Mục "Tất cả" chỉ hiện khi có ≥ 2 thú cưng** (1 thú cưng thì "Tất cả" trùng với chính nó).
