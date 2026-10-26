# Ý tưởng Giai đoạn 2 — ghi tạm

| Trường | Giá trị |
|---|---|
| Trạng thái | **Mục 2 (Bản tin): đã duyệt và làm xong trên máy dev** (12/13 task, còn lưu ảnh lên R2 làm cùng production). **Mục 1 (App điện thoại): chưa làm** |
| Ngày | 2026-10-25 (cập nhật 2026-10-26) |
| Tác giả | Việt (bàn với Claude) |
| Liên quan | [PRD §1.3](PRD.md) (lộ trình, MR-1→MR-8), [PRD §8](PRD.md) (Bản tin), [BRD mục 16](BRD.md) (BR-045→BR-054, DEC-023→DEC-030), [Implement_plan §10](../implement/Implement_plan.md) |

Ghi lại các ý tưởng đã bàn để làm **sau khi xong Giai đoạn 1** (S5–S6).

> **Cập nhật 2026-10-26:** Bản tin (mục 2) đã chuyển thành yêu cầu chính thức (BRD mục 16, PRD §8), task F-01→F-13 ([tasks-feed/](../implement/tasks-feed/README.md)) và đã code xong trên dev. App điện thoại (mục 1) vẫn là ý tưởng, chưa có task.

---

## 1. App điện thoại

**Mục tiêu:** dùng Pet Health như app trên điện thoại, có thông báo đẩy cho mốc y tế (đúng lý do chính của Giai đoạn 2 trong PRD §1.3).

### Các hướng đã cân nhắc

| Hướng | Công sức | Dùng lại mã web | Ghi chú |
|---|---|---|---|
| **PWA**: cài web lên màn hình chính | 2–4 ngày | ~100% | Manifest, icon, service worker, Web Push. iPhone cần iOS 16.4+ và phải cài vào màn hình chính. Không lên store, không mất phí |
| **Capacitor**: bọc web thành app trên store | 2–3 tuần | ~90% giao diện | Xem các việc phải thêm bên dưới. Phí: Apple 99 USD/năm, Google 25 USD một lần |
| React Native / Expo | 6–10 tuần | API, `api-client`, từ điển, hàm tính | Viết lại toàn bộ giao diện. Không đáng với dự án cá nhân |

**Đề xuất:** PWA trước, Capacitor sau khi cần push ổn định trên iPhone hoặc muốn lên store.

### Việc phải thêm cho Capacitor

- **Đăng nhập bằng token**, lưu trong bộ nhớ an toàn của máy. App native khác origin, không dùng được cookie phiên và cách kiểm tra CSRF theo Origin của web (PRD MR-3).
- **Thông báo đẩy FCM/APNs:**
  - Thêm bảng lưu token thiết bị.
  - Thêm job chạy hằng ngày theo múi giờ tài khoản để gửi nhắc D7/D1. Hiện thông báo chỉ được tính khi mở app.
  - Thêm kênh `push` vào thông báo (PRD MR-4).
- **Deep link:** email xác minh và đặt lại mật khẩu phải mở thẳng vào app (universal link / app link).
- **Camera:** chụp ảnh bằng plugin native. API đã nhận ảnh HEIC.
- **Có thể làm thêm:** đăng nhập bằng Face ID hoặc vân tay (PRD §1.3).

---

## 2. Bản tin ảnh kiểu Instagram (rút gọn)

> **Trạng thái 2026-10-26: đã làm xong trên máy dev** (F-02→F-13). Khác với phác thảo dưới đây:
> - **Không có báo cáo bài / tự ẩn** (DEC-025): chỉ chặn + giới hạn chống spam.
> - **Gắn thú cưng là tùy chọn** (0–5 bé), bài hiện tên người dùng; một hồ sơ chứa mọi ảnh (DEC-028).
> - Bài công khai với **tài khoản đã đăng nhập**, không phải mọi người (DEC-024).
> - Thêm: nickname + ngày sinh + nhập lại mật khẩu khi đăng ký (DEC-030); nén ảnh > 5 MB trên thiết bị (DEC-026); mục "Hồ sơ" trên thanh điều hướng; chuông tự cập nhật 30 giây (DEC-029); thông báo hoạt động lưu bảng riêng, tab riêng.
> - Làm trên máy dev trước; server công khai và R2 làm cùng đợt production (DEC-023).

**Mục tiêu:** người dùng đăng ảnh thú cưng, theo dõi nhau, thả tim và bình luận. Lấy phần lõi của Instagram, bỏ các tính năng nặng.

### Phạm vi

**Làm:**
- **Hồ sơ công khai:** username, ảnh đại diện, giới thiệu ngắn, lưới ảnh 3 cột.
- **Bài đăng:**
  - Mỗi bài 1–5 ảnh, có chú thích, gắn thú cưng.
  - Sửa được chú thích, xóa được bài (xóa luôn ảnh).
