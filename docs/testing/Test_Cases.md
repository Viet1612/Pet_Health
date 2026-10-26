# Đặc tả Test Case & Ma trận Truy vết — Pet Health

> **Tài liệu:** PH-TC-001 · **Phiên bản:** 1.0 · **Ngày:** 2026-10-26 · **Trạng thái:** Draft
> **Tài liệu mẹ:** [Test_Plan.md](Test_Plan.md) (PH-MTP-001)
> **Chuẩn:** IEEE 29119-3 (test case), IEEE 829-2008 (traceability)
> **Phạm vi:** 141 FR · 41 NFR · 50 story · 86 API operation · GĐ1 + GĐ2 trên môi trường dev

---

## 1. Quy ước

### 1.1 Sơ đồ mã test case

| Tiền tố | Ý nghĩa | Ví dụ |
|---|---|---|
| `TC-<MOD>-<nn>` | Case chức năng theo FR (mỗi FR có ít nhất 1 case) | `TC-AUTH-001` |
| `TC-<MOD>-<nn>-N<n>` | Case âm/negative | `TC-AUTH-001-N1` |
| `TC-<MOD>-<nn>-B<n>` | Case biên/boundary | `TC-WGT-001-B1` |
| `DB-<nn>` | Tích hợp DB/migration/RLS | `DB-02` |
| `CON-<nn>` | Hợp đồng API | `CON-01` |
| `API-<nn>` | API xuyên suốt (lỗi, phân trang, idempotency) | `API-03` |
| `E2E-<nn>` | Luồng hệ thống | `E2E-01` |
| `UAT-<nn>` | Chấp nhận theo epic | `UAT-05` |
| `REG-<nn>` | Hồi quy | `REG-01` |
| `PERF-<nn>` | Hiệu năng | `PERF-01` |
| `SEC-<nn>` | Bảo mật | `SEC-01` |
| `ACC-<nn>` | Accessibility | `ACC-01` |
| `UI-<nn>` | UI/UX | `UI-01` |
| `REL-<nn>` | Độ tin cậy | `REL-01` |
| `MNT-<nn>` | Khả năng bảo trì/static | `MNT-01` |
| `OPS-<nn>` | Vận hành/job | `OPS-01` |

### 1.2 Cấp độ và ưu tiên

| Cột | Giá trị |
|---|---|
| **Cấp** | `UT` unit · `IT` integration · `API` · `E2E` · `UI` · `UAT` · `SEC` · `PERF` · `ACC` · `OPS` |
| **Ưu tiên** | `P0` bắt buộc · `P1` nên có · `P2` có thể hoãn |
| **Trạng thái** | `Pass` · `Fail` · `Blocked` · `Pending` · `Not Run` · `N/A` |

### 1.3 Môi trường

| ID | Base URL / DB | Ghi chú |
|---|---|---|
| ENV-01 | `http://localhost:3000/api/v1`, `http://localhost:5173`, DB `pethealth` | Dev thủ công |
| ENV-02 | GitHub Actions | Unit/integration/contract/security/size |
| ENV-03 | `http://localhost:3100/api/v1`, `http://localhost:5174`, DB `pethealth_e2e`, Mailpit `:8025` | E2E; `NODE_ENV=test`; FakeClock |
| ENV-04/05 | Staging/production | **Chưa có** — case phụ thuộc ghi `Pending` |

### 1.4 Dữ liệu test chuẩn

| Tên | Giá trị |
|---|---|
| Tài khoản A | `qa.a+<run>@example.test` / mật khẩu test riêng |
| Tài khoản B, C | `qa.b+<run>@example.test`, `qa.c+<run>@example.test` |
| Bé Mochi | Poodle, Cái, sinh `2019-03-15` |
| Bé Bơ | British Shorthair, Đực, sinh `2026-05-01` |
| T0 (FakeClock) | `2026-11-01T09:00:00+07:00` (`Asia/Ho_Chi_Minh`) |
| Mốc | Hạn T0−1, T0, T0+1, T0+7, T0+8, T0+30; chu kỳ 1/12/60/không |
| Ảnh | `small.jpg` 200 KB; `6mb.jpg`; `12mb.heic`; `gps.jpg`; `fake.jpg` (text); `corrupt.heic` |

### 1.5 Quy ước viết case

- Bước được đánh số `1) 2) 3)` trong một ô, dùng `<br>`.
- "Kỳ vọng" phải quan sát được: status, mã lỗi, nội dung, trạng thái DB/UI.
- Case dùng `FakeClock` phải ghi rõ thời điểm; cuối case reset T0.
- Case email phải xóa hộp thư Mailpit trước khi bắt đầu.
- Case IDOR phải dùng tài khoản B gọi ID của A; xác nhận dữ liệu A không đổi.

---

## 2. Test case chức năng theo FR

### 2.1 AUTH — Tài khoản và xác thực (18 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-AUTH-001** | API, UI | 1) `POST /auth/register` với email có khoảng trắng + chữ hoa, mật khẩu 8 ký tự, nickname, ngày sinh hợp lệ.<br>2) Kiểm DB `users`.<br>3) Kiểm Mailpit. | 2xx; email lưu dạng trim + lowercase; tài khoản tạo; email xác minh xuất hiện ≤1 phút; mật khẩu không lưu dạng rõ. | FR-AUTH-001, 017, 018 |
| **TC-AUTH-002** | API, IT | 1) Lấy link trong Mailpit.<br>2) Mở link lần 1.<br>3) Mở lại lần 2. | Lần 1: tài khoản `email_verified`; lần 2: thông báo đã dùng + nút gửi lại; token một lần. | FR-AUTH-002, 004 |
| **TC-AUTH-003** | API | 1) Gửi lại xác minh 5 lần trong 1 giờ.<br>2) Gửi lần 6.<br>3) Dùng link cũ sau khi đã gửi lại. | 5 lần đầu 2xx; lần 6 bị chặn (429); link cũ không dùng được. | FR-AUTH-003 |
| **TC-AUTH-004** | API, UI | 1) Token hết hạn (T0+24h+1m).<br>2) Token đã dùng.<br>3) Token sai.<br>4) Token hợp lệ. | 1–3: thông báo lỗi tương ứng + nút "Gửi lại"; 4: xác minh thành công. | FR-AUTH-004 |
| **TC-AUTH-005** | API, UI | 1) Đăng nhập đúng.<br>2) Sai email.<br>3) Sai mật khẩu.<br>4) So sánh body/status. | Đúng: 2xx + cookie phiên; sai: cùng status 401 và cùng thông báo "Email hoặc mật khẩu không đúng"; không lộ tài khoản tồn tại. | FR-AUTH-005 |
| **TC-AUTH-006** | API | 1) Sai 5 lần trong 15 phút.<br>2) Thử đúng ngay sau đó.<br>3) FakeClock +15 phút, thử lại. | 1) 5 lần 401; 2) bị khóa (4xx/429) dù mật khẩu đúng; 3) đăng nhập được. | FR-AUTH-006 |
| **TC-AUTH-007** | API, UI | 1) Đăng nhập, lấy cookie.<br>2) `POST /auth/logout`.<br>3) Dùng lại cookie cũ.<br>4) Gọi logout không CSRF. | 2) 2xx, cookie bị xóa; 3) 401; 4) bị từ chối CSRF. | FR-AUTH-007 |
| **TC-AUTH-008** | API, UI | 1) Quên mật khẩu với email tồn tại.<br>2) Với email không tồn tại.<br>3) Mở link sau 60 phút.<br>4) Dùng link 1 lần. | 1–2: cùng thông báo/status; 3: hết hạn; 4: đổi được một lần; mật khẩu cũ không còn. | FR-AUTH-008 |
| **TC-AUTH-009** | API | 1) Đăng nhập 3 phiên.<br>2) Reset mật khẩu ở phiên 1.<br>3) Gọi API từ phiên 2, 3. | Phiên 2, 3 nhận 401; phiên hiện tại (nếu được giữ) vẫn hợp lệ theo thiết kế. | FR-AUTH-009 |
| **TC-AUTH-010** | API, UI | 1) Đổi mật khẩu với mật khẩu hiện tại đúng.<br>2) Sai hiện tại.<br>3) Mật khẩu mới 7 ký tự. | 1) 2xx; 2) 4xx, không đổi; 3) 422 lỗi trường; thông báo dưới ô. | FR-AUTH-010 |
| **TC-AUTH-011** | API, E2E | 1) `PATCH /me` hoặc `/me/locale` đổi múi giờ sang `America/New_York`.<br>2) Kiểm "hôm nay" ở checklist/mốc.<br>3) Đổi múi giờ không hợp lệ. | "Hôm nay" đổi ngay theo múi giờ mới; thông báo đã tạo giữ nguyên; múi giờ sai → 422; mặc định `Asia/Ho_Chi_Minh`. | FR-AUTH-011 |
| **TC-AUTH-012** | API | 1) Đăng nhập.<br>2) FakeClock +29 ngày, gọi API.<br>3) +30 ngày, gọi API.<br>4) +31 ngày. | 2) còn hợp lệ; 3–4) 401 khi hết hạn không hoạt động; hoạt động lại gia hạn trượt. | FR-AUTH-012 |
| **TC-AUTH-013** | API, SEC | 1) B dùng ID của A cho mọi endpoint có `{id}`/`{petId}`.<br>2) B dùng ID không tồn tại.<br>3) Kiểm dữ liệu A sau đó. | Cả 1–2: 404 giống nhau; không lộ tồn tại; dữ liệu A không đổi; áp dụng 100% endpoint. | FR-AUTH-013, NFR-SEC-004 |
| **TC-AUTH-014** | E2E | 1) Mở `/settings` khi chưa đăng nhập.<br>2) Đăng nhập.<br>3) Thử `next` là URL ngoài. | 1) chuyển `/login?next=/settings`; 2) quay lại `/settings`; 3) không redirect ra ngoài (open redirect bị chặn). | FR-AUTH-014 |
| **TC-AUTH-015** | API, IT | 1) `POST /me/email` với mật khẩu đúng + email mới.<br>2) Kiểm email cũ chưa đổi.<br>3) Mở link xác minh sau 60 phút.<br>4) Kiểm email cũ nhận thông báo. | Chỉ đổi sau xác minh; email mới phải chưa dùng; token một lần 60 phút; email cũ được thông báo; trạng thái verified. | FR-AUTH-015 |
| **TC-AUTH-016** | API, E2E | 1) `DELETE /me` với mật khẩu đúng.<br>2) Đăng nhập lại.<br>3) Kiểm DB/media.<br>4) B xem hồ sơ A. | 2) không đăng nhập được; 3) không còn dữ liệu sức khỏe, social, media; 4) 404. | FR-AUTH-016 |
| **TC-AUTH-017** | API, UI | 1) Đăng ký nickname 1 và 50 ký tự.<br>2) Ngày sinh 01/01/1900, hôm nay, tương lai, ngày không tồn tại.<br>3) Tài khoản cũ chưa có dữ liệu mở app. | 1) chấp nhận; 2) tương lai → `FUTURE_DATE`, không tồn tại → `INVALID_DATE`; 3) hỏi bổ sung một lần; ngày sinh không hiện với người khác. | FR-AUTH-017 |
| **TC-AUTH-018** | UI | 1) Nhập mật khẩu và nhập lại khác.<br>2) Gõ lại cho khớp.<br>3) Theo dõi network. | 1) lỗi ngay dưới ô, không gửi request; 2) lỗi biến mất; 3) chỉ gửi khi khớp. | FR-AUTH-018 |
| **TC-AUTH-001-N1** | API | Đăng ký với email sai định dạng, email trùng (khác hoa thường), mật khẩu 7/129, nickname rỗng/51, ngày sinh tương lai. | 422 với lỗi đúng trường; email trùng → 409; không tạo tài khoản. | FR-AUTH-001, 017 |
| **TC-AUTH-006-N1** | API | 6 request sai đồng thời từ 2 thiết bị. | Không bypass khóa; số đếm chính xác; không tạo session. | FR-AUTH-006 |
| **TC-AUTH-013-N1** | API | B gọi ID của A với ID sai định dạng, ID đã xóa, ID của chính B. | ID sai/đã xóa → 404; ID của B → 2xx; không 500. | FR-AUTH-013 |

### 2.2 PET — Hồ sơ thú cưng (8 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-PET-001** | API, UI | 1) Tạo bé với đủ 4 trường.<br>2) Tên toàn khoảng trắng.<br>3) Giới tính ngoài enum.<br>4) Ngày sinh hôm nay/tương lai. | 1) 2xx, hiện trong danh sách; 2–3) 422; 4) hôm nay OK, tương lai 422. | FR-PET-001 |
| **TC-PET-002** | API, UI | 1) Tạo 10 bé.<br>2) Kiểm nút "Thêm" ở bé thứ 10.<br>3) Gọi API tạo bé 11.<br>4) 2 request tạo đồng thời khi đã có 9. | 1) 10 bé; 2) nút bị vô hiệu + chú thích; 3) 409 `PET_LIMIT_REACHED`; 4) chỉ 1 thành công, không vượt 10. | FR-PET-002 |
| **TC-PET-003** | UT, API | Kiểm 4 ca SRS §2.10.1: 2019-03-15→2026-10-22; 2019-03-25→2026-10-22; 2026-05-01→2026-10-22; 2026-10-10→2026-10-22. | Lần lượt "7 năm 7 tháng", "7 năm 6 tháng", "5 tháng", "0 tháng". | FR-PET-003 |
| **TC-PET-004** | API, UI | 1) Lưu đặc điểm 0, 2.000 ký tự.<br>2) Lưu 2.001 ký tự.<br>3) Bỏ trống. | 1) OK; 2) 422; 3) OK (không bắt buộc). | FR-PET-004 |
| **TC-PET-005** | API, IT | 1) Upload JPG/PNG/HEIC hợp lệ.<br>2) File text đổi đuôi `.jpg`.<br>3) Ảnh 6 MB.<br>4) Ảnh HEIC.<br>5) Ảnh có GPS.<br>6) Xóa avatar. | 1) nhận; 2) từ chối theo magic bytes; 3) nén client hoặc 413; 4) chuyển JPG; 5) không còn EXIF/GPS; 6) avatar mất, file purge; URL ký hết hạn. | FR-PET-005, NFR-SEC-011 |
| **TC-PET-006** | API, UI | 1) Sửa từng trường.<br>2) Sửa với dữ liệu sai.<br>3) B sửa bé của A. | 1) cập nhật đúng; 2) 422; 3) 404, dữ liệu A không đổi. | FR-PET-006 |
| **TC-PET-007** | E2E, UI | 1) Chọn bé ở Dashboard.<br>2) Mở Cân nặng, Sổ y tế, Mốc, Việc.<br>3) Reload.<br>4) Xóa bé đang chọn. | Bộ chọn có mặt ở mọi màn dữ liệu; 1 thao tác; nhớ theo thiết bị; reload giữ; bé bị xóa → fallback bé đầu tiên/empty. | FR-PET-007 |
| **TC-PET-008** | API, E2E | 1) Xóa với tên sai.<br>2) Tên đúng nhưng khác hoa thường/khoảng trắng.<br>3) Kiểm DB và media sau xóa. | 1) 422/409, không xóa; 2) xóa; 3) mất cân nặng, khám, ảnh, mốc, thông báo, việc; job purge chạy. | FR-PET-008 |
| **TC-PET-001-B1** | API | Tên 1 và 50 ký tự; giống 1 và 50; tên 51; giống 51. | 1/50 OK; 51 → 422. | FR-PET-001 |
| **TC-PET-002-N1** | API | Tạo bé khi đã có 10, đồng thời 5 request. | 0 request thành công; tất cả 409; DB vẫn 10. | FR-PET-002 |

### 2.3 WGT — Cân nặng (10 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-WGT-001** | API, UI | 1) Thêm 9,2 với ngày mặc định.<br>2) Nhập `9.2`.<br>3) Nhập 0,1; 150.<br>4) Nhập 0; 150,1; 9,25.<br>5) Ngày tương lai. | 1–2) lưu 9,2; 3) OK; 4) 422 `OUT_OF_RANGE`/lỗi định dạng; 5) 422 `DATE_IN_FUTURE`. | FR-WGT-001 |
| **TC-WGT-002** | API | Thêm 2 số đo cùng ngày. | Cả hai được giữ; không ghi đè; hiện 2 điểm. | FR-WGT-002 |
| **TC-WGT-003** | API, UI | Tạo số đo ngày 01, 03, 03 (khác giờ). | Danh sách giảm dần theo ngày; cùng ngày giảm dần theo thời điểm tạo. | FR-WGT-003 |
| **TC-WGT-004** | UI, E2E | 1) 0 điểm.<br>2) 1 điểm.<br>3) Nhiều điểm + mục tiêu.<br>4) Kiểm trục Y. | 1) empty state; 2) 1 điểm + gợi ý; 3) đường nối; 4) trục Y bao cả số đo và mục tiêu. | FR-WGT-004 |
| **TC-WGT-005** | API, UI | 1) Đặt mục tiêu 9.<br>2) Sửa 8,5.<br>3) Xóa.<br>4) Giá trị 0/150,1. | 1–3) cập nhật ngay; 4) 422; mục tiêu hiện trên thẻ/biểu đồ. | FR-WGT-005 |
| **TC-WGT-006** | UI | Có mục tiêu, kiểm biểu đồ. | Đường ngang nét đứt tại đúng giá trị, cùng trục Y. | FR-WGT-006 |
| **TC-WGT-007** | UI | Rê/chạm điểm có mục tiêu; điểm không có mục tiêu. | Tooltip: ngày, kg, chênh lệch có dấu +/−, 1 chữ số thập phân; không mục tiêu thì ẩn chênh lệch. | FR-WGT-007 |
| **TC-WGT-008** | UI | 0 số đo; 1 số đo. | 0: empty state đúng PRD; 1: 1 điểm + "Thêm số đo tháng sau để thấy xu hướng". | FR-WGT-008 |
| **TC-WGT-009** | UI | Có ≥2 số đo; chỉ 1 số đo. | Thẻ tóm tắt hiện gần nhất + chênh lệch so với liền trước; 1 số đo không hiện chênh lệch. | FR-WGT-009 |
| **TC-WGT-010** | API, UI | 1) Sửa số đo.<br>2) Xóa số đo.<br>3) B sửa/xóa số đo của A. | 1–2) thành công, biểu đồ cập nhật; 3) 404, dữ liệu A không đổi. | FR-WGT-010 |
| **TC-WGT-001-B1** | API | 0,0; 0,1; 150,0; 150,1; 9,25; 9,2; 9.2; 9,; ,2. | Chỉ 0,1–150 và ≤1 chữ số thập phân được nhận; `,` và `.` tương đương. | FR-WGT-001 |
| **TC-WGT-005-B1** | API | Mục tiêu 0,1; 150; 150,1; 9,25. | 0,1/150 OK; 150,1/9,25 → 422. | FR-WGT-005 |

### 2.4 VIS — Sổ y tế (8 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-VIS-001** | API, UI | 1) Tạo bản ghi chỉ triệu chứng.<br>2) Chỉ chẩn đoán.<br>3) Cả hai rỗng/toàn khoảng trắng.<br>4) Trường 2.000/2.001 ký tự.<br>5) Ngày tương lai. | 1–2) OK; 3) 422; 4) 2.000 OK, 2.001 lỗi; 5) 422 `DATE_IN_FUTURE`. | FR-VIS-001 |
| **TC-VIS-002** | API, UI | Tạo 25 bản ghi, nhiều ngày; mở danh sách. | 20 bản ghi trang 1, 5 trang 2; giảm dần theo ngày, cùng ngày theo tạo; dòng có ngày, chẩn đoán 1 dòng, số ảnh. | FR-VIS-002 |
| **TC-VIS-003** | API, UI | Sửa từng trường; sửa vi phạm quy tắc. | Hợp lệ cập nhật; vi phạm 422; giữ nguyên dữ liệu cũ. | FR-VIS-003 |
| **TC-VIS-004** | API, E2E | 1) Xóa không xác nhận.<br>2) Xác nhận.<br>3) Kiểm ảnh đính kèm. | 1) không xóa; 2) xóa; 3) ảnh và file bị xóa. | FR-VIS-004 |
| **TC-VIS-005** | API, IT | 1) Đính 5 ảnh JPG/PNG/HEIC.<br>2) Ảnh thứ 6.<br>3) File giả.<br>4) HEIC/GPS. | 1) OK; 2) 422; 3) từ chối; 4) HEIC→JPG, EXIF/GPS bị bỏ. | FR-VIS-005 |
| **TC-VIS-006** | API, UI | 1) Upload 3 ảnh, 1 ảnh lỗi.<br>2) Kiểm 2 ảnh còn lại.<br>3) Bấm "Thử lại". | 2 ảnh READY, bản ghi vẫn OK; ảnh lỗi có nút thử lại; thử lại thành công. | FR-VIS-006 |
| **TC-VIS-007** | API, UI | Xóa 1 ảnh trong bản ghi. | Ảnh biến mất, số ảnh giảm, file purge; bản ghi còn. | FR-VIS-007 |
| **TC-VIS-008** | UI | Mở bản ghi có ảnh, chạm ảnh. | Thumbnail đúng; lightbox mở, xem được ảnh lớn, đóng được. | FR-VIS-008 |
| **TC-VIS-001-N1** | API | Chỉ khoảng trắng ở cả hai; 2.001 ký tự; ngày 2099. | 422 với lỗi đúng trường; không tạo. | FR-VIS-001 |
| **TC-VIS-005-B1** | API | 0 ảnh; 5 ảnh; 6 ảnh; ảnh 5 MB; 6 MB. | 0 OK (không bắt buộc); 5 OK; 6 lỗi; 5 MB OK; 6 MB bị nén/413 theo client. | FR-VIS-005 |

