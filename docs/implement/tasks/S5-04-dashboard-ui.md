# S5-04 · Giao diện SCR-06: banner, panel, lọc, skeleton, empty state, nút "+"

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S5 · T11–12 |
| Story | US-051, US-060, US-061, US-062 (kèm US-047 panel mốc, phần banner của US-002) |
| Yêu cầu | FR-DSH-001→007, FR-NTF-009, FR-NTF-010, FR-RT-002, FR-RT-003, UXD-004, NFR-PERF-001, NFR-PERF-003 |
| Phụ thuộc | [S5-03](S5-03-dashboard-api.md) |
| Ước lượng | 2,5 ngày |
| Màn hình Figma | SCR-06 · Dashboard (8:3); SCR-06 · Dashboard trống (8:281); SCR-06 · Dashboard · lọc "Tất cả" (21:2207); skeleton (21:2473) |

## Mục tiêu

Dựng màn hình chính `/` sau đăng nhập: banner nhắc, banner xác minh email, 3 panel (Việc hôm nay, Mốc sắp tới, Cân nặng), bộ lọc thú cưng có "Tất cả", empty state người dùng mới, skeleton không xô lệch và menu "+" Thêm nhanh ở mọi breakpoint. Toàn bộ dữ liệu đến từ **1 request** `GET /dashboard`. Đạt LCP < 2,5 s trên staging.

## Phạm vi

**Trong phạm vi:** route `/` (SCR-06); `ReminderBanner` (CMP-06); `SystemBanner` biến thể verify-email (CMP-05); `DashboardRoutinesPanel`, `DashboardMilestonesPanel`, `DashboardWeightPanel`; mục "Tất cả" trong `PetSwitcher`; `QuickAddMenu` trên `TopBar`; điều hướng về `/` sau đăng nhập; Lighthouse trên staging.

**Ngoài phạm vi:** logic tick checklist ([S5-02](S5-02-routines-ui.md), dùng lại); dialog FLW-04 và toast hoàn tác ([S4-04](S4-04-milestones-ui.md)); sheet ghi cân nặng FLW-02 và `WeightChart` ([S3-02](S3-02-weights-ui.md)); form lần khám ([S3-05](S3-05-visits-ui.md)); trang SCR-17 và chuông ([S4-05](S4-05-notifications-ui.md)); banner mất mạng ([S6-03](S6-03-system-states.md)); dark mode ([S6-04](S6-04-dark-mode-a11y.md)); event `web_vitals` ([S6-05](S6-05-analytics.md)).

## Chi tiết kỹ thuật

**Vị trí code:** `apps/web/src/features/dashboard/` — `routes/DashboardPage.tsx` (nằm trong chunk ban đầu, không lazy), `components/{ReminderBanner,VerifyEmailBanner,RoutinesPanel,MilestonesPanel,WeightPanel,DashboardSkeleton,DashboardEmpty}.tsx`, `hooks/useDashboard.ts`; `QuickAddMenu` ở `apps/web/src/app-shell/`.

**Dữ liệu:**

1. Bộ lọc `filter` = `'all' | petId`, lưu `localStorage` `ph.dashboardFilter`; mặc định `ph.selectedPetId`, nếu không có thì `'all'`. Chọn một thú cưng cũng ghi `ph.selectedPetId` (FR-PET-007). Mọi truy cập `localStorage` bọc `try/catch`.
2. `useDashboard(filter)` = `useQuery({ queryKey: ['dashboard', filter], queryFn: GET /dashboard?pet=filter })`, `staleTime: 0`, `refetchOnWindowFocus: true` (FR-NTF-010). Route loader `ensureQueryData` để chờ dữ liệu mới (FR-GEN-008).
3. Phản hồi `404` (thú cưng đã bị xóa ở thiết bị khác) → đặt `filter = 'all'`, xóa key cũ, gọi lại.
4. Sau mutation mốc, cân nặng, việc, đóng banner: `invalidateQueries(['dashboard'])` và `['notifications','summary']` (chuông).
5. Không gọi thêm API nào khác trên đường render đầu tiên ngoài `GET /dashboard` (chuông của shell dùng `summary`, không nằm trên đường LCP).