- **Theo dõi:**
  - Theo dõi ngay, không cần duyệt; bỏ theo dõi được.
  - Tìm người theo username.
- **Bản tin:** bài của người mình theo dõi, mới nhất trước, không có thuật toán xếp hạng. Tải dần khi cuộn.
- **Tương tác:**
  - Thả tim.
  - Bình luận một cấp, không trả lời lồng nhau; xóa được bình luận của mình.
- **Thông báo** khi được thả tim, bình luận hoặc theo dõi. Dùng lại module thông báo hiện có.
- **An toàn:**
  - Chặn người dùng.
  - Báo cáo bài; bài bị báo cáo nhiều lần thì tự ẩn.
  - Giới hạn tần suất đăng bài và bình luận.

**Không làm:** story, reels, video, nhắn tin, hashtag, trang khám phá, chia sẻ, lưu bài, tài khoản riêng tư cần duyệt theo dõi.

**Quyền xem:**
- Bài đăng công khai với mọi tài khoản.
- Dữ liệu sức khỏe (cân nặng, sổ y tế, lịch mốc, thông báo nhắc) **vẫn chỉ chủ tài khoản xem được**, giữ RLS `owner_isolation` như hiện nay.

### Danh sách task dự kiến (~13 task, 4–5 tuần)

| # | Task |
|---|---|
| 1 | Server công khai có HTTPS (cần khi có nhiều người dùng) |
| 2 | Chuyển lưu ảnh sang R2 (hoặc B2) qua `ObjectStoragePort` |
| 3 | Hồ sơ công khai: username, bio, avatar (API + màn hình) |
| 4 | Schema `posts`, `post_photos`; phân quyền đọc công khai, ghi chỉ của chủ |
| 5 | API đăng, sửa, xóa bài; thêm loại ảnh "bài đăng" vào pipeline ảnh |
| 6 | Giao diện soạn bài: chọn nhiều ảnh, chú thích, chọn thú cưng |
| 7 | Lưới ảnh trên hồ sơ và chi tiết bài (vuốt giữa các ảnh) |
| 8 | Theo dõi / bỏ theo dõi, tìm theo username |
| 9 | Bản tin từ người đang theo dõi (API + giao diện cuộn) |
| 10 | Thả tim và bình luận (API + giao diện) |
| 11 | Thông báo thả tim, bình luận, theo dõi |
| 12 | Chặn, báo cáo, tự ẩn bài, giới hạn chống spam |
| 13 | Test chéo tài khoản (IDOR/RLS), E2E, chuỗi vi/en |

### Điểm khó

- **Phân quyền:** hiện mọi bảng đều khóa theo chủ tài khoản. Phần mạng xã hội cần quy tắc "ai cũng đọc, chỉ chủ sửa", còn dữ liệu sức khỏe vẫn khóa chặt. Bộ IDOR phải thêm nhiều ca đọc chéo.
- **Hạ tầng:** bắt buộc có server công khai. Ảnh nên chuyển khỏi đĩa local trên máy dev.

### Dùng lại được từ Giai đoạn 1

- Pipeline ảnh: tải lên, HEIC, xử lý nền, URL ký, xóa ảnh.
- Lightbox, ô chọn ảnh có % tải lên.
- Module thông báo.
- Bộ test IDOR, E2E.
- Từ điển vi/en.

---

## 3. Điều kiện chung

- Giai đoạn 1 hiện chỉ chạy trên máy dev (truy cập điện thoại qua Tailscale), đã bỏ task server/staging S2-06. Cả hai ý tưởng trên đều cần **làm lại phần server công khai có HTTPS**.
- Thứ tự gợi ý: server + R2 → PWA → bản tin ảnh → Capacitor + push.

## 4. Câu hỏi còn mở

| Câu hỏi | Trạng thái |
|---|---|
| Chọn PWA hay Capacitor cho bản đầu? | **Còn mở** (app điện thoại chưa làm) |
| Bản tin công khai với mọi tài khoản, hay chỉ người theo dõi mới xem được? | **Đã chốt:** công khai với mọi tài khoản đã đăng nhập (DEC-024) |
| Có cần người duyệt nội dung (admin) hay chỉ tự ẩn theo số lần báo cáo? | **Đã chốt:** không có báo cáo, không kiểm duyệt; chỉ chặn + giới hạn chống spam (DEC-025) |
| Hạn mức dung lượng ảnh mỗi người là bao nhiêu? | **Đã chốt:** 5 ảnh/bài, 30 bài/ngày, ảnh bài thu về 1080 px; ảnh > 5 MB nén trên thiết bị (DEC-026). Theo dõi dung lượng R2 khi lên production |
