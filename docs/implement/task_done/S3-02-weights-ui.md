# S3-02 · Giao diện cân nặng — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S3-02](../tasks/S3-02-weights-ui.md) |
| Trạng thái | Xong (code), chưa bấm thử trên trình duyệt |
| Ngày hoàn thành | 2026-10-24 |
| Commit | xem [README](README.md) |

## Kết quả

- **Route:**
  - `/pets/$petId/health`: layout "Sức khỏe · {tên}", segmented "Cân nặng | Sổ y tế". Sổ y tế ghi "(Sắp có)", làm ở S3-05.
  - `/pets/$petId/health/`: chuyển sang tab Cân nặng.
  - `/pets/$petId/health/weight`: SCR-10. Loader lấy dữ liệu mới; có skeleton khi tải.
- **`features/weights/`:**
  - `queries.ts`: `['weights', petId]` gọi `GET /pets/{id}/weights`; mutation thêm/sửa/xóa số đo và đặt/xóa mục tiêu. Xong thì invalidate `['weights', petId]` và `['dashboard']`.
  - `format.ts`:
    - `9,3 kg`, chênh lệch `+0,3` / `−0,1` (U+2212) / `0,0`, ngày `dd/MM/yyyy`.
    - `parseKgInput` nhận dấu phẩy, kiểm 0,1–150 và 1 chữ số thập phân, thông điệp giống server.
    - `todayIn(user.timezone)`, `addMonths` (kẹp ngày cuối tháng).
  - `chart-data.ts`: cửa sổ 6 tháng tính lùi từ số đo mới nhất, trục X tăng dần. Số đo cùng ngày sắp theo `createdAt` và lệch +60 s mỗi điểm. Trục Y `[min − 0,5; max + 0,5]` bao trùm mục tiêu. Mốc nhãn đầu tháng (T5…T10).
  - `WeightChart` (lazy) và `WeightChartImpl` (uPlot):
    - Đường số đo màu primary; mục tiêu là đường nét đứt `[6, 4]` màu muted.
    - Tooltip "dd/MM/yyyy · 9,3 kg · +0,3 kg so với mục tiêu". Rê/chạm hoặc dùng phím ←/→ khi figure đang focus.
    - `<figure>` + `<figcaption>`; bảng `sr-only` (Ngày đo · Cân nặng · Chênh lệch so với mục tiêu).
    - Cao 240 / 320 px; vẽ lại theo `ResizeObserver`.
  - `WeightSummaryCard`: số đo gần nhất và ngày; "+0,3 so với lần trước" (ẩn khi < 2 số đo); chip mục tiêu kèm "Sửa mục tiêu", hoặc "Đặt cân nặng mục tiêu"; nút "+ Thêm cân nặng".
  - `WeightHistoryList`: ngày, giá trị, chênh lệch so với số đo liền trước. Menu ⋮ có `aria-label` gồm ngày, mục Sửa/Xóa. Chạm vào dòng mở sheet sửa.
  - `WeightEntryDialog` (thêm/sửa):
    - Ô kg có hậu tố "kg", `inputmode="decimal"`, autofocus. Ngày mặc định hôm nay, `max` = hôm nay.
    - `Idempotency-Key` sinh mỗi lần mở, giữ nguyên khi "Thử lại". `422` gán vào đúng trường; lỗi mạng → toast "Thử lại".
  - `WeightTargetDialog`: lưu mục tiêu. Lưu ô trống khi đã có mục tiêu, hoặc bấm "Xóa mục tiêu" → `ConfirmDialog` "Xóa cân nặng mục tiêu?".
  - `WeightScreen`: 0 số đo → `EmptyState`; 1 số đo → gợi ý "Thêm số đo tháng sau để thấy xu hướng". Xóa số đo → `ConfirmDialog` "Xóa số đo 9,3 kg ngày …?" → toast "Đã xóa số đo". Bố cục: < 768 một cột; ≥ 768 thẻ tóm tắt 300 px cạnh biểu đồ, lịch sử bên dưới.
- **`ui/ConfirmDialog`** (CMP-13) dùng chung: "Hủy" nhận focus mặc định, nút xác nhận đỏ.
- **Thêm nhanh (FLW-02):** `app/shell/QuickAdd.tsx` thay nút "+" trên TopBar. Menu có "Cân nặng" → mở `WeightEntryDialog` cho thú cưng đang chọn: "+" → "Cân nặng" → gõ → "Lưu".
- **Bundle:** uPlot (54 KB) và CSS của nó nằm ở chunk `WeightChartImpl`, không có trong `index-*.js`. size-limit: JS ban đầu 79,9 KB gzip (giới hạn 250), CSS 6,4 KB (giới hạn 25).
- **Test:** `features/weights/weights.test.ts`, 5 ca.
  - Định dạng kg và dấu trừ; `parseKgInput`; `addMonths`.
  - `buildChartData`: cửa sổ 6 tháng, thứ tự, lệch 60 s cùng ngày.
  - `yRange`, `monthSplits`.

## Tiêu chí chấp nhận

**Đã kiểm:** typecheck, lint, depcruise, `vite build`, size-limit, 5 unit test. Dev server biên dịch được các module mới.

**Chưa kiểm** (cần bấm thử trên trình duyệt): luồng thêm/sửa/xóa, mục tiêu, tooltip và phím mũi tên, bố cục 3 khoảng, đếm số lần chạm từ Dashboard. Thú cưng Mochi của `smoke-test@example.test` có sẵn 2 số đo để thử.

## Khác với file task

- **Vị trí route:** dưới layout `_app` (`routes/_app/pets/$petId/health.tsx` và `health/weight.tsx`), thay vì `routes/pets.$petId.health*.tsx`.
- **Màn Sức khỏe tách ra component `WeightScreen`**, để Dashboard (S5-04) dùng lại cùng các sheet.
- **Thêm nhanh chưa có chế độ "Tất cả thú cưng"** (cần PetSwitcher "Tất cả" ở S5-04); luôn ghi cho thú cưng đang chọn.
- **Màu đường mục tiêu** dùng token `--text-muted` (repo chưa có `--muted-fg`).
