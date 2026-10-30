# Khung SAD

```markdown
# Tài liệu Thiết kế Kiến trúc Phần mềm (SAD) — <Tên sản phẩm>

| Mã | <PRJ>-SAD-001 | Phiên bản | 1.0 | Ngày | YYYY-MM-DD | Nguồn | SRS v<x>, PRD v<y> |

## 0. Giới thiệu

Mục đích, phạm vi, đối tượng đọc, tài liệu tham chiếu, thuật ngữ.

## 1. Mục tiêu kiến trúc và nguyên tắc thiết kế

- Thuộc tính chất lượng ưu tiên (từ NFR) và thứ tự đánh đổi.
- Nguyên tắc (vd. monolith mô-đun, ports & adapters, deny-by-default, đơn giản vận hành).
- Bảng quyết định kiến trúc:
  | ID | Quyết định | Lý do | Phương án loại | NFR liên quan |
  |---|---|---|---|---|
  | AD-001 | … | … | … | … |

## 2. Phân rã thành phần hệ thống

### 2.1 Sơ đồ ngữ cảnh (C4 mức 1) và container (C4 mức 2) — Mermaid hoặc ASCII

### 2.2 Backend: danh sách module, trách nhiệm, phụ thuộc cho phép; cấu trúc thư mục; layer

### 2.3 Frontend: routing, quản lý state/data fetching, component, i18n

### 2.4 Worker / job nền: danh sách job, lịch, retry

### 2.5 Package dùng chung (api-client, types…)

## 3. Kiến trúc dữ liệu và luồng tích hợp

### 3.1 Mô hình dữ liệu vật lý: bảng, cột chính, khóa, index, ràng buộc

### 3.2 Phân quyền dữ liệu (RLS / kiểm tra owner), role DB

### 3.3 Hợp đồng API: quy ước + bảng `Method | Path | Mô tả | Auth | FR`

### 3.4 Luồng quan trọng (sequence diagram): đăng ký, upload file, job…

### 3.5 Tích hợp ngoài: email, lưu trữ, thanh toán…

## 4. Các mối quan tâm xuyên suốt và hạ tầng

Bảo mật · Xử lý lỗi · Log/metrics/tracing · Cấu hình & secret · Thời gian/múi giờ ·
Hiệu năng & cache · Backup/khôi phục · Môi trường (dev/staging/prod) · CI/CD · Triển khai.

## 5. Truy vết yêu cầu → thiết kế

| FR/NFR | Thành phần | AD/ADR | Ghi chú |

## 6. Rủi ro kỹ thuật và câu hỏi mở

| ID | Rủi ro | Khả năng | Ảnh hưởng | Giảm thiểu |

## Phụ lục A. ADR

# ADR-001: <Tiêu đề>

- **Trạng thái:** Accepted · **Ngày:** …
- **Bối cảnh:** …
- **Phương án:** A … / B … / C …
- **Quyết định:** …
- **Hệ quả:** tích cực / tiêu cực / việc cần làm

## Lịch sử thay đổi
```
