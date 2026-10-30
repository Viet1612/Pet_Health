# Khung UI/UX Blueprint (IEEE 1016-2009)

```markdown
# Bản thiết kế UI/UX — <Tên sản phẩm>

| Mã | <PRJ>-UX-001 | Phiên bản | 1.0 | Ngày | YYYY-MM-DD | Nguồn | PRD (UXD-xxx), SRS |

## 1. Bối cảnh và đối tượng thiết kế

Persona, thiết bị, ngữ cảnh dùng, nguyên tắc UX (từ UXD-xxx).

## 2. Các bên liên quan và mối quan tâm

| Bên | Mối quan tâm | View đáp ứng |

## 3. Các view thiết kế

### 3.1 View ngữ cảnh — sitemap, điều hướng chính (desktop + mobile)

### 3.2 View design system

- Token: màu (chính, phụ, trạng thái, nền, chữ; cả dark mode nếu có), typography, spacing, radius, shadow.
- Component lõi: Button, Input, Select, Dialog, Toast, Card, EmptyState, Skeleton… — biến thể, trạng thái.
- Breakpoint & lưới.

### 3.3 View màn hình

Mỗi màn:

#### SCR-01 — <Tên>

| Thuộc tính | Giá trị              |
| ---------- | -------------------- |
| Route      | /login               |
| Mục đích   | …                    |
| US / FR    | US-003 / FR-AUTH-005 |
| API        | POST /auth/login     |

- **Bố cục:** (wireframe ASCII ngắn hoặc link Figma)
- **Trạng thái:** loading · empty · error (liệt kê thông báo theo mã lỗi) · success
- **Hành vi & kiểm tra form:** …
- **Responsive:** …
- **A11y:** nhãn, thứ tự focus, aria-live…

### 3.4 View tương tác — các luồng chính (bước, màn hình, điều kiện rẽ nhánh)

### 3.5 View nội dung — giọng văn, thông báo lỗi chuẩn, i18n (key, ngôn ngữ hỗ trợ, định dạng ngày/số)

### 3.6 View accessibility — checklist WCAG 2.2 AA áp dụng

## 4. Truy vết

| SCR | US | FR | API |

## 5. Mức sẵn sàng

Màn hình nào đã có thiết kế chi tiết / còn thiếu; câu hỏi mở.
```
