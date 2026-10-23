# S3-02 · Giao diện SCR-10, FLW-02, biểu đồ uPlot

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S3 · T7–8 |
| Story | US-020, US-021, US-022, US-023 |
| Yêu cầu | FR-WGT-001→010; FR-GEN-002, 004, 005, 009, 010, 012; NFR-USA-002, NFR-USA-006, NFR-PERF-003 |
| Phụ thuộc | [S3-01](S3-01-weights-api.md) |
| Ước lượng | 2 ngày |
| Màn hình Figma | SCR-10 · Sức khỏe / Cân nặng (10:576); FLW-02 · Thêm cân nặng (10:719); Sửa cân nặng mục tiêu (10:817) |

## Mục tiêu

Màn hình Sức khỏe tab Cân nặng: thẻ tóm tắt, biểu đồ đường so với mục tiêu, lịch sử số đo có sửa/xóa, sheet thêm cân nặng và sheet mục tiêu. Người dùng ghi một số đo từ Dashboard trong ≤ 3 lần chạm.

## Phạm vi

**Trong phạm vi:** route `/pets/:petId/health` với segmented "Cân nặng | Sổ y tế"; SCR-10; `WeightEntryDialog` (thêm/sửa); `WeightTargetDialog`; `WeightChart` (CMP-22) tải lazy; mục "Cân nặng" trong menu "+" Thêm nhanh của TopBar.

**Ngoài phạm vi:** nội dung tab Sổ y tế ([S3-05](S3-05-visits-ui.md)); panel Cân nặng và bản biểu đồ thu gọn trên Dashboard ([S5-04](S5-04-dashboard-ui.md), dùng lại `WeightChart` và `WeightEntryDialog`); dark mode tinh chỉnh ([S6-04](S6-04-dark-mode-a11y.md)).

## Chi tiết kỹ thuật

**Vị trí mã**

- `apps/web/src/routes/pets.$petId.health.tsx` (layout + segmented), `pets.$petId.health.weight.tsx` (SCR-10).
- `apps/web/src/features/weights/` — `WeightSummaryCard.tsx`, `WeightChart.tsx`, `WeightChartImpl.tsx` (chứa `import 'uplot'`), `WeightHistoryList.tsx`, `WeightEntryDialog.tsx`, `WeightTargetDialog.tsx`, `queries.ts`, `format.ts`.

**Dữ liệu**

1. Query key `['weights', petId]` → `GET /pets/{petId}/weights` (không truyền `from/to`); route loader chờ dữ liệu mới (FR-GEN-008).
2. Mutation thêm/sửa/xóa số đo và mục tiêu → `invalidateQueries(['weights', petId])` và `['dashboard']`.
3. Form mở ở chế độ thêm sinh `Idempotency-Key = crypto.randomUUID()` một lần; "Thử lại" dùng lại key.
4. Giá trị nhập: `trim`, đổi `,` → `.`, kiểm `^\d{1,3}(\.\d)?$` và 0,1–150 ở client (cùng thông điệp server); server vẫn kiểm lại.

**Định dạng (`format.ts`)**

- Ngày `dd/MM/yyyy`; kg dấu phẩy `9,3 kg` (FR-GEN-002).
- Chênh lệch: `"+0,3"`, `"−0,1"` (dấu trừ U+2212), `"0,0"`.
- Hôm nay ở client = ngày theo `user.timezone` từ `GET /auth/session` (dùng `Intl.DateTimeFormat`), làm giá trị mặc định và `max` cho DateField.

**Biểu đồ `WeightChart`**

