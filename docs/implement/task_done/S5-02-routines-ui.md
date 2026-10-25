# S5-02 · Giao diện SCR-16 và sheet — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S5-02](../tasks/S5-02-routines-ui.md) |
| Trạng thái | Xong, E2E giao diện Pass ở phone 390 px và tablet 834 px |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **`ui/ChecklistItem.tsx` (CMP-19):** cả dòng là `role="checkbox"` + `aria-checked`, cao ≥ 56 px, Space/Enter bật tắt, nhãn đọc "{giờ} {tên}". Xong: ô tick đặc màu primary, tên gạch ngang. Có dòng phụ `meta` cho Dashboard "Tất cả". Lỗi thì rung 300 ms (`@keyframes ph-shake` trong `tokens.css`, tự tắt khi giảm chuyển động).
- **`features/routines/queries.ts`:**
  - `routinesQuery` (`['routines', petId]`), `sortRoutines` (chưa xong trước, rồi theo giờ).
  - `applyToggle`: hàm thuần, dùng cho cả cache SCR-16 lẫn phần `routines` của mọi cache `['dashboard', …]`.
  - `useToggleRoutine(id, petId?)`: lạc quan, lỗi thì khôi phục snapshot, `scope: routine-{id}` để các lần chạm gửi tuần tự. Mọi mutation invalidate `['routines', petId]` và `['dashboard']`.
  - `useCreateRoutine` (Idempotency-Key), `useUpdateRoutine`, `useDeleteRoutine`.
- **`RoutineChecklist`:**
  - Giữ dòng ở chỗ cũ 300 ms rồi mới sắp lại.
  - Lỗi → toast "Không lưu được" + "Thử lại" (gửi lại đúng `done`); `404` → "Việc này không còn tồn tại".
  - Dùng lại được cho Dashboard (`petId` bỏ trống, `metaOf` cho dòng tên thú cưng).
- **`RoutineFormDialog`:**
  - Thêm (11:1615) / Sửa (23:3144): "Tên việc *" `maxLength=100`, "Giờ *" `type=time step=60`.
  - Sửa chỉ gửi trường đã đổi; "Lưu thay đổi" disabled khi không đổi gì.
  - `409 ROUTINE_LIMIT_REACHED` → lỗi chung trong sheet + refetch; `422` → lỗi dưới trường.
  - "Xóa việc" mở `DeleteRoutineDialog` (ConfirmDialog, focus mặc định "Hủy").
- **`RoutinesScreen` + route `/pets/$petId/routines`:**
  - Card "HÔM NAY · dd/MM" + "x/y xong"; card "DANH SÁCH VIỆC" + "n/20", chip giờ, menu "⋮" Sửa/Xóa, "+ Thêm việc".
  - Đủ 20 việc → nút disabled + "Đã đạt tối đa 20 việc".
  - Empty state, skeleton 2 card × 4 dòng, ≥ 768 px chia 2 cột.
  - `?add=1` mở thẳng sheet Thêm việc.
- **Hồ sơ thú cưng:** ô "Việc hằng ngày" bỏ nhãn "Sắp có", trỏ tới SCR-16.
- **i18n:** nhóm `routines` trong `vi.ts` và `en.ts`.
- **Test:**
  - Unit `routines.test.ts`: sắp xếp, `applyToggle`.
  - E2E `e2e/ui/routines.ui.spec.ts` (phone + tablet): `?add=1` → tạo 2 việc → tick → reload vẫn xong → sửa giờ → qua 00:00 giờ tài khoản thì chưa xong → xóa có xác nhận.
- **Bundle:** JS ban đầu 132,3 KB gzip.

## Tiêu chí chấp nhận

**Đã kiểm (E2E):** tạo việc hiện ngay đúng giờ; tick đổi ngay và lưu được; sửa tên/giờ cập nhật ngay; xóa qua ConfirmDialog; sheet mở từ `?add=1`; tablet 2 cột chạy được.

**Chưa kiểm** (cần bấm thử hoặc test component):
- Rollback khi lỗi mạng/timeout và nút "Thử lại".
- Chạm 3 lần nhanh gửi tuần tự.
- Trạng thái đủ 20 việc trên giao diện.
- So khớp chi tiết với frame Figma.
- Không cuộn ngang ở 360–1440 px.

## Khác với file task

- **Không có test component Vitest + Testing Library + MSW:** repo chưa cài Testing Library/MSW. Thay bằng unit test hàm thuần và E2E thật.
- **Không chạy axe-core** (giống S4-06).
- **Vị trí file:** gộp hook vào `queries.ts` và component vào `features/routines/*.tsx` (không tách `components/`, `hooks/`), theo cách các feature khác đang làm.
- **Menu "⋮"** chép từ `WeightHistoryList`. Chưa tách thành component chung vì mới có 2 chỗ dùng.