**ReminderBanner** (hiển thị khi `notifications.banner != null`):

- Nội dung `top`: OVERDUE → "{loại} của {tên} đã quá hạn N ngày (dd/MM)"; D1/D7 → "{loại}{ (ghi chú)} của {tên} — {label}, dd/MM/yyyy". Loại: `VACCINE` "Tiêm vaccine", `FLEA` "Nhỏ gáy", `DEWORM` "Tẩy giun". Dòng phụ "+{moreCount} nhắc khác" khi `moreCount > 0`.
- Màu: `OVERDUE` danger (nền đỏ nhạt, viền trái đỏ, icon `alert-circle`); `D1`/`D7` warning (cam). Luôn có chữ, không chỉ dựa vào màu.
- "Đã thực hiện" → mở dialog FLW-04 của S4-04 với `top.milestoneId`; xong → invalidate, banner chuyển sang nhắc kế tiếp hoặc ẩn.
- "Xem" → điều hướng SCR-17.
- "✕" → optimistic ẩn banner (thu chiều cao 200 ms, bỏ khi reduced motion) → `POST /notifications/read { ids: banner.notificationIds, reason: "BANNER" }` theo contract S4-03 → lỗi thì hiện lại banner + toast "Không lưu được" + "Thử lại".

**VerifyEmailBanner:** khi `account.emailVerified === false`, nằm **dưới** ReminderBanner, không chặn chức năng. "Gửi lại" → `POST /auth/verify-email/resend` → `202` toast "Đã gửi lại email xác minh"; `429` toast "Bạn đã gửi lại quá nhiều lần, thử lại sau 1 giờ"; nút loading trong lúc gửi.

**Panel Việc hôm nay:** render `routines.items` bằng `ChecklistItem` + `useToggleRoutine` (S5-02). Tiêu đề "HÔM NAY" (lọc "Tất cả": "HÔM NAY · TẤT CẢ") + "x/y xong". Lọc "Tất cả" thì mỗi dòng có chip tên thú cưng. "+ Thêm việc" mở `RoutineFormDialog` cho thú cưng đang chọn (lọc "Tất cả" → hỏi chọn thú cưng trước); "Quản lý việc →" tới SCR-16. Trống: "Thêm việc như cho ăn, đi dạo để theo dõi mỗi ngày." + "+ Thêm việc".

**Panel Mốc sắp tới:** tối đa 5 `MilestoneItem` (CMP-20): icon loại, "{loại}{ · ghi chú}" (lọc "Tất cả": thêm " · {tên}"), "Hạn dd/MM/yyyy", `StatusChip` từ `displayStatus` + `daysUntilDue` ("Quá hạn N ngày" đỏ, "Còn N ngày"/"Ngày mai"/"Hôm nay" cam, "Còn N ngày (dd/MM)" neutral). Nút ✓ (`aria-label="Đánh dấu đã thực hiện: {loại} {ghi chú}"`) mở FLW-04; thành công → mục thu gọn 200 ms. "Xem tất cả" → SCR-14. Trống: "Không có lịch nào trong 30 ngày tới 🎉" + "+ Tạo mốc y tế".

**Panel Cân nặng:** "CÂN NẶNG" (lọc "Tất cả": kèm tên thú cưng của `weight.petId`), "Mục tiêu 9,0 kg" khi có `target`, "9,3 kg" + "+0,3 so với lần trước", `WeightChart` bản thu gọn 6 tháng (uPlot **tải lazy**, khung chiều cao cố định 120 px trước khi chart tải). "+ Cân nặng" mở sheet FLW-02. Trống: "Chưa có số đo nào. Cân bé và ghi lại để theo dõi xu hướng." + "+ Thêm cân nặng".