1. `React.lazy(() => import('./WeightChartImpl'))`; uPlot không nằm trong chunk ban đầu (kiểm bằng `size-limit`). Skeleton chart kích thước cố định khi đang tải.
2. Cửa sổ dữ liệu: 6 tháng tính lùi từ số đo mới nhất (`addCalendarMonths(latest.measuredOn, −6)` → `latest`); trục X mỗi tháng một nhãn `T6…T11`.
3. Trục X tăng dần (FR-WGT-004). Số đo cùng ngày: sắp theo `createdAt` tăng dần, điểm thứ `i` cộng `i × 60` giây vào timestamp để vẽ đủ cả hai điểm mà x vẫn tăng dần.
4. Trục Y: `[min(giá trị, target) − 0,5; max(giá trị, target) + 0,5]`, luôn bao trùm mục tiêu.
5. Đường mục tiêu: series hằng số `target`, `dash: [6, 4]`, màu `--muted-fg`; không vẽ khi `target = null`.
6. Tooltip khi chạm/rê hoặc dùng phím ←/→ trên figure đang focus: `"01/11/2026 · 9,3 kg · +0,3 kg so với mục tiêu"` (Blueprint ghi "+0,3 so với mục tiêu"; thêm "kg" theo ví dụ AC US-022); không có mục tiêu thì bỏ phần sau cùng.
7. Trợ năng: `<figure>` + `<figcaption>` "Biểu đồ cân nặng Mochi, mục tiêu 9,0 kg"; bảng `sr-only` (Ngày đo · Cân nặng · Chênh lệch so với mục tiêu) chứa toàn bộ điểm trong cửa sổ.
8. Cao 240 px (< 768) / 320 px (≥ 768); vẽ lại theo `ResizeObserver`.

## Giao diện

**SCR-10 (10:576)** — tiêu đề "Sức khỏe", segmented "Cân nặng" (đang chọn) | "Sổ y tế".

- **Thẻ tóm tắt:** nhãn "SỐ ĐO GẦN NHẤT" + ngày `01/11/2026` bên phải; giá trị `9,3 kg` (`text-display`); dòng "+0,3 so với lần trước" (ẩn khi < 2 số đo); chip "Mục tiêu 9,0 kg" + "Sửa mục tiêu" mở sheet mục tiêu; chưa có mục tiêu → liên kết "Đặt cân nặng mục tiêu". Nút primary toàn chiều rộng "+ Thêm cân nặng".
- **Thẻ biểu đồ:** "XU HƯỚNG 6 THÁNG", chú thích phải "Nét đứt = mục tiêu" (ẩn khi không có mục tiêu).
  - 0 số đo: thay toàn bộ thẻ tóm tắt + biểu đồ bằng EmptyState "Chưa có số đo nào. Cân bé và ghi lại để theo dõi xu hướng." + nút "+ Thêm cân nặng".
  - 1 số đo: 1 điểm + dòng gợi ý "Thêm số đo tháng sau để thấy xu hướng".
- **Lịch sử:** "LỊCH SỬ SỐ ĐO" + "6 số đo"; mỗi dòng: ngày, giá trị đậm, chênh lệch so với số đo liền trước (căn phải), nút ⋮ (`aria-label="Tùy chọn số đo 01/11/2026"`) mở menu "Sửa" / "Xóa". Chạm vào dòng cũng mở sheet sửa.
- **Xóa:** ConfirmDialog nguy hiểm "Xóa số đo 9,3 kg ngày 01/11/2026?", nút "Hủy" (focus mặc định) / "Xóa"; xong → toast "Đã xóa số đo", biểu đồ cập nhật.

**Sheet Thêm cân nặng (10:719)** — CMP-12: bottom sheet trên phone, modal 480 px khi ≥ 768.

- Tiêu đề "Thêm cân nặng", phụ đề "Mochi · Mục tiêu 9,0 kg" (bỏ phần mục tiêu khi không có).
- "Cân nặng *" — DecimalField, hậu tố "kg", `inputmode="decimal"`, autofocus; gợi ý "Nhận cả dấu phẩy và dấu chấm".
- "Ngày đo" — DateField mặc định hôm nay, `max` = hôm nay; gợi ý "Mặc định hôm nay · không được ở tương lai".
- Nút "Lưu": loading + disabled khi đang gửi; thành công → đóng sheet, toast "Đã lưu" 3 s.
- Lỗi kiểm tra hiện dưới trường, giữ sheet mở; timeout 10 s → toast "Không lưu được. Kiểm tra kết nối rồi thử lại." + "Thử lại", giữ giá trị.
- **Dạng sửa** (US-023, chưa có frame riêng): cùng sheet, tiêu đề "Sửa cân nặng", điền sẵn giá trị và ngày.

**Sheet Cân nặng mục tiêu (10:817)** — tiêu đề "Cân nặng mục tiêu", phụ đề "Mochi · hiển thị thành đường nét đứt trên biểu đồ"; trường "Cân nặng mục tiêu" hậu tố "kg", gợi ý "Từ 0,1 đến 150 kg, tối đa 1 chữ số thập phân"; nút "Lưu"; nút chữ đỏ "Xóa mục tiêu" (chỉ khi đã có) → ConfirmDialog "Xóa cân nặng mục tiêu?". Lưu với ô trống khi đã có mục tiêu = xóa mục tiêu.

