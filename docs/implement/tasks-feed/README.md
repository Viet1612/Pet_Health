# Danh sách task — Bản tin ảnh thú cưng (Giai đoạn 2)

2026-10-26 · Việt

Tính năng **Bản tin**: người dùng đăng ảnh thú cưng, theo dõi nhau, thả tim và bình luận. Lấy phần lõi của Instagram, bỏ các tính năng nặng. Phạm vi lấy từ [Phase2-ideas.md](../../requirements/Phase2-ideas.md) §2 (kiểu B rút gọn). Bộ task này tách khỏi Giai đoạn 1 ([../tasks/](../tasks/README.md)) và chưa có PRD/SRS riêng; mỗi task tự ghi rõ quy tắc nghiệp vụ.

Quy ước tên file: `F-<số>-<tên-ngắn>.md`. Ước lượng tính theo ngày công.

## Quyết định thiết kế (chủ dự án duyệt trước khi bắt đầu)

Các câu hỏi còn mở ở Phase2-ideas §4 được chốt tạm như sau. Đổi quyết định nào thì sửa các task liên quan trước khi làm.

| # | Câu hỏi | Chốt tạm | Lý do |
|---|---|---|---|
| D1 | Bài đăng công khai hay chỉ người theo dõi? | **Công khai với mọi tài khoản đã đăng nhập.** Khách chưa đăng nhập không xem được | Đơn giản, đúng kiểu Instagram công khai; không có trang công khai cho máy tìm kiếm nên ít rủi ro lộ dữ liệu |
| D2 | Kiểm duyệt nội dung | **Tự ẩn khi đủ 3 báo cáo từ 3 tài khoản khác nhau** + lệnh SQL/script cho chủ dự án khôi phục hoặc xóa. Chưa có trang admin | Đủ cho quy mô nhỏ; trang admin để sau |
| D3 | Hạn mức ảnh | **Tối đa 5 ảnh/bài, 5 MB/ảnh, 30 bài/ngày/tài khoản** | Giữ dung lượng R2 trong gói miễn phí lúc đầu |
| D4 | Tách dữ liệu sức khỏe | Mô-đun mới `social`; **bảng sức khỏe giữ nguyên RLS `owner_isolation`**. Bảng xã hội dùng chính sách đọc riêng (F-03) | Không được để thay đổi phân quyền làm lộ cân nặng, sổ y tế, lịch mốc |
| D5 | Gắn thú cưng vào bài | Chỉ hiện **tên** thú cưng (và avatar), không hiện tuổi, giống, dữ liệu sức khỏe | Hồ sơ thú cưng vẫn là dữ liệu riêng |
| D6 | Thông báo xã hội | Bảng riêng `social_notifications`; chuông dùng chung, đếm cả hai loại | Bảng `notifications` hiện gắn chặt với mốc y tế (`milestone_id NOT NULL`) |

## Điều kiện trước

- **Server production có HTTPS** ([S7-01](../tasks/S7-01-production-stack.md), [S7-02](../tasks/S7-02-cloudflare-email.md)): bản tin chỉ có ý nghĩa khi nhiều người cùng truy cập.
- **F-01 (lưu ảnh lên R2)** làm trước mọi task có ảnh.

## Bảng task

| Task | Tên | Phụ thuộc | Ước lượng |
|---|---|---|---|
| [F-01](F-01-r2-storage.md) | Lưu ảnh lên Cloudflare R2 qua `ObjectStoragePort` | S7-01 | 1 |
| [F-02](F-02-public-profile.md) | Hồ sơ công khai: username, tên hiển thị, giới thiệu, ảnh đại diện | — | 1,5 |
| [F-03](F-03-social-schema.md) | Schema mô-đun `social` và chính sách RLS đọc công khai | F-02 | 1,5 |
| [F-04](F-04-posts-api.md) | API bài đăng: đăng, sửa chú thích, xóa, xem; ảnh `POST_PHOTO` | F-01, F-03 | 2 |
| [F-05](F-05-composer-ui.md) | Giao diện soạn bài: chọn nhiều ảnh, chú thích, gắn thú cưng | F-04 | 1,5 |
| [F-06](F-06-profile-grid-post-detail.md) | Hồ sơ dạng lưới 3 cột và chi tiết bài (vuốt ảnh) | F-04 | 1,5 |
| [F-07](F-07-follow-search.md) | Theo dõi / bỏ theo dõi, danh sách, tìm theo username | F-03 | 1,5 |
| [F-08](F-08-feed.md) | Bản tin từ người đang theo dõi (API + giao diện cuộn vô hạn) | F-04, F-07 | 2 |
| [F-09](F-09-likes-comments-api.md) | API thả tim và bình luận | F-04 | 1,5 |
| [F-10](F-10-likes-comments-ui.md) | Giao diện thả tim (nhấn đúp), bình luận | F-06, F-09 | 1,5 |
| [F-11](F-11-social-notifications.md) | Thông báo thả tim, bình luận, theo dõi | F-07, F-09 | 1,5 |
| [F-12](F-12-safety.md) | Chặn người dùng, báo cáo bài, tự ẩn, giới hạn chống spam | F-08, F-09 | 2 |
| [F-13](F-13-cross-account-tests.md) | Test chéo tài khoản (IDOR/RLS), E2E, vi/en, analytics | F-01→F-12 | 1,5 |

**Tổng:** 13 task, khoảng 20 ngày công (4–5 tuần làm bán thời gian).

## Dùng lại từ Giai đoạn 1

| Thành phần | Ở đâu |
|---|---|
| Pipeline ảnh (nhận tệp, HEIC, xử lý nền, URL ký, xóa theo prefix) | `modules/media`, S2-02, S3-04 |
| Ô chọn ảnh có % tải lên, Lightbox vuốt | `features/photos`, S3-05 |
| Chuông, danh sách thông báo | `features/notifications`, S4-05 |
| Idempotency-Key, rate limit, IDOR suite, E2E Playwright | `platform/*`, S1-08, S4-06 |
| Từ điển vi/en, mã lỗi có params | `i18n`, S4-07, S4-08 |
| Analytics danh sách trắng | `modules/analytics`, S6-05 |
| Xóa tài khoản cascade + purge ảnh | S6-01 |
