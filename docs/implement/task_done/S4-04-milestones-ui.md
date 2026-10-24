# S4-04 · Giao diện lịch mốc y tế — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S4-04](../tasks/S4-04-milestones-ui.md) |
| Trạng thái | Xong (code), chưa bấm thử trên trình duyệt |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **Route:**
  - `/pets/$petId/milestones`: SCR-14 (thay trang giữ chỗ). Tab lưu ở `?tab=`. ≥ 768 px: danh sách + khung "Chọn một mốc để xem chi tiết" (340 px, 420 px ở ≥ 1280).
  - `/milestones/$milestoneId`: SCR-15. ≥ 768 px là khung chi tiết cạnh danh sách, mục đang chọn tô nền primary-soft. `?from=notification` → cuộn tới khối hành động và tô nền 1 s (bỏ khi giảm chuyển động).
  - Mục "Lịch" trên thanh điều hướng sáng cả ở `/milestones/:id`.
- **`features/milestones/`:**
  - `queries.ts`: `['milestones', petId]`, `['milestone', id]`; mutation tạo/sửa/hủy; `completeMilestone`, `undoCompleteMilestone`. Sau mọi thay đổi: invalidate danh sách, chi tiết, `['notifications']` và `['dashboard']`.
  - `format.ts`: tên loại, tiêu đề "Tiêm vaccine · Dại", dòng phụ "Hạn … · tự lặp 12 tháng / chu kỳ N tháng", `statusChip`, `nextDuePreview` (cộng tháng lịch, kẹp cuối tháng).
  - `components.tsx`:
    - `MilestoneTypeIcon` (syringe / droplet / pill).
    - `StatusChip`: luôn có icon + chữ. Quá hạn đỏ, còn 0–7 ngày cam, > 7 ngày trung tính "Còn N ngày (dd/MM)", đã thực hiện xanh, đã hủy gạch ngang.
    - `MilestoneItem` có nút ✓ 44 px (`aria-label` "Đánh dấu đã thực hiện: …") chỉ với mốc PENDING.
  - `MilestoneList` (SCR-14): segmented "Sắp tới · N / Quá hạn · N / Đã thực hiện / Đã hủy", mặc định Quá hạn nếu có. Trạng thái rỗng theo từng tab. Skeleton 3 dòng khi tải.
  - `MilestoneDetail` (SCR-15):
    - Thẻ thông tin: thú cưng, hạn, ghi chú, chu kỳ, nguồn gốc ("Tạo tự động từ lần thực hiện …" / "Tạo thủ công"), ngày thực hiện.
    - Nhắc nhở theo `reminders`, có hậu tố (chưa xem / đã xem / đã xử lý).
    - Menu ⋮ (Sửa, Hủy mốc). Khối hành động chỉ hiện với mốc PENDING.
  - `MilestoneFormDialog` (tạo/sửa):
    - Chọn loại bằng 3 thẻ (`radiogroup`). Ngày hạn quá khứ → cảnh báo vàng "Ngày này đã qua" (không chặn lưu). Ghi chú ≤ 500 ký tự, có bộ đếm khi còn ≤ 50.
    - Chu kỳ: chip 1/3/6 tháng (chạm lại để bỏ) hoặc "Khác…" nhập 1–60. Vaccine hiện dòng "Vaccine luôn lặp 12 tháng".
    - Dạng sửa: loại bị khóa; chỉ gửi trường đã đổi.
    - `Idempotency-Key` mỗi lần mở; `422` gán vào đúng trường; `409` → toast "Mốc đã được thực hiện hoặc đã hủy".
  - `complete-flow.tsx` (FLW-04):
    - Sheet "Đánh dấu đã thực hiện": ngày mặc định `today` của API, `max` = today, xem trước "Chu kỳ N tháng → … hạn …" / "Tự lặp 12 tháng → …".
    - `useCompleteMilestone`: ẩn mốc khỏi nhóm ngay (lỗi thì trả lại); toast "Đã đánh dấu thực hiện" + [Hoàn tác] 10 s.
    - Có mốc kế tiếp → toast thứ hai "Đã tạo lịch tiêm / nhỏ gáy / tẩy giun tiếp theo: dd/MM/yyyy".
    - Hoàn tác xong → "Đã hoàn tác"; quá hạn hoàn tác → "Đã quá thời gian hoàn tác".
  - Hủy mốc: `ConfirmDialog` "Hủy mốc này?", nút "Hủy mốc" (đỏ) và "Không" (focus mặc định).
- **`ui/ConfirmDialog`** nhận thêm `cancelLabel`. **`ui/toast`**: toast hoàn tác không tự ẩn khi rê chuột (trước đây chỉ khi có focus).
- **i18n:** nhóm `vi.milestones`.
- **Test:** `features/milestones/milestones.test.ts`, 3 ca: `statusChip` đủ 7 trạng thái; tiêu đề và dòng phụ; `nextDuePreview` (vaccine, 29/02, chu kỳ 3, không chu kỳ).
- **Bundle:** JS ban đầu 132 KB gzip (giới hạn 250), tăng từ 104 KB.

## Tiêu chí chấp nhận

**Đã kiểm:** typecheck, lint, depcruise, `vite build`, size-limit, unit test. Dev server biên dịch được các module mới. API phía sau đã gọi thử ở S4-01 → S4-03.

**Chưa kiểm** (cần bấm thử): toàn bộ luồng trên giao diện, chuông cập nhật sau khi đánh dấu (chuông làm ở S4-05), bố cục 3 khoảng.

## Khác với file task

- **Vị trí file:** route ở `routes/_app/pets/$petId/milestones.tsx` và `routes/_app/milestones/$milestoneId.tsx`. Component gộp trong `features/milestones/{components,MilestoneList,MilestoneDetail,MilestoneFormDialog,complete-flow}.tsx` thay vì các thư mục con `routes/`, `dialogs/`, `hooks/`, `lib/`.
- **"Hôm nay"** lấy từ `today` trong response API, client không tự tính múi giờ.

## Việc còn tồn

- **JS ban đầu tăng ~28 KB.** Đã thử import thẳng `queries` trong loader nhưng kích thước không đổi, nên phần tăng không đến từ barrel `index`. Cần phân tích bundle (ví dụ `rollup-plugin-visualizer`) để tách chunk khi gần chạm giới hạn.
