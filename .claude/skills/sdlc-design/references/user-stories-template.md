# Khung User Stories

```markdown
# <Tên sản phẩm> — User Stories

## Giới thiệu

Nguồn (PRD v, SRS v), quy ước mã, thang ưu tiên (MoSCoW), thang điểm (Fibonacci 1,2,3,5,8), Definition of Ready.

## E1 — <Epic>

Mục tiêu epic, BR liên quan.

### US-001 — <Tên ngắn>

**Là** <persona>, **tôi muốn** <hành động>, **để** <giá trị>.

| Ưu tiên | Điểm | Phụ thuộc | FR               | Màn hình | API                 |
| ------- | ---- | --------- | ---------------- | -------- | ------------------- |
| Must    | 3    | —         | FR-AUTH-001, 002 | SCR-01   | POST /auth/register |

**Tiêu chí chấp nhận**

1. **Given** … **When** … **Then** … (đường chính)
2. **Given** … **When** dữ liệu sai … **Then** báo lỗi "…" (case lỗi)
3. **Given** … ở giá trị biên … **Then** … (case biên)

**Ghi chú kỹ thuật:** …
**Ngoài phạm vi:** …

## Ma trận truy vết

| US | BR | FR | SCR | API | Ưu tiên |
```

Quy tắc: story phải INVEST (độc lập, thương lượng được, có giá trị, ước lượng được, nhỏ, kiểm thử được). Story > 8 điểm thì tách.