**Thêm nhanh từ Dashboard (FLW-02):** TopBar "+" mở menu, mục "Cân nặng" mở `WeightEntryDialog` cho thú cưng đang chọn (`ph.selectedPetId`); khi PetSwitcher ở "Tất cả", sheet có thêm select thú cưng điền sẵn con đầu tiên. Đếm chạm: "+" → "Cân nặng" → gõ → "Lưu".

**Responsive:** < 768: tóm tắt → biểu đồ → lịch sử, 1 cột. 768–1279: thẻ tóm tắt 300 px + biểu đồ cùng hàng, lịch sử bên dưới. ≥ 1280: như tablet, biểu đồ rộng hơn.

## Tiêu chí chấp nhận

- [ ] Given đang xem một thú cưng, When bấm "Thêm cân nặng", nhập 9,2, giữ ngày mặc định rồi lưu, Then số đo xuất hiện trong lịch sử và biểu đồ; từ Dashboard tối đa 3 lần chạm.
- [ ] Given giá trị ≤ 0, > 150 hoặc nhiều hơn 1 chữ số thập phân, When lưu, Then hiện "Cân nặng phải từ 0,1 đến 150 kg, tối đa 1 chữ số thập phân" dưới ô.
- [ ] Given ngày đo ở tương lai, When lưu, Then bị từ chối với "Ngày không được ở tương lai".
- [ ] Given đã có số đo cùng ngày, When lưu số đo mới cho ngày đó, Then biểu đồ hiển thị cả hai điểm.
- [ ] Given chưa có mục tiêu, When nhập 9 và lưu, Then "Mục tiêu 9,0 kg" hiện trên thẻ và đường nét đứt hiện trên biểu đồ.
- [ ] Given đã có mục tiêu, When xóa mục tiêu, Then đường mục tiêu biến mất.
- [ ] Given 6 số đo ở 6 tháng, When mở biểu đồ, Then có 6 điểm theo thời gian và một đường ngang nét đứt.
- [ ] Given chạm hoặc rê vào một điểm, Then tooltip có ngày, giá trị và chênh lệch so với mục tiêu (ví dụ "+0,2 kg").
- [ ] Given 0 số đo, Then hiện empty state thay cho biểu đồ trống.
- [ ] Given đúng 1 số đo, Then hiện 1 điểm và "Thêm số đo tháng sau để thấy xu hướng".
- [ ] Chọn một dòng lịch sử mở sheet dạng sửa; xóa qua xác nhận; biểu đồ cập nhật ngay sau khi lưu/xóa.
- [ ] uPlot không có trong chunk ban đầu; JS ban đầu vẫn < 250 KB gzip.
- [ ] Trình đọc màn hình đọc được bảng dữ liệu ẩn; tooltip điều khiển được bằng phím mũi tên.

## Kiểm thử

- **Unit (Vitest):** `format.ts` — `formatKg("9.0")` → "9,0 kg", delta `"-0.1"` → "−0,1"; chuẩn hóa nhập `"9,2"` → `"9.2"`, từ chối `"9,25"`, `"0"`, `"150,1"`; tính cửa sổ 6 tháng và lệch timestamp cho số đo cùng ngày; miền Y bao trùm mục tiêu nằm ngoài dải số đo (số đo 8,6–9,3, mục tiêu 10,0).
- **Component (Testing Library + MSW):** 0/1/6 số đo; có/không mục tiêu; lỗi `422` hiện dưới ô; timeout 10 s giữ giá trị và "Thử lại" gửi lại cùng `Idempotency-Key`; nút Lưu disabled khi đang gửi.
- **E2E (Playwright, viewport 390 × 844 và 1280):** Dashboard → "+" → "Cân nặng" → gõ "9,2" → "Lưu", đếm đúng 3 lần chạm, toast "Đã lưu"; sửa rồi xóa một số đo; đặt và xóa mục tiêu.
- **Thủ công:** VoiceOver/TalkBack đọc bảng ẩn; bàn phím số bật trên iOS/Android.

## Ghi chú

- Dashboard (S5-04) dùng lại `WeightChart` ở chế độ thu gọn và `WeightEntryDialog`; giữ props chung (`petId`, `compact`).
- Tooltip dùng plugin cursor của uPlot; không thêm thư viện tooltip.