### 2.5 MS — Mốc y tế (13 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-MS-001** | API, UI | 1) Tạo `VACCINE` hạn T0+30, ghi chú, không chu kỳ.<br>2) Tạo `FLEA` chu kỳ 1.<br>3) Tạo `DEWORM` chu kỳ 60.<br>4) Hạn trong quá khứ.<br>5) Ghi chú 500/501; chu kỳ 0/61. | 1–4) tạo được, trạng thái `PENDING`; 5) 500/1/60 OK, 501/0/61 lỗi; `VACCINE` luôn chu kỳ 12. | FR-MS-001 |
| **TC-MS-002** | API, IT | Tạo mốc tại T0 với hạn T0+30; đọc DB. | `due_set_on = T0`; các mức nhắc được xác định theo FR-NTF-001→003; chưa tạo thông báo nếu `appear_on ≤ due_set_on`. | FR-MS-002 |
| **TC-MS-003** | API, UI | 1) Đánh dấu DONE, không nhập ngày.<br>2) Nhập ngày quá khứ.<br>3) Nhập ngày tương lai. | 1) `doneOn = hôm nay`; 2) OK; 3) 422 `FUTURE_DATE`; trạng thái `DONE`, ngày thực hiện hiển thị. | FR-MS-003 |
| **TC-MS-004** | API, IT | 1) Tạo mốc có thông báo chưa xem.<br>2) Đánh dấu DONE.<br>3) Tải lại Dashboard/Thông báo. | Thông báo của mốc chuyển `processed` lý do `DONE`, coi như đã xem; không tạo thông báo mới cho mốc. | FR-MS-004 |
| **TC-MS-005** | API, E2E | 1) DONE, trong 10 giây bấm Hoàn tác.<br>2) Kiểm trạng thái/thông báo/mốc AUTO.<br>3) DONE lại, chờ >10 giây, hoàn tác. | 1–2) về `PENDING`; thông báo được khôi phục đúng; mốc AUTO vừa tạo bị xóa; 3) bị từ chối. | FR-MS-005 |
| **TC-MS-006** | API, UI | 1) Sửa hạn của mốc PENDING.<br>2) Sửa ghi chú/chu kỳ.<br>3) Kiểm `due_set_on` và thông báo cũ.<br>4) Sửa mốc DONE/CANCELLED. | 1) `due_set_on = hôm nay`, thông báo cũ `processed` lý do `RESCHEDULED`; 2) cập nhật; 3) đúng; 4) bị từ chối. | FR-MS-006 |
| **TC-MS-007** | API, UI | 1) Hủy mốc PENDING không xác nhận.<br>2) Xác nhận.<br>3) Kiểm thông báo. | 1) không đổi; 2) `CANCELLED`; 3) thông báo `processed` lý do `CANCELLED`, ẩn banner. | FR-MS-007 |
| **TC-MS-008** | API, IT | 1) `VACCINE` DONE ngày 2026-11-14.<br>2) Kiểm mốc mới.<br>3) Lặp với 2028-02-29. | 1) đúng 1 mốc `AUTO`, `PENDING`, hạn 2027-11-14; 2) sao chép ghi chú; thông báo ngày mới; 3) hạn 2029-02-28. | FR-MS-008, BRU-011 |
| **TC-MS-009** | API, IT | 1) `FLEA` chu kỳ 3 DONE ngày 2026-11-14.<br>2) `DEWORM` không chu kỳ DONE.<br>3) `DEWORM` chu kỳ 1 DONE ngày 2026-01-31. | 1) 1 mốc AUTO hạn 2027-02-14, giữ ghi chú/chu kỳ; 2) không tạo; 3) hạn 2026-02-28. | FR-MS-009, BRU-012 |
| **TC-MS-010** | API | `PATCH /milestones/{id}` gửi `type` khác. | Bị từ chối (422) hoặc bỏ qua có kiểm soát; loại không đổi; các trường khác vẫn cập nhật nếu hợp lệ. | FR-MS-010, SD-004 |
| **TC-MS-011** | API, IT | 1) Gửi complete 2 lần liên tiếp.<br>2) Gửi 10 request song song.<br>3) Kiểm DB. | Chỉ 1 mốc kế tiếp; không lỗi 500; các request còn lại trả kết quả idempotent. | FR-MS-011 |
| **TC-MS-012** | API, UI | Tạo mốc sắp tới, quá hạn, đã thực hiện, đã hủy; mở danh sách. | 4 nhóm đúng; sắp tới/quá hạn tăng dần theo hạn; đã thực hiện giảm dần theo ngày; đã hủy riêng. | FR-MS-012 |
| **TC-MS-013** | UI | Kiểm màu + nhãn của quá hạn, ≤7 ngày, >7 ngày, đã thực hiện. | Đỏ/cam/trung tính/xanh **kèm nhãn chữ**; không chỉ dựa vào màu. | FR-MS-013 |
| **TC-MS-001-N1** | API | Tạo `VACCINE` với chu kỳ 1; `FLEA` chu kỳ 0/61; ghi chú 501; loại sai. | `VACCINE` bỏ qua chu kỳ truyền vào và dùng 12; các trường hợp còn lại 422. | FR-MS-001 |
| **TC-MS-006-N1** | API | Sửa hạn mốc DONE; sửa loại; sửa mốc của B. | 4xx; dữ liệu không đổi; B nhận 404. | FR-MS-006, 010 |
| **TC-MS-008-B1** | UT | Bảng cộng tháng: 2026-11-14 +12; 2028-02-29 +12; 2026-11-14 +3; 2026-01-31 +1. | 2027-11-14; 2029-02-28; 2027-02-14; 2026-02-28. | FR-MS-008, 009, BRU-011/012 |

### 2.6 NTF — Nhắc nhở trong app (11 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-NTF-001** | UT, API, E2E | Chạy bảng 9 ca SRS §2.6.1: hạn 15/11, đặt hạn 01/11; mở app 07/11, 08/11, 11/11, 14/11; đặt hạn 11/11; hạn 12/11. | Đúng từng ca: không có, D7 "còn 7 ngày", D7 "còn 4 ngày", D1 + D7 đã xem, chỉ D1, không có, không có. | FR-NTF-001, 003, 004 |
| **TC-NTF-002** | API, E2E | Mốc PENDING hạn T0−1; mở app T0. | Tạo `OVERDUE` nhãn "quá hạn 1 ngày"; chỉ 1 thông báo chưa xem. | FR-NTF-002 |
| **TC-NTF-003** | API | 1) Tạo mốc hôm nay hạn T0+7.<br>2) Đổi hạn sang T0+1.<br>3) Mở app cùng ngày. | Không tạo nhắc bù vì `appear_on ≤ due_set_on`; sau khi đổi hạn, `due_set_on = hôm nay`. | FR-NTF-003 |
| **TC-NTF-004** | API, IT | 1) Không mở app từ T0−7 đến T0−1.<br>2) Mở app T0−1.<br>3) Kiểm số thông báo. | Chỉ tạo mức muộn nhất (D1), không tạo D7; mỗi mốc tối đa 1 chưa xem; D7 cũ (nếu có) chuyển đã xem. | FR-NTF-004 |
| **TC-NTF-005** | API, IT | 1) Tải lại 5 lần.<br>2) Mở 2 thiết bị.<br>3) 10 request song song. | Tối đa 1 thông báo cho bộ (mốc, mức, hạn); không 500; unique constraint giữ. | FR-NTF-005, G-15 |
| **TC-NTF-006** | API, IT | DONE, CANCELLED, đổi hạn, xóa bé; kiểm thông báo. | Tất cả thông báo hiện có chuyển `processed` với lý do đúng; coi là đã xem; không hiện banner. | FR-NTF-006 |
| **TC-NTF-007** | UI | Mở banner/mục Thông báo; chạm một nhắc. | Hiện tên bé, loại mốc, ghi chú, hạn `dd/MM/yyyy`, nhãn đúng thời điểm, ngày xuất hiện; chạm mở đúng mốc; không lộ nội dung y tế khác. | FR-NTF-007 |
| **TC-NTF-008** | API, UI | 1) 0 chưa xem.<br>2) 1 chưa xem.<br>3) 12 chưa xem.<br>4) Mở danh sách 25 mục.<br>5) Đánh dấu tất cả. | 1) ẩn badge; 2) "1"; 3) "9+"; 4) 20 mục trang 1, sắp giảm dần, cùng ngày OVERDUE>D1>D7, chưa xem nổi bật, đã xử lý mờ + nhãn; 5) tất cả đã xem. | FR-NTF-008, SD-014 |
| **TC-NTF-009** | E2E | Có 3 nhắc: OVERDUE, D1, D7; mở Dashboard. | Banner hiện OVERDUE (đỏ) + "+2 nhắc khác"; nút Xem/Đã thực hiện/Đóng; đóng → các nhắc được tóm tắt chuyển đã xem; D7/D1 màu cam + nhãn chữ. | FR-NTF-009 |
| **TC-NTF-010** | API, E2E | 1) Đánh dấu đã xem trên A.<br>2) Mở B.<br>3) Chuyển tab đi rồi quay lại.<br>4) Ẩn tab 60 giây. | 1–2) trạng thái nhất quán; 3) refetch; 4) polling 30 giây dừng khi tab ẩn, chạy lại khi hiện. | FR-NTF-010, DC-003 |
| **TC-NTF-011** | IT, OPS | Tạo thông báo `appear_on` 91 ngày trước; chạy `maintenance.daily`. | Thông báo bị xóa; thông báo 89 ngày còn; job idempotent. | FR-NTF-011, SD-013 |
| **TC-NTF-001-B1** | UT | Biên 00:00: hạn T0+7, mở app T0+7 00:00:00 và 23:59:59; múi giờ `America/New_York`. | Tạo đúng khi sang ngày địa phương; không tạo sớm 1 giây; đổi múi giờ đổi "hôm nay". | FR-NTF-001, FR-GEN-001 |
| **TC-NTF-005-N1** | API | 2 request song song cùng mốc/mức/hạn. | 1 tạo, 1 trả bản ghi cũ; không lỗi unique ra ngoài. | FR-NTF-005 |

### 2.7 RT — Việc chăm sóc hằng ngày (7 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-RT-001** | API, UI | 1) Tạo việc tên 1/100 ký tự, giờ `00:00`, `23:59`.<br>2) Tên 101; giờ `24:00`.<br>3) Tạo việc thứ 21. | 1) OK; 2) 422; 3) 422/409, tối đa 20/bé. | FR-RT-001 |
| **TC-RT-002** | API, UI | Tạo 4 việc giờ 07:00, 18:00, 07:30; đánh dấu 1 việc xong. | Sắp tăng dần theo giờ; việc xong xuống cuối, gạch ngang; bộ đếm "1/4 xong". | FR-RT-002 |
| **TC-RT-003** | E2E | 1) Chạm việc.<br>2) Giả lập API lỗi.<br>3) Kiểm UI. | 1) đổi ngay (optimistic); 2) quay lại trạng thái cũ + thông báo lỗi; không mất dữ liệu. | FR-RT-003 |
| **TC-RT-004** | API, IT | 1) Đánh dấu xong hôm nay.<br>2) FakeClock qua 00:00.<br>3) Mở checklist.<br>4) Đổi múi giờ. | 1) lưu cặp (việc, ngày); 2–3) ngày mới tất cả chưa xong; 4) "hôm nay" đổi theo múi giờ. | FR-RT-004 |
| **TC-RT-005** | IT | Đánh dấu xong 3 ngày, xóa việc; kiểm bảng completion. | Lịch sử các ngày trước vẫn còn; dùng được cho MET-003; việc đã xóa không còn trong checklist. | FR-RT-005, SD-008 |
| **TC-RT-006** | API, UI | Sửa tên/giờ; mở checklist hôm nay. | Thay đổi áp dụng ngay; thứ tự cập nhật theo giờ mới. | FR-RT-006 |
| **TC-RT-007** | API, E2E | 1) Xóa việc không xác nhận.<br>2) Xác nhận.<br>3) Kiểm lịch sử. | 1) không xóa; 2) biến khỏi checklist ngay; 3) lịch sử ngày trước giữ nguyên. | FR-RT-007 |
| **TC-RT-001-B1** | API | 20/21 việc; giờ `00:00`, `23:59`, `7:00`, `24:00`. | 20 OK, 21 lỗi; `00:00`/`23:59` OK; `7:00` chuẩn hóa hoặc lỗi theo schema; `24:00` lỗi. | FR-RT-001 |
| **TC-RT-003-N1** | E2E | Double click liên tiếp. | Chỉ 1 request hoặc kết quả cuối đúng; không tạo trạng thái sai; UI nhất quán. | FR-RT-003 |

### 2.8 DSH — Dashboard (7 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-DSH-001** | E2E | Đăng nhập thành công. | Chuyển `/` (Dashboard), không phải màn khác. | FR-DSH-001 |
| **TC-DSH-002** | E2E, API | Mở Dashboard có dữ liệu. | 1 request `GET /dashboard`; banner (nếu có) + 3 panel Việc hôm nay, Mốc sắp tới, Cân nặng của bé đang chọn. | FR-DSH-002 |
| **TC-DSH-003** | API, UI | Tạo 7 mốc PENDING: 3 quá hạn, 2 trong 30 ngày, 2 sau 30 ngày. | Panel tối đa 5: quá hạn trước (hạn tăng dần), rồi trong 30 ngày (tăng dần); mỗi mốc có nút hoàn tất tại chỗ. | FR-DSH-003 |
| **TC-DSH-004** | UI | Kiểm 360/390/767/768/1279/1280/1366 px. | <768: 1 cột đúng thứ tự Việc→Mốc→Cân nặng + nav dưới; 768–1279: 2 cột 60/40 + nav trái; ≥1280: như 2 cột, nội dung max 1280 căn giữa. | FR-DSH-004 |
| **TC-DSH-005** | API, UI | Chọn "Tất cả", từng bé. | "Tất cả" gộp việc + mốc mọi bé, mỗi mục có tên bé; từng bé chỉ dữ liệu bé đó; lọc nhớ theo thiết bị. | FR-DSH-005 |
| **TC-DSH-006** | E2E | Tài khoản chưa có bé. | Empty state "Thêm thú cưng đầu tiên" thay 3 panel; nút tạo hoạt động. | FR-DSH-006 |
| **TC-DSH-007** | E2E | Tài khoản chưa xác minh email. | Banner xác minh dưới banner nhắc, có nút gửi lại; không chặn chức năng; sau xác minh banner biến mất. | FR-DSH-007 |
| **TC-DSH-002-N1** | API | Dashboard khi 0 bé, 0 mốc, 0 cân nặng. | 200 với cấu trúc rỗng đúng schema; UI empty state; không 500. | FR-DSH-002, 006 |

### 2.9 GEN — Hành vi toàn hệ thống (13 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-GEN-001** | UT, IT | 1) Tạo dữ liệu ở `Asia/Ho_Chi_Minh` và `America/New_York`.<br>2) Đọc DB. | Timestamp lưu UTC; ngày lưu date-only; "hôm nay" đúng múi giờ tài khoản; không lệch ngày. | FR-GEN-001 |
| **TC-GEN-002** | UI | Kiểm ngày và số trên 5 màn. | Ngày `dd/MM/yyyy`; số thập phân dấu phẩy (`9,2 kg`); i18n tiếng Anh dùng định dạng phù hợp. | FR-GEN-002, NFR-USA-007 |
| **TC-GEN-003** | E2E | 1) Ngắt mạng khi đang nhập form.<br>2) Bật lại. | Banner "Mất kết nối — thay đổi chưa được lưu"; nút Lưu bị vô hiệu; nội dung giữ; có mạng lại banner tự ẩn. | FR-GEN-003 |
| **TC-GEN-004** | E2E | Giả lập API chậm >10 giây khi lưu. | Coi là thất bại; "Không lưu được" + "Thử lại"; form giữ nguyên; không tạo bản ghi trùng. | FR-GEN-004 |
| **TC-GEN-005** | API, IT | 1) POST với `Idempotency-Key`.<br>2) Gửi lại cùng key sau 1 giờ.<br>3) Sau 24 giờ.<br>4) Thiếu key. | 1) tạo; 2) trả kết quả cũ, không tạo mới; 3) key hết hạn, tạo mới; 4) 400/422; nút lưu bị vô hiệu trong lúc chờ. | FR-GEN-005 |
| **TC-GEN-006** | E2E | 1) Nhập form, để session hết hạn.<br>2) Đăng nhập lại.<br>3) Kiểm form. | Bản nháp lưu `sessionStorage`; chuyển login; sau login khôi phục đúng nội dung; không lưu vào localStorage. | FR-GEN-006 |
| **TC-GEN-007** | API | Hai thiết bị sửa cùng bản ghi; lưu lần lượt. | Lần lưu sau ghi đè; không cảnh báo xung đột; dữ liệu cuối = lần lưu sau. | FR-GEN-007 |
| **TC-GEN-008** | E2E | 1) Mở màn, sửa ở tab khác.<br>2) Quay lại/tải lại. | Luôn lấy dữ liệu mới nhất; không hiện cache cũ hơn lần lưu thành công gần nhất. | FR-GEN-008 |
| **TC-GEN-009** | UI | Lưu thành công; đánh dấu mốc DONE. | Toast "Đã lưu" 3 giây; toast mốc có nút "Hoàn tác" hoạt động trong 10 giây. | FR-GEN-009 |
| **TC-GEN-010** | UI | Mở từng dialog xóa; nhập sai trường. | Mọi xóa có xác nhận; lỗi hiện ngay dưới trường, đúng nội dung PRD §4.2; không chỉ toast chung. | FR-GEN-010 |
| **TC-GEN-011** | E2E | Giả lập 500 từ API. | Thông báo chung + mã tham chiếu ngắn; không lộ stack/SQL/tên bảng. | FR-GEN-011 |
| **TC-GEN-012** | UI | Mở từng màn không có dữ liệu. | Empty state đúng PRD §4.2 cho từng màn; có hành động gợi ý. | FR-GEN-012 |
| **TC-GEN-013** | UI, E2E | 1) Chọn ảnh 4 MB.<br>2) 6 MB.<br>3) 50 MB.<br>4) HEIC không đọc được.<br>5) Ảnh vẫn >5 MB sau nén. | 1) gửi nguyên; 2–3) nén cạnh dài ≤3.000 px, JPEG ≤5 MB rồi gửi; 4–5) "Ảnh quá lớn" như 413; không treo UI. | FR-GEN-013 |
| **TC-GEN-005-N1** | API | Cùng key nhưng payload khác; key sai định dạng. | Payload khác → 409/422; key sai → 400; không tạo bản ghi. | FR-GEN-005 |
| **TC-GEN-003-N1** | E2E | Mất mạng khi đang gửi request. | Không tạo bản ghi; banner + nút thử lại; idempotency đảm bảo không trùng. | FR-GEN-003, 004 |

### 2.10 ANL — Analytics (6 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-ANL-001** | API, DB | Thực hiện các hành động: đăng ký, tạo bé, thêm cân nặng, tạo mốc, mở app, tim, bình luận, theo dõi, chặn, xem feed. | Mỗi event đúng điều kiện + thuộc tính theo PRD §5.2; không thừa/thiếu event; ghi vào `analytics_events`. | FR-ANL-001 |
| **TC-ANL-002** | API, DB | Kiểm 1 event bất kỳ. | Có `user_id_hash`, `platform = web`, `device_class`, `viewport_w`, `timestamp`; hash ổn định. | FR-ANL-002 |
| **TC-ANL-003** | API, DB | Gửi event chứa email/tên bé/triệu chứng/chẩn đoán/đơn thuốc/ghi chú. | Bị lọc/loại bỏ; DB không chứa các giá trị này; chỉ trường allowlist. | FR-ANL-003 |
| **TC-ANL-004** | IT | Tạo thông báo, tạo mốc AUTO. | `notification_created`, `milestone_auto_created` được ghi từ server dù client không gửi. | FR-ANL-004 |
| **TC-ANL-005** | E2E | Làm hỏng endpoint analytics (500/timeout). | Luồng chính vẫn thành công; không có lỗi UI; event có thể mất nhưng không ảnh hưởng chức năng. | FR-ANL-005 |
| **TC-ANL-006** | API, DB | Tạo hồ sơ, đăng bài, tim, bình luận, theo dõi, chặn, xem feed. | Đủ 8 event social + funnel `analytics_funnel_social`; props không chứa caption/comment/username/post ID. | FR-ANL-006 |
| **TC-ANL-001-N1** | API | Gửi 21 event; payload 16 KB+1; event sai schema. | 20 OK, 21 lỗi; quá 16 KB → 413; sai schema → 422. | FR-ANL-001, 002 |
| **TC-ANL-003-N1** | API, DB | Gửi event với `props` chứa khóa lạ. | Bị từ chối hoặc lọc theo allowlist; DB không có khóa lạ. | FR-ANL-003 |

