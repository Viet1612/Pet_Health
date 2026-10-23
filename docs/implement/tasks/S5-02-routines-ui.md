# S5-02 · Giao diện SCR-16 và sheet

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S5 · T11–12 |
| Story | US-050, US-052, US-045 |
| Yêu cầu | FR-RT-001→003, FR-RT-006, FR-RT-007, UXD-009 |
| Phụ thuộc | [S5-01](S5-01-routines-api.md) |
| Ước lượng | 1 ngày |
| Màn hình Figma | SCR-16 · Việc hằng ngày (11:1490); Thêm việc hằng ngày — sheet (11:1615); SCR-16 · Sửa việc — sheet (23:3144) |

## Mục tiêu

Dựng màn SCR-16 `/pets/:petId/routines` gồm checklist hôm nay và danh sách quản lý việc, sheet Thêm/Sửa việc, xác nhận xóa. Tách logic tick checklist (optimistic + rollback) thành hook và component dùng lại cho panel Việc hôm nay trên Dashboard ([S5-04](S5-04-dashboard-ui.md)).

## Phạm vi

**Trong phạm vi:** route SCR-16; `ChecklistItem` (CMP-19), `RoutineChecklist`, `RoutineFormDialog`; hook `useRoutines`, `useToggleRoutine`, `useCreateRoutine`, `useUpdateRoutine`, `useDeleteRoutine`; empty state; trạng thái đủ 20 việc; bố cục phone/tablet/desktop.

**Ngoài phạm vi:** panel Việc hôm nay và mục "Việc hằng ngày" trong menu "+" ([S5-04](S5-04-dashboard-ui.md)); banner mất mạng, lưu nháp khi hết phiên ([S6-03](S6-03-system-states.md)); dark mode ([S6-04](S6-04-dark-mode-a11y.md)).

## Chi tiết kỹ thuật

**Vị trí code:** `apps/web/src/features/routines/` — `routes/RoutinesPage.tsx` (route lazy), `components/{ChecklistItem,RoutineChecklist,RoutineList,RoutineFormDialog}.tsx`, `hooks/*.ts`. `ChecklistItem` đặt ở `apps/web/src/ui/` vì dùng chung.

**Query key:** `['routines', petId]` (dữ liệu `GET /pets/{petId}/routines`). Mọi mutation thành công → `invalidateQueries(['routines', petId])` và `invalidateQueries(['dashboard'])`.

**`useToggleRoutine` (FLW-05):**

1. `mutationFn: ({ id, done }) => PUT /routines/{id}/completion { done }`, timeout 10 s (wrapper [S0-08](S0-08-api-client.md)).
2. `scope: { id: 'routine-' + id }` để các lần chạm liên tiếp trên cùng một việc gửi tuần tự, lệnh cuối quyết định.
3. `onMutate`: `cancelQueries` trên các key chứa việc → lưu snapshot → đảo `done` trong mọi cache có việc đó (`['routines', petId]` và mọi `['dashboard', *]`), cập nhật `doneCount`. Đánh dấu dòng `pending` để giữ vị trí 300 ms rồi mới sắp lại.
4. `onError` (lỗi mạng, 5xx, timeout 10 s): khôi phục snapshot; dòng ở trạng thái lỗi (rung nhẹ 300 ms, bỏ qua khi `prefers-reduced-motion`); toast error "Không lưu được" + "Thử lại" (gọi lại mutation với cùng `{ id, done }`). `404` → toast "Việc này không còn tồn tại" và refetch.
5. `onSettled`: `invalidateQueries` các key trên.

Hook nhận `petId?`; Dashboard gọi không cần `petId` (chỉ sửa cache dashboard).

**Sắp xếp phía client** (chỉ để hiển thị sau optimistic update, khớp server): `done` tăng dần, rồi `timeOfDay` tăng dần. Bộ đếm "x/y xong" tính từ danh sách.

**`RoutineFormDialog`** (CMP-12, React Hook Form + schema sinh từ OpenAPI):

- Trường "Tên việc *": `<input maxLength=100>`, `trim`, 1–100 ký tự. Trường "Giờ *": `<input type="time" step="60">`, giá trị `HH:MM`.
- Tạo: `Idempotency-Key = crypto.randomUUID()` sinh khi mở sheet, "Thử lại" dùng lại key. `POST` → đóng sheet, toast success "Đã lưu".
- Sửa: điền sẵn giá trị; `PATCH` chỉ gửi trường đã đổi; không đổi gì thì nút "Lưu thay đổi" disabled.
- Nút submit chuyển loading + disabled khi đang gửi. `422` → lỗi hiện dưới trường; `409 ROUTINE_LIMIT_REACHED` → lỗi chung trong sheet "Đã đạt tối đa 20 việc" và refetch.
- Xóa: "Xóa việc" mở `ConfirmDialog` (CMP-13, nguy hiểm, focus mặc định vào "Hủy") → `DELETE` → đóng cả hai, toast "Đã xóa việc".

**Mở sheet Thêm việc từ ngoài:** route nhận search param `?add=1` để menu "+" của Dashboard mở thẳng sheet.

## Giao diện

**Phone (< 768 px), frame 11:1490:**

