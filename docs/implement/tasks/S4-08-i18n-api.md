# S4-08 · API trung lập ngôn ngữ: mã lỗi và dữ liệu thô

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S4 · T9–10 (bổ sung, làm trước S5) |
| Story | — (yêu cầu bổ sung của chủ dự án, 2026-10-25) |
| Yêu cầu | SAD §2.4.3 (problem+json có `code`); mở rộng đa ngôn ngữ |
| Phụ thuộc | [S4-07](S4-07-i18n-web.md) |
| Ước lượng | 1 ngày |
| Màn hình Figma | — |

## Mục tiêu

Web hiển thị lỗi và các câu do server tính (tuổi, nhãn nhắc) đúng ngôn ngữ người dùng chọn, mà API không phải biết ngôn ngữ. API trả **mã + tham số + dữ liệu thô**; web dịch.

## Phạm vi

**Trong phạm vi:**
- Mã lỗi trường có tham số.
- API trả thêm số liệu thô cho các câu đang ghép ở server.
- Web dịch theo mã, có dự phòng.
- Sinh lại `openapi.yaml` và `api-client`.

**Ngoài phạm vi:**
- Email ([S4-09](S4-09-user-locale-email.md)).
- Bỏ trường chữ tiếng Việt cũ của API. Giữ lại một thời gian để không phá client cũ; xóa khi dọn dẹp ở S6.

## Chi tiết kỹ thuật

**Lỗi**

- Problem `{ code, title, errors[{ field, code, message }] }` giữ nguyên; thêm `params?: Record<string, string | number>` cho lỗi trường cần số liệu (ví dụ `TOO_LONG { max: 2000 }`, `OUT_OF_RANGE { min: 0.1, max: 150 }`).
- Web: `api/to-user-message.ts` tra `m.errors.codes[problem.code]` và `m.errors.fields[error.code]`; không có thì dùng `title` / `message` tiếng Việt của server làm dự phòng.
- Lập danh mục mã hiện có (grep `new AppError`, `ValidationError`, mã trong domain): `REQUIRED`, `TOO_LONG`, `OUT_OF_RANGE`, `INVALID_DATE`, `FUTURE_DATE`, `DATE_IN_FUTURE`, `INVALID_ENUM`, `NOT_ALLOWED_FOR_VACCINE`, `SYMPTOMS_OR_DIAGNOSIS_REQUIRED`, `TYPE_IMMUTABLE`, `MILESTONE_NOT_PENDING`, `UNDO_WINDOW_EXPIRED`, `PET_LIMIT_REACHED`, `PHOTO_LIMIT_REACHED`, `FILE_TOO_LARGE`, `UNSUPPORTED_FORMAT`, `CONFIRM_NAME_MISMATCH`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `EMAIL_TAKEN`, `RATE_LIMITED`, `CSRF_INVALID`, `NOT_FOUND`, … Thêm vào `vi.ts` và `en.ts`.
- Lỗi Zod chung (`zod-messages.vi.ts`) giữ mã chuẩn (`REQUIRED`, `INVALID_FORMAT`, `OUT_OF_RANGE`, `TOO_LONG`) để web dịch.

**Dữ liệu thô thay cho câu ghép ở server**

| Chỗ | Hiện tại | Thêm trường |
|---|---|---|
| `Pet.ageText` "7 năm 7 tháng" | câu tiếng Việt | `ageMonths: number` |
| `Notification.label` "còn 7 ngày" | câu tiếng Việt | `daysUntilDue: number` (âm = quá hạn) |

Web ghép câu bằng từ điển: `m.pets.age(months)`, `m.notifications.label(days)`. Trường chữ cũ vẫn trả (dự phòng).

## Giao diện

Không có frame mới.

## Tiêu chí chấp nhận

- [ ] Ở tiếng Anh, lỗi trường (ví dụ ngày sinh tương lai, cân nặng ngoài khoảng, ảnh > 5 MB) hiện tiếng Anh; ở tiếng Việt giữ nguyên như trước.
- [ ] Mã lỗi chưa có trong từ điển → hiện thông điệp server (không vỡ giao diện).
- [ ] Tuổi thú cưng và nhãn nhắc hiển thị đúng ngôn ngữ ("7 years 7 months", "in 7 days", "tomorrow", "3 days overdue").
- [ ] `openapi.yaml`, `api-client` sinh lại; các client cũ dùng `ageText` / `label` vẫn chạy.

## Kiểm thử

- **Unit (web):** `toUserMessage` theo mã + dự phòng; `m.pets.age`, `m.notifications.label` cả 2 ngôn ngữ (0, 1, 12, 13 tháng; −3, 0, 1, 7 ngày).
- **Unit (API):** lỗi trường có `params` đúng.