### 2.11 SOC — Bản tin ảnh thú cưng (40 FR)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **TC-SOC-001** | API, E2E | 1) Tài khoản chưa có hồ sơ mở `/feed`.<br>2) Tạo hồ sơ với username, tên hiển thị, giới thiệu, ảnh.<br>3) Gọi `POST /posts` trước khi có hồ sơ. | 1) màn "Tạo hồ sơ công khai"; 2) tạo được, vào feed; 3) 409 `PROFILE_NOT_SET`; tên hiển thị 1–50, giới thiệu ≤150. | FR-SOC-001 |
| **TC-SOC-002** | API, UI | 1) Username `  Hoa.Ly_01  `.<br>2) `ab`, `-abc`, `a..b`, `.abc`.<br>3) `admin`, `feed`, `u`.<br>4) Username đã có (khác hoa thường).<br>5) Gọi check 31 lần/phút. | 1) chuẩn hóa `hoa.ly_01`; 2) `USERNAME_INVALID`; 3) `USERNAME_RESERVED`; 4) 409 `USERNAME_TAKEN`; 5) 429; check trả hợp lệ/còn trống. | FR-SOC-002 |
| **TC-SOC-003** | API, UI | 1) Sửa tên/giới thiệu/avatar.<br>2) Đổi username lần đầu.<br>3) Đổi lại sau 3 ngày.<br>4) Sau 14 ngày. | 1) OK; 2) OK; 3) 429 `USERNAME_CHANGE_TOO_SOON` kèm số ngày; 4) OK; các trường khác luôn sửa được. | FR-SOC-003, SD-020 |
| **TC-SOC-004** | API, E2E | 1) B mở `/u/A`.<br>2) Kiểm JSON.<br>3) A chặn B, B mở lại.<br>4) Mở username không tồn tại. | 1) đủ ảnh, tên, `@username`, giới thiệu, 3 số, lưới; 2) không email/nickname/ngày sinh/giống/cân nặng/sổ y tế; 3–4) 404. | FR-SOC-004, SD-016 |
| **TC-SOC-005** | API, IT | 1) Đặt avatar JPG/PNG/HEIC/GPS.<br>2) File giả.<br>3) Chưa có hồ sơ. | 1) chuẩn hóa như ảnh bé, HEIC→JPG, bỏ EXIF, URL ký; 2) từ chối; 3) 4xx. | FR-SOC-005 |
| **TC-SOC-006** | API, UI | 1) Tạo bài 1 ảnh, không chú thích, không gắn bé.<br>2) 5 ảnh, chú thích 2.200, gắn 5 bé.<br>3) Đổi thứ tự ảnh trước khi đăng.<br>4) 6 ảnh/6 bé/2.201 ký tự. | 1) OK; 2) OK; 3) thứ tự mới được lưu; 4) 422; tất cả trên một màn soạn. | FR-SOC-006 |
| **TC-SOC-007** | API, E2E | 1) Tạo draft, upload ảnh vị trí 0, 1.<br>2) Ảnh cuối READY.<br>3) Ảnh lỗi → thử lại.<br>4) Bỏ ảnh lỗi còn 1 ảnh.<br>5) Bỏ ảnh cuối cùng.<br>6) Draft >24 giờ. | 1) `DRAFT`, chỉ chủ thấy; 2) `PUBLISHED` đúng khi ảnh cuối xong; 3) thay ảnh cùng vị trí; 4) đăng được; 5) 409 `LAST_PHOTO`; 6) bị xóa kèm ảnh. | FR-SOC-007 |
| **TC-SOC-008** | API | 1) Đăng 5 ảnh, gắn bé của mình.<br>2) Gắn bé của B.<br>3) Đăng bài thứ 31 trong ngày.<br>4) Tài khoản <24 giờ đăng bài 11. | 1) OK; 2) 422 `PET_NOT_OWNED`; 3) 429 `POST_LIMIT_REACHED`; 4) 429 (ngưỡng 10). | FR-SOC-008, SD-018 |
| **TC-SOC-009** | API, IT | Upload ảnh lớn; kiểm file/URL. | Ảnh chính JPEG cạnh dài ≤1.080 px; thumbnail vuông 360 px cắt giữa; không EXIF/GPS; lưu theo bài; URL ký hết hạn. | FR-SOC-009 |
| **TC-SOC-010** | API, E2E | 1) Sửa chú thích.<br>2) Thêm/bớt/bỏ hết bé.<br>3) Cố đổi ảnh sau đăng. | 1–2) OK; 3) bị từ chối (không có endpoint/không đổi); số ảnh giữ nguyên. | FR-SOC-010 |
| **TC-SOC-011** | API, E2E | 1) Xóa bài không xác nhận.<br>2) Xác nhận.<br>3) Kiểm media/tim/bình luận/thông báo.<br>4) B xóa bài A. | 1) không xóa; 2) xóa; 3) media purge, tim/bình luận/thông báo liên quan mất; 4) 404, dữ liệu A không đổi. | FR-SOC-011 |
| **TC-SOC-012** | UI, API | Mở bài có 2 ảnh, gắn 2 bé, chú thích có `@username`. | Hiện avatar/tên/`@username`/link hồ sơ; thời gian tương đối (quá 7 ngày hiện ngày); ảnh vuốt; chỉ **tên** bé; chú thích link; số tim/bình luận; trạng thái đã thích; bé bị xóa biến mất. | FR-SOC-012, SD-016 |
| **TC-SOC-013** | E2E | 1) Mở `/p/{id}` có 3 ảnh.<br>2) Vuốt, bấm ←/→, dùng phím.<br>3) Kiểm chấm vị trí + screen reader.<br>4) Mở bài đã xóa/bị chặn. | 1) carousel; 2) chuyển ảnh được; 3) "Ảnh 2/3" được đọc; 4) "Bài này không còn". | FR-SOC-013 |
| **TC-SOC-014** | API, E2E | 1) B theo dõi A.<br>2) Bấm theo dõi lại.<br>3) B tự theo dõi.<br>4) 201 lần theo dõi/ngày.<br>5) Bỏ theo dõi. | 1) OK + số mới; 2) idempotent, không tăng; 3) 422 `CANNOT_FOLLOW_SELF`; 4) 429 `FOLLOW_LIMIT_REACHED`; 5) xác nhận + giảm số, idempotent. | FR-SOC-014 |
| **TC-SOC-015** | API, UI | 35 người theo dõi; mở danh sách. | Mới nhất trước, 30/trang, mỗi dòng có nút Theo dõi tại chỗ; trang 2 có 5. | FR-SOC-015 |
| **TC-SOC-016** | API, UI | 20 bài, có bài 3 ảnh; cuộn tới cuối. | Lưới 3 cột vuông, mọi bài đã đăng, mới nhất trước, 18/trang, tự tải tiếp; bài nhiều ảnh có icon. | FR-SOC-016 |
| **TC-SOC-017** | API, UI | 1) Tìm "ho" (không dấu) với "Hồ".<br>2) Tìm tiền tố username.<br>3) Tìm email.<br>4) Tìm khi có người chặn.<br>5) Gõ liên tục. | 1) khớp không dấu; 2) khớp + xếp hạng; 3) không trả kết quả; 4) loại người chặn/bị chặn; 5) chỉ gọi sau 300 ms; tối đa 20, 60/phút. | FR-SOC-017 |
| **TC-SOC-018** | API, IT | A theo dõi B, C; B đăng bài mới khi A đang cuộn. | Feed có bài của A, B, C; mới nhất trước; không ranking; 10/trang; cursor không trùng/sót khi có bài mới. | FR-SOC-018 |
| **TC-SOC-019** | E2E | 1) Cuộn gần cuối.<br>2) Kéo xuống đầu (phone).<br>3) Nút "Làm mới" (tablet).<br>4) Chờ 60 giây có bài mới. | 1) tải trước khi còn ~3 bài; 2) refresh; 3) refresh; 4) hiện "Có bài mới" khi tab hiển thị. | FR-SOC-019 |
| **TC-SOC-020** | UI | Mở feed có bài đủ thành phần. | Đầu bài, ảnh vuông cố định, hàng ♥/💬, số tim, chip bé, chú thích 2 dòng + "xem thêm", "Xem N bình luận". | FR-SOC-020 |
| **TC-SOC-021** | E2E | Feed rỗng. | "Theo dõi bạn bè để xem ảnh thú cưng của họ" + nút "Tìm người" + "Đăng bài đầu tiên". | FR-SOC-021 |
| **TC-SOC-022** | API, E2E | 1) Tim bài.<br>2) Bỏ tim.<br>3) Bấm lặp.<br>4) 301 lần/giờ.<br>5) Lỗi mạng khi tim. | 1–2) trạng thái + số đúng; 3) idempotent; 4) 429 `LIKE_RATE_LIMITED`; 5) UI trả lại + "Không lưu được"; các lần bấm cùng bài gửi tuần tự. | FR-SOC-022 |
| **TC-SOC-023** | E2E | 1) Nhấn đúp ảnh.<br>2) Bật giảm chuyển động.<br>3) Kiểm aria. | 1) chỉ thả tim, tim lớn 600 ms; 2) không hiệu ứng; 3) nút có trạng thái nhấn + nhãn "Thích/Bỏ thích, N lượt thích". | FR-SOC-023 |
| **TC-SOC-024** | API, UI | Bài có 120 người thích; mở danh sách. | Tối đa 100 người gần nhất; có nút Theo dõi; cuộn/tải thêm nếu có. | FR-SOC-024 |
| **TC-SOC-025** | API | 1) Bình luận 1 ký tự, 500 ký tự.<br>2) Rỗng/toàn khoảng trắng.<br>3) 501 ký tự.<br>4) Gửi lặp cùng key.<br>5) 31 bình luận/10 phút. | 1) OK; 2) `REQUIRED`; 3) `TOO_LONG` + `params.max`; 4) idempotent; 5) 429 `COMMENT_RATE_LIMITED`; chuẩn hóa NFC + trim. | FR-SOC-025 |
| **TC-SOC-026** | UI, E2E | 1) Gửi bằng Enter; Shift+Enter.<br>2) Gõ 460 ký tự.<br>3) Lỗi mạng.<br>4) 25 bình luận. | 1) Enter gửi, Shift+Enter xuống dòng; 2) hiện còn 40; 3) bình luận mờ + "Thử lại" cùng key, nút gửi tắt, nội dung giữ; 4) cũ trước, 20/trang. | FR-SOC-026 |
| **TC-SOC-027** | API, E2E | 1) Tác giả xóa bình luận.<br>2) Chủ bài xóa.<br>3) B xóa bình luận của A.<br>4) Kiểm thông báo. | 1–2) xóa sau xác nhận; 3) 404; 4) thông báo của bình luận mất. | FR-SOC-027 |
| **TC-SOC-028** | API, IT | 1) B tim bài A 2 lần, bỏ tim rồi tim lại.<br>2) B bình luận 2 lần.<br>3) B theo dõi A.<br>4) A tự tim bài mình.<br>5) B bỏ theo dõi. | 1) tối đa 1 thông báo LIKE; 2) 2 COMMENT; 3) 1 FOLLOW; 4) không tạo; 5) xóa FOLLOW chưa đọc; tất cả trong cùng transaction. | FR-SOC-028 |
| **TC-SOC-029** | API, UI | 1) 2 người tim cùng bài chưa đọc.<br>2) 1 bình luận dài.<br>3) 35 dòng. | 1) gộp 1 dòng "A và N người khác...", tối đa 3 ảnh; 2) trích ≤80 ký tự; 3) 30 dòng/trang, mới nhất trước; chỉ người nhận đọc. | FR-SOC-029 |
| **TC-SOC-030** | E2E | Mở tab Hoạt động; chạm dòng tim/bình luận/theo dõi. | Có tab; dòng đủ ảnh, câu mô tả, thời gian, thumbnail; chạm mở đúng bài (cuộn tới bình luận) hoặc hồ sơ; mở tab đánh dấu đã xem; tự tải lại 30 giây. | FR-SOC-030 |
| **TC-SOC-031** | E2E, API | 1) 2 nhắc lịch + 3 hoạt động chưa xem.<br>2) Chỉ có hoạt động.<br>3) Kiểm aria label. | 1) badge 5, aria "Thông báo, 2 nhắc lịch, 3 hoạt động mới"; 2) mở thẳng tab Hoạt động; 3) banner nhắc lịch và tab Nhắc lịch không đổi. | FR-SOC-031 |
| **TC-SOC-032** | IT, OPS | Tạo thông báo hoạt động 91 ngày; chạy job. | Bị xóa; 89 ngày còn; job idempotent. | FR-SOC-032, SD-021 |
| **TC-SOC-033** | API, IT | A chặn B; B tim/bình luận/theo dõi A. | Không tạo thông báo cho A; B không thấy bài A; không lỗi 500. | FR-SOC-033 |
| **TC-SOC-034** | API, E2E | 1) Chặn từ menu hồ sơ/bài/bình luận, có xác nhận.<br>2) Chặn lại.<br>3) Tự chặn.<br>4) 51 lần/ngày. | 1) OK; 2) idempotent; 3) 422 `CANNOT_BLOCK_SELF`; 4) 429 `BLOCK_LIMIT_REACHED`. | FR-SOC-034 |
| **TC-SOC-035** | API, IT | A chặn B; kiểm DB. | Xóa theo dõi 2 chiều, tim/bình luận của B trên bài A, thông báo 2 chiều; tất cả trong 1 transaction; dữ liệu khác giữ. | FR-SOC-035 |
| **TC-SOC-036** | API, E2E | 1) A chặn B.<br>2) B mở hồ sơ A, feed, tìm kiếm.<br>3) A mở hồ sơ B.<br>4) B theo dõi/tim/bình luận A. | 1) OK; 2) 404/không thấy; 3) A vẫn thấy hồ sơ B nhưng bài bị ẩn, có nút bỏ chặn; 4) 404. | FR-SOC-036 |
| **TC-SOC-037** | API, E2E | 1) Bỏ chặn trên hồ sơ.<br>2) Bỏ chặn trong Cài đặt → Đã chặn.<br>3) Kiểm dữ liệu cũ. | 1–2) OK; 3) không khôi phục follow/tim/bình luận đã xóa; có thể theo dõi lại từ đầu. | FR-SOC-037 |
| **TC-SOC-038** | API, UI | Vượt từng ngưỡng: bài 30/ngày, bình luận 30/10 phút, tim 300/giờ, follow 200/ngày, chặn 50/ngày, tìm 60/phút. | 429 kèm `retryAfter` + `params.max`; UI "Bạn thao tác quá nhanh, thử lại sau N phút"; cửa sổ cố định. | FR-SOC-038 |
| **TC-SOC-039** | API | Tài khoản <24 giờ: đăng bài 11, bình luận 11/10 phút. | 429; sau 24 giờ ngưỡng trở lại 30. | FR-SOC-039 |
| **TC-SOC-040** | API, UI | Tìm endpoint/UI báo cáo, ẩn bài, kiểm duyệt; kiểm OpenAPI. | Không có endpoint/UI; OpenAPI không có path; chỉ có chặn + rate limit + gỡ thủ công. | FR-SOC-040, SD-017 |
| **TC-SOC-002-N1** | API | Username 2/3/30/31 ký tự; `a.b`, `a..b`, `.a`, `a.`, `a_b`, `a-b`, chữ hoa. | 3–30 OK (chuẩn hóa); các mẫu sai → `USERNAME_INVALID`; reserved → `USERNAME_RESERVED`. | FR-SOC-002 |
| **TC-SOC-006-B1** | API | 0/1/5/6 ảnh; 0/2.200/2.201 chú thích; 0/5/6 bé. | 0 ảnh lỗi; 1/5 OK; 6 lỗi; 2.200 OK; 2.201 lỗi; 0/5 bé OK; 6 lỗi. | FR-SOC-006 |
| **TC-SOC-007-N1** | API | 2 ảnh cùng vị trí; xóa ảnh khi còn 1; draft của B. | Trùng vị trí `PHOTO_POSITION_TAKEN`; xóa ảnh cuối `LAST_PHOTO`; B không thấy draft A (404). | FR-SOC-007 |
| **TC-SOC-017-N1** | API | Tìm email `qa.a@...`; tìm chuỗi 31 ký tự; tìm khi bị chặn. | Không trả kết quả; 31 ký tự lỗi; người chặn/bị chặn bị loại. | FR-SOC-017 |
| **TC-SOC-025-B1** | API | 1/500/501 ký tự; toàn khoảng trắng; Unicode NFC/NFD. | 1/500 OK; 501 `TOO_LONG`; rỗng `REQUIRED`; NFC chuẩn hóa trước khi đếm/lưu. | FR-SOC-025 |
| **TC-SOC-036-N1** | E2E | A chặn B, B đang mở feed cũ; B refresh; B dùng deep link. | Sau refresh, dữ liệu A biến mất; deep link bài A → 404/"Bài này không còn"; không lộ cache. | FR-SOC-036 |

---

## 3. Test case tích hợp — DB, migration, RLS, media (DB-01→DB-23)

> Chạy bằng Vitest + Testcontainers PostgreSQL 16 (`apps/api/test/*.int.test.ts`). Mỗi case dùng DB rỗng, chạy migration thật, role thật (`app_rw`, `app_worker`, `ph_owner`).

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **DB-01** | IT | 1) Tạo DB rỗng.<br>2) Chạy toàn bộ 22 migration theo thứ tự.<br>3) Chạy lại (idempotent nếu có).<br>4) Rollback từng migration theo thứ tự ngược.<br>5) Up lại. | Up thành công, không lỗi; rollback sạch; up lại cho schema giống hệt; không còn bảng/temporary object mồ côi. | NFR-MNT-006, SAD §2.9 |
| **DB-02** | IT | 1) Kết nối bằng `app_rw`, `app_worker`, `ph_owner`.<br>2) Kiểm `rolbypassrls`, quyền bảng/sequence/function. | `app_rw` không bypass RLS; `app_worker` có BYPASSRLS nhưng chỉ quyền cần thiết; `ph_owner` sở hữu schema; `app_*` không có quyền DDL; `analytics_*` function chỉ `app_worker` EXECUTE. | NFR-SEC-004, SAD §2.3 |
| **DB-03** | IT | A tạo pets, weight_entries, visits, visit_photos, milestones, notifications, routine_tasks/completions; B đọc từng bảng bằng `app_rw`. | B thấy 0 dòng ở cả 7 bảng; `EXPLAIN` cho thấy policy `owner_isolation`; A vẫn thấy đủ dữ liệu của mình. | FR-AUTH-013, NFR-SEC-004 |
| **DB-04** | IT | 1) Kiểm `relrowsecurity` + `relforcerowsecurity` trên 8 bảng social.<br>2) B đọc profile/post/follow của A.<br>3) Draft của A.<br>4) A chặn B rồi B đọc lại. | 1) tất cả bật + FORCE; 2) chỉ dữ liệu công khai, không email/ngày sinh; 3) draft chỉ A thấy; 4) `not_blocked()` loại dữ liệu hai chiều. | FR-SOC-004, 036, NFR-SEC-013 |
| **DB-05** | IT | 1) Insert email `A@X.com` rồi `a@x.com `.<br>2) Insert 2 profile cùng username khác hoa thường.<br>3) Insert 2 profile cùng `user_id`. | 1) vi phạm unique (chuẩn hóa trim/lower); 2) vi phạm unique index lower(username); 3) vi phạm PK/FK 1-1. | FR-AUTH-001, FR-SOC-001, 002 |
| **DB-06** | IT | 1) Insert token đã dùng, đã hết hạn.<br>2) Dùng lại token.<br>3) Insert session hết hạn.<br>4) Đọc session còn hạn. | Token một lần: lần 2 trả 0 dòng/`consumed_at` khác null; token/session hết hạn bị loại bởi query; index `expires_at` được dùng. | FR-AUTH-002, 008, 012 |
| **DB-07** | IT | 1) Tạo 10 pets.<br>2) Insert pet thứ 11 trực tiếp.<br>3) Xóa pet.<br>4) Kiểm bảng con. | 11 bị chặn (constraint/app); xóa pet cascade weight/visit/photo/milestone/notification/routine; upload liên quan chuyển trạng thái purge. | FR-PET-002, 008 |
| **DB-08** | IT | Insert `weight_entries` 0; 0,1; 150; 150,1; 9,25; 2 dòng cùng ngày. | 0/150,1/9,25 vi phạm check; 0,1/150 OK; 2 dòng cùng ngày OK; kiểu `numeric(4,1)`. | FR-WGT-001, 002 |
| **DB-09** | IT | Insert visit với symptoms null + diagnosis null; chỉ khoảng trắng; một trong hai có giá trị. | Check constraint chặn cả hai rỗng/toàn khoảng trắng; trường hợp còn lại OK. | FR-VIS-001 |
| **DB-10** | IT | 1) Insert 5 visit_photos.<br>2) Ảnh thứ 6.<br>3) 2 ảnh cùng `position`. | 5 OK; 6 bị chặn; trùng position vi phạm unique. | FR-VIS-005 |
| **DB-11** | IT | 1) Insert milestone status ngoài enum.<br>2) 2 mốc AUTO cùng `source_milestone_id`.<br>3) Đổi `type` sau khi tạo bằng UPDATE. | 1) vi phạm check; 2) vi phạm unique (chống tạo trùng mốc kế); 3) bị chặn bởi trigger/app hoặc test API xác nhận không đổi. | FR-MS-008, 010, 011 |
| **DB-12** | IT | 1) Insert 2 notification cùng (milestone, level, due_on).<br>2) Insert lý do processed lạ.<br>3) Insert `appear_on` 89/91 ngày trước. | 1) unique chặn; 2) check enum chặn; 3) cả hai insert được (job mới xóa cái cũ). | FR-NTF-005, 006, NFR-REL-003 |
| **DB-13** | IT | 1) 20 routine_tasks cho 1 pet.<br>2) Task thứ 21.<br>3) 2 completion cùng (task, done_on).<br>4) Xóa task. | 1) OK; 2) chặn; 3) unique chặn; 4) completion còn (giữ lịch sử) nhưng task biến mất khỏi checklist. | FR-RT-001, 004, 005 |
| **DB-14** | IT | 1) 2 request cùng `Idempotency-Key` + cùng user.<br>2) Cùng key khác user.<br>3) Key 25 giờ.<br>4) Xóa user. | 1) unique (key,user) chặn bản ghi thứ 2, trả kết quả cũ; 2) độc lập; 3) hết hạn; 4) FK cascade xóa key. | FR-GEN-005 |
| **DB-15** | IT | 1) 5 request trong cửa sổ.<br>2) Sang cửa sổ mới.<br>3) Đọc/ghi đồng thời. | Đếm chính xác, không lost update; cửa sổ cố định; dòng cũ được reset/dọn. | NFR-SEC-005, FR-SOC-038 |
| **DB-16** | IT | 1) `analytics_ensure_partitions(2)`.<br>2) Insert event.<br>3) `analytics_drop_partitions_before(cutoff)`.<br>4) Gọi function bằng `app_rw`. | 1) tạo partition tháng hiện tại + 2 tháng; 2) vào đúng partition; 3) drop partition cũ; 4) bị từ chối quyền. | FR-ANL-001, 004, NFR-MNT-006 |
| **DB-17** | IT | 1) Post status ngoài enum.<br>2) 2 post_photos cùng (post, position).<br>3) Post không ảnh.<br>4) Ảnh cuối chuyển READY. | 1) check chặn; 2) unique chặn; 3) draft không ảnh hợp lệ; 4) trigger/use case chuyển `PUBLISHED` đúng một lần. | FR-SOC-006, 007 |
| **DB-18** | IT | 1) B follow A 2 lần.<br>2) B like bài A 2 lần.<br>3) Xóa bài A. | 1–2) PK chặn trùng; 3) like/comment/photo/social_notification liên quan cascade, media purge. | FR-SOC-014, 022, 028 |
| **DB-19** | IT | 1) A chặn B.<br>2) B chặn A.<br>3) A chặn A.<br>4) Bỏ chặn. | 1–2) cặp đối xứng được chuẩn hóa (1 dòng hoặc 2 dòng có kiểm); 3) check chặn; 4) xóa dòng tương ứng. | FR-SOC-034, 035 |
| **DB-20** | IT | 1) 3 like chưa đọc của 3 người.<br>2) 2 comment.<br>3) Đọc rồi like thêm.<br>4) Xóa người gửi. | 1) gộp đúng nhóm; 2) 2 dòng; 3) tạo nhóm mới; 4) cascade xóa thông báo. | FR-SOC-028, 029 |
| **DB-21** | IT | 1) Complete milestone trong transaction (milestone + notification + mốc AUTO).<br>2) Ép lỗi ở bước tạo mốc AUTO.<br>3) Kiểm DB. | 1) cả 3 ghi; 2) rollback toàn bộ, milestone vẫn `PENDING`, không thông báo mồ côi; 3) không có bản ghi dở dang. | FR-MS-008, 011, SAD §2.2.2 |
| **DB-22** | IT | 1) Upload JPG/PNG/HEIC/GPS.<br>2) File text đổi đuôi.<br>3) Ảnh 6 MB.<br>4) URL ký quá 15 phút.<br>5) Purge prefix. | 1) 2 kích thước + không EXIF; 2) `FAILED` theo magic bytes; 3) nén hoặc 413; 4) 403; 5) file bị xóa, DB `ABANDONED`. | FR-PET-005, FR-SOC-009, NFR-SEC-011 |
| **DB-23** | IT | Chạy migration khi có dữ liệu (10.000 weight, 50.000 milestone); đo thời gian và lock. | Migration không mất dữ liệu; thời gian ghi nhận; không lock bảng quá lâu gây timeout; có ghi chú nếu cần chạy ngoài giờ. | NFR-MNT-006, RSK-T13 |

---

## 4. Test case hợp đồng (CON-01→CON-10)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **CON-01** | Contract | Chạy `pnpm openapi:gen` hai lần trên cùng commit; `git diff openapi.yaml`. | Không diff; thứ tự ổn định; 86 operation, 62 path. | NFR-MNT-001, G-17 |
| **CON-02** | Contract | Sinh `packages/api-client` từ `openapi.yaml`; `pnpm -r typecheck`. | Không lỗi type; mọi path/method dùng trong web đều tồn tại trong client. | NFR-MNT-001, 004 |
| **CON-03** | Contract | `oasdiff breaking base openapi.yaml`. | 0 lỗi breaking; nếu có thay đổi phải ghi version + migration client. | NFR-MNT-004, G-17 |
| **CON-04** | Contract | Kiểm mỗi operation có `operationId`, request/response schema, mã lỗi. | 86/86 có schema; response lỗi tham chiếu `Problem`; không operation thiếu mô tả. | NFR-MNT-001 |
| **CON-05** | Contract | Sinh danh sách mã lỗi từ OpenAPI, đối chiếu bảng mã lỗi SRS/PRD. | Mọi mã dùng trong code có trong tài liệu và ngược lại; không mã lạ. | NFR-MNT-001, FR-GEN-011 |
| **CON-06** | Contract | Kiểm các POST tạo mới có header `Idempotency-Key` bắt buộc. | 100% POST tạo mới khai báo; response 400/422 khi thiếu khớp thực tế. | FR-GEN-005 |
| **CON-07** | Contract | Kiểm tham số/response phân trang của feed, visits, notifications, followers, comments. | Cùng quy ước `cursor`/`nextCursor`/`items`; giới hạn 10/18/20/30 khớp tài liệu. | FR-VIS-002, FR-SOC-016, 018 |
| **CON-08** | Contract | Kiểm security scheme, cookie, CSRF header trong OpenAPI. | Có khai báo session cookie + CSRF; operation công khai (`/healthz`, login, register) được đánh dấu rõ. | NFR-SEC-002 |
| **CON-09** | Contract | Chạy Schemathesis trên staging (S7). | 0 lỗi 5xx; sai khác schema được ghi; **Pending** khi chưa có staging. | NFR-MNT-004 |
| **CON-10** | Contract | Kiểm schema upload (multipart/PUT), giới hạn dung lượng, URL ký. | Schema khớp client; giới hạn 5 MB/50 MB khai báo; response URL có `expiresAt`. | FR-GEN-013, FR-SOC-009 |