**QuickAddMenu (UXD-004):** nút "+" (`aria-label="Thêm nhanh"`) trên TopBar mọi màn hình, mọi breakpoint (tablet/desktop: "+ Thêm"). Menu 4 mục: "Cân nặng" (sheet FLW-02), "Lần khám" (form SCR-13), "Mốc y tế" (dialog tạo mốc S4-04), "Việc hằng ngày" (`RoutineFormDialog`). Áp cho thú cưng đang chọn; lọc "Tất cả" → bước chọn thú cưng trước. Ẩn khi chưa có thú cưng. Mọi thao tác tạo mới ≤ 2 chạm tới form.

**Sau đăng nhập (FR-DSH-001):** `POST /auth/login` thành công → `next` (nếu hợp lệ, cùng origin) hoặc `/` = Dashboard; kiểm lại route guard của [S1-07](S1-07-auth-ui.md).

**Skeleton và CLS:** `DashboardSkeleton` (CMP-11, frame 21:2473) có kích thước cố định: chỗ banner 96 px, panel Việc 4 dòng × 56 px, panel Mốc 3 dòng × 72 px, panel Cân nặng 200 px; cùng lưới với nội dung thật. Khi dữ liệu về, thay **toàn bộ** skeleton bằng nội dung trong một lần render (không render từng phần); không có nhắc thì không render chỗ banner. `aria-busy="true"` trên vùng nội dung khi đang tải. Lỗi tải → `ErrorState` (CMP-24) + "Thử lại".

## Giao diện

- **Phone < 768 px (8:3):** TopBar (PetSwitcher · chuông · "+" · menu) → ReminderBanner → VerifyEmailBanner → Việc hôm nay → Mốc sắp tới → Cân nặng; BottomNav 4 mục, "Tổng quan" đang chọn. 1 cột, lề 16 px.
- **Tablet 768–1279 px:** SideRail; banner trải 2 cột; dưới là 2 cột: trái 60% (Cân nặng, rồi Mốc sắp tới), phải 40% (Việc hôm nay).
- **Desktop ≥ 1280 px:** như tablet, nội dung tối đa 1280 px, căn giữa.
- **Lọc "Tất cả" (21:2207):** PetSwitcher hiện "Tất cả"; tiêu đề panel thêm "· TẤT CẢ"; mỗi việc/mốc có tên thú cưng; banner và panel chỉ tính dữ liệu trong phạm vi lọc.
- **Người dùng mới (8:281):** TopBar "Xin chào!" + chuông + menu (không có PetSwitcher, "+"); VerifyEmailBanner nếu chưa xác minh; EmptyState icon chân thú, "Thêm thú cưng đầu tiên để bắt đầu", phụ "Ghi cân nặng, sổ y tế và lịch tiêm cho từng bé.", nút "+ Thêm thú cưng" → SCR-09; card "3 BƯỚC ĐỂ ĐƯỢC NHẮC LỊCH": "1. Thêm hồ sơ thú cưng", "2. Tạo mốc vaccine, nhỏ gáy, tẩy giun", "3. Mở app mỗi ngày để xem nhắc và tick việc".
- **Trợ năng:** ReminderBanner `role="region"` + `aria-label="Nhắc nhở"`, ✕ `aria-label="Đóng nhắc nhở"`; VerifyEmailBanner `role="status"`; mỗi panel `<section aria-labelledby>`; chart có bảng `sr-only`. Không thanh cuộn ngang ở 360–1440 px.

## Tiêu chí chấp nhận

