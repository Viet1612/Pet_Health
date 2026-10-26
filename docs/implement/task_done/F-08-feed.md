# F-08 · Bản tin từ người đang theo dõi — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-08](../tasks-feed/F-08-feed.md) |
| Trạng thái | Xong, E2E API + giao diện + test tích hợp Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

### API

- **`GET /feed?cursor=`:**
  - Trả bài đã đăng của mình và người mình theo dõi, mới nhất trước, 10 bài/trang. Phân trang keyset `(created_at, id)`, cursor base64url.
  - Tính lúc đọc (`owner_id = me OR owner_id IN (follows)`), không có bảng timeline, không có thuật toán xếp hạng. RLS tự loại bài nháp và người đã chặn nhau.
  - Mỗi bài là `PostView` như F-04. Ảnh, tên thú cưng, số tim/bình luận được ghép bằng 3 truy vấn phụ cho cả trang, không N+1.
- **`GET /feed/new-count?since=`:** số bài mới của người đang theo dõi sau thời điểm `since` (không tính bài của mình).

### Web

**Màn Bản tin (`/feed`):**
- Thanh trên: tiêu đề, nút "Làm mới" (≥ 768 px), icon Tìm người, nút "+ Đăng bài".

**Thẻ bài (`PostCard`):**
- Đầu bài: avatar, tên, `@username`, thời gian tương đối.
- Ảnh vuốt dùng lại carousel của F-06; khung vuông cố định nên không giật bố cục.
- Số lượt thích, chip thú cưng (chỉ khi bài có gắn).
- Chú thích rút gọn 2 dòng + "xem thêm"; "Xem N bình luận" khi có bình luận.
- Nút ♥ và 💬 làm ở F-10.

**Cuộn và làm mới:**
- Cuộn vô hạn: `useInfiniteQuery`, `IntersectionObserver` tải trang kế khi còn khoảng 3 thẻ phía trước. Hết bài thì hiện "Bạn đã xem hết bài mới".
- Kéo xuống ở đầu trang (phone) để làm mới, có chỉ báo xoay.
- Mỗi 60 s, khi tab đang mở, app hỏi `new-count`. Có bài mới → nút nổi "↑ Có bài mới"; bấm vào thì cuộn lên đầu và tải lại.
- Bản tin rỗng: "Theo dõi bạn bè để xem ảnh thú cưng của họ" + nút "Tìm người" + "Đăng bài đầu tiên".
- Mục "Bản tin" đã có trên thanh điều hướng từ F-02; thêm mục "Hồ sơ" ở bản sửa trước (`553c05e`).

**Khác thiết kế:**
- Không dùng `maxPages: 5`. Bản tin chỉ phân trang một chiều, nên bỏ trang đầu sẽ mất bài khi cuộn ngược lên. 10 bài/trang chỉ là JSON nhỏ, ảnh vẫn tải lười.

## Tiêu chí chấp nhận

**Test tích hợp** `apps/api/test/social-feed.int.test.ts`:
- A theo dõi B, C; 30 bài xen kẽ + 5 bài của D (không theo dõi).
- Phân trang 7 bài/trang: đủ 30 bài, không trùng, đúng thứ tự, không có bài của D, kể cả khi B đăng bài mới giữa lúc cuộn.
- `feedNewCount` đếm đúng 1 bài mới.
- Bỏ theo dõi B → không còn bài của B.

**E2E:**
- API: bản tin của A = [bài B, bài A] (không có bài D); `new-count` = 1; bỏ theo dõi B → chỉ còn bài A.
- Giao diện (phone + tablet): A theo dõi B, B đăng bài → A mở Bản tin thấy thẻ bài của B.

**Trợ năng:** axe 0 lỗi serious/critical trên `/feed` khi có bài.

**Toàn bộ test:**
- Unit: 207 Pass.
- IDOR: 123/123 Pass.
- E2E: 64 ca, 63 Pass ở lần chạy đầu. Ca còn lại là `social-posts` trên tablet: B tải lại trang trước khi A lưu xong chú thích. Em đã sửa test để chờ hộp sửa đóng, chạy lại thì Pass.

**Chưa kiểm:**
- p95 < 300 ms với 50 người × 200 bài.
- `EXPLAIN` dùng index.
- CLS < 0,1.

Query dùng index `posts_owner_idx (owner_id, created_at DESC, id DESC)` có sẵn, nhưng chưa đo. Để kiểm khi có dữ liệu lớn hơn.