---

## 5. Test case API xuyên suốt (API-01→API-16)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **API-01** | API | Gọi 10 loại lỗi khác nhau (400/401/403/404/409/413/415/422/429/500). | Tất cả `application/problem+json` với `type`, `title`, `status`, `detail`, `instance`; không HTML/stack. | FR-GEN-011, NFR-SEC-008 |
| **API-02** | API | B gọi tài nguyên A; B gọi tài nguyên không tồn tại; B gọi tài nguyên công khai của A. | 404 cho cả hai trường hợp đầu (không phân biệt tồn tại); dữ liệu công khai trả 200; không 403 lộ tồn tại. | FR-AUTH-013, NFR-SEC-004 |
| **API-03** | API | Gọi mọi route không kèm cookie (trừ allowlist công khai). | Mặc định 401; deny-by-default; allowlist khớp `openapi.yaml`. | NFR-SEC-002, SAD §2.5 |
| **API-04** | API | POST/PATCH/DELETE không có CSRF token; có token sai; có token đúng. | Thiếu/sai → 403; đúng → thành công; cookie `SameSite=Lax` vẫn được kiểm. | NFR-SEC-002 |
| **API-05** | API | Vượt ngưỡng rate limit từng nhóm (login, register, analytics, social, search). | 429 + `Retry-After`; header giới hạn; không ảnh hưởng tài khoản khác/IP khác. | NFR-SEC-005, FR-SOC-038 |
| **API-06** | API | Replay `Idempotency-Key` cùng payload; khác payload; sau 24 giờ; thiếu key. | Cùng payload → kết quả cũ (cùng status/body); khác → 409; sau 24 h → tạo mới; thiếu → 400/422. | FR-GEN-005 |
| **API-07** | API | Cursor rỗng, cursor sai, cursor hết, limit 0/1/giới hạn/giới hạn+1. | Cursor sai → 422 `INVALID_CURSOR`; limit ngoài khoảng → 422; limit tối đa bị chặn; không trùng/sót bản ghi. | FR-SOC-018, NFR-MNT-001 |
| **API-08** | API | Gửi payload thiếu trường, sai kiểu, sai enum, quá dài, toàn khoảng trắng. | 422 với `errors[]` gồm `field`, `code`, `message`, `params`; nhiều lỗi cùng lúc trả đủ. | FR-GEN-010, NFR-USA-007 |
| **API-09** | API | Body 64 KB+1; body không phải JSON; `Content-Type` sai. | 413; 415; 400 problem+json; không đọc quá giới hạn. | NFR-SEC-006 |
| **API-10** | API | Giữ kết nối chậm >10 giây; client abort giữa request ghi. | Server hủy/không treo; không tạo bản ghi dở; connection pool được trả lại. | FR-GEN-004, NFR-REL-001 |
| **API-11** | API | Gửi `Accept-Language: en`, `vi`; gửi múi giờ; gửi locale không hỗ trợ. | Thông báo/email đúng ngôn ngữ; múi giờ áp dụng cho "hôm nay"; locale lạ fallback `vi`. | NFR-USA-007, FR-AUTH-011 |
| **API-12** | API | Kiểm header `X-Request-Id` / mã `ref` trong lỗi 5xx. | Có mã tham chiếu ngắn, không lộ chi tiết nội bộ; log tương ứng tìm được. | FR-GEN-011 |
| **API-13** | API | Hai client PATCH cùng bản ghi gần như đồng thời. | Last-write-wins; không 500; bản ghi cuối đúng; updated_at tăng. | FR-GEN-007 |
| **API-14** | API | Upload thiếu multipart, sai field, file rỗng, file 0 byte, file quá lớn. | 400/422 rõ ràng; không tạo upload `READY` giả; file rỗng bị từ chối. | FR-GEN-013, FR-SOC-009 |
| **API-15** | API | `GET` URL ký: đúng, sửa path, sửa chữ ký, hết hạn, dùng lại sau khi xóa. | Đúng → 200 + `Cache-Control: private`; sai/hết hạn → 403; xóa → 404. | NFR-SEC-007, G-11 |
| **API-16** | API | Gọi method không hỗ trợ; path không tồn tại; path có `//` hoặc encoded. | 405/404 problem+json; không 500; không bypass router. | FR-GEN-011 |

---

## 6. Test case hệ thống/E2E (E2E-01→E2E-26)

> Chạy `pnpm e2e` trên ENV-03: API 3100, web 5174, DB `pethealth_e2e`, Mailpit, FakeClock, Chromium, `workers: 1`. Cột "File" ghi spec hiện có; case chưa có spec là **khoảng trống cần bổ sung**.

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết | File |
|---|---|---|---|---|---|
| **E2E-01** | E2E | Đăng ký → mở mail → xác minh → tạo bé → tạo mốc hạn T0+30 → FakeClock T0+23 → nhắc D7 xuất hiện ở banner + mục Thông báo → đánh dấu đã thực hiện → mốc kế tiếp xuất hiện. | Toàn luồng Pass, không thao tác tay vào DB; nhắc đúng nội dung; mốc AUTO đúng hạn. | G-3, G-18, FR-MS-003, 008 | `api/core-flow.api.spec.ts`, `ui/core-flow.ui.spec.ts` |
| **E2E-02** | E2E | Đăng nhập, reload, đăng xuất, back, mở URL bảo vệ. | Phiên giữ qua reload; logout xóa phiên; back không vào được; redirect login có `next`. | FR-AUTH-005, 007, 014 | `ui/core-flow.ui.spec.ts` |
| **E2E-03** | E2E | Quên mật khẩu → mail → đặt lại → đăng nhập mật khẩu mới → thử link lần 2. | Đổi được; link lần 2 báo đã dùng; phiên cũ bị hủy. | FR-AUTH-008, 009 | `ui/core-flow.ui.spec.ts` |
| **E2E-04** | E2E | Đổi email: nhập mật khẩu + email mới → xác minh → kiểm email cũ. | Chỉ đổi sau xác minh; email cũ nhận thông báo; đăng nhập bằng email mới. | FR-AUTH-015 | `ui/settings.ui.spec.ts` |
| **E2E-05** | E2E | Xóa tài khoản: xác nhận mật khẩu → kiểm đăng nhập + dữ liệu social/sức khỏe. | Không đăng nhập được; dữ liệu và media bị xóa; B thấy 404. | FR-AUTH-016, US-005 | `ui/settings.ui.spec.ts` |
| **E2E-06** | E2E | Tạo 1 bé → sửa → thêm 9 bé → nút bị khóa → xóa bằng tên sai/đúng. | Luồng đúng; giới hạn 10; xóa chỉ khi tên khớp; danh sách cập nhật. | FR-PET-001, 002, 006, 008 | `ui/core-flow.ui.spec.ts` |
| **E2E-07** | E2E | Upload avatar JPG và HEIC có GPS; xóa avatar. | Ảnh hiển thị; HEIC thành JPG; không còn GPS (kiểm file); xóa về placeholder. | FR-PET-005, NFR-SEC-011 | `ui/core-flow.ui.spec.ts` |
| **E2E-08** | E2E | Thêm 4 số đo (có 9.2 và 9,2) → sửa → xóa → đặt mục tiêu → kiểm biểu đồ/tooltip. | Số đo đúng; 2 điểm cùng ngày; biểu đồ + đường mục tiêu; tooltip chênh lệch; empty/1 điểm đúng. | FR-WGT-001→010 | `ui/core-flow.ui.spec.ts` |
| **E2E-09** | E2E | Tạo khám có 5 ảnh → mở lightbox → xóa 1 ảnh → xóa bản ghi. | 5 ảnh; lightbox mở/đóng; xóa ảnh đúng; xóa bản ghi xóa phần còn lại. | FR-VIS-001→008 | `ui/core-flow.ui.spec.ts` |
| **E2E-10** | E2E | Tạo 3 loại mốc → sửa hạn → hủy → kiểm 4 nhóm. | Nhóm đúng; sửa hạn cập nhật nhắc; hủy ẩn banner. | FR-MS-001, 006, 007, 012 | `ui/core-flow.ui.spec.ts` |
| **E2E-11** | E2E | Đánh dấu mốc DONE → toast Hoàn tác → bấm trong 10 giây → DONE lại → chờ 11 giây → hoàn tác. | Hoàn tác trong hạn trả PENDING và xóa mốc AUTO; quá hạn bị từ chối. | FR-MS-003, 005, 008 | `ui/core-flow.ui.spec.ts` |
| **E2E-12** | E2E | Có 3 nhắc → mở chuông → đọc 1 → đọc tất cả → đổi tab 60 giây → quay lại. | Badge 3→2→0 ẩn; danh sách 2 tab; polling dừng khi ẩn tab. | FR-NTF-008, 010, FR-SOC-031 | `ui/core-flow.ui.spec.ts` |
| **E2E-13** | E2E | 4 việc → chạm 1 việc → giả lập lỗi mạng → FakeClock qua 00:00. | Optimistic + rollback đúng; qua ngày reset toàn bộ; lịch sử giữ. | FR-RT-002→005 | `ui/routines.ui.spec.ts` |
| **E2E-14** | E2E | Dashboard: có dữ liệu, "Tất cả"/từng bé, chưa xác minh, chưa có bé. | 3 panel đúng; lọc đúng; banner xác minh; empty state; 1 request. | FR-DSH-001→007 | `ui/dashboard.ui.spec.ts` |
| **E2E-15** | E2E | Điều hướng phone 390×844 và tablet 834×1112: nav dưới/trái, mở từng màn. | Không cuộn ngang; nav đúng breakpoint; touch target ≥44 px. | FR-DSH-004, NFR-USA-001 | `ui/core-flow.ui.spec.ts` |
| **E2E-16** | E2E | Đổi múi giờ VN → New York; qua 00:00; kiểm D7/D1/quá hạn. | Ngày địa phương đúng; nhắc đổi theo; DST không lệch ngày. | FR-AUTH-011, FR-GEN-001, G-5 | `api/timezone.api.spec.ts`, `api/srs-2-6-table.api.spec.ts` |
| **E2E-17** | E2E | Offline khi nhập form; API chậm >10 giây; API 500; hết phiên giữa form. | Banner offline; timeout + thử lại; 500 có ref; nháp khôi phục sau login. | FR-GEN-003→006, 011 | `ui/system-states.ui.spec.ts` |
| **E2E-18** | E2E | Tạo hồ sơ → đổi username → đổi lại sau 3 ngày → sau 14 ngày; B mở hồ sơ. | Tạo đúng; cooldown đúng; B chỉ thấy dữ liệu công khai. | FR-SOC-001→005 | `api/social-profile.api.spec.ts`, `ui/social-posts.ui.spec.ts` |
| **E2E-19** | E2E | Soạn bài 3 ảnh + 2 bé + chú thích → xóa 1 ảnh → đăng → kiểm feed. | Draft chỉ chủ thấy; đăng khi ảnh cuối READY; thứ tự ảnh đúng. | FR-SOC-006→013 | `api/social-posts.api.spec.ts`, `ui/social-posts.ui.spec.ts` |
| **E2E-20** | E2E | Feed 25 bài → cuộn tải tiếp → kéo làm mới → có bài mới sau 60 giây. | 10/trang, không trùng/sót; refresh đúng; chip "Có bài mới". | FR-SOC-016→021 | `api/social-feed.api.spec.ts`, `ui/social-feed.ui.spec.ts` |
| **E2E-21** | E2E | B tim → bỏ tim → nhấn đúp ảnh → bình luận → xóa bình luận. | Trạng thái/số đúng; idempotent; thông báo cho A; quyền xóa đúng. | FR-SOC-022→027 | `api/social-engagement.api.spec.ts`, `ui/social-engagement.ui.spec.ts` |
| **E2E-22** | E2E | B tìm "ho" → theo dõi A → xem danh sách → bỏ theo dõi. | Tìm không dấu; theo dõi idempotent; danh sách 30/trang. | FR-SOC-014, 015, 017 | `api/social-feed.api.spec.ts`, `ui/social-feed.ui.spec.ts` |
| **E2E-23** | E2E | 2 người tim + 1 bình luận + 1 theo dõi A → A mở tab Hoạt động → chạm từng dòng. | Gộp đúng; deep link đúng bài/bình luận; đã xem; tự tải lại 30 giây. | FR-SOC-028→033 | `ui/social-engagement.ui.spec.ts` |
| **E2E-24** | E2E | A chặn B từ bài → B mở hồ sơ/feed/tìm → A mở "Đã chặn" → bỏ chặn. | B mất quyền thấy; A thấy trạng thái chặn; bỏ chặn không khôi phục dữ liệu cũ. | FR-SOC-034→037 | `api/social-cross.api.spec.ts`, `ui/social-block.ui.spec.ts` |
| **E2E-25** | E2E | Chuyển ngôn ngữ vi→en→vi trên 6 màn chính; kiểm ngày/số/lỗi. | Chuỗi đổi hết; không lẫn ngôn ngữ; định dạng ngày/số đúng; lỗi dịch đủ. | NFR-USA-007, FR-GEN-002 | `ui/settings.ui.spec.ts` |
| **E2E-26** | E2E | Tablet: mở bài 3 ảnh, dùng phím ←/→, mở lightbox, đóng bằng Esc. | Điều hướng bàn phím đầy đủ; focus không mất; screen reader đọc "Ảnh 2/3". | FR-SOC-013, NFR-USA-002 | `ui/social-posts.ui.spec.ts`, `ui/a11y.ui.spec.ts` |

---

## 7. Test case chấp nhận — UAT theo 50 story (UAT-001→UAT-079)

> **Quy ước ID:** `UAT-<số story>` (US-001 → UAT-001; US-070 → UAT-070). Mỗi story có đúng một UAT; các AC Given/When/Then được kiểm theo bảng dưới.
> **Cách chạy:** PO thực hiện trên build ứng viên tại ENV-01/ENV-03 với dữ liệu UAT; QA ghi kết quả, ảnh chụp và quyết định Pass/Fail. Không dùng dữ liệu thật.
> **Trạng thái mặc định:** `Not Run` — UAT chưa được thực thi tại thời điểm lập tài liệu.

### 7.1 Epic E1 — Tài khoản (8 story)

| ID | Story | AC trọng tâm | Cách kiểm | Kỳ vọng | TC | Trạng thái |
|---|---|---|---|---|---|---|
| **UAT-001** | US-001 Đăng ký | Given email hợp lệ, When đăng ký, Then tài khoản tạo + email xác minh | Đăng ký bằng email mới, mở Mailpit | Tài khoản tạo, email tới ≤1 phút, đăng nhập được sau xác minh | TC-AUTH-001, 002, 017; E2E-01 | Not Run |
| **UAT-002** | US-002 Xác minh email | Given chưa xác minh, When mở link, Then xác minh; link hết hạn có nút gửi lại | Mở link, mở lại, chờ hết hạn | Xác minh một lần; thông báo đúng; gửi lại được | TC-AUTH-002, 003, 004; DSH-007 | Not Run |
| **UAT-003** | US-003 Đăng nhập/xuất | Given tài khoản đã xác minh, When đăng nhập sai/đúng, Then thông báo không lộ tài khoản | Thử 4 tổ hợp, khóa 15 phút, logout | Cùng thông báo khi sai; khóa đúng; logout hủy phiên | TC-AUTH-005, 006, 007, 014 | Not Run |
| **UAT-004** | US-004 Đặt lại mật khẩu | Given quên mật khẩu, When dùng link, Then đổi được một lần, phiên cũ hủy | Yêu cầu reset, dùng link 2 lần | Đổi được; link một lần; phiên khác 401 | TC-AUTH-008, 009 | Not Run |
| **UAT-005** | US-005 Xóa tài khoản | Given đã đăng nhập, When xác nhận mật khẩu + xóa, Then toàn bộ dữ liệu mất | Xóa A, kiểm DB/media, B xem hồ sơ | Không đăng nhập lại; dữ liệu/media mất; B thấy 404 | TC-AUTH-016; E2E-05 | Not Run |
| **UAT-006** | US-006 Phân quyền dữ liệu | Given 2 tài khoản, When B gọi ID của A, Then 404 và dữ liệu A không đổi | Chạy bộ IDOR trên UI + API | 136/136 Pass; không lộ trường riêng tư | TC-AUTH-013; DB-03; SEC-01 | Not Run |
| **UAT-007** | US-007 Nhất quán đa thiết bị | Given 2 thiết bị, When lưu ở thiết bị 1, Then thiết bị 2 thấy dữ liệu mới | Sửa trên phone, reload tablet | Không cache cũ; last-write-wins | TC-GEN-007, 008 | Not Run |
| **UAT-008** | US-008 Đổi email | Given email mới, When xác minh, Then email đổi; email cũ được báo | Đổi email, kiểm 2 hộp thư | Chỉ đổi sau xác minh; thông báo email cũ | TC-AUTH-015; E2E-04 | Not Run |

### 7.2 Epic E2 — Thú cưng (6 story)

| ID | Story | AC trọng tâm | Cách kiểm | Kỳ vọng | TC | Trạng thái |
|---|---|---|---|---|---|---|
| **UAT-010** | US-010 Tạo hồ sơ | Given đã đăng nhập, When nhập 4 trường, Then bé xuất hiện trong danh sách | Tạo Mochi, kiểm danh sách + Dashboard | Bé hiện ngay; dữ liệu đúng; lỗi trường rõ | TC-PET-001-B1 | Not Run |
| **UAT-011** | US-011 Tự tính tuổi | Given ngày sinh, When mở hồ sơ, Then tuổi đúng theo tháng | Kiểm 4 mốc ngày sinh | "7 năm 7 tháng", "5 tháng", "0 tháng" | TC-PET-003 | Not Run |
| **UAT-012** | US-012 Đặc điểm + ảnh | Given hồ sơ, When lưu đặc điểm + ảnh, Then ảnh hiển thị, HEIC chuyển JPG | Upload JPG/HEIC/GPS | Ảnh đúng; không EXIF; lỗi file giả | TC-PET-004, 005; DB-22 | Not Run |
| **UAT-013** | US-013 Sửa hồ sơ | Given hồ sơ, When sửa trường, Then lưu và hiển thị mới | Sửa tên, giống, ngày sinh | Cập nhật tức thì; tuổi tính lại | TC-PET-006 | Not Run |
| **UAT-014** | US-014 Xóa hồ sơ | Given hồ sơ, When nhập đúng tên + xác nhận, Then xóa toàn bộ dữ liệu liên quan | Xóa thử tên sai rồi đúng | Chỉ xóa khi khớp; dữ liệu con mất | TC-PET-008 | Not Run |
| **UAT-015** | US-015 Quản lý tối đa 10 | Given đã có 10 bé, When thêm, Then bị chặn kèm giải thích | Tạo đủ 10, thử thêm | Nút khóa/thông báo rõ; DB vẫn 10 | TC-PET-002-N1, 007 | Not Run |

### 7.3 Epic E3 — Cân nặng (4 story)

| ID | Story | AC trọng tâm | Cách kiểm | Kỳ vọng | TC | Trạng thái |
|---|---|---|---|---|---|---|
| **UAT-020** | US-020 Ghi số đo | Given bé, When nhập 9,2 kg, Then lưu và hiện trong danh sách | Nhập `9,2`, `9.2`, 0,1, 150 | Lưu đúng 1 chữ số thập phân; biên đúng | TC-WGT-001-B1, 002 | Not Run |
| **UAT-021** | US-021 Mục tiêu | Given bé, When đặt mục tiêu 9 kg, Then thẻ/biểu đồ cập nhật | Đặt, sửa, xóa mục tiêu | Cập nhật ngay; giá trị sai bị chặn | TC-WGT-005-B1 | Not Run |
| **UAT-022** | US-022 Biểu đồ | Given nhiều số đo + mục tiêu, When mở biểu đồ, Then đường nối + đường mục tiêu + tooltip | Kiểm 0/1/nhiều điểm | Empty/1 điểm đúng; tooltip có chênh lệch | TC-WGT-003, 004, 006→009 | Not Run |
| **UAT-023** | US-023 Sửa/xóa số đo | Given số đo, When sửa/xóa, Then biểu đồ cập nhật | Sửa 9,2→9,5; xóa | Đúng; không lỗi khi xóa điểm cuối | TC-WGT-010 | Not Run |

### 7.4 Epic E4 — Sổ y tế (5 story)

| ID | Story | AC trọng tâm | Cách kiểm | Kỳ vọng | TC | Trạng thái |
|---|---|---|---|---|---|---|
| **UAT-030** | US-030 Tạo bản ghi khám | Given bé, When nhập ngày + ≥1 trong triệu chứng/chẩn đoán, Then lưu | Tạo chỉ triệu chứng, chỉ chẩn đoán, cả hai rỗng | Lưu khi có 1 trong 2; rỗng bị chặn | TC-VIS-001-N1 | Not Run |
| **UAT-031** | US-031 Danh sách lịch sử | Given 25 bản ghi, When mở sổ, Then 20/trang, mới nhất trước | Tạo 25, chuyển trang | Đúng thứ tự, đúng số, đúng tóm tắt dòng | TC-VIS-002 | Not Run |
| **UAT-032** | US-032 Sửa/xóa bản ghi | Given bản ghi, When sửa/xóa + xác nhận, Then cập nhật | Sửa, xóa, hủy xác nhận | Xác nhận bắt buộc; dữ liệu đúng | TC-VIS-003, 004 | Not Run |
| **UAT-033** | US-033 Ảnh đơn thuốc/XNT | Given bản ghi, When đính 5 ảnh, Then xem được lightbox | Upload 5 ảnh, mở lightbox, ảnh lỗi | 5 ảnh; lightbox; ảnh lỗi độc lập | TC-VIS-005-B1, 006, 008 | Not Run |
| **UAT-034** | US-034 Xóa ảnh | Given bản ghi có ảnh, When xóa 1 ảnh, Then ảnh mất, bản ghi còn | Xóa ảnh giữa | Đúng; số ảnh giảm; file purge | TC-VIS-007 | Not Run |

### 7.5 Epic E5 — Mốc y tế và nhắc nhở (9 story)

| ID | Story | AC trọng tâm | Cách kiểm | Kỳ vọng | TC | Trạng thái |
|---|---|---|---|---|---|---|
| **UAT-040** | US-040 Tạo mốc | Given bé, When chọn loại + hạn, Then mốc PENDING xuất hiện | Tạo 3 loại, 3 hạn | Đúng loại/hạn; VACCINE chu kỳ 12 | TC-MS-001-N1, 002 | Not Run |
| **UAT-041** | US-041 Nhắc D7/D1 | Given mốc hạn T0+7, When mở app T0, Then nhắc D7 xuất hiện | FakeClock qua các mốc | Đúng bảng 9 ca; tối đa 1 chưa xem | TC-NTF-001, 003→005, 007 | Not Run |
| **UAT-042** | US-042 Đánh dấu thực hiện | Given mốc PENDING, When DONE, Then trạng thái + nhắc xử lý, hoàn tác 10 giây | DONE, hoàn tác, DONE lại | Đúng; hoàn tác trong 10 giây | TC-MS-003→005; NTF-006 | Not Run |
| **UAT-043** | US-043 Tự tạo mốc năm sau | Given VACCINE DONE, When lưu, Then mốc AUTO +12 tháng | DONE 14/11/2026, 29/02/2028 | Hạn 14/11/2027, 28/02/2029 | TC-MS-008-B1, 011 | Not Run |
| **UAT-044** | US-044 Chu kỳ lặp | Given FLEA/DEWORM có chu kỳ, When DONE, Then mốc AUTO +N tháng | Chu kỳ 1, 3, 60; không chu kỳ | Đúng tháng lịch; không tạo nếu không chu kỳ | TC-MS-001, 009, 011 | Not Run |
| **UAT-046** | US-046 Sửa/hủy mốc | Given mốc PENDING, When sửa hạn/hủy, Then nhắc cũ xử lý đúng | Sửa hạn, hủy, sửa mốc DONE | Lý do RESCHEDULED/CANCELLED; không sửa mốc DONE | TC-MS-006-N1, 007; NTF-006 | Not Run |
| **UAT-047** | US-047 Mốc sắp tới/quá hạn | Given nhiều mốc, When mở Dashboard, Then 5 mốc ưu tiên quá hạn | Tạo 7 mốc, kiểm panel | Đúng thứ tự + nút hoàn tất tại chỗ | TC-DSH-003; MS-012 | Not Run |
| **UAT-048** | US-048 Nhắc quá hạn | Given mốc hạn T0−1, When mở app T0, Then nhắc OVERDUE | FakeClock T0 | "Quá hạn 1 ngày"; chỉ 1 nhắc | TC-NTF-002 | Not Run |
| **UAT-049** | US-049 Mục Thông báo | Given nhiều nhắc, When mở chuông, Then 2 tab, badge, đọc tất cả | 0/1/12 nhắc, đọc 1/tất cả | Badge 0/1/9+; lưu 90 ngày | TC-NTF-008, 010, 011 | Not Run |

