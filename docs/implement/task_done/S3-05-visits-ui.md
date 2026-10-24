# S3-05 · Giao diện sổ y tế — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S3-05](../tasks/S3-05-visits-ui.md) |
| Trạng thái | Xong (code), chưa bấm thử trên trình duyệt |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **Route:**
  - `/pets/$petId/health/visits`: SCR-11, trong layout Sức khỏe; tab "Sổ y tế" đã bật. ≥ 768 px: danh sách bên trái, khung "Chọn một lần khám để xem chi tiết" bên phải.
  - `/visits/$visitId`: SCR-12. < 768 px là trang riêng; ≥ 768 px nằm cạnh danh sách của thú cưng (mục đang chọn viền primary). Mở trực tiếp vẫn đúng bố cục.
  - `/pets/$petId/visits/new`: SCR-13 thêm.
  - `/visits/$visitId/edit`: SCR-13 sửa.
  - Lối tắt "Sổ y tế" ở hồ sơ thú cưng giờ dẫn tới tab này.
- **`features/visits/`:**
  - `queries.ts`: `useInfiniteQuery(['visits', petId])` theo con trỏ; `['visit', id]`; mutation tạo/sửa/xóa lần khám và xóa ảnh. Xong thì invalidate cả danh sách và chi tiết.
  - `VisitList`:
    - Dòng "n lần khám · mới nhất trước" kèm nút "+ Thêm lần khám".
    - Thẻ có ô ngày (ngày lớn, tháng/năm), tiêu đề là chẩn đoán (không có thì dùng triệu chứng), dòng phụ, số ảnh, chevron.
    - Cuộn tới cuối tự tải trang kế (`IntersectionObserver`, rootMargin 200 px); nút "Tải thêm" dự phòng cho bàn phím. 2 skeleton khi đang tải; `EmptyState` khi chưa có lần khám.
  - `VisitDetail`:
    - Ngày (h1), "{tên} · ghi lúc dd/MM/yyyy HH:mm" theo múi giờ tài khoản.
    - Khối Triệu chứng / Chẩn đoán / Đơn thuốc giữ xuống dòng, khối trống thì ẩn.
    - Ảnh đính kèm "n ảnh · chạm để phóng to"; menu ⋮ (Sửa, Xóa); cuối trang có "Sửa" và "Xóa lần khám".
    - Xóa → `ConfirmDialog` "Xóa lần khám này và n ảnh đính kèm?" → về danh sách, toast "Đã xóa lần khám".
  - `VisitForm` (thêm/sửa):
    - Ngày khám có `max` = hôm nay theo múi giờ tài khoản.
    - 3 ô `TextAreaCounter` (≥ 1280 px nằm trên 1 hàng).
    - Kiểm như server: ngày bắt buộc, không ở tương lai; thiếu cả triệu chứng lẫn chẩn đoán → lỗi ở cả hai trường kèm focus. Trường > 2.000 ký tự → bộ đếm đỏ và khóa nút lưu.
    - `422` gán vào đúng trường; lỗi mạng → toast "Thử lại".
    - Nút lưu dính đáy trên phone; "Hủy · Lưu" căn phải ở ≥ 768 px.
  - Dạng thêm: đóng (✕) khi đã nhập → "Bỏ thay đổi?". Dạng sửa: có "Xóa lần khám".
- **`features/photos/`:**
  - `upload-store.ts`: hàng đợi tải ảnh nằm ngoài cây route.
    - Kiểm từng tệp: định dạng, ≤ 5 MB, tổng ≤ 5 ảnh. Tệp lỗi báo ở ô riêng, không chặn tệp khác.
    - Tải tối đa 2 ảnh song song qua XHR, có % và `Idempotency-Key`. Không có tiến trình trong 10 s thì hủy.
    - Sau `202`: hỏi `GET /uploads/{id}` mỗi 1 s, tối đa 20 lần.
    - `413`/`415`/`409` → báo lỗi, chỉ có "Bỏ". Lỗi mạng → "Thử lại" với cùng key. Xử lý lỗi hoặc quá 20 s → xóa ảnh dở trên server rồi gửi lại với key mới.
  - `PhotoPicker` (form tạo): chọn và xem trước; lưu lần khám xong thì đưa ảnh vào hàng đợi và chuyển ngay sang chi tiết (không đợi ảnh).
  - `PhotoUploader` (form sửa): tải ngay khi chọn; ảnh cũ có ✕ (`aria-label "Xóa ảnh n"`) → "Xóa ảnh này?". Ô "+ Thêm ảnh" ẩn khi đủ 5. Input `multiple`, không đặt `capture`, nên điện thoại mở được cả camera và thư viện.
  - `PhotoTile`: ô 76/96 px với các trạng thái sẵn sàng, đang tải (thanh %), đang xử lý, lỗi (viền đỏ, "Thử lại"), bị từ chối.
  - `PhotoGrid` (chi tiết): lưới 3 cột, kèm ảnh còn đang tải từ form tạo. Ảnh lỗi tải (URL hết hạn) → tải lại chi tiết một lần.
  - `Lightbox` (tải lazy, chunk riêng 2,4 KB):
    - `<dialog>` toàn màn hình, bộ đếm "2 / 3", ‹ ›, vuốt, phím ←/→, Esc.
    - Chú thích "Ảnh đính kèm 2/3 — lần khám …" dùng làm `alt`.
  - `usePhotoUploadBridge` gắn ở AppShell: ảnh xong → invalidate chi tiết và danh sách.
- **`api/upload-file.ts`:** thêm `headers` và tự hủy khi tiến trình đứng 10 s.
- **`ui/TextAreaCounter`** (CMP-18): đếm code point sau NFC; đỏ khi vượt; `aria-live` khi còn ≤ 10%.
- **Bundle:** JS ban đầu 104 KB gzip (giới hạn 250), CSS 7,1 KB.
- **Test:** `features/visits/visits.test.ts`, 4 ca.
  - Định dạng ngày, giờ theo múi giờ, đếm ký tự NFC.
  - `photoFileError`.
  - `enqueuePhotos`: tệp GIF và tệp vượt 5 ảnh bị từ chối riêng, tệp hợp lệ vẫn vào hàng đợi.

## Tiêu chí chấp nhận

**Đã kiểm:** typecheck, lint, depcruise, `vite build`, size-limit, unit test. Dev server biên dịch được các module mới. API phía sau đã được thử ở S3-03/S3-04.

**Chưa kiểm** (cần bấm thử trên trình duyệt hoặc điện thoại): toàn bộ luồng thêm/sửa/xóa, cuộn tải thêm, tiến trình và "Thử lại" từng ảnh, lightbox (vuốt, phím), mở camera trên điện thoại, bố cục 3 khoảng.

## Khác với file task

- **Vị trí route:** dưới layout `_app` (`routes/_app/pets/$petId/health/visits.tsx`, `routes/_app/visits/$visitId/{index,edit}.tsx`, `routes/_app/pets/$petId/visits/new.tsx`).
- **Form tạo dùng `PhotoPicker` riêng** (chọn trước, tải sau khi lưu); form sửa dùng `PhotoUploader` (tải ngay). Cả hai dùng chung các ô của `PhotoTile`.
- **Loader danh sách dùng `queryClient.infiniteQuery`**, vì `prefetchInfiniteQuery` đã deprecated.
