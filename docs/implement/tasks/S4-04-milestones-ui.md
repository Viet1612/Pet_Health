# S4-04 · Giao diện SCR-14, 15, sheet tạo/sửa/hủy, FLW-04, toast hoàn tác

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S4 · T9–10 |
| Story | US-040, 042, 043, 044, 046, 047, 048 |
| Yêu cầu | FR-MS-001, 003, 005→010, 012, 013; FR-GEN-002, 004, 005, 009, 010; UXD-009; CMP-10, 12, 13, 16, 20, 21 |
| Phụ thuộc | [S4-02](S4-02-complete-undo-api.md) |
| Ước lượng | 2 |
| Màn hình Figma | SCR-14 · Lịch mốc y tế (11:999), SCR-15 · Chi tiết mốc (11:1195), Tạo mốc y tế (11:1299), Sửa mốc (23:2983), Hủy mốc · xác nhận (11:1429), FLW-04 · Đánh dấu đã thực hiện (8:506) |

## Mục tiêu

Người dùng xem, tạo, sửa, hủy và đánh dấu mốc theo đúng Figma; sau khi đánh dấu có toast "Hoàn tác" 10 giây và thông báo ngày hạn của mốc kế tiếp.

## Phạm vi

**Trong phạm vi:** route `/pets/:petId/milestones` (SCR-14), `/milestones/:milestoneId` (SCR-15); 4 dialog; component `MilestoneItem`, `StatusChip`, `CompleteMilestoneDialog` (dùng lại ở Dashboard); invalidate query liên quan; bố cục danh sách + chi tiết ≥ 768 px.

**Ngoài phạm vi:** chuông và SCR-17 → [S4-05](S4-05-notifications-ui.md). Panel Mốc và banner trên Dashboard → [S5-04](S5-04-dashboard-ui.md). Lưu bản nháp khi hết phiên → [S6-03](S6-03-system-states.md).

## Chi tiết kỹ thuật

```
apps/web/src/features/milestones/
  routes/pet-milestones.route.tsx      # SCR-14 (+ khung chi tiết ≥ 768)
  routes/milestone-detail.route.tsx    # SCR-15
  components/MilestoneItem.tsx, StatusChip.tsx, MilestoneTypeIcon.tsx
  dialogs/CreateMilestoneDialog.tsx, EditMilestoneDialog.tsx,
          CancelMilestoneDialog.tsx, CompleteMilestoneDialog.tsx
  hooks/useMilestoneMutations.ts       # create/update/cancel/complete/undo
  lib/next-due-preview.ts              # addCalendarMonths thuần trên chuỗi YYYY-MM-DD
```

- Query key: `['milestones', petId]`, `['milestone', id]`. Loader chờ dữ liệu mới (`staleTime: 0`, FR-GEN-008).
- Sau **mọi** mutation mốc thành công: invalidate `['milestones', petId]`, `['milestone', id]`, `['notifications','summary']`, `['notifications','list']`, `['dashboard']` (FR-NTF-010).
- "Hôm nay" và `max` của DateField lấy từ `today` trong response API; client không tính múi giờ (SAD P1).
- `next-due-preview.ts` chỉ dùng để hiển thị dự kiến trong FLW-04; ngày thật lấy từ `nextMilestone.dueOn`.
- Tạo mốc: mỗi lần mở dialog sinh `Idempotency-Key = crypto.randomUUID()`; "Thử lại" dùng lại key; nút Lưu `loading` + `disabled` tới khi có phản hồi; timeout 10 s → toast "Không lưu được. Kiểm tra kết nối rồi thử lại." + [Thử lại], form giữ nguyên.
- Lỗi trường `422` hiển thị dưới trường (`errors[].field`); `409 MILESTONE_NOT_PENDING` → toast "Mốc đã được thực hiện hoặc đã hủy", refetch.
- Hoàn tác: timer 10 s phía client; `POST /undo-complete`; `409 UNDO_WINDOW_EXPIRED` → toast "Đã quá thời gian hoàn tác". Cập nhật lạc quan khi đánh dấu (ẩn mốc khỏi nhóm), lỗi thì hoàn lại + toast lỗi.

