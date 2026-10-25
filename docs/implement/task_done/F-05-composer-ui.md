# F-05 · Giao diện soạn bài — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-05](../tasks-feed/F-05-composer-ui.md) |
| Trạng thái | Xong, E2E giao diện (phone + tablet) + axe Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

### Lối vào và bố cục

- **Route `/feed/new`.** Mở từ 2 chỗ:
  - Nút **"+ Đăng bài"** trên màn Bản tin.
  - Mục **"Bài đăng"** trong menu "+" Thêm nhanh.
- Chưa có hồ sơ công khai → tự về `/feed` để tạo hồ sơ trước.
- **Phone:** 2 bước. Bước "Chọn ảnh" → nút **Tiếp** → bước "Chú thích + gắn bé" → **Đăng**. Thanh trên có "Hủy" / "Bài mới" / nút chính.
- **≥ 768 px:** 2 cột trên cùng một màn (ảnh trái, chi tiết phải), nút **Đăng** ở thanh trên.

### Soạn bài

- **Chọn ảnh:**
  - `input multiple` (JPG, PNG, HEIC, mỗi ảnh ≤ 5 MB), tối đa 5 ảnh; chọn thừa → "Tối đa 5 ảnh".
  - Tệp sai định dạng hoặc quá lớn bị bỏ, có báo lỗi.
  - Ô xem trước vuông 3 cột. Mỗi ảnh có nút ✕ bỏ ảnh và nút ←/→ đổi thứ tự; các nút có nhãn và bấm được bằng bàn phím.
- **Chú thích:** `TextAreaCounter` 2.200 ký tự.
- **Gắn thú cưng (không bắt buộc):**
  - Chip các bé của mình (`aria-pressed`), mặc định không chọn bé nào, tối đa 5.
  - Tài khoản chưa có thú cưng thì ẩn mục này.
  - Component `PetChips` dùng chung với màn sửa bài.
- **Logic thuần** `features/social/composer.ts` (`addPhotos`, `movePhoto`, `togglePet`) có unit test.

### Đăng bài (`use-publish-post.ts`)

- **Tạo bài:** gọi `POST /posts`. Idempotency-Key được giữ qua "Thử lại" và đổi khi nội dung đổi.
- **Tải ảnh:** song song tối đa 2 ảnh qua `uploadFile`, có % từng ảnh, rồi hỏi `GET /uploads/{id}` tới khi READY. Ô ảnh phủ lớp "x%" / "Đang xử lý" / "Ảnh lỗi"; có dòng "Đã xong n/N ảnh".
- **Xong:** toast "Đã đăng" → về hồ sơ của mình (bản tin F-08 chưa có), bài mới đứng đầu lưới.
- **Ảnh lỗi:**
  - **Thử lại:** ảnh lỗi do mạng gửi lại cùng khóa; ảnh lỗi do xử lý thì gửi lại với khóa mới vào đúng vị trí.
  - **Bỏ ảnh lỗi rồi đăng:** `DELETE /post-photos/{id}`, chỉ hiện khi server đã nhận các ảnh lỗi đó.
- **Hết phiên lúc đăng:** chú thích và lựa chọn thú cưng lưu vào `sessionStorage` (`lib/draft.ts`). Khi quay lại, app khôi phục và báo "Chọn lại ảnh để đăng".
- **Mất mạng:** nút Đăng tự tắt (Button dùng chung của S6-03).

### Lỗi API tìm thấy khi chạy E2E (đã sửa)

- **Triệu chứng:** hai ảnh của cùng một bài xử lý song song thì bài không bao giờ được đăng. Mỗi transaction chỉ thấy ảnh của chính nó là READY.
- **Cách sửa:** `publishIfComplete` khóa dòng `posts` (`FOR UPDATE`) trước, rồi đếm ảnh READY ở câu lệnh sau. Transaction đến sau sẽ chờ transaction trước commit và thấy đủ ảnh.

## Tiêu chí chấp nhận

- **E2E** `e2e/ui/social-posts.ui.spec.ts` (phone 390 px + tablet 834 px):
  - Bài 1: chọn 2 ảnh, viết chú thích, gắn Mochi, Đăng.
  - Bài 2: chọn 1 ảnh, không gắn bé, Đăng.
  - Kết quả: cả hai bài hiện trên lưới hồ sơ; bài 2 không có chip thú cưng.
- **Unit** `features/social/social.test.ts`:
  - Chọn 6 ảnh → nhận 5.
  - Bỏ tệp sai định dạng hoặc quá 5 MB.
  - Đổi thứ tự ảnh, kể cả ở biên.
  - Gắn tối đa 5 bé.
- **Trợ năng:** axe 0 lỗi serious/critical trên `/feed/new`; trên phone mọi nút ≥ 44 px.
- **Chưa kiểm tự động:**
  - Mạng 3G giả lập.
  - Mất mạng giữa chừng rồi "Thử lại".

  Cơ chế Idempotency-Key giống ảnh lần khám (S3-05) nên không tạo bài trùng.