### 7.6 Epic E6 — Việc hằng ngày (5 story)

| ID | Story | AC trọng tâm | Cách kiểm | Kỳ vọng | TC | Trạng thái |
|---|---|---|---|---|---|---|
| **UAT-050** | US-050 Tạo việc | Given bé, When nhập tên + giờ, Then việc xuất hiện trong checklist | Tạo 1, 20, 21 việc | 20 OK; 21 bị chặn; giờ hợp lệ | TC-RT-001-B1 | Not Run |
| **UAT-051** | US-051 Checklist hôm nay | Given 4 việc, When mở app, Then sắp theo giờ, việc xong xuống cuối | Đánh dấu 1 việc | Thứ tự + gạch ngang + "1/4 xong" | TC-RT-002; DSH-001, 002 | Not Run |
| **UAT-052** | US-052 Chạm đảo trạng thái | Given việc chưa xong, When chạm, Then đổi ngay; lỗi thì trả lại | Chạm + giả lập lỗi | Optimistic + rollback + thông báo | TC-RT-003-N1 | Not Run |
| **UAT-053** | US-053 Lưu theo ngày | Given đã xong hôm nay, When qua 00:00, Then reset | FakeClock qua ngày, đổi múi giờ | Reset đúng; lịch sử giữ | TC-RT-004, 005 | Not Run |
| **UAT-045** | US-045 Sửa/xóa việc | Given việc, When sửa/xóa, Then áp dụng ngay, lịch sử giữ | Sửa giờ, xóa việc | Đúng; lịch sử ngày trước còn | TC-RT-006, 007 | Not Run |

### 7.7 Epic E7 — Dashboard (3 story)

| ID | Story | AC trọng tâm | Cách kiểm | Kỳ vọng | TC | Trạng thái |
|---|---|---|---|---|---|---|
| **UAT-060** | US-060 Tổng quan | Given dữ liệu, When đăng nhập, Then 1 màn 3 panel đúng thứ tự responsive | Kiểm 7 breakpoint | 1 cột/2 cột đúng; 1 request | TC-DSH-001, 002, 004, 006 | Not Run |
| **UAT-061** | US-061 Lọc theo bé | Given nhiều bé, When chọn "Tất cả"/1 bé, Then dữ liệu lọc đúng | Chuyển bộ lọc, reload | Đúng; nhớ theo thiết bị | TC-DSH-005 | Not Run |
| **UAT-062** | US-062 Banner nhắc | Given 3 nhắc, When mở Dashboard, Then banner ưu tiên + "+N nhắc khác" | Mở banner, đóng, xem/hoàn tất | Đúng thứ tự; đóng đánh dấu đã xem; không mất nhắc | TC-NTF-009, 010; DSH-002 | Not Run |

### 7.8 Epic E8 — Bản tin ảnh thú cưng (10 story)

| ID | Story | AC trọng tâm | Cách kiểm | Kỳ vọng | TC | Trạng thái |
|---|---|---|---|---|---|---|
| **UAT-070** | US-070 Hồ sơ công khai | Given đã có tài khoản, When tạo hồ sơ, Then username + ảnh + giới thiệu; người khác chỉ thấy công khai | Tạo hồ sơ, B mở `/u/A` | Đúng dữ liệu công khai; không lộ email/ngày sinh | TC-SOC-001→005 | Not Run |
| **UAT-071** | US-071 Đăng bài nhiều ảnh | Given hồ sơ, When chọn 1–5 ảnh + gắn bé, Then đăng khi ảnh cuối READY | Đăng 1, 5, 6 ảnh; bỏ ảnh | 5 OK; 6 lỗi; draft đúng; thứ tự đúng | TC-SOC-006-B1, 007→009 | Not Run |
| **UAT-072** | US-072 Hồ sơ dạng lưới + chi tiết | Given nhiều bài, When mở hồ sơ/bài, Then lưới 3 cột + carousel | Cuộn lưới, mở bài 3 ảnh | 18/trang tự tải; carousel + chấm + alt | TC-SOC-012, 013, 016 | Not Run |
| **UAT-073** | US-073 Sửa/xóa bài | Given bài đã đăng, When sửa chú thích/bé hoặc xóa, Then cập nhật | Sửa, xóa, B xóa bài A | Đúng; ảnh không đổi; B 404 | TC-SOC-010, 011 | Not Run |
| **UAT-074** | US-074 Theo dõi + tìm | Given B, When tìm "ho" + theo dõi A, Then danh sách cập nhật | Tìm không dấu, theo dõi, bỏ theo dõi | Đúng; idempotent; 30/trang | TC-SOC-014, 015, 017 | Not Run |
| **UAT-075** | US-075 Bản tin | Given theo dõi 2 người, When mở feed, Then bài mới nhất, cuộn tải tiếp | Cuộn, kéo làm mới | 10/trang, không trùng/sót | TC-SOC-018→021 | Not Run |
| **UAT-076** | US-076 Thả tim | Given bài, When tim/nhấn đúp, Then trạng thái + số đúng, idempotent | Tim, bỏ tim, nhấn đúp | Đúng; animation tắt khi reduced motion | TC-SOC-022→024 | Not Run |
| **UAT-077** | US-077 Bình luận | Given bài, When bình luận 1–500 ký tự, Then hiện đúng, quyền xóa đúng | Gửi, xóa, B xóa bình luận A | Đúng; rate limit; idempotent | TC-SOC-025-B1, 026, 027 | Not Run |
| **UAT-078** | US-078 Thông báo hoạt động | Given 3 hoạt động, When mở tab, Then gộp đúng + deep link | Tim, bình luận, theo dõi | Gộp LIKE; deep link đúng; badge | TC-SOC-028→033 | Not Run |
| **UAT-079** | US-079 Chặn người dùng | Given A và B, When A chặn B, Then B mất quyền thấy, A bỏ chặn được | Chặn, kiểm feed/tìm, bỏ chặn | Đúng 2 chiều; không khôi phục dữ liệu cũ | TC-SOC-034→037 | Not Run |

**Tổng UAT:** 50 case cho 50 story · 0 đã chạy · 50 Not Run (chờ build ứng viên và PO).

---

## 8. Test case hồi quy (REG-01→REG-12)

> **R1 — Smoke P0 (≤30 phút):** chạy mỗi lần merge/PR lớn.
> **R2 — Theo mô-đun (≤3 giờ):** chạy trước phát hành và sau mọi sửa schema/API.
> **R3 — Đầy đủ (≤1 ngày):** chạy cuối chu kỳ C3.

| ID | Bộ | Phạm vi | Cách chạy | Tiêu chí đạt | Truy vết |
|---|---|---|---|---|---|
| **REG-01** | R1 | Đăng ký → xác minh → đăng nhập → tạo bé → tạo mốc → DONE → mốc AUTO | `pnpm e2e --grep "@smoke"` + API core-flow | 100% Pass; ≤5 phút | G-3, E2E-01 |
| **REG-02** | R1 | Dashboard 3 panel + banner + checklist việc | `dashboard.ui`, `routines.ui` | Pass; không lỗi console | FR-DSH-001→007 |
| **REG-03** | R1 | IDOR smoke 20 endpoint đại diện | `idor.int.test.ts -t smoke` | 20/20 Pass | G-9, NFR-SEC-004 |
| **REG-04** | R2 | Toàn bộ unit + integration | `pnpm test` | 100% Pass; coverage không giảm >1% | NFR-MNT-003 |
| **REG-05** | R2 | AUTH + PET + WGT | `account.api`, `ui/core-flow`, `idor` | Pass; không hồi quy P0 | FR-AUTH/PET/WGT |
| **REG-06** | R2 | VIS + MS + NTF + RT | `core-flow.api`, `timezone`, `srs-2-6-table`, `routines` | Pass; bảng 9 ca không đổi | FR-VIS/MS/NTF/RT |
| **REG-07** | R2 | SOC hồ sơ/bài/feed | `social-profile`, `social-posts`, `social-feed` | Pass; IDOR social Pass | FG-1, FG-2 |
| **REG-08** | R2 | SOC tim/bình luận/thông báo/chặn | `social-engagement`, `social-cross`, `social-block` | Pass; đếm/gộp đúng | FG-2 |
| **REG-09** | R2 | UI 25 màn + i18n + empty/error | `ui/*.spec.ts` + checklist | Pass; không lỗi chuỗi | NFR-USA-007 |
| **REG-10** | R3 | Ma trận hồi quy đầy đủ 141 FR | Chạy toàn bộ suite + case thủ công P0 | P0 100%, P1 ≥95% | §14.2 |
| **REG-11** | R3 | Accessibility + UI/UX toàn bộ | axe + checklist UI | 0 serious/critical; checklist 100% | FG-3, NFR-USA-002 |
| **REG-12** | R3 | Contract + size + security tĩnh | `openapi:gen`, `size-limit`, audit/OSV/gitleaks | Không diff; bundle <250 KB; 0 High | G-8, G-12, G-17 |

**Quy tắc chọn hồi quy:** mọi thay đổi schema → REG-04 + REG-06 + REG-12; thay đổi media → REG-05 + REG-07; thay đổi auth → REG-03 + REG-05; thay đổi notification → REG-06 + REG-02.

---

## 9. Test case hiệu năng (PERF-01→PERF-12)

> Công cụ: Lighthouse mobile (4G giả lập), k6, `size-limit`, Mailpit timing, `EXPLAIN (ANALYZE)`. Seed theo SD-011: 1.000 tài khoản · 10.000 bé · 50.000 mốc.

| ID | Cấp | Kịch bản | Ngưỡng / kỳ vọng | Truy vết | Trạng thái |
|---|---|---|---|---|---|
| **PERF-01** | PERF | Lighthouse mobile cho Dashboard (dev, build production) | LCP < 2,5 s; INP < 200 ms; CLS < 0,1 ở p75 | NFR-PERF-001, G-6 | Pending (chưa chạy) |
| **PERF-02** | PERF | Lighthouse cho 5 màn chính (login, pets, weights, feed, post detail) | Không có điểm < 80 performance; LCP/CLS đạt | NFR-PERF-001 | Pending |
| **PERF-03** | PERF | k6 đọc: `GET /dashboard`, `/pets`, `/pets/{id}/weights`, `/feed`, `/notifications` | p95 < 500 ms; p99 < 1.000 ms; lỗi < 0,1% | NFR-PERF-002, G-7 | Pending |
| **PERF-04** | PERF | k6 ghi: tạo cân nặng, khám, mốc, việc, bài, bình luận | p95 < 800 ms; lỗi < 0,5% | NFR-PERF-002 | Pending |
| **PERF-05** | PERF | Đo bundle sau build: JS/CSS ban đầu | JS < 250 KB gzip; CSS < 25 KB | NFR-PERF-003, G-8 | **Pass (136,5 KB)** |
| **PERF-06** | PERF | Gửi email xác minh + reset; đo thời gian tới Mailpit | ≤ 60 giây từ yêu cầu | NFR-PERF-004 | Có thể chạy trên dev |
| **PERF-07** | PERF | Tài khoản có 10 bé, 100 mốc PENDING; mở Dashboard; đo phần tạo thông báo | ≤ 50 ms p95 cho riêng phần tạo thông báo; không làm vượt PERF-01/03 | NFR-PERF-005 | Pending |
| **PERF-08** | PERF | Seed SD-011; chạy lại PERF-03/04 | Đạt ngưỡng ở quy mô 1.000/10.000/50.000 | NFR-PERF-006 | Pending |
| **PERF-09** | PERF | Upload ảnh 5 MB trên mạng 10 Mbps | Hoàn tất ≤ 10 giây; có tiến trình; không treo UI | NFR-PERF-007 | Có thể chạy thủ công |
| **PERF-10** | PERF | `EXPLAIN (ANALYZE)` cho 10 query nóng (dashboard, feed cursor, notification sync, search) | Dùng index; không sequential scan trên bảng lớn; < 100 ms ở SD-011 | NFR-PERF-002, 006 | Pending |
| **PERF-11** | PERF | Tải đồng thời 50 request/s trong 10 phút (không phải stress) | Không 5xx; p95 trong ngưỡng; RAM/CPU ổn định | NFR-PERF-002, NFR-REL-001 | Pending |
| **PERF-12** | PERF | Đo cold start API/worker và thời gian migration | API ready < 5 s; worker nhận job < 10 s; ghi nhận migration | NFR-REL-001 | Có thể chạy dev |

**Cách ghi kết quả:** ngày, commit, máy, lệnh, seed, p50/p95/p99, % lỗi, ảnh Lighthouse, file k6 JSON. Nếu chưa có staging, ghi `Pending` và **không** suy ra đạt từ số liệu dev.

---

## 10. Test case bảo mật (SEC-01→SEC-22)

> **Chuẩn đối chiếu:** OWASP Top 10 2021, OWASP ASVS 4.0.3 mức L1/L2, NFR-SEC-001→014. IDOR chạy tự động mỗi PR; ZAP/Schemathesis chỉ chạy khi có staging (S7).

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết | Trạng thái |
|---|---|---|---|---|---|
| **SEC-01** | SEC, IT | Chạy toàn bộ `idor.int.test.ts`: A có đủ dữ liệu sức khỏe + social; B gọi mọi route có `{id}`/`{username}`/`{petId}`. | 136/136 Pass; 404 cho tài nguyên người khác; dữ liệu A không đổi; không lộ trường riêng tư. | NFR-SEC-004, G-9, FG-1 | **Pass (136/136)** — baseline F-13 |
| **SEC-02** | SEC, IT | Meta-test RLS: kiểm `relrowsecurity` + policy trên mọi bảng; thử `SET ROLE app_rw` đọc chéo. | 100% bảng sức khỏe + 8 bảng social bật RLS/FORCE; không đọc chéo; `app_worker` chỉ dùng cho worker. | NFR-SEC-004, 013 | **Pass** — `social-rls.int.test.ts`, `db.int.test.ts` |
| **SEC-03** | SEC, API | Quét mọi response đọc của Bản tin + hồ sơ: tìm `email`, `birth`, `weight`, `symptom`, `diagnosis`, `medication`, `note`, khóa file. | 0 lần xuất hiện; chỉ tên bé, username, ảnh công khai. | NFR-SEC-013, SD-016 | **Pass** — leak scan F-13 |
| **SEC-04** | SEC, API | Đăng nhập/đăng ký/quên mật khẩu với email tồn tại và không tồn tại. | Cùng status + cùng thông báo; thời gian phản hồi không chênh đáng kể. | FR-AUTH-005, NFR-SEC-004 | Chạy dev |
| **SEC-05** | SEC, API | Sai mật khẩu 5 lần; thử đúng; chờ 15 phút; thử từ IP khác. | Khóa tài khoản đúng; không bypass bằng IP khác; mở khóa sau 15 phút. | FR-AUTH-006, NFR-SEC-005 | Chạy dev |
| **SEC-06** | SEC, API | Vượt ngưỡng đăng ký 10/giờ/IP, quên mật khẩu 5/giờ/email, gửi lại xác minh. | 429 + `Retry-After`; không tạo tài khoản/token thừa; email không gửi thêm. | NFR-SEC-005, FR-AUTH-003 | Chạy dev |
| **SEC-07** | SEC, API | Kiểm `Set-Cookie` khi đăng nhập; kiểm cookie trên HTTP (dev) và mô phỏng HTTPS. | `HttpOnly`, `SameSite=Lax`; `Secure` bật khi HTTPS/production; không lộ session trong URL/localStorage. | NFR-SEC-002, G-10 | Một phần (Secure khi có HTTPS) |
| **SEC-08** | SEC, API | Gửi POST/PATCH/DELETE không CSRF, sai CSRF, CSRF của phiên khác, đúng CSRF. | Thiếu/sai/chéo phiên → 403; đúng → thành công; không ảnh hưởng GET. | NFR-SEC-002 | Chạy dev |
| **SEC-09** | SEC, API | Session fixation: lấy cookie trước login, login, dùng cookie cũ; logout rồi dùng lại. | Cookie đổi sau login; cookie cũ không dùng được; logout vô hiệu hóa server-side. | FR-AUTH-007, NFR-SEC-002 | Chạy dev |
| **SEC-10** | SEC, UT | Kiểm hash mật khẩu trong DB; quét log khi đăng nhập/đổi mật khẩu/lỗi. | Argon2id (hoặc bcrypt cost ≥12); salt riêng; log không có mật khẩu/token/email đầy đủ. | NFR-SEC-001, 009 | Chạy dev |
| **SEC-11** | SEC, CI | `gitleaks` + quét bundle client tìm `DATABASE_URL`, `MEDIA_SIGNING_KEY`, `ANALYTICS_HMAC_KEY`, SMTP pass. | 0 secret trong repo/bundle/log; chỉ `.env` local; CI fail nếu phát hiện. | NFR-SEC-010 | CI (baseline) |
| **SEC-12** | SEC, API | Sửa path/chữ ký/hạn của URL ảnh; dùng URL của A cho B; dùng lại sau khi xóa. | Sửa → 403; hết hạn 15 phút → 403; B dùng URL A → 403/404; ảnh xóa → 404. | NFR-SEC-006, G-11 | Chạy dev |
| **SEC-13** | SEC, API | Upload file `.jpg` chứa PHP/HTML/SVG, file nén bomb, file 0 byte, MIME sai. | Chỉ nhận ảnh thật theo magic bytes; không thực thi; giải nén có giới hạn; lỗi rõ. | NFR-SEC-007 | Chạy dev |
| **SEC-14** | SEC, E2E | Chèn `<script>`, `"><img onerror>`, `javascript:` vào nickname, caption, comment, tên bé, bio. | Tất cả bị encode/hiển thị dạng chữ; không thực thi; CSP chặn inline script. | NFR-SEC-007 | Chạy dev |
| **SEC-15** | SEC, API | SQL injection vào `q`, `cursor`, `sort`, `username`; thử `' OR 1=1--`, `;DROP`. | Tham số hóa; 422/404; không lộ lỗi SQL; DB nguyên vẹn. | NFR-SEC-007 | Chạy dev |
| **SEC-16** | SEC, CI | `pnpm audit --prod`, OSV-Scanner, kiểm pin GitHub Actions SHA. | 0 lỗ hổng High/Critical; dependency pin; action pin SHA. | NFR-SEC-008, G-12 | CI (baseline) |
| **SEC-17** | SEC, API | Kiểm header: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`, HSTS. | Header đúng; HSTS chỉ khi HTTPS (production); không `unsafe-inline` cho script. | NFR-SEC-003, 007, G-10 | Một phần (HSTS Pending) |
| **SEC-18** | SEC, IT | Ảnh JPEG có GPS/EXIF; HEIC có metadata; thumbnail. | Cả ảnh chính + thumbnail không còn EXIF/GPS; kiểm bằng `exiftool`/libvips. | NFR-SEC-011, SD-007 | Chạy dev |
| **SEC-19** | SEC, E2E | `?next=https://evil.example`, `//evil`, `/\evil`, `javascript:`. | Chỉ redirect nội bộ; URL ngoài bị bỏ qua; không open redirect. | FR-AUTH-014 | Chạy dev |
| **SEC-20** | SEC, Review | Rà soát pháp lý: dữ liệu cá nhân, đồng thuận, lưu trữ, xóa, chia sẻ ảnh công khai. | Có ý kiến pháp lý trước khi mở cho người ngoài; ghi nhận khoảng trống. | NFR-SEC-012 | **Pending** — cần chuyên gia |
| **SEC-21** | SEC, DB | Gửi event analytics chứa PII/nội dung; quét bảng `analytics_events` + view funnel. | Không có email/tên bé/caption/comment/username/ID bài; chỉ allowlist + hash. | NFR-SEC-013, FG-5 | **Pass** — S6-05, F-13 |
| **SEC-22** | SEC, API | Kết hợp chặn + rate limit: B bị A chặn vẫn tim/bình luận/theo dõi; B vượt ngưỡng. | 404/429; không tạo thông báo cho A; không lách bằng nhiều tài khoản trong cùng phiên. | NFR-SEC-014, FR-SOC-033, 038 | Chạy dev |

**Ghi chú:** SEC-01/02/03/11/16/21 có bằng chứng tự động trong CI/baseline. SEC-07/17 phụ thuộc HTTPS production; SEC-20 phụ thuộc chuyên gia pháp lý — tất cả phải xuất hiện trong known issues nếu chưa đóng trước khi mở public.

---

## 11. Test case accessibility (ACC-01→ACC-12)

