# Khung SRS (ISO/IEC/IEEE 29148)

```markdown
# Đặc tả Yêu cầu Phần mềm (SRS) — <Tên sản phẩm>

| Thuộc tính  | Giá trị            |
| ----------- | ------------------ |
| Mã tài liệu | <PRJ>-SRS-001      |
| Phiên bản   | 1.0                |
| Ngày        | YYYY-MM-DD         |
| Nguồn       | BRD v<x>, PRD v<y> |

## 1. Giới thiệu

### 1.1 Mục đích · 1.2 Phạm vi · 1.3 Định nghĩa, viết tắt · 1.4 Tài liệu tham chiếu

### 1.5 Tổng quan sản phẩm: bối cảnh, lớp người dùng, môi trường vận hành, giả định & phụ thuộc

### 1.6 Quy ước mã: FR-<MOD>-nnn, NFR-<CAT>-nnn; từ khóa phải/nên/có thể

## 2. Yêu cầu chức năng

### 2.1 <MOD> — <Tên module> (n FR)

| ID          | Yêu cầu                                                                     | Ưu tiên | Truy vết |
| ----------- | --------------------------------------------------------------------------- | ------- | -------- |
| FR-AUTH-001 | Hệ thống **phải** … (một hành vi, kiểm chứng được, nêu giá trị biên/mã lỗi) | Must    | US-001   |

Quy tắc viết FR:

- Nêu rõ đầu vào hợp lệ, giới hạn (độ dài, kích thước, số lượng), hành vi khi sai (mã lỗi/thông báo).
- Quyền: ai được làm gì; truy cập tài nguyên người khác → 404 (không lộ tồn tại).
- Trạng thái và chuyển trạng thái nếu có.
- Thời gian/múi giờ, idempotency, giới hạn tần suất nếu liên quan.

## 3. Yêu cầu giao diện ngoài

### 3.1 Giao diện người dùng (tham chiếu UXD, danh sách màn hình)

### 3.2 Giao diện phần mềm / API (bảng endpoint dự kiến: method, path, mô tả, FR)

### 3.3 Giao diện truyền thông (email, push, webhook)

### 3.4 Lưu trữ và dịch vụ bên thứ ba

## 4. Yêu cầu phi chức năng

| ID                                                                           | Thuộc tính | Yêu cầu (có số đo)         | Cách kiểm chứng   |
| ---------------------------------------------------------------------------- | ---------- | -------------------------- | ----------------- |
| NFR-PERF-001                                                                 | Hiệu năng  | p95 API đọc < 300 ms với … | Load test         |
| NFR-SEC-001                                                                  | Bảo mật    | Mật khẩu băm Argon2id …    | Inspection + test |
| Nhóm gợi ý: PERF, SEC, PRIV, REL, AVL, USA, A11Y, I18N, MNT, PORT, OBS, BAK. |

## 5. Mô hình dữ liệu logic

Bảng thực thể: tên, mô tả, thuộc tính chính, ràng buộc, quan hệ. Vòng đời/trạng thái.
Quy tắc lưu giữ và xóa dữ liệu.

## 6. Ràng buộc thiết kế

Công nghệ bắt buộc, ngân sách, pháp lý, chuẩn.

## 7. Kiểm chứng

| Yêu cầu | Phương pháp (Test/Demo/Inspection/Analysis) | Cấp test |

## 8. Phụ lục

Ma trận truy vết US → FR; câu hỏi mở; lịch sử thay đổi.
```