## Giao diện

**SCR-14 · Lịch mốc y tế (11:999)**

- Tiêu đề h1 "Lịch mốc y tế", nút primary "+ Tạo mốc".
- Segmented control: "Sắp tới · N", "Quá hạn · N", "Đã thực hiện", "Đã hủy". Mặc định mở "Quá hạn" nếu có, ngược lại "Sắp tới". Lưu tab trong search param `?tab=`.
- `MilestoneItem`: icon loại (Tiêm vaccine `syringe`, Nhỏ gáy `droplet`, Tẩy giun `pill`) trong vòng tròn `--primary-soft`; dòng 1 "Tiêm vaccine · Dại" (không ghi chú thì chỉ tên loại); dòng 2 "Hạn 17/11/2026 · tự lặp 12 tháng" / "· chu kỳ 3 tháng" / không gì khi không lặp; `StatusChip`; nút ✓ tròn 44 px chỉ với mốc `PENDING`, `aria-label="Đánh dấu đã thực hiện: Tiêm vaccine Dại"`. Chạm dòng → SCR-15.
- `StatusChip` (luôn có icon + chữ):

  | Trạng thái | Màu | Nhãn |
  |---|---|---|
  | Quá hạn | đỏ `--status-danger` | "Quá hạn N ngày" |
  | Còn 0–7 ngày | cam `--status-warning` | "Còn N ngày" / "Ngày mai" / "Hôm nay" |
  | Còn > 7 ngày | trung tính | "Còn 21 ngày (05/12)" |
  | Đã thực hiện | xanh `--status-success` | "Đã thực hiện 14/11/2026" |
  | Đã hủy | trung tính, chữ gạch ngang | "Đã hủy" |

- Empty: Sắp tới → "Không có lịch nào trong 30 ngày tới 🎉" + "+ Tạo mốc y tế"; nhóm khác → "Không có mốc nào ở nhóm này.". Skeleton 3 dòng kích thước cố định khi tải.

**SCR-15 · Chi tiết mốc (11:1195)**

- TopBar "← Chi tiết mốc" + menu ⋮ (Sửa, Hủy mốc). h1 "Tiêm vaccine · Dại" + `StatusChip`.
- Thẻ thông tin: Thú cưng; Ngày đến hạn; Ghi chú; Chu kỳ ("Tự lặp 12 tháng sau ngày tiêm" / "Lặp mỗi N tháng sau ngày thực hiện" / "Không tự lặp"); Nguồn gốc ("Tạo tự động từ lần tiêm 17/11/2025" khi `AUTO`, "Tạo thủ công"); Ngày thực hiện (khi `DONE`); Nhắc nhở từ `reminders`: "Còn 7 ngày: 10/11 (đã xem)", "Ngày mai: 16/11", "Quá hạn: 18/11" — hậu tố "(chưa xem)", "(đã xem)", "(đã xử lý)"; mức `PLANNED` không hậu tố.
- Hành động (chỉ khi `PENDING`): "Đánh dấu đã thực hiện" (primary, full width), "Sửa" (outline), "Hủy mốc" (chữ đỏ). Chú thích "Loại mốc không đổi được sau khi tạo (SD-004).".
- Mở với `?from=notification` → cuộn tới khối hành động và tô nền `--primary-soft` 1 s (bỏ hiệu ứng khi `prefers-reduced-motion`).

**Tạo mốc y tế (11:1299)** — `ResponsiveDialog`, tiêu đề "Tạo mốc y tế", phụ đề tên thú cưng.