- [ ] US-060: **Given** tablet 10,5" ngang, **When** Dashboard tải xong, **Then** bố cục 2 cột, không cuộn ngang.
- [ ] US-060: **Given** phone 360–430 px, **When** tải xong, **Then** 1 cột theo thứ tự Việc hôm nay → Mốc sắp tới → Cân nặng.
- [ ] US-060: **Given** tài khoản chưa có thú cưng, **Then** hiện empty state "Thêm thú cưng đầu tiên" thay cho các panel.
- [ ] US-051: màn hình đầu tiên sau đăng nhập là Dashboard; checklist theo giờ, việc xong cuối và gạch ngang; tick hoạt động như SCR-16.
- [ ] US-061: bộ lọc có "Tất cả" và từng thú cưng; "Tất cả" gộp việc và mốc, mỗi dòng ghi tên thú cưng; banner và panel chỉ tính dữ liệu trong phạm vi lọc.
- [ ] US-062: **Given** ≥ 1 nhắc chưa xem, **Then** banner ở đầu nội dung (dưới thanh chọn thú cưng) hiện nhắc khẩn cấp nhất và "+N nhắc khác"; đỏ cho Quá hạn, cam cho D1/D7, luôn có chữ.
- [ ] US-062: "Xem" mở Thông báo; "✕" chuyển các nhắc trên banner sang đã xem, banner ẩn, chúng vẫn ở mục Thông báo; "Đã thực hiện" mở sheet FLW-04.
- [ ] US-062: **Given** không có nhắc chưa xem, **Then** không có banner và không để khoảng trống.
- [ ] US-047: panel mốc tối đa 5, quá hạn tô đỏ, đứng đầu, có nhãn chữ; ✓ đánh dấu tại chỗ; "Xem tất cả" mở SCR-14.
- [ ] US-002: tài khoản chưa xác minh thấy "Xác minh email để có thể lấy lại mật khẩu khi quên" + "Gửi lại" dưới banner nhắc; mọi chức năng vẫn dùng được.
- [ ] Nút "+" Thêm nhanh có ở phone, tablet, desktop với 4 mục; lọc "Tất cả" hỏi chọn thú cưng.
- [ ] Dashboard tải bằng đúng 1 request `GET /dashboard`; Lighthouse mobile trên staging: LCP < 2,5 s, CLS < 0,1; `size-limit` JS ban đầu ≤ 180 KB gzip (cứng 250 KB).

## Kiểm thử

- **Component (MSW):** banner OVERDUE/D1/D7 đúng màu và chữ; `moreCount` 0 → không có dòng phụ; `banner: null` → không có phần tử banner; ✕ lỗi 500 → banner hiện lại + toast; resend 202/429; `pets: []` → empty state, không có "+"; lọc "Tất cả" hiện chip tên; `weight.latest: null` → empty panel.
- **E2E (Playwright + `FakeClock`, viewport 360, 390, 1112 ngang, 1440):** đăng nhập → URL `/`; thứ tự panel trên phone (so `boundingBox().y`); 2 cột trên 1112; `document.scrollingElement.scrollWidth <= innerWidth` ở cả 4 viewport; tạo mốc quá hạn + mốc D1 → banner đỏ "+1 nhắc khác" → ✕ → reload không còn banner, SCR-17 vẫn có 2 mục; "Đã thực hiện" từ banner → toast hoàn tác; đổi lọc Mochi ↔ Bơ ↔ Tất cả; đếm request mạng khi tải `/` chỉ 1 lần `GET /api/v1/dashboard`.
- **Hiệu năng:** Lighthouse CI mobile (4G giả lập, cache trống) trên staging với tài khoản 3 thú cưng, 10 việc, 5 mốc, 20 số đo; ghi LCP, CLS, TBT vào PR.
- **a11y:** axe-core trên 3 trạng thái (đầy đủ, trống, đang tải) không có lỗi serious/critical.

## Ghi chú

- Blueprint §3.5.2 ghi "vùng banner không chiếm chỗ khi đang tải", SAD §2.1.1 ghi "skeleton chừa sẵn chỗ banner". Task theo SAD: skeleton có chỗ banner và được thay toàn bộ trong một lần render, nên không phát sinh layout shift.
- Frame 21:2207 hiển thị "+2 nhắc khác (Bơ, Mít)"; contract chỉ có `moreCount`, nên chỉ hiện "+N nhắc khác".
- `banner.notificationIds` và `reason: "BANNER"` phụ thuộc contract của S4-03 / S5-03 (xem Ghi chú S5-03).
