# F-08 · Bản tin từ người đang theo dõi (API + giao diện cuộn vô hạn)

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-04](F-04-posts-api.md), [F-07](F-07-follow-search.md) |
| Ước lượng | 2 ngày |

## Mục tiêu

Màn **Bản tin** hiện bài của người mình theo dõi (và của chính mình), mới nhất trước, cuộn vô hạn mượt trên điện thoại. Không có thuật toán xếp hạng.

## Phạm vi

**Trong phạm vi:** `GET /feed?cursor=`; màn `/feed` với danh sách bài dạng thẻ; trạng thái rỗng gợi ý tìm người; kéo xuống để làm mới; nút "Có bài mới".

**Ngoài phạm vi:** trang khám phá, quảng cáo, xếp hạng theo tương tác.

## Chi tiết kỹ thuật

1. **Truy vấn** (fan-out lúc đọc; đủ cho quy mô nhỏ, không cần bảng timeline):

   ```sql
   SELECT p.* FROM posts p
   WHERE p.status = 'PUBLISHED'
     AND (p.owner_id = $me OR p.owner_id IN (SELECT followee_id FROM follows WHERE follower_id = $me))
     AND (p.created_at, p.id) < ($cursorAt, $cursorId)
   ORDER BY p.created_at DESC, p.id DESC LIMIT 10;
   ```

   RLS tự loại bài bị ẩn và người đã chặn (F-03). Index `(owner_id, created_at DESC, id DESC)`. `EXPLAIN` phải dùng index, không quét toàn bảng.
2. **Phản hồi:** `{ items: PostView[], nextCursor }`, cursor mã hóa base64url `{at, id}`. Ghép `likedByMe`, tên thú cưng, URL ký trong ≤ 3 truy vấn phụ (không N+1).
3. **Giao diện:**
   - Thẻ bài: đầu (avatar, username, thời gian), carousel ảnh (dùng lại F-06), hàng nút ♥ 💬, số tim, chú thích rút gọn 2 dòng + "xem thêm", "Xem N bình luận".
   - `useInfiniteQuery`, tải trước trang kế khi còn 3 bài; ảnh `loading="lazy"` với khung tỉ lệ cố định (không giật).
   - Chỉ giữ tối đa 5 trang trong cache (`maxPages`) để không phình bộ nhớ trên điện thoại.
   - **Kéo xuống làm mới** trên phone; nút "Làm mới" ở ≥ 768 px.
   - Mỗi 60 s khi tab đang mở, gọi `GET /feed/new-count?since=` → nếu > 0 hiện nút nổi "↑ Có bài mới".
   - **Rỗng:** "Theo dõi bạn bè để xem ảnh thú cưng của họ" + nút "Tìm người" (F-07) + nút "Đăng bài đầu tiên".
4. **Điều hướng:** thêm mục "Bản tin" vào BottomNav/SideRail, giữ 4 mục cũ → 5 mục. Kiểm vùng chạm ≥ 44 px và nhãn không xuống dòng ở 360 px.

## Tiêu chí chấp nhận

- [ ] A theo dõi B, C: bản tin có bài của A, B, C xếp mới nhất trước; không có bài của D (không theo dõi).
- [ ] Cuộn 100 bài: không trùng, không sót (kể cả khi có bài mới đăng giữa lúc cuộn).
- [ ] `GET /feed` p95 < 300 ms với 50 người theo dõi × 200 bài (đo ở test tích hợp).
- [ ] Bỏ theo dõi B → lần làm mới kế tiếp không còn bài của B.
- [ ] Không cuộn ngang, CLS < 0,1 trên phone.

## Kiểm thử

- **Integration:** seed 3 người, 30 bài xen kẽ thời gian; kiểm phân trang không trùng/sót khi chèn bài mới giữa 2 trang.
- **E2E (phone):** 2 tài khoản, A theo dõi B, B đăng bài, A làm mới thấy bài.