> Chuẩn: WCAG 2.1 AA, NFR-USA-001→003, FG-3. Tự động: `@axe-core/playwright` trên từng màn, phone + tablet. Thủ công: bàn phím, screen reader, zoom.

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết | Trạng thái |
|---|---|---|---|---|---|
| **ACC-01** | ACC | axe quét 25 màn ở trạng thái có dữ liệu (phone 390×844 + tablet 834×1112). | 0 vi phạm `serious`/`critical`; các vi phạm `minor` được ghi + quyết định. | NFR-USA-002, FG-3 | **Pass 14 màn** — `a11y.ui.spec.ts`; còn 11 màn cần bổ sung |
| **ACC-02** | ACC | axe quét trạng thái rỗng, lỗi, loading, dialog xác nhận, lightbox, carousel. | 0 serious/critical ở cả trạng thái động; dialog có `role`/`aria-modal`. | NFR-USA-002 | Chưa đủ — khoảng trống |
| **ACC-03** | ACC | Điều hướng chỉ bằng Tab/Shift+Tab/Enter/Esc/Arrow qua 6 luồng chính. | Thứ tự focus hợp lý; không bẫy focus ngoài dialog; Esc đóng; Arrow hoạt động ở carousel/tab. | NFR-USA-002 | Thủ công — chưa chạy đầy đủ |
| **ACC-04** | ACC | Mở/đóng dialog xóa, lightbox, bottom sheet; kiểm focus trả về. | Focus vào phần tử đầu; đóng trả về nút mở; nền `aria-hidden`/inert. | NFR-USA-002 | Thủ công |
| **ACC-05** | ACC | NVDA (Windows) + VoiceOver (iOS/iPadOS) đọc 5 luồng: đăng ký, tạo mốc, checklist, feed, bình luận. | Tên/nhãn/trạng thái đọc đúng; thông báo lỗi được đọc; không đọc nội dung ẩn. | NFR-USA-002 | **Pending** — cần thiết bị/trình đọc màn hình |
| **ACC-06** | ACC | Đo tương phản chữ/nền, trạng thái quá hạn/D7/đã xong, nút disable. | Chữ thường ≥4,5:1; chữ lớn ≥3:1; trạng thái có nhãn chữ, không chỉ màu. | NFR-USA-003 | Kiểm công cụ + mắt |
| **ACC-07** | ACC | Đo vùng chạm của mọi nút/chip/tab/checkbox trên phone. | ≥44×44 px (hoặc khoảng cách bù tương đương); không chồng lấn. | NFR-USA-001, FG-3 | **Pass** — S6-04 |
| **ACC-08** | ACC | Kiểm form: label, `autocomplete`, lỗi `aria-describedby`, `aria-invalid`, trường bắt buộc. | Mọi ô có label; lỗi liên kết; trạng thái lỗi được đọc; không chỉ viền đỏ. | NFR-USA-002 | Kiểm code + thủ công |
| **ACC-09** | ACC | Toast, badge, banner nhắc, "Có bài mới", lỗi mạng. | Dùng `role="status"`/`aria-live` phù hợp; không đọc lặp; badge có nhãn đầy đủ. | NFR-USA-002, FR-SOC-031 | Kiểm code |
| **ACC-10** | ACC | Bật `prefers-reduced-motion`; mở carousel, thả tim, toast. | Không animation chuyển động lớn; vẫn dùng được; không mất thông tin. | NFR-USA-002, FR-SOC-023 | Chạy dev |
| **ACC-11** | ACC | Zoom 200% và viewport 320 px; kiểm 5 màn. | Không mất nội dung, không cuộn ngang; chữ không bị cắt. | NFR-USA-002, NFR-PRT-002 | Thủ công |
| **ACC-12** | ACC | Ảnh có alt; biểu đồ cân nặng có bảng dữ liệu thay thế; icon có nhãn. | Mọi ảnh nội dung có alt; ảnh trang trí `alt=""`; biểu đồ có bảng; icon-only có `aria-label`. | NFR-USA-002, 003 | Kiểm code + axe |

---

## 12. Test case UI/UX (UI-01→UI-14)

> Đối chiếu `UI_UX_Blueprint.md` (SCR-01→SCR-25), PRD §4.2 (empty/error), Figma. Breakpoint bắt buộc: 360, 390, 768, 834, 1024, 1280, 1366 px; dọc + ngang.

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **UI-01** | UI | Checklist 25 màn: thành phần, thứ tự, nhãn, hành động chính so Blueprint. | 25/25 khớp cấu trúc; sai khác thẩm mỹ ghi mức S4; sai luồng ghi S3. | IF-UI-001→004 |
| **UI-02** | UI | Đo cuộn ngang 7 breakpoint × 10 màn chính, cả dọc/ngang. | 0 cuộn ngang trong 360–1366 px; ảnh/biểu đồ co giãn đúng. | NFR-PRT-002 |
| **UI-03** | UI | Kiểm 4 trạng thái chuẩn (loading, empty, error, có dữ liệu) trên 12 màn. | Skeleton/spinner đúng; empty có CTA; error có thử lại; không nhảy layout. | FR-GEN-012, PRD §4.2 |
| **UI-04** | UI | Kiểm pattern responsive: nav dưới (phone), nav trái (tablet), bottom sheet vs modal. | Đúng breakpoint 768; sheet trên phone, modal trên tablet; không dùng lẫn. | FR-DSH-004, IF-UI-001 |
| **UI-05** | UI | Kiểm dialog xác nhận xóa (bé, bản ghi, mốc, bài, bình luận, tài khoản). | Luôn có xác nhận; nút nguy hiểm rõ; Esc/hủy an toàn; focus đúng. | FR-GEN-010 |
| **UI-06** | UI | Kiểm toast + hoàn tác + thông báo lỗi trường. | Toast 3 giây; hoàn tác 10 giây; lỗi dưới đúng trường; không chỉ toast. | FR-GEN-009, 010 |
| **UI-07** | UI | Kiểm định dạng ngày `dd/MM/yyyy`, số `9,2 kg`, tuổi, thời gian tương đối. | Nhất quán toàn app; tiếng Anh dùng định dạng phù hợp; không `NaN`/`Invalid Date`. | FR-GEN-002, NFR-USA-007 |
| **UI-08** | UI | Chuyển vi/en trên 6 màn; kiểm chuỗi dài/ngắn, tràn, cắt. | Không lẫn ngôn ngữ; không tràn nút; khóa dịch đủ; lỗi API dịch đúng. | NFR-USA-007, FG-4 |
| **UI-09** | UI | Kiểm ảnh: lưới 3 cột, carousel, thumbnail, lightbox, ảnh lỗi, ảnh đang tải. | Tỷ lệ vuông; không nhảy layout; placeholder; "Ảnh i/n"; đóng được. | FR-SOC-013, 016, 020 |
| **UI-10** | UI | Kiểm biểu đồ cân nặng: 0/1/nhiều điểm, mục tiêu, tooltip, resize. | Empty/1 điểm đúng; trục Y bao mục tiêu; tooltip không che điểm; resize không vỡ. | FR-WGT-004, 006, 007 |
| **UI-11** | UI | Kiểm màu + nhãn trạng thái mốc, badge, nút disable, lỗi. | Không chỉ dùng màu; nhãn tiếng Việt rõ; trạng thái disable nhận biết được. | FR-MS-013, NFR-USA-003 |
| **UI-12** | UI | So khớp Figma 390 px cho 10 màn P0 (spacing, typography, màu). | Sai khác ≤4 px hoặc ghi nhận; không lệch component; dark mode `N/A`. | IF-UI-001, NT-05 |
| **UI-13** | UI | Kiểm tương tác cảm ứng: vuốt carousel, kéo làm mới, nhấn đúp, long-press. | Cử chỉ hoạt động; không xung đột cuộn; có phản hồi; không kích hoạt nhầm. | FR-SOC-019, 023, NFR-PRT-001 |
| **UI-14** | UI | Kiểm Safari/Chrome desktop + emulation; ghi khác biệt. | Không lỗi layout; cookie/session hoạt động; ghi rõ phần chưa kiểm trên thiết bị thật (G-4 Pending). | NFR-PRT-001→005 |

---

## 13. Test case độ tin cậy, vận hành và khả năng bảo trì

### 13.1 Độ tin cậy (REL-01→REL-08)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết | Trạng thái |
|---|---|---|---|---|---|
| **REL-01** | REL, API | 10 request song song tạo notification cùng mốc/mức; 10 request complete cùng mốc. | Không trùng, không 500; unique xử lý; kết quả nhất quán. | NFR-REL-003, G-15, FR-NTF-005 | **Pass** — `concurrency.api.spec.ts` |
| **REL-02** | REL, OPS | Restart worker giữa lúc xử lý job; kiểm retry. | Job chạy lại, không mất; không tạo email/ảnh trùng; log rõ. | NFR-REL-001 | Có thể chạy dev |
| **REL-03** | REL, IT | Tải lại Dashboard 20 lần liên tiếp; mở 3 thiết bị. | Số thông báo không tăng; mỗi mốc tối đa 1 chưa xem; không mất nhắc. | FR-NTF-005, G-15 | **Pass** — baseline |
| **REL-04** | REL, OPS | Làm 1 bước job lỗi (khóa bảng/tắt quyền) và chạy job. | Bước lỗi log `error {job,step,code}`; các bước khác vẫn chạy; job cuối trả lỗi để pg-boss retry. | NFR-REL-003 | Có test `maintenance.int.test.ts` |
| **REL-05** | REL, IT | FakeClock +91 ngày; chạy job; kiểm dữ liệu 89/91 ngày. | Xóa đúng biên; giữ 89 ngày; idempotent lần 2 xóa 0. | FR-NTF-011, SD-013, 021 | **Pass** — S6-06 |
| **REL-06** | REL | Đổi múi giờ, DST, qua 00:00; kiểm checklist + nhắc. | Không lệch ngày; không tạo 2 nhắc; reset đúng. | FR-GEN-001, FR-RT-004, G-5 | Chạy dev (`timezone.api`) |
| **REL-07** | REL, API | Ngắt DB 10 giây rồi kết nối lại; gửi request. | API trả 503 problem+json; tự phục hồi; không rò connection; healthcheck đổi trạng thái. | NFR-REL-001 | Có thể chạy dev |
| **REL-08** | REL, OPS | SIGTERM khi đang chạy request/job. | Graceful shutdown: hoàn tất request trong hạn, đóng pool, heartbeat dừng; không mất dữ liệu. | NFR-REL-001 | Có `shutdown.test.ts` |

### 13.2 Vận hành (OPS-01→OPS-10)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết | Trạng thái |
|---|---|---|---|---|---|
| **OPS-01** | OPS | `GET /healthz`, `GET /readyz` khi DB sống/chết, worker sống/chết. | `healthz` 200 khi process sống; `readyz` 503 khi DB/worker chết; không lộ chi tiết. | NFR-REL-001 | **Pass** — `app.test.ts`, compose healthcheck |
| **OPS-02** | OPS | Kiểm heartbeat file/cập nhật định kỳ. | Heartbeat chỉ ghi khi `SELECT 1` thành công; file cũ bị coi là unhealthy. | NFR-REL-001 | **Pass** — `heartbeat.test.ts` |
| **OPS-03** | OPS | Kiểm lịch `maintenance.daily` 20:00 UTC (03:00 VN), retry 3. | Đúng 1 lịch; timezone UTC; retry/delay đúng; không chạy 2 worker cùng lúc. | NFR-REL-003, S6-06 | **Pass** |
| **OPS-04** | OPS | Chạy tay `pnpm --filter @ph/api maintenance:run`. | Job chạy ngay; log từng bước; không cần restart worker. | NFR-REL-003 | **Pass** — S6-06 |
| **OPS-05** | OPS | Upload bị bỏ dở 25 giờ; file mồ côi 2 ngày; ảnh FAILED. | File `incoming/` xóa; upload `FAILED/ABANDONED`; file mồ côi xóa; ảnh READY không đụng. | FR-SOC-007, S6-06 | **Pass** |
| **OPS-06** | OPS | Kiểm dung lượng media/DB sau seed lớn; dọn `.data`. | Có ngưỡng cảnh báo; dọn được; không ảnh hưởng dữ liệu đang dùng. | RSK-20 | Thủ công |
| **OPS-07** | OPS | Chạy migration trên môi trường có dữ liệu (staging). | Có backup/snapshot trước; rollback được; thời gian ghi nhận. | NFR-MNT-006 | **Pending** — chưa có staging |
| **OPS-08** | OPS | Backup/restore, RPO/RTO. | **Không thực hiện** — G-13/NFR-REL-002 đã rút (DEC-020). | NT-01 | **N/A (Withdrawn)** |
| **OPS-09** | OPS | Giám sát/cảnh báo, dashboard vận hành. | **Không thực hiện** — G-16/NFR-REL-004/005 đã rút (DEC-017). | NT-02 | **N/A (Withdrawn)** |
| **OPS-10** | OPS | Gửi email qua Gmail/Outlook thật; kiểm spam, SPF/DKIM/DMARC. | Vào inbox, không spam, link đúng; **Pending** vì chưa có SMTP Gmail. | NFR-PERF-004, G-14 | **Pending** |

### 13.3 Khả năng bảo trì (MNT-01→MNT-10)

| ID | Cấp | Kịch bản | Kỳ vọng | Truy vết |
|---|---|---|---|---|
| **MNT-01** | MNT | `pnpm format:check`, `pnpm lint`. | 0 lỗi; 0 file chưa format; rule không bị tắt tùy tiện. | NFR-MNT-002 |
| **MNT-02** | MNT | `pnpm -r typecheck` (strict). | 0 lỗi; không `any` mới không giải thích. | NFR-MNT-002 |
| **MNT-03** | MNT | `pnpm depcruise apps packages`. | 0 vi phạm ranh giới module/hexagonal; không import vòng. | NFR-MNT-002, SAD §2.2 |
| **MNT-04** | MNT | `pnpm test:unit --coverage`; đối chiếu ngưỡng. | Domain/platform ≥90% dòng; tổng ≥70%; báo cáo lưu CI. | NFR-MNT-003, G-2 |
| **MNT-05** | MNT | `pnpm openapi:gen` + `openapi-typescript` sinh client. | Không diff; client compile; 86 operation. | NFR-MNT-001, 004 |
| **MNT-06** | MNT | CI contract job: diff OpenAPI + oasdiff. | 0 breaking; PR bị chặn nếu đổi contract không cập nhật client. | NFR-MNT-004, G-17 |
| **MNT-07** | MNT | Kiểm seed/fixture: chạy lại 2 lần, DB sạch. | Seed idempotent; không phụ thuộc thứ tự; dọn được. | NFR-MNT-005 |
| **MNT-08** | MNT | Kiểm tài liệu task/evidence: mỗi task có file kết quả + commit. | 47/54 task GĐ1 + 12/13 GĐ2 có evidence; task thiếu được liệt kê. | NFR-MNT-005 |
| **MNT-09** | MNT | `size-limit` sau build. | JS <250 KB, CSS <25 KB gzip; fail CI nếu vượt. | NFR-PERF-003, G-8 |
| **MNT-10** | MNT | Kiểm pin dependency/action SHA, lockfile. | Lockfile commit; action pin SHA; không `latest` trong CI. | NFR-SEC-008, NFR-MNT-002 |

---

## 14. Ma trận truy vết

> **Nguyên tắc:** mỗi FR có ít nhất một `TC` chức năng (cột "TC chính"); case âm/biên cùng số được liệt kê ở cột "Bổ sung". Các case xuyên suốt (DB/API/CON/E2E/UAT/SEC/ACC/UI/REL/OPS/MNT) được ánh xạ ở §14.3–§14.6 và trong cột "Truy vết" của từng case.
> **Trạng thái:** "Đã thiết kế" = có đặc tả; "Có bằng chứng" = có kết quả chạy trong baseline 2026-10-26; "Chưa chạy" = chưa thực thi trong chu kỳ này.

### 14.1 Story → FR → Test case

| Story | Ưu tiên | FR | UAT | TC chính | E2E / bổ sung |
|---|---|---|---|---|---|
| US-001 Đăng ký | P0 | FR-AUTH-001, 002 | UAT-001 | TC-AUTH-001 | TC-AUTH-001-N1, E2E-01 |
| US-002 Xác minh email | P1 | FR-AUTH-002→004, FR-DSH-007 | UAT-002 | TC-AUTH-002, 003, 004 | E2E-01, TC-DSH-007 |
| US-003 Đăng nhập/xuất | P0 | FR-AUTH-005→007, 014 | UAT-003 | TC-AUTH-005, 006, 007 | TC-AUTH-006-N1, E2E-02 |
| US-004 Đặt lại mật khẩu | P1 | FR-AUTH-008, 009 | UAT-004 | TC-AUTH-008, 009 | E2E-03 |
| US-005 Xóa tài khoản | P2 | FR-AUTH-016 | UAT-005 | TC-AUTH-016 | E2E-05 |
| US-006 Phân quyền dữ liệu | P0 | FR-AUTH-013; NFR-SEC-004 | UAT-006 | TC-AUTH-013 | TC-AUTH-013-N1, SEC-01, DB-03 |
| US-007 Nhất quán đa thiết bị | P0 | FR-GEN-007, 008 | UAT-007 | TC-GEN-007, 008 | E2E-17 |
| US-008 Đổi email | P1 | FR-AUTH-015 | UAT-008 | TC-AUTH-015 | E2E-04 |
| US-010 Tạo hồ sơ | P0 | FR-PET-001 | UAT-010 | TC-PET-001 | TC-PET-001-B1, E2E-06 |
| US-011 Tự tính tuổi | P1 | FR-PET-003 | UAT-011 | TC-PET-003 | — |
| US-012 Đặc điểm + ảnh | P1 | FR-PET-004, 005 | UAT-012 | TC-PET-004, 005 | DB-22, SEC-18 |
| US-013 Sửa hồ sơ | P0 | FR-PET-006 | UAT-013 | TC-PET-006 | E2E-06 |
| US-014 Xóa hồ sơ | P1 | FR-PET-008 | UAT-014 | TC-PET-008 | DB-07 |
| US-015 Quản lý tối đa 10 | P0 | FR-PET-002, 007 | UAT-015 | TC-PET-002, 007 | TC-PET-002-N1 |
| US-020 Ghi số đo | P0 | FR-WGT-001, 002 | UAT-020 | TC-WGT-001, 002 | TC-WGT-001-B1, E2E-08 |
| US-021 Mục tiêu | P0 | FR-WGT-005 | UAT-021 | TC-WGT-005 | TC-WGT-005-B1 |
| US-022 Biểu đồ | P0 | FR-WGT-003, 004, 006→009 | UAT-022 | TC-WGT-003, 004, 006→009 | UI-10 |
| US-023 Sửa/xóa số đo | P1 | FR-WGT-010 | UAT-023 | TC-WGT-010 | E2E-08 |
| US-030 Tạo bản ghi khám | P0 | FR-VIS-001 | UAT-030 | TC-VIS-001 | TC-VIS-001-N1, E2E-09 |
| US-031 Danh sách lịch sử | P0 | FR-VIS-002 | UAT-031 | TC-VIS-002 | CON-07 |
| US-032 Sửa/xóa bản ghi | P0 | FR-VIS-003, 004 | UAT-032 | TC-VIS-003, 004 | E2E-09 |
| US-033 Ảnh đơn thuốc/XNT | P1 | FR-VIS-005, 006, 008 | UAT-033 | TC-VIS-005, 006, 008 | TC-VIS-005-B1, DB-10 |
| US-034 Xóa ảnh | P1 | FR-VIS-007 | UAT-034 | TC-VIS-007 | E2E-09 |
| US-040 Tạo mốc | P0 | FR-MS-001, 002 | UAT-040 | TC-MS-001, 002 | TC-MS-001-N1, E2E-10 |
| US-041 Nhắc D7/D1 | P0 | FR-NTF-001, 003→005, 007 | UAT-041 | TC-NTF-001, 003, 004, 005, 007 | TC-NTF-001-B1, E2E-01 |
| US-042 Đánh dấu thực hiện | P0 | FR-MS-003→005; FR-NTF-006 | UAT-042 | TC-MS-003, 004, 005 | E2E-11 |
| US-043 Tự tạo mốc năm sau | P0 | FR-MS-008, 011 | UAT-043 | TC-MS-008, 011 | TC-MS-008-B1, DB-21 |
| US-044 Chu kỳ lặp | P1 | FR-MS-001, 009, 011 | UAT-044 | TC-MS-009 | TC-MS-009 + DB-11 |
| US-046 Sửa/hủy mốc | P0 | FR-MS-006, 007; FR-NTF-006 | UAT-046 | TC-MS-006, 007 | TC-MS-006-N1, E2E-10 |
| US-047 Mốc sắp tới/quá hạn | P1 | FR-DSH-003; FR-MS-012 | UAT-047 | TC-DSH-003, TC-MS-012 | UI-03 |
| US-048 Nhắc quá hạn | P1 | FR-NTF-002 | UAT-048 | TC-NTF-002 | E2E-01 |
| US-049 Mục Thông báo | P0 | FR-NTF-008, 010, 011 | UAT-049 | TC-NTF-008, 010, 011 | TC-NTF-005-N1, E2E-12 |
| US-050 Tạo việc | P1 | FR-RT-001 | UAT-050 | TC-RT-001 | TC-RT-001-B1 |
| US-051 Checklist hôm nay | P1 | FR-RT-002; FR-DSH-001, 002 | UAT-051 | TC-RT-002, TC-DSH-001, 002 | E2E-13 |
| US-052 Chạm đảo trạng thái | P1 | FR-RT-003 | UAT-052 | TC-RT-003 | TC-RT-003-N1 |
| US-053 Lưu theo ngày | P1 | FR-RT-004, 005 | UAT-053 | TC-RT-004, 005 | DB-13, REL-06 |
| US-045 Sửa/xóa việc | P1 | FR-RT-006, 007 | UAT-045 | TC-RT-006, 007 | E2E-13 |
| US-060 Tổng quan | P0 | FR-DSH-001, 002, 004, 006 | UAT-060 | TC-DSH-001, 002, 004, 006 | TC-DSH-002-N1, E2E-14 |
| US-061 Lọc theo bé | P1 | FR-DSH-005 | UAT-061 | TC-DSH-005 | E2E-14 |
| US-062 Banner nhắc | P0 | FR-NTF-009, 010; FR-DSH-002 | UAT-062 | TC-NTF-009, 010 | E2E-12, E2E-14 |
| US-070 Hồ sơ công khai | P1 | FR-SOC-001→005 | UAT-070 | TC-SOC-001→005 | E2E-18, SEC-03 |
| US-071 Đăng bài nhiều ảnh | P1 | FR-SOC-006→009; FR-GEN-013 | UAT-071 | TC-SOC-006→009 | TC-SOC-006-B1, E2E-19 |
| US-072 Hồ sơ lưới + chi tiết bài | P1 | FR-SOC-012, 013, 016 | UAT-072 | TC-SOC-012, 013, 016 | E2E-20, E2E-26 |
| US-073 Sửa/xóa bài | P1 | FR-SOC-010, 011 | UAT-073 | TC-SOC-010, 011 | E2E-19 |
| US-074 Theo dõi + tìm | P1 | FR-SOC-014, 015, 017 | UAT-074 | TC-SOC-014, 015, 017 | TC-SOC-017-N1, E2E-22 |
| US-075 Bản tin | P1 | FR-SOC-018→021 | UAT-075 | TC-SOC-018→021 | E2E-20 |
| US-076 Thả tim | P1 | FR-SOC-022→024 | UAT-076 | TC-SOC-022→024 | E2E-21, ACC-10 |
| US-077 Bình luận | P1 | FR-SOC-025→027 | UAT-077 | TC-SOC-025→027 | TC-SOC-025-B1, E2E-21 |
| US-078 Thông báo hoạt động | P1 | FR-SOC-028→033 | UAT-078 | TC-SOC-028→033 | E2E-23 |
| US-079 Chặn người dùng | P1 | FR-SOC-034→040 | UAT-079 | TC-SOC-034→040 | TC-SOC-036-N1, E2E-24 |

**Tổng hợp:** 50 story · 50 UAT · 100% story có FR và TC · 21 P0, 28 P1, 1 P2.

### 14.2 FR → Test case

