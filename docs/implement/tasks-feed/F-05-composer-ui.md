# F-05 · Giao diện soạn bài: chọn nhiều ảnh, chú thích, gắn thú cưng

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-04](F-04-posts-api.md) |
| Ước lượng | 1,5 ngày |

## Mục tiêu

Đăng một bài trong ≤ 3 bước: chọn ảnh → viết chú thích và gắn bé → Đăng. Ảnh tải nền có % từng ảnh; mất mạng không mất nội dung đang soạn.

## Phạm vi

**Trong phạm vi:** route `/feed/new`, nút "+" trên màn Bản tin, mục "Bài đăng" trong menu "+" Thêm nhanh; chọn ảnh, sắp thứ tự, xem trước; chú thích có bộ đếm; chọn thú cưng; tiến trình tải; xử lý ảnh lỗi.

**Ngoài phạm vi:** bộ lọc, chỉnh sửa ảnh (cắt, xoay) để sau; sửa bài sau khi đăng nằm ở chi tiết bài (F-06).

## Chi tiết kỹ thuật

1. **Bước 1 — chọn ảnh:**
   - `<input type="file" accept="image/jpeg,image/png,image/heic" multiple>`, tối đa 5 ảnh.
   - Kiểm loại tệp và kích thước ≤ 5 MB ở client (dùng lại `PhotoPicker`).
   - Ô xem trước 1:1, kéo để đổi thứ tự (bàn phím: nút ←/→ trên ảnh đang focus), nút ✕ bỏ ảnh.
2. **Bước 2 — chi tiết:**
   - Chú thích (`TextAreaCounter`, 2.200 ký tự).
   - Chip chọn thú cưng của mình (tối đa 5).
3. **Đăng:**
   - `POST /posts` (Idempotency-Key giữ qua "Thử lại") → tải ảnh song song tối đa 2 (dùng lại `upload-store`).
   - Thanh tiến trình tổng + % từng ảnh.
   - Xong → về Bản tin, toast "Đã đăng", bài của mình hiện đầu danh sách.
4. **Ảnh lỗi:** đánh dấu đỏ trên ảnh đó, nút "Thử lại" hoặc "Bỏ ảnh này rồi đăng".
5. **Bản nháp:** chú thích và lựa chọn thú cưng lưu `sessionStorage` (`lib/draft.ts`) khi hết phiên. Ảnh không lưu được; khi khôi phục báo "Chọn lại ảnh".

## Giao diện

- **Phone:** toàn màn hình, thanh trên có "Hủy" / tiêu đề "Bài mới" / "Tiếp" → "Đăng".
- **≥ 768 px:** dialog 2 cột (ảnh trái, chi tiết phải).

## Tiêu chí chấp nhận

- [ ] Chọn 6 ảnh → chỉ nhận 5, báo "Tối đa 5 ảnh".
- [ ] Đăng 3 ảnh trên mạng 3G giả lập: thấy % từng ảnh, bài xuất hiện đầu bản tin khi xong.
- [ ] Mất mạng giữa chừng: banner offline, ảnh đang tải dừng; có mạng lại thì "Thử lại" tiếp tục, không tạo bài trùng.
- [ ] Bàn phím đổi được thứ tự ảnh; mọi nút ≥ 44 px; axe 0 lỗi serious.

## Kiểm thử

- **E2E (phone + tablet):** chọn 2 ảnh mẫu, chú thích, gắn bé, Đăng → bài hiện trên bản tin và hồ sơ.
- **Unit:** sắp xếp lại thứ tự ảnh, kiểm giới hạn.