- "Loại *": 3 thẻ chọn có icon "Tiêm vaccine", "Nhỏ gáy", "Tẩy giun" (`radiogroup`).
- "Ngày đến hạn *": DateField, cho phép quá khứ; ngày < hôm nay → cảnh báo vàng "Ngày này đã qua" (không chặn lưu).
- "Ghi chú": tối đa 500 ký tự, gợi ý "Tối đa 500 ký tự", bộ đếm khi còn ≤ 50 ký tự.
- "Chu kỳ lặp (tháng)" (chỉ Nhỏ gáy/Tẩy giun): chip "1 tháng", "3 tháng", "6 tháng", "Khác…" (mở ô số 1–60); chạm lại chip đang chọn để bỏ chọn; gợi ý "Số nguyên 1–60 · bỏ trống thì không tự lặp.". Chọn Tiêm vaccine → ẩn chip, hiện dòng cố định "Vaccine luôn lặp 12 tháng".
- Nút "Lưu" → đóng dialog, toast "Đã lưu" 3 s.

**Sửa mốc (23:2983)** — tiêu đề "Sửa mốc", phụ đề "Tiêm vaccine · không đổi được loại mốc (SD-004)", ô khóa "Loại: Tiêm vaccine" (icon khóa, chỉ đọc); "Ngày đến hạn *" + gợi ý "Đổi ngày hạn sẽ tính lại nhắc nhở theo ngày mới"; "Ghi chú"; "Chu kỳ lặp" như form tạo (chỉ FLEA/DEWORM); nút "Lưu thay đổi". Chỉ gửi trường đã đổi.

**Hủy mốc (11:1429)** — `ConfirmDialog` nguy hiểm: tiêu đề "Hủy mốc này?", nội dung `Mốc "Tiêm vaccine · Dại · 17/11/2026" sẽ chuyển sang Đã hủy và không còn nhắc nhở. Lịch sử vẫn được giữ.`, nút "Hủy mốc" (đỏ) và "Không" (focus mặc định).

**FLW-04 · Đánh dấu đã thực hiện (8:506)** — mở từ ✓ trên SCR-14, nút ở SCR-15 (và Dashboard ở S5).

- Tiêu đề "Đánh dấu đã thực hiện", phụ đề "Tẩy giun · Mochi · hạn 12/11/2026".
- "Ngày thực hiện *": DateField mặc định `today`, `max = today`, gợi ý "Mặc định hôm nay · không được ở tương lai"; lỗi "Ngày không được ở tương lai".
- Khối thông tin nền `--primary-soft` khi có mốc kế tiếp: "Mốc kế tiếp sẽ được tạo tự động" + "Chu kỳ 3 tháng → Tẩy giun hạn 14/02/2027" / "Tự lặp 12 tháng → Tiêm vaccine hạn 14/11/2027"; cập nhật khi đổi ngày.
- Nút "Xác nhận" → đóng dialog → toast undo "Đã đánh dấu thực hiện" + [Hoàn tác] với thanh đếm 10 s; nếu có `nextMilestone`: toast thứ hai ngay dưới "Đã tạo lịch tiêm tiếp theo: 14/11/2027" (Nhỏ gáy: "Đã tạo lịch nhỏ gáy tiếp theo: …", Tẩy giun: "Đã tạo lịch tẩy giun tiếp theo: …").
- Hoàn tác thành công → mốc hiện lại đúng vị trí, toast "Đã hoàn tác". Toast không tự ẩn khi đang hover hoặc focus.

**Responsive (UXD-009, §3.1.5):** < 768 px: danh sách → trang chi tiết riêng, dialog là bottom sheet (tối đa 90vh). Tablet 768–1279: danh sách + khung chi tiết 340 px; desktop ≥ 1280: chi tiết 420 px; mục đang chọn nền `--primary-soft`; route `/milestones/:id` mở thẳng vào khung chi tiết. Dialog ≥ 768 là modal 480 px. Không có thanh cuộn ngang ở 390, 834, 1280 px.

## Tiêu chí chấp nhận