| FR | Ưu tiên | TC chính | Case âm/biên | Trạng thái |
|---|---|---|---|---|
| FR-AUTH-001 | P0 | TC-AUTH-001 | TC-AUTH-001-N1 | Đã thiết kế |
| FR-AUTH-002 | P1 | TC-AUTH-002 | — | Đã thiết kế |
| FR-AUTH-003 | P1 | TC-AUTH-003 | — | Đã thiết kế |
| FR-AUTH-004 | P1 | TC-AUTH-004 | — | Đã thiết kế |
| FR-AUTH-005 | P0 | TC-AUTH-005 | — | Đã thiết kế |
| FR-AUTH-006 | P0 | TC-AUTH-006 | TC-AUTH-006-N1 | Đã thiết kế |
| FR-AUTH-007 | P0 | TC-AUTH-007 | — | Đã thiết kế |
| FR-AUTH-008 | P1 | TC-AUTH-008 | — | Đã thiết kế |
| FR-AUTH-009 | P1 | TC-AUTH-009 | — | Đã thiết kế |
| FR-AUTH-010 | P1 | TC-AUTH-010 | — | Đã thiết kế |
| FR-AUTH-011 | P0 | TC-AUTH-011 | — | Đã thiết kế |
| FR-AUTH-012 | P0 | TC-AUTH-012 | — | Đã thiết kế |
| FR-AUTH-013 | P0 | TC-AUTH-013 | TC-AUTH-013-N1 | Đã thiết kế |
| FR-AUTH-014 | P0 | TC-AUTH-014 | — | Đã thiết kế |
| FR-AUTH-015 | P1 | TC-AUTH-015 | — | Đã thiết kế |
| FR-AUTH-016 | P2 | TC-AUTH-016 | — | Đã thiết kế |
| FR-AUTH-017 | P1 | TC-AUTH-017 | — | Đã thiết kế |
| FR-AUTH-018 | P1 | TC-AUTH-018 | — | Đã thiết kế |
| FR-PET-001 | P0 | TC-PET-001 | TC-PET-001-B1 | Đã thiết kế |
| FR-PET-002 | P0 | TC-PET-002 | TC-PET-002-N1 | Đã thiết kế |
| FR-PET-003 | P1 | TC-PET-003 | — | Đã thiết kế |
| FR-PET-004 | P1 | TC-PET-004 | — | Đã thiết kế |
| FR-PET-005 | P1 | TC-PET-005 | — | Đã thiết kế |
| FR-PET-006 | P0 | TC-PET-006 | — | Đã thiết kế |
| FR-PET-007 | P0 | TC-PET-007 | — | Đã thiết kế |
| FR-PET-008 | P1 | TC-PET-008 | — | Đã thiết kế |
| FR-WGT-001 | P0 | TC-WGT-001 | TC-WGT-001-B1 | Đã thiết kế |
| FR-WGT-002 | P0 | TC-WGT-002 | — | Đã thiết kế |
| FR-WGT-003 | P0 | TC-WGT-003 | — | Đã thiết kế |
| FR-WGT-004 | P0 | TC-WGT-004 | — | Đã thiết kế |
| FR-WGT-005 | P0 | TC-WGT-005 | TC-WGT-005-B1 | Đã thiết kế |
| FR-WGT-006 | P0 | TC-WGT-006 | — | Đã thiết kế |
| FR-WGT-007 | P0 | TC-WGT-007 | — | Đã thiết kế |
| FR-WGT-008 | P0 | TC-WGT-008 | — | Đã thiết kế |
| FR-WGT-009 | P1 | TC-WGT-009 | — | Đã thiết kế |
| FR-WGT-010 | P1 | TC-WGT-010 | — | Đã thiết kế |
| FR-VIS-001 | P0 | TC-VIS-001 | TC-VIS-001-N1 | Đã thiết kế |
| FR-VIS-002 | P0 | TC-VIS-002 | — | Đã thiết kế |
| FR-VIS-003 | P0 | TC-VIS-003 | — | Đã thiết kế |
| FR-VIS-004 | P0 | TC-VIS-004 | — | Đã thiết kế |
| FR-VIS-005 | P1 | TC-VIS-005 | TC-VIS-005-B1 | Đã thiết kế |
| FR-VIS-006 | P1 | TC-VIS-006 | — | Đã thiết kế |
| FR-VIS-007 | P1 | TC-VIS-007 | — | Đã thiết kế |
| FR-VIS-008 | P1 | TC-VIS-008 | — | Đã thiết kế |
| FR-MS-001 | P0 | TC-MS-001 | TC-MS-001-N1 | Đã thiết kế |
| FR-MS-002 | P0 | TC-MS-002 | — | Đã thiết kế |
| FR-MS-003 | P0 | TC-MS-003 | — | Đã thiết kế |
| FR-MS-004 | P0 | TC-MS-004 | — | Đã thiết kế |
| FR-MS-005 | P0 | TC-MS-005 | — | Đã thiết kế |
| FR-MS-006 | P0 | TC-MS-006 | TC-MS-006-N1 | Đã thiết kế |
| FR-MS-007 | P0 | TC-MS-007 | — | Đã thiết kế |
| FR-MS-008 | P0 | TC-MS-008 | TC-MS-008-B1 | Đã thiết kế |
| FR-MS-009 | P1 | TC-MS-009 | — | Đã thiết kế |
| FR-MS-010 | P0 | TC-MS-010 | — | Đã thiết kế |
| FR-MS-011 | P0 | TC-MS-011 | — | Đã thiết kế |
| FR-MS-012 | P0 | TC-MS-012 | — | Đã thiết kế |
| FR-MS-013 | P1 | TC-MS-013 | — | Đã thiết kế |
| FR-NTF-001 | P0 | TC-NTF-001 | TC-NTF-001-B1 | Đã thiết kế |
| FR-NTF-002 | P1 | TC-NTF-002 | — | Đã thiết kế |
| FR-NTF-003 | P0 | TC-NTF-003 | — | Đã thiết kế |
| FR-NTF-004 | P0 | TC-NTF-004 | — | Đã thiết kế |
| FR-NTF-005 | P0 | TC-NTF-005 | TC-NTF-005-N1 | Đã thiết kế |
| FR-NTF-006 | P0 | TC-NTF-006 | — | Đã thiết kế |
| FR-NTF-007 | P0 | TC-NTF-007 | — | Đã thiết kế |
| FR-NTF-008 | P0 | TC-NTF-008 | — | Đã thiết kế |
| FR-NTF-009 | P0 | TC-NTF-009 | — | Đã thiết kế |
| FR-NTF-010 | P0 | TC-NTF-010 | — | Đã thiết kế |
| FR-NTF-011 | P1 | TC-NTF-011 | — | Đã thiết kế |
| FR-RT-001 | P1 | TC-RT-001 | TC-RT-001-B1 | Đã thiết kế |
| FR-RT-002 | P1 | TC-RT-002 | — | Đã thiết kế |
| FR-RT-003 | P1 | TC-RT-003 | TC-RT-003-N1 | Đã thiết kế |
| FR-RT-004 | P1 | TC-RT-004 | — | Đã thiết kế |
| FR-RT-005 | P1 | TC-RT-005 | — | Đã thiết kế |
| FR-RT-006 | P1 | TC-RT-006 | — | Đã thiết kế |
| FR-RT-007 | P1 | TC-RT-007 | — | Đã thiết kế |
| FR-DSH-001 | P0 | TC-DSH-001 | — | Đã thiết kế |
| FR-DSH-002 | P0 | TC-DSH-002 | TC-DSH-002-N1 | Đã thiết kế |
| FR-DSH-003 | P1 | TC-DSH-003 | — | Đã thiết kế |
| FR-DSH-004 | P0 | TC-DSH-004 | — | Đã thiết kế |
| FR-DSH-005 | P1 | TC-DSH-005 | — | Đã thiết kế |
| FR-DSH-006 | P0 | TC-DSH-006 | — | Đã thiết kế |
| FR-DSH-007 | P1 | TC-DSH-007 | — | Đã thiết kế |
| FR-GEN-001 | P0 | TC-GEN-001 | — | Đã thiết kế |
| FR-GEN-002 | P0 | TC-GEN-002 | — | Đã thiết kế |
| FR-GEN-003 | P0 | TC-GEN-003 | TC-GEN-003-N1 | Đã thiết kế |
| FR-GEN-004 | P0 | TC-GEN-004 | — | Đã thiết kế |
| FR-GEN-005 | P0 | TC-GEN-005 | TC-GEN-005-N1 | Đã thiết kế |
| FR-GEN-006 | P1 | TC-GEN-006 | — | Đã thiết kế |
| FR-GEN-007 | P0 | TC-GEN-007 | — | Đã thiết kế |
| FR-GEN-008 | P0 | TC-GEN-008 | — | Đã thiết kế |
| FR-GEN-009 | P0 | TC-GEN-009 | — | Đã thiết kế |
| FR-GEN-010 | P0 | TC-GEN-010 | — | Đã thiết kế |
| FR-GEN-011 | P0 | TC-GEN-011 | — | Đã thiết kế |
| FR-GEN-012 | P0 | TC-GEN-012 | — | Đã thiết kế |
| FR-GEN-013 | P1 | TC-GEN-013 | — | Đã thiết kế |
| FR-ANL-001 | P1 | TC-ANL-001 | TC-ANL-001-N1 | Đã thiết kế |
| FR-ANL-002 | P1 | TC-ANL-002 | — | Đã thiết kế |
| FR-ANL-003 | P0 | TC-ANL-003 | TC-ANL-003-N1 | Đã thiết kế |
| FR-ANL-004 | P1 | TC-ANL-004 | — | Đã thiết kế |
| FR-ANL-005 | P0 | TC-ANL-005 | — | Đã thiết kế |
| FR-ANL-006 | P1 | TC-ANL-006 | — | Đã thiết kế |
| FR-SOC-001 | P1 | TC-SOC-001 | — | Đã thiết kế |
| FR-SOC-002 | P1 | TC-SOC-002 | TC-SOC-002-N1 | Đã thiết kế |
| FR-SOC-003 | P1 | TC-SOC-003 | — | Đã thiết kế |
| FR-SOC-004 | P1 | TC-SOC-004 | — | Đã thiết kế |
| FR-SOC-005 | P1 | TC-SOC-005 | — | Đã thiết kế |
| FR-SOC-006 | P1 | TC-SOC-006 | TC-SOC-006-B1 | Đã thiết kế |
| FR-SOC-007 | P1 | TC-SOC-007 | TC-SOC-007-N1 | Đã thiết kế |
| FR-SOC-008 | P1 | TC-SOC-008 | — | Đã thiết kế |
| FR-SOC-009 | P1 | TC-SOC-009 | — | Đã thiết kế |
| FR-SOC-010 | P1 | TC-SOC-010 | — | Đã thiết kế |
| FR-SOC-011 | P1 | TC-SOC-011 | — | Đã thiết kế |
| FR-SOC-012 | P1 | TC-SOC-012 | — | Đã thiết kế |
| FR-SOC-013 | P1 | TC-SOC-013 | — | Đã thiết kế |
| FR-SOC-014 | P1 | TC-SOC-014 | — | Đã thiết kế |
| FR-SOC-015 | P1 | TC-SOC-015 | — | Đã thiết kế |
| FR-SOC-016 | P1 | TC-SOC-016 | — | Đã thiết kế |
| FR-SOC-017 | P1 | TC-SOC-017 | TC-SOC-017-N1 | Đã thiết kế |
| FR-SOC-018 | P1 | TC-SOC-018 | — | Đã thiết kế |
| FR-SOC-019 | P1 | TC-SOC-019 | — | Đã thiết kế |
| FR-SOC-020 | P1 | TC-SOC-020 | — | Đã thiết kế |
| FR-SOC-021 | P1 | TC-SOC-021 | — | Đã thiết kế |
| FR-SOC-022 | P1 | TC-SOC-022 | — | Đã thiết kế |
| FR-SOC-023 | P1 | TC-SOC-023 | — | Đã thiết kế |
| FR-SOC-024 | P1 | TC-SOC-024 | — | Đã thiết kế |
| FR-SOC-025 | P1 | TC-SOC-025 | TC-SOC-025-B1 | Đã thiết kế |
| FR-SOC-026 | P1 | TC-SOC-026 | — | Đã thiết kế |
| FR-SOC-027 | P1 | TC-SOC-027 | — | Đã thiết kế |
| FR-SOC-028 | P1 | TC-SOC-028 | — | Đã thiết kế |
| FR-SOC-029 | P1 | TC-SOC-029 | — | Đã thiết kế |
| FR-SOC-030 | P1 | TC-SOC-030 | — | Đã thiết kế |
| FR-SOC-031 | P1 | TC-SOC-031 | — | Đã thiết kế |
| FR-SOC-032 | P1 | TC-SOC-032 | — | Đã thiết kế |
| FR-SOC-033 | P1 | TC-SOC-033 | — | Đã thiết kế |
| FR-SOC-034 | P1 | TC-SOC-034 | — | Đã thiết kế |
| FR-SOC-035 | P1 | TC-SOC-035 | — | Đã thiết kế |
| FR-SOC-036 | P1 | TC-SOC-036 | TC-SOC-036-N1 | Đã thiết kế |
| FR-SOC-037 | P1 | TC-SOC-037 | — | Đã thiết kế |
| FR-SOC-038 | P1 | TC-SOC-038 | — | Đã thiết kế |
| FR-SOC-039 | P1 | TC-SOC-039 | — | Đã thiết kế |
| FR-SOC-040 | P1 | TC-SOC-040 | — | Đã thiết kế |

**Kiểm tra phủ:** 141/141 FR có TC chính. Không thiếu FR nào.

**Phân bổ ưu tiên:** P0 = 61, P1 = 79, P2 = 1.

### 14.3 NFR → Test case

| NFR | Nội dung kiểm | Test case | Bằng chứng / trạng thái |
|---|---|---|---|
| NFR-PERF-001 | LCP <2,5 s, INP <200 ms, CLS <0,1 (p75) | PERF-01, PERF-02 | **Pending** — chưa chạy Lighthouse |
| NFR-PERF-002 | API đọc p95 <500 ms, ghi <800 ms | PERF-03, PERF-04, PERF-10 | **Pending** — chưa chạy k6 |
| NFR-PERF-003 | JS ban đầu <250 KB gzip | PERF-05, MNT-09 | **Pass** — 136,5 KB, size-limit CI |
| NFR-PERF-004 | Email xác minh/reset tới SMTP ≤1 phút | PERF-06, OPS-10 | Chạy dev với Mailpit; Gmail **Pending** |
| NFR-PERF-005 | Tạo thông báo ≤50 ms p95 với 10 bé/100 mốc | PERF-07 | **Pending** |
| NFR-PERF-006 | Đạt p95 ở quy mô SD-011 | PERF-08, PERF-11 | **Pending** — chưa seed/đo |
| NFR-PERF-007 | Upload 5 MB ≤10 giây trên 10 Mbps | PERF-09 | Chạy thủ công trên dev |
| NFR-SEC-001 | Argon2id/bcrypt cost ≥12, không log mật khẩu | SEC-10 | Kiểm code + DB dev |
| NFR-SEC-002 | Cookie HttpOnly/Secure/SameSite + CSRF | SEC-07, SEC-08, SEC-09 | Một phần — `Secure` phụ thuộc HTTPS |
| NFR-SEC-003 | HSTS, không nội dung trộn | SEC-17 | **Pending** — cần production |
| NFR-SEC-004 | IDOR 100% endpoint | SEC-01, SEC-02, TC-AUTH-013 | **Pass** — 136/136, meta-test RLS |
| NFR-SEC-005 | Rate limit đăng nhập/đăng ký/quên/gửi lại | SEC-05, SEC-06, API-05 | Chạy dev |
| NFR-SEC-006 | URL ký ≤15 phút | SEC-12, API-15 | Chạy dev |
| NFR-SEC-007 | Validate server, encode output, CSP | SEC-13, SEC-14, SEC-15, SEC-17 | Chạy dev; ZAP **Pending** |
| NFR-SEC-008 | 0 High/Critical dependency + OWASP Top 10 | SEC-16 | CI baseline; ZAP **Pending** |
| NFR-SEC-009 | Log không có mật khẩu/token/nội dung y tế | SEC-10 | Chạy dev |
| NFR-SEC-010 | Secret không nằm trong source/bundle | SEC-11 | CI baseline (gitleaks) |
| NFR-SEC-011 | Bỏ EXIF/GPS trước khi lưu | SEC-18, DB-22 | Chạy dev |
| NFR-SEC-012 | Tuân thủ pháp luật dữ liệu cá nhân | SEC-20 | **Pending** — cần rà soát pháp lý |
| NFR-SEC-013 | Bản tin không rò dữ liệu riêng tư | SEC-03, SEC-21, TC-SOC-004 | **Pass** — leak scan F-13 |
| NFR-SEC-014 | Rate limit Bản tin + `retryAfter` | SEC-22, TC-SOC-038 | Chạy dev |
| NFR-REL-001 | Khả dụng ≥98%/tháng | OPS-01, OPS-02, REL-07, REL-08 | **Pending** — chưa có production để đo |
| NFR-REL-002 | Backup/RPO/RTO | OPS-08 | **Withdrawn** (DEC-020) — rủi ro chấp nhận |
| NFR-REL-003 | Tạo nhắc idempotent, không mất/nhân đôi | REL-01, REL-03, REL-04, OPS-03 | **Pass** — concurrency + reload + job |
| NFR-REL-004 | Cảnh báo job nhắc | OPS-09 | **Withdrawn** (DEC-017) |
| NFR-REL-005 | Bounce/spam <2% | OPS-09 | **Withdrawn** (DEC-016) |
| NFR-USA-001 | Vùng chạm ≥44×44 px | ACC-07 | **Pass** — S6-04 |
| NFR-USA-002 | WCAG 2.1 AA | ACC-01→ACC-05, ACC-08→ACC-12 | Một phần — axe 14 màn; screen reader **Pending** |
| NFR-USA-003 | Không chỉ dùng màu | ACC-06, UI-11 | Kiểm code + mắt |
| NFR-USA-004 | Chỉ giao diện sáng (dark mode không làm) | UI-12 | **N/A** — quyết định S6-04 |
| NFR-USA-005 | `inputmode="decimal"`, date picker gốc | UI-07, ACC-08 | Kiểm DOM + thủ công |
| NFR-USA-006 | Ghi cân nặng từ Dashboard ≤3 thao tác, ≤20 giây | UAT-020, E2E-14 | Chạy E2E/thủ công |
| NFR-USA-007 | vi mặc định + en, định dạng ngày/số | UI-08, TC-GEN-002, E2E-25 | Một phần — chưa click hết bản en |
| NFR-MNT-001 | Web chỉ dùng API công khai theo OpenAPI | MNT-05, MNT-06, CON-01, API-03 | CI contract |
| NFR-MNT-002 | Quy tắc nghiệp vụ ở server | TC-MS-008, TC-NTF-001, TC-RT-004, API-08 | Unit + API |
| NFR-MNT-003 | Coverage logic ≥90%, tổng ≥70% | MNT-04 | **Chưa đo lại** — G-2 |
| NFR-MNT-004 | Contract test khớp 100% OpenAPI | CON-01→CON-04, MNT-05, MNT-06 | CI contract |
| NFR-MNT-005 | E2E luồng G-3 | E2E-01, REG-01 | **Pass** — `core-flow` 17/17 |
| NFR-MNT-006 | E2E Bản tin phone/tablet | E2E-18→E2E-26, REG-07, REG-08 | **Pass** — 72/72 baseline |
| NFR-PRT-001 | Safari/Chrome chính | UI-14 | Một phần — emulation; thiết bị thật **Pending** |
| NFR-PRT-002 | Không cuộn ngang 360–1366 px | UI-02, ACC-11 | Chạy dev |
| NFR-PRT-003 | Cookie web + token refresh app GĐ2 | SEC-07, CON-08 | Một phần — app chưa làm |
| NFR-PRT-004 | Nhắc theo `channel`, GĐ1 chỉ `in_app` | DB-12, TC-NTF-001 | Kiểm schema + code |
| NFR-PRT-005 | Ảnh qua storage dùng chung | DB-22, SEC-12, OPS-05 | Chạy dev; R2 **Pending** |

**Tổng hợp NFR:** 41 còn hiệu lực · 41 có test case hoặc quyết định chấp nhận · 3 đã rút (REL-002/004/005) · 7 **Pending** do thiếu staging/production/thiết bị/pháp lý.

### 14.4 Ma trận API → Test case (86 operation)