- TopBar: nút quay lại, tiêu đề "Việc hằng ngày · {tên}", nút "+" (`aria-label="Thêm việc"`).
- Card 1 "HÔM NAY · dd/MM" (ngày lấy từ `today` của API) + "x/y xong" màu primary. Mỗi dòng `ChecklistItem`: ô tick, giờ `HH:MM`, tên; chưa xong chữ đậm; xong ô tick đặc màu primary, tên gạch ngang màu phụ, nằm cuối.
- Card 2 "DANH SÁCH VIỆC" + "n/20". Mỗi dòng: chip giờ (nền `--primary-soft`), tên, nút "⋮" (`aria-label="Tùy chọn cho {tên}"`) mở menu "Sửa" / "Xóa". Cuối card: "+ Thêm việc".
- Đủ 20 việc: "+ Thêm việc" và nút "+" trên TopBar disabled, kèm dòng "Đã đạt tối đa 20 việc".
- Empty: EmptyState "Thêm việc như cho ăn, đi dạo để theo dõi mỗi ngày." + nút "+ Thêm việc"; ẩn card Hôm nay.
- Loading: Skeleton 2 card cố định chiều cao (4 dòng × 56 px).

**Sheet Thêm việc (11:1615):** tiêu đề "Thêm việc hằng ngày", phụ đề "{tên} · tối đa 20 việc", nút ✕ (`aria-label="Đóng"`); "Tên việc *" gợi ý "1–100 ký tự"; "Giờ *" gợi ý "Định dạng 24 giờ"; nút "Lưu" toàn chiều rộng.

**Sheet Sửa việc (23:3144):** tiêu đề "Sửa việc", phụ đề "Thay đổi áp dụng ngay cho checklist hôm nay"; cùng 2 trường; nút "Lưu thay đổi"; nút chữ đỏ "Xóa việc"; chú thích "Xóa việc: biến mất khỏi checklist từ bây giờ, lịch sử các ngày trước vẫn được giữ."

**ConfirmDialog xóa:** tiêu đề "Xóa việc "{tên}"?", nội dung "Việc sẽ biến mất khỏi checklist từ bây giờ. Lịch sử các ngày trước vẫn được giữ.", nút "Hủy" / "Xóa" (đỏ).

**Tablet/desktop (≥ 768 px):** 2 cột — trái checklist hôm nay, phải danh sách quản lý (UXD-009); sheet thành modal 480 px; desktop trong khung 1280 px. Không có thanh cuộn ngang ở 360–1440 px.

**Trợ năng:** `ChecklistItem` là `role="checkbox"` + `aria-checked`, vùng chạm toàn dòng ≥ 44 px, Space/Enter bật tắt; nhãn đọc "{giờ} {tên}".

## Tiêu chí chấp nhận

- [ ] US-050: tạo việc tên 1–100 ký tự, giờ HH:MM; lưu xong việc xuất hiện ngay trong checklist hôm nay theo đúng giờ.
- [ ] US-050: khi đủ 20 việc, nút thêm disabled kèm "Đã đạt tối đa 20 việc".
- [ ] US-052: **Given** "Cho ăn 07:00" chưa xong, **When** chạm vào dòng, **Then** dòng chuyển sang xong ngay (trước khi API trả về) và trạng thái được lưu.
- [ ] US-052: **Given** lưu thất bại, **Then** dòng quay về chưa xong kèm toast "Không lưu được" + "Thử lại".
- [ ] Chạm lại việc đã xong → bỏ đánh dấu; việc xong chuyển xuống cuối, gạch ngang; bộ đếm "x/y xong" đúng.
- [ ] US-045: sửa tên và giờ, checklist hôm nay cập nhật ngay; xóa phải qua ConfirmDialog, việc biến khỏi cả hai card.
- [ ] Sheet Thêm việc mở được từ `?add=1`.
- [ ] Giao diện khớp 3 frame Figma ở phone; tablet 2 cột; không cuộn ngang.

## Kiểm thử

- **Component (Vitest + Testing Library, MSW):**
  - Tick thành công: trạng thái đổi ngay, request `PUT {done:true}` gửi 1 lần.
  - Tick lỗi 500 và timeout 10 s (fake timers): rollback, toast có "Thử lại"; bấm "Thử lại" gửi lại đúng `done`.
  - Chạm 3 lần nhanh: request gửi tuần tự, trạng thái cuối = `done:true`.
  - Form: tên 0/100/101 ký tự, tên toàn khoảng trắng; giờ trống; `409` hiện lỗi chung; "Thử lại" sau timeout dùng cùng `Idempotency-Key`.
  - Đủ 20 việc → nút disabled; empty state khi 0 việc.
- **E2E (Playwright, viewport 390 và 1112):** tạo 2 việc → tick 1 → reload vẫn xong → sửa giờ → xóa có xác nhận. Với `FakeClock` qua 00:00 (múi giờ tài khoản) → reload thấy chưa xong.
- **a11y:** axe-core trên SCR-16 và 2 sheet không có lỗi serious/critical; điều khiển checklist bằng bàn phím.

## Ghi chú

- Lần chạm đầu không cần xác nhận; xóa luôn cần xác nhận (FR-RT-007).
- Giữ dòng ở vị trí cũ 300 ms trước khi chuyển xuống cuối để mắt kịp thấy (FLW-05).