- [ ] **Given** đang xem Mochi, **When** chọn "Tiêm vaccine", hạn 15/11/2026, ghi chú "Dại" và lưu, **Then** mốc xuất hiện ở tab Sắp tới với chip cam/trung tính đúng số ngày.
- [ ] **Given** hạn đã qua, **When** lưu, **Then** form hiện cảnh báo "Ngày này đã qua" trước khi lưu, mốc nằm ở tab Quá hạn với chip đỏ "Quá hạn N ngày".
- [ ] Nhỏ gáy/Tẩy giun chọn được 1/3/6 tháng hoặc nhập 1–60; nhập 0 hoặc 61 → "Chu kỳ phải là số tháng nguyên từ 1 đến 60"; Vaccine không có ô chu kỳ.
- [ ] **Given** mốc Sắp tới hạn 15/11/2026, **When** bấm "Đã thực hiện", chọn 10/11, **Then** mốc chuyển sang tab Đã thực hiện với chip "Đã thực hiện 10/11/2026", số trên chuông cập nhật.
- [ ] Không chọn được ngày thực hiện ở tương lai (`max`), server từ chối thì hiện lỗi dưới trường.
- [ ] **When** chọn "Hoàn tác" trong 10 s, **Then** mốc quay về nhóm cũ, mốc kế tiếp biến mất, chuông về số cũ.
- [ ] Đánh dấu vaccine ngày 14/11/2026 → toast "Đã tạo lịch tiêm tiếp theo: 14/11/2027" và mốc mới ở tab Sắp tới.
- [ ] **Given** mốc Sắp tới, **When** sửa ngày hạn, **Then** chip và dòng Nhắc nhở của SCR-15 tính theo ngày mới; loại mốc chỉ đọc.
- [ ] **Given** mốc Sắp tới, **When** "Hủy mốc" → "Hủy mốc", **Then** mốc chuyển sang tab Đã hủy, không còn ở Sắp tới; nút "Không" đóng sheet không thay đổi gì.
- [ ] Mọi màu trạng thái có chữ đi kèm; Quá hạn đỏ, còn ≤ 7 ngày cam, đã thực hiện xanh.
- [ ] Bố cục danh sách + chi tiết ở ≥ 768 px; bottom sheet ở phone; không cuộn ngang.

## Kiểm thử

- **Component (Vitest + Testing Library, MSW):** `StatusChip` với `daysUntilDue` −2, 0, 1, 7, 8, 21; `CreateMilestoneDialog` ẩn chu kỳ khi Vaccine, chip bỏ chọn được, cảnh báo ngày quá khứ; `next-due-preview` 4 ca SRS §2.10.2; `CompleteMilestoneDialog` mặc định `today` từ API, `max` đúng.
- **Hành vi:** bấm Lưu 2 lần nhanh → 1 request; timeout giả 10 s → nút "Thử lại" gửi cùng `Idempotency-Key`; `409 UNDO_WINDOW_EXPIRED` → toast đúng chữ; invalidate `['notifications','summary']` sau create/update/cancel/complete/undo.
- **Trợ năng:** axe-core 0 vi phạm trên SCR-14, SCR-15 và 4 dialog; focus trap, Esc đóng, trả focus về nút mở; mọi nút có tên truy cập (`getByRole`).
- **Thủ công:** 390 × 844, iPad 834 × 1112 (2 hướng), 1280 px trên Chrome; so khớp 6 frame Figma.

## Ghi chú

- Blueprint ghi dòng cố định "Tự lặp mỗi 12 tháng" cho Vaccine còn frame 11:1299 ghi "Vaccine luôn lặp 12 tháng"; dùng câu của frame.
- Câu toast cho Nhỏ gáy/Tẩy giun chưa có trong danh mục UX writing (§3.5.4) — dùng mẫu ở trên và bổ sung vào Blueprint.
- `CompleteMilestoneDialog` nhận `{ milestoneId, petName, type, note, dueOn, cycleMonths, today }` qua props để Dashboard ([S5-04](S5-04-dashboard-ui.md)) mở được mà không cần tải lại mốc.