| # | Operation | Nhóm | TC chính | IDOR | Contract |
|---|---|---|---|---|---|
| 1 | `GET /healthz` | system | OPS-01 | — | CON-04 |
| 2 | `GET /readyz` | system | OPS-01 | — | CON-04 |
| 3 | `POST /analytics/events` | analytics | TC-ANL-001, TC-ANL-001-N1 | — | CON-04, CON-06 |
| 4 | `POST /auth/register` | auth | TC-AUTH-001, TC-AUTH-001-N1 | — | CON-04, CON-06 |
| 5 | `POST /auth/login` | auth | TC-AUTH-005, TC-AUTH-006 | — | CON-04, CON-06 |
| 6 | `POST /auth/logout` | auth | TC-AUTH-007 | — | CON-04, CON-06 |
| 7 | `GET /auth/session` | auth | TC-AUTH-012 | — | CON-04 |
| 8 | `POST /auth/verify-email` | auth | TC-AUTH-002, TC-AUTH-004 | — | CON-04, CON-06 |
| 9 | `POST /auth/verify-email/resend` | auth | TC-AUTH-003 | — | CON-04, CON-06 |
| 10 | `POST /auth/password/forgot` | auth | TC-AUTH-008 | — | CON-04, CON-06 |
| 11 | `POST /auth/password/reset` | auth | TC-AUTH-008, TC-AUTH-009 | — | CON-04, CON-06 |
| 12 | `GET /me` | auth | TC-AUTH-011, TC-AUTH-017 | — | CON-04 |
| 13 | `PATCH /me` | auth | TC-AUTH-017 | — | CON-04 |
| 14 | `DELETE /me` | auth | TC-AUTH-016 | — | CON-04 |
| 15 | `PATCH /me/locale` | auth | TC-AUTH-011 | — | CON-04 |
| 16 | `POST /me/password` | auth | TC-AUTH-010 | — | CON-04, CON-06 |
| 17 | `POST /me/email` | auth | TC-AUTH-015 | — | CON-04, CON-06 |
| 18 | `GET /pets` | pets | TC-PET-007, TC-DSH-005 | — | CON-04 |
| 19 | `POST /pets` | pets | TC-PET-001, TC-PET-002 | — | CON-04, CON-06 |
| 20 | `GET /pets/{petId}` | pets | TC-PET-006 | TC-AUTH-013, SEC-01 | CON-04 |
| 21 | `PATCH /pets/{petId}` | pets | TC-PET-006 | TC-AUTH-013, SEC-01 | CON-04 |
| 22 | `DELETE /pets/{petId}` | pets | TC-PET-008 | TC-AUTH-013, SEC-01 | CON-04 |
| 23 | `PUT /pets/{petId}/avatar` | pets | TC-PET-005 | TC-AUTH-013, SEC-01 | CON-04 |
| 24 | `DELETE /pets/{petId}/avatar` | pets | TC-PET-005 | TC-AUTH-013, SEC-01 | CON-04 |
| 25 | `PUT /pets/{petId}/weight-target` | weights | TC-WGT-005, TC-WGT-005-B1 | TC-AUTH-013, SEC-01 | CON-04 |
| 26 | `DELETE /pets/{petId}/weight-target` | weights | TC-WGT-005 | TC-AUTH-013, SEC-01 | CON-04 |
| 27 | `GET /uploads/{uploadId}` | media | TC-PET-005, TC-VIS-006, SEC-12 | TC-AUTH-013, SEC-01 | CON-04 |
| 28 | `GET /pets/{petId}/weights` | weights | TC-WGT-003, TC-WGT-008 | TC-AUTH-013, SEC-01 | CON-04 |
| 29 | `POST /pets/{petId}/weights` | weights | TC-WGT-001, TC-WGT-002 | TC-AUTH-013, SEC-01 | CON-04, CON-06 |
| 30 | `PATCH /weights/{id}` | weights | TC-WGT-010 | TC-AUTH-013, SEC-01 | CON-04 |
| 31 | `DELETE /weights/{id}` | weights | TC-WGT-010 | TC-AUTH-013, SEC-01 | CON-04 |
| 32 | `GET /pets/{petId}/visits` | visits | TC-VIS-002 | TC-AUTH-013, SEC-01 | CON-04 |
| 33 | `POST /pets/{petId}/visits` | visits | TC-VIS-001, TC-VIS-001-N1 | TC-AUTH-013, SEC-01 | CON-04, CON-06 |
| 34 | `GET /visits/{id}` | visits | TC-VIS-002, TC-VIS-008 | TC-AUTH-013, SEC-01 | CON-04 |
| 35 | `PATCH /visits/{id}` | visits | TC-VIS-003 | TC-AUTH-013, SEC-01 | CON-04 |
| 36 | `DELETE /visits/{id}` | visits | TC-VIS-004 | TC-AUTH-013, SEC-01 | CON-04 |
| 37 | `POST /visits/{id}/photos` | visits | TC-VIS-005, TC-VIS-006 | TC-AUTH-013, SEC-01 | CON-04, CON-06 |
| 38 | `DELETE /photos/{id}` | visits | TC-VIS-007 | TC-AUTH-013, SEC-01 | CON-04 |
| 39 | `GET /pets/{petId}/milestones` | milestones | TC-MS-012 | TC-AUTH-013, SEC-01 | CON-04 |
| 40 | `POST /pets/{petId}/milestones` | milestones | TC-MS-001, TC-MS-002 | TC-AUTH-013, SEC-01 | CON-04, CON-06 |
| 41 | `GET /milestones/{id}` | milestones | TC-MS-006 | TC-AUTH-013, SEC-01 | CON-04 |
| 42 | `PATCH /milestones/{id}` | milestones | TC-MS-006, TC-MS-010 | TC-AUTH-013, SEC-01 | CON-04 |
| 43 | `POST /milestones/{id}/cancel` | milestones | TC-MS-007 | TC-AUTH-013, SEC-01 | CON-04, CON-06 |
| 44 | `POST /milestones/{id}/complete` | milestones | TC-MS-003, TC-MS-008, TC-MS-011 | TC-AUTH-013, SEC-01 | CON-04, CON-06 |
| 45 | `POST /milestones/{id}/undo-complete` | milestones | TC-MS-005 | TC-AUTH-013, SEC-01 | CON-04, CON-06 |
| 46 | `GET /notifications/summary` | notifications | TC-NTF-008 | — | CON-04 |
| 47 | `GET /notifications` | notifications | TC-NTF-008 | — | CON-04 |
| 48 | `POST /notifications/read` | notifications | TC-NTF-010 | — | CON-04, CON-06 |
| 49 | `POST /notifications/read-all` | notifications | TC-NTF-008, TC-NTF-010 | — | CON-04, CON-06 |
| 50 | `GET /pets/{petId}/routines` | routines | TC-RT-002 | TC-AUTH-013, SEC-01 | CON-04 |
| 51 | `POST /pets/{petId}/routines` | routines | TC-RT-001, TC-RT-001-B1 | TC-AUTH-013, SEC-01 | CON-04, CON-06 |
| 52 | `PATCH /routines/{id}` | routines | TC-RT-006 | TC-AUTH-013, SEC-01 | CON-04 |
| 53 | `DELETE /routines/{id}` | routines | TC-RT-007 | TC-AUTH-013, SEC-01 | CON-04 |
| 54 | `PUT /routines/{id}/completion` | routines | TC-RT-003, TC-RT-004 | TC-AUTH-013, SEC-01 | CON-04 |
| 55 | `GET /dashboard` | dashboard | TC-DSH-002, TC-DSH-003 | — | CON-04 |
| 56 | `GET /me/profile` | social | TC-SOC-001 | — | CON-04 |
| 57 | `PUT /me/profile` | social | TC-SOC-001, TC-SOC-003 | — | CON-04 |
| 58 | `GET /profiles/check` | social | TC-SOC-002, TC-SOC-002-N1 | — | CON-04 |
| 59 | `GET /profiles/{username}` | social | TC-SOC-004 | TC-AUTH-013, SEC-01 | CON-04 |
| 60 | `PUT /me/avatar` | social | TC-SOC-005 | — | CON-04 |
| 61 | `DELETE /me/avatar` | social | TC-SOC-005 | — | CON-04 |
| 62 | `POST /posts` | social | TC-SOC-006, TC-SOC-008, TC-SOC-006-B1 | — | CON-04, CON-06 |
| 63 | `POST /posts/{id}/photos` | social | TC-SOC-007 | TC-AUTH-013, SEC-01 | CON-04, CON-06 |
| 64 | `DELETE /post-photos/{id}` | social | TC-SOC-007, TC-SOC-007-N1 | TC-AUTH-013, SEC-01 | CON-04 |
| 65 | `GET /posts/{id}` | social | TC-SOC-012, TC-SOC-013 | TC-AUTH-013, SEC-01 | CON-04 |
| 66 | `PATCH /posts/{id}` | social | TC-SOC-010 | TC-AUTH-013, SEC-01 | CON-04 |
| 67 | `DELETE /posts/{id}` | social | TC-SOC-011 | TC-AUTH-013, SEC-01 | CON-04 |
| 68 | `GET /feed` | social | TC-SOC-018, TC-SOC-019 | — | CON-04 |
| 69 | `GET /feed/new-count` | social | TC-SOC-019 | — | CON-04 |
| 70 | `GET /profiles/{username}/posts` | social | TC-SOC-016 | TC-AUTH-013, SEC-01 | CON-04 |
| 71 | `PUT /follows/{username}` | social | TC-SOC-014 | TC-AUTH-013, SEC-01 | CON-04 |
| 72 | `DELETE /follows/{username}` | social | TC-SOC-014 | TC-AUTH-013, SEC-01 | CON-04 |
| 73 | `GET /profiles/{username}/followers` | social | TC-SOC-015 | TC-AUTH-013, SEC-01 | CON-04 |
| 74 | `GET /profiles/{username}/following` | social | TC-SOC-015 | TC-AUTH-013, SEC-01 | CON-04 |
| 75 | `GET /search/profiles` | social | TC-SOC-017, TC-SOC-017-N1 | — | CON-04 |
| 76 | `PUT /posts/{id}/like` | social | TC-SOC-022, TC-SOC-028 | TC-AUTH-013, SEC-01 | CON-04 |
| 77 | `DELETE /posts/{id}/like` | social | TC-SOC-022 | TC-AUTH-013, SEC-01 | CON-04 |
| 78 | `GET /posts/{id}/likes` | social | TC-SOC-024 | TC-AUTH-013, SEC-01 | CON-04 |
| 79 | `GET /posts/{id}/comments` | social | TC-SOC-025 | TC-AUTH-013, SEC-01 | CON-04 |
| 80 | `POST /posts/{id}/comments` | social | TC-SOC-025, TC-SOC-026, TC-SOC-028 | TC-AUTH-013, SEC-01 | CON-04, CON-06 |
| 81 | `DELETE /comments/{id}` | social | TC-SOC-027 | TC-AUTH-013, SEC-01 | CON-04 |
| 82 | `GET /social-notifications` | social | TC-SOC-029, TC-SOC-030 | — | CON-04 |
| 83 | `POST /social-notifications/read-all` | social | TC-SOC-030 | — | CON-04, CON-06 |
| 84 | `PUT /blocks/{username}` | social | TC-SOC-034, TC-SOC-035 | TC-AUTH-013, SEC-01 | CON-04 |
| 85 | `DELETE /blocks/{username}` | social | TC-SOC-037 | TC-AUTH-013, SEC-01 | CON-04 |
| 86 | `GET /me/blocks` | social | TC-SOC-036, TC-SOC-037 | — | CON-04 |
**Kiểm tra phủ:** 86/86 operation có test case. Không thiếu operation nào.
**Phân bổ theo nhóm:** system 2 · analytics 1 · auth 10 · me 6 · pets 7 · weights 5 · visits 7 · milestones 7 · notifications 4 · routines 5 · dashboard 1 · social 31 · media 1.

### 14.5 Gate → Bằng chứng

| Gate | Nội dung | Test case | Bằng chứng hiện có | Trạng thái |
|---|---|---|---|---|
| **G-1** | 100% story P0 đạt AC | UAT-001→UAT-079; REG-10 | Code + test cho 21 story P0; UAT chưa chạy | **Một phần** |
| **G-2** | Coverage ≥90% logic, ≥70% tổng | MNT-04 | CI có gate; chưa có báo cáo mới | **Chưa đo lại** |
| **G-3** | E2E đăng ký→xác minh→bé→mốc→nhắc→hoàn tất→mốc kế | E2E-01, REG-01 | `core-flow.api` 17/17; E2E 72/72 | **Đạt (dev)** |
| **G-4** | Thiết bị thật, 0 Critical/High | UI-14, ACC-05, ACC-07 | Chromium emulation; 44 px Pass | **Pending** |
| **G-5** | Đổi múi giờ/qua 00:00/D7/D1/Quá hạn | E2E-16, TC-NTF-001-B1, REL-06 | `timezone.api`, `srs-2-6-table.api` Pass | **Đạt (dev)** |
| **G-6** | LCP <2,5 s, INP <200 ms, CLS <0,1 | PERF-01, PERF-02 | Chưa chạy Lighthouse | **Pending** |
| **G-7** | API đọc p95 <500 ms, ghi <800 ms | PERF-03, PERF-04, PERF-08 | Chưa chạy k6 | **Pending** |
| **G-8** | Bundle <250 KB gzip | PERF-05, MNT-09 | 136,5 KB; size-limit CI | **Đạt** |
| **G-9** | IDOR 100% endpoint | SEC-01, SEC-02 | 136/136 Pass | **Đạt (dev)** |
| **G-10** | HTTPS, hash mật khẩu, cookie an toàn | SEC-07, SEC-10, SEC-17 | Hash/cookie Pass dev; HTTPS/HSTS thiếu | **Một phần** |
| **G-11** | Storage riêng + URL ký ≤15 phút | DB-22, SEC-12, API-15 | Pipeline + test hết hạn Pass; R2 pending | **Đạt (dev)** |
| **G-12** | 0 High/Critical dependency/OWASP | SEC-16 | audit/OSV/gitleaks CI; ZAP chưa chạy | **Một phần** |
| **G-13** | Backup/restore | OPS-08 | DEC-020 | **Withdrawn** |
| **G-14** | Email Gmail/Outlook không spam | PERF-06, OPS-10 | Chỉ Mailpit | **Pending** |
| **G-15** | Nhắc idempotent | REL-01, REL-03, TC-NTF-005 | Concurrency + reload + job Pass | **Đạt (dev)** |
| **G-16** | Cảnh báo job nhắc | OPS-09 | DEC-017 | **Withdrawn** |
| **G-17** | OpenAPI khớp 100% | CON-01→CON-06, MNT-05, MNT-06 | CI contract; Schemathesis chưa chạy | **Một phần** |
| **G-18** | E2E G-3 chỉ qua API | E2E-01 (project `api`) | 17/17 Pass | **Đạt (dev)** |
| **FG-1** | IDOR 100% + quét rò rỉ | SEC-01, SEC-03 | 136/136 + leak scan | **Đạt (dev)** |
| **FG-2** | E2E 3 tài khoản phone/tablet | E2E-18→E2E-24, REG-07, REG-08 | 72/72, `social-cross.api` | **Đạt (dev)** |
| **FG-3** | axe 0 serious/critical + 44 px | ACC-01, ACC-07 | 14 màn, phone + tablet | **Đạt (dev)** — còn 11 màn |
| **FG-4** | Chuỗi vi/en + mã lỗi | UI-08, E2E-25 | Typecheck `Messages`; chưa click hết bản en | **Một phần** |
| **FG-5** | Analytics không PII/nội dung | SEC-21, TC-ANL-003 | Allowlist + quét DB | **Đạt (dev)** |
| **FG-6** | Ảnh trên R2 trước production | DB-22, OPS-07 | F-01 chưa làm | **Pending** |

### 14.6 Risk → Test case

| Rủi ro | Nội dung | Test case trọng tâm | Mức |
|---|---|---|---|
| RSK-01 | Sai logic D7/D1/OVERDUE | TC-NTF-001, 001-B1, 002, 004; E2E-01, E2E-16 | Cao |
| RSK-02 | Cộng tháng lịch sai | TC-MS-008-B1, TC-MS-009 | TB |
| RSK-03 | Lộ dữ liệu sức khỏe qua Bản tin/IDOR | SEC-01, SEC-02, SEC-03 | Cao |
| RSK-04 | Ảnh HEIC/EXIF/URL ký lỗi | DB-22, SEC-12, SEC-18, TC-PET-005 | TB |
| RSK-05 | Trùng nhắc/mốc do chạy song song | REL-01, TC-NTF-005, TC-MS-011 | TB |
| RSK-06 | Thiếu staging/production → gate chưa kiểm | PERF-01→04, SEC-17, SEC-20, UI-14 | Cao |
| RSK-07 | Không backup (đã chấp nhận) | OPS-08 (N/A) + ghi known issue | TB |
| RSK-08 | Không monitoring (đã chấp nhận) | OPS-02, OPS-09 (N/A) | TB |
| RSK-09 | Chưa đo hiệu năng SD-011 | PERF-08, PERF-10, PERF-11 | TB |
| RSK-10 | Chỉ emulation, chưa thiết bị thật | UI-14, ACC-05 | TB |
| RSK-11 | Analytics rò PII/nội dung | SEC-21, TC-ANL-003 | TB |
| RSK-12 | Email vào spam | OPS-10, PERF-06 | TB |
| RSK-13 | Dữ liệu test bẩn | MNT-07, DB-01, E2E-01 | TB |
| RSK-14 | E2E flaky do FakeClock | E2E-01→26 (workers 1, reset T0), REL-01 | TB |
| RSK-15 | Bỏ sót rate limit/spam | SEC-06, SEC-22, TC-SOC-038 | TB |
| RSK-16 | A11y regression | ACC-01, ACC-02, REG-11 | TB |
| RSK-17 | Chuỗi cung ứng dependency | SEC-11, SEC-16 | TB |
| RSK-18 | Key person | MNT-08, review AI | TB |
| RSK-19 | Xóa tài khoản/bé không hết dữ liệu | TC-AUTH-016, TC-PET-008, DB-07, E2E-05 | TB |
| RSK-20 | Hết dung lượng media | OPS-06 | Thấp |

---

## 15. Hướng dẫn thực thi

### 15.1 Điều kiện tiên quyết

| Mục | Yêu cầu | Kiểm tra |
|---|---|---|
| Node/pnpm | Node 22 (`>=22 <23`), pnpm 12.15 | `node -v`, `pnpm -v` |
| DB dev | PostgreSQL 16 (ServBay), DB `pethealth`, role `ph_owner`/`app_rw`/`app_worker` | `psql -c '\dt'` |
| Mailpit | Cổng 1025/8025 | Mở `http://localhost:8025` |
| Docker | Cho Testcontainers (integration) | `docker info` |
| Cổng trống | 3000, 3100, 5173, 5174, 5432, 8025 | `netstat -ano \| findstr` |
| Biến môi trường | `.env` từ `.env.example`; **không** commit | `Get-Content .env` |
| Dữ liệu | DB E2E `pethealth_e2e` sạch; `.data/` đủ chỗ | — |

### 15.2 Lệnh chạy theo cấp độ

| Cấp độ | Lệnh | Ghi chú |
|---|---|---|
| Cài đặt | `pnpm install --frozen-lockfile` | CI và local |
| Dev up | `pnpm dev:up` | Docker Compose (DB/Mailpit) |
| Migration | `pnpm db:migrate` | Chạy trước test |
| Reset DB dev | `pnpm dev:reset` | Xóa/tạo lại schema dev |
| Unit | `pnpm test:unit` | Loại `*.int.test.ts` |
| Unit + coverage | `pnpm test:unit --coverage` | Báo cáo `coverage/` — dùng cho G-2 |
| Integration | `pnpm test:integration` | Testcontainers PostgreSQL 16 |
| Toàn bộ Vitest | `pnpm test` | Unit + integration |
| Contract | `pnpm openapi:gen` rồi `git diff --exit-code openapi.yaml` | CI contract |
| E2E (tất cả) | `pnpm e2e` | Tự bật API 3100 + web 5174 + worker |
| E2E API | `pnpm e2e:api` | Project `api` — G-18 |
| E2E UI | `pnpm e2e --project=ui-phone` / `--project=ui-tablet` | 390×844 / 834×1112 |
| Một file | `pnpm e2e e2e/api/core-flow.api.spec.ts` | Debug |
| Có trace | `pnpm e2e --trace=on` | Lưu `.data/e2e-report` |
| Lint/format | `pnpm lint`, `pnpm format:check` | CI |
| Typecheck | `pnpm -r typecheck` | CI |
| Ranh giới module | `pnpm depcruise apps packages` | CI |
| Bundle | `pnpm --filter @ph/web build` + `size-limit` | G-8 |
| Job bảo trì | `pnpm --filter @ph/api maintenance:run` | OPS-04 |

### 15.3 Thiết lập E2E và FakeClock

```powershell
# 1. DB E2E riêng (không dùng pethealth)
$env:NODE_ENV = "test"
pnpm --filter @ph/api migrate   # trỏ MIGRATION_DATABASE_URL vào pethealth_e2e

# 2. Chạy E2E (Playwright tự bật API 3100, web 5174, worker email)
pnpm e2e

# 3. Điều khiển thời gian trong test (chỉ NODE_ENV=test)
#    POST http://localhost:3100/__test/clock
#    { "now": "2026-11-01T09:00:00+07:00", "frozen": true }
#    { "advanceMs": 86400000 }
#    { "reset": true }
```

**Quy tắc:** mỗi test đặt T0 ở `beforeEach`, gọi `resetClock()` ở `afterEach`; không dựa vào thứ tự test; `workers: 1` bắt buộc; không chạy song song 2 lệnh `pnpm e2e`.

### 15.4 Quy trình một chu kỳ

1. **Chuẩn bị:** reset DB, seed dữ liệu, xóa Mailpit, đặt clock T0, ghi commit/build.
2. **Chạy theo thứ tự:** unit → integration → contract → API → E2E → security → accessibility → UI → performance → reliability/OPS.
3. **Ghi kết quả:** mỗi case cập nhật Pass/Fail/Blocked/Pending + bằng chứng (log, ảnh, report).
4. **Triage:** phân loại S1–S4, gán owner, cập nhật defect log; S1 dừng ngay.
5. **Hồi quy:** chạy R1 sau mỗi fix; R2 trước phát hành.
6. **Báo cáo:** tổng hợp theo mẫu §15.5, cập nhật Phụ lục B của Test_Plan.
7. **Gate:** cập nhật §14.5 + Test_Plan Phụ lục A; không suy ra Pass từ "code đã xong".

### 15.5 Mẫu báo cáo thực thi

```markdown
# Báo cáo kiểm thử — Chu kỳ <C0/C1/C2/C3/S7>

| Thuộc tính | Giá trị |
|---|---|
| Mã báo cáo | PH-TR-<số> |
| Chu kỳ | <C0…> |
| Ngày chạy | <yyyy-mm-dd> |
| Commit/build | <sha> |
| Môi trường | ENV-01 / ENV-02 / ENV-03 / ENV-04 |
| Người chạy | <tên> |
| Thời gian | <bắt đầu – kết thúc> |

## 1. Tổng hợp

| Cấp độ | Tổng case | Pass | Fail | Blocked | Pending | Not Run | Pass % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Unit |  |  |  |  |  |  |  |
| Integration |  |  |  |  |  |  |  |
| API/Contract |  |  |  |  |  |  |  |
| E2E |  |  |  |  |  |  |  |
| Security |  |  |  |  |  |  |  |
| Accessibility |  |  |  |  |  |  |  |
| UI/UX |  |  |  |  |  |  |  |
| Performance |  |  |  |  |  |  |  |
| Regression |  |  |  |  |  |  |  |
| UAT |  |  |  |  |  |  |  |

## 2. Defect

| ID | Severity | Mô tả | FR/TC | Trạng thái | Owner |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## 3. Gate

| Gate | Trạng thái | Bằng chứng | Ghi chú |
|---|---|---|---|
| G-1…G-18, FG-1…FG-6 |  |  |  |

## 4. Kết luận
- Đạt/không đạt tiêu chí ra (§7 Test_Plan):
- Rủi ro còn lại:
- Đề xuất:
```

### 15.6 Mẫu ghi defect

| Trường | Nội dung |
|---|---|
| ID | `BUG-<số>` |
| Tiêu đề | Ngắn, nêu hành vi sai |
| Môi trường | ENV + commit + trình duyệt/DB |
| Tiền điều kiện | Tài khoản, dữ liệu, clock |
| Bước tái hiện | 1)… 2)… 3)… |
| Kỳ vọng | Theo FR/AC/TC |
| Thực tế | Kèm log/ảnh/response |
| Severity / Priority | S1–S4 / P0–P3 |
| Truy vết | FR, TC, gate |
| Trạng thái | New → Triaged → In Progress → Fixed → Verified → Closed |

### 15.7 Trạng thái hiện tại và tổng hợp phủ (2026-10-26)

| Hạng mục | Số lượng | Đã có bằng chứng | Ghi chú |
|---|---:|---:|---|
| FR | 141 | 141 thiết kế | 61 P0 / 79 P1 / 1 P2 |
| NFR còn hiệu lực | 41 | 34 thiết kế + 3 withdrawn + 7 Pending | Pending do môi trường/pháp lý |
| Story | 50 | 50 có UAT | UAT chưa chạy |
| API operation | 86 | 86 có TC | Contract CI |
| Gate G | 18 | 6 đạt dev, 5 một phần, 4 pending, 2 withdrawn | Xem §14.5 |
| Gate FG | 6 | 4 đạt dev, 1 một phần, 1 pending | FG-6/R2 |
| Test case chức năng | 141 chính + 27 âm/biên | 168 TC | Mỗi FR có TC chính; 27 case âm/biên |
| Test case xuyên suốt | DB 23 · CON 10 · API 16 · E2E 26 · UAT 50 · REG 12 · PERF 12 · SEC 22 · ACC 12 · UI 14 · REL 8 · OPS 10 · MNT 10 | 225 | Tổng cộng 393 ID test case |

> **Cảnh báo trung thực:** bằng chứng trong bảng là **baseline lịch sử** (209 unit, IDOR 136/136, E2E 72/72, axe 14 màn, bundle 136,5 KB), **không** phải kết quả chạy lại trong tài liệu này. Mọi con số phải được xác nhận lại ở C0–C3 trước khi tuyên bố phát hành.

### 15.8 Việc cần làm trước chu kỳ C0

| # | Việc | Lý do | Liên quan |
|---|---|---|---|
| 1 | Chạy `pnpm test:unit --coverage` và lưu báo cáo | G-2 chưa có số | MNT-04 |
| 2 | Bổ sung axe cho 11 màn còn lại + trạng thái động | FG-3 mới phủ 14/25 | ACC-01, ACC-02 |
| 3 | Kiểm bàn phím + screen reader | Chưa có bằng chứng | ACC-03→05 |
| 4 | Cài k6, chạy seed SD-011 | G-7 chưa đo | PERF-08 |
| 5 | Chạy Lighthouse mobile | G-6 chưa đo | PERF-01 |
| 6 | Xác nhận CI trên GitHub gần nhất | Chưa xác nhận lần chạy | MNT-01→06 |
| 7 | Bổ sung E2E cho analytics | FR-ANL-005 chưa có E2E | TC-ANL-005 |
| 8 | Lập kế hoạch S7: staging, R2, Gmail, thiết bị, ZAP | 7 gate đang Pending | G-4/6/7/10/14, FG-6 |

---

**Hết tài liệu PH-TC-001 v1.0.**
