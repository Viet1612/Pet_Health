# S4-08 · API trung lập ngôn ngữ: mã lỗi và dữ liệu thô — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S4-08](../tasks/S4-08-i18n-api.md) |
| Trạng thái | Xong (code), test tự động Pass; chưa bấm thử lỗi ở bản tiếng Anh |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

**API**
- `FieldError` thêm `params?`; `AppErrorOptions` và problem+json thêm `params?` cấp lỗi.
- Lỗi Zod: `fieldErrorParams` lấy `{ max }` (TOO_LONG, OUT_OF_RANGE) hoặc `{ min }` từ issue.
- Lỗi domain có params:
  - `TOO_LONG`: tên thú cưng 50, mô tả 2000, văn bản lần khám 2000, ghi chú mốc 500.
  - `OUT_OF_RANGE`: cân nặng / mục tiêu `{ min: 0.1, max: 150 }`, chu kỳ `{ min: 1, max: 60 }`.
  - `PET_LIMIT_REACHED { max: 10 }`.
- Dữ liệu thô: `Pet.ageMonths`, `Notification.daysUntilDue` (âm = quá hạn, `null` khi đã xử lý). `ageText`, `label` vẫn trả cho client cũ.
- Sinh lại `openapi.yaml` và `packages/api-client` (thêm `ProblemParams`).

**Web**
- `api/to-user-message.ts`: `problemText` (tra `m.apiErrors.problem[code]`, không có → `title` server), `fieldErrorText` (`m.apiErrors.field(code, field, params)`, không có → `message` server). `toUserMessage` và lỗi `EMAIL_TAKEN` ở đăng ký dùng 2 hàm này.
- Từ điển:
  - `en.apiErrors`: 28 mã lỗi cấp problem và các mã lỗi trường.
  - `m.pets.age(months)`: "7 năm 7 tháng" / "7 years 7 months", "1 year".
  - `m.notifications.label(days)`: "còn 7 ngày" / "in 7 days", "tomorrow", "3 days overdue".
- Thẻ thú cưng, PetSwitcher, mục thông báo dùng `ageMonths` / `daysUntilDue`.

**Test**
- API: `fieldErrorParams`; params ở pet TOO_LONG, visit TOO_LONG. `errors.test.ts` cập nhật kỳ vọng có `params`.
- Web `i18n/messages.test.ts`: tuổi (0, 1, 12, 13, 91 tháng), nhãn (−3, −1, 0, 1, 7 ngày) cả 2 ngôn ngữ; dịch lỗi en theo mã + params; dự phòng thông điệp server.

## Tiêu chí chấp nhận

**Đã kiểm:** typecheck, lint, unit 174, IDOR 79/79, E2E 17/17.

**Chưa kiểm** (cần bấm thử ở English): lỗi trường như ngày sinh tương lai, cân nặng ngoài khoảng, ảnh > 5 MB hiện tiếng Anh.

## Khác với file task

- **Bản vi không có bảng mã lỗi:** `vi.apiErrors.problem` để trống, `field` luôn trả `null`, nên tiếng Việt dùng nguyên thông điệp server (giống hệt trước). Lý do: server đã là nguồn chuẩn tiếng Việt, chép lại sẽ dễ lệch câu chữ. Ngôn ngữ mới chỉ cần điền 2 mục này.
- **Lỗi trường dịch theo `code` + `field`** cho các câu riêng (cân nặng, chu kỳ, ngày sinh), vì cùng mã `OUT_OF_RANGE` / `FUTURE_DATE` có câu khác nhau theo trường.
- **Dọn rác:** xóa file rỗng `apps/api/console.log('jpg'` bị commit nhầm ở S2-03.
