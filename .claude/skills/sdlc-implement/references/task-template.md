# Khung file task và README

## tasks/README.md

```markdown
# Danh sách task — <Tên sản phẩm>

YYYY-MM-DD · <tác giả>

[Implement_plan.md](../Implement_plan.md) được chia thành **N task** trong M sprint. Làm theo thứ tự bảng; cột "Phụ thuộc" cho biết task phải xong trước.
Quy ước tên file: `S<sprint>-<số>-<tên-ngắn>.md`. Ước lượng theo ngày công.

## S0 · T1–2 — Nền tảng

| Task                       | Tên                                           | Story / FR | Phụ thuộc | Ước lượng |
| -------------------------- | --------------------------------------------- | ---------- | --------- | --------- |
| [S0-01](S0-01-monorepo.md) | Khởi tạo monorepo, lint, tsconfig, pre-commit | AD-002     | —         | 0,5       |
```

## <ID>-<slug>.md

```markdown
# S1-03 · API đăng ký

| Thuộc tính | Giá trị                                                                           |
| ---------- | --------------------------------------------------------------------------------- |
| Sprint     | S1                                                                                |
| Story / FR | US-001 · FR-AUTH-001→004                                                          |
| Phụ thuộc  | S1-01, S1-02                                                                      |
| Ước lượng  | 1 ngày                                                                            |
| Thiết kế   | [SAD §3.3](../../design/SAD.md#33-…) · [SRS §2.1](../../requirements/SRS.md#21-…) |

## Mục tiêu

Một câu: sau task này hệ thống làm được gì.

## Phạm vi

- **Làm:** …
- **Không làm:** … (thuộc task nào)

## Chi tiết kỹ thuật

### Endpoint

`POST /api/v1/auth/register` — body, response, mã lỗi.

### Kiểm tra đầu vào

Schema, giới hạn.

### Logic / use case

Các bước, transaction, side effect (email, job).

### Dữ liệu

Bảng/cột/migration.

### Tệp

- `path/to/new-file.ts` — mới
- `path/to/existing.ts` — sửa: …

## Giao diện

Màn hình (SCR-xx), trạng thái, thông báo — hoặc "Không có".

## Tiêu chí chấp nhận

- [ ] …(kiểm chứng được, có giá trị cụ thể)
- [ ] Truy cập tài nguyên người khác → 404

## Kiểm thử

- Unit: …
- Integration: …
- Lệnh: `pnpm test …`

## Ghi chú

Rủi ro, quyết định, link.
```
