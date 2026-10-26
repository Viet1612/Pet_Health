# Report — `<ID>` — `<Tên test case>`

> **Mã case:** `<ID>` · **Loại:** `<Chức năng | Tích hợp DB | Hợp đồng | API | E2E | UAT | Hồi quy | Hiệu năng | Bảo mật | Accessibility | UI/UX | Độ tin cậy | Vận hành | Bảo trì>`
> **Verdict:** `<Pass | Fail | Blocked | N/A (Withdrawn)>`
> **Môi trường:** `https://pet.vietdeptrai.io.vn/` · **API:** `https://pet.vietdeptrai.io.vn/api/v1`
> **Build/commit:** `<hash hoặc "không xác định">` · **Trình duyệt/thiết bị:** `<Chromium 1xx / ...>`
> **Bắt đầu:** `<YYYY-MM-DDTHH:mm:ss+07:00>` · **Kết thúc:** `<...>`
> **Người chạy:** `<tên/agent>` · **Ngày viết report:** `<YYYY-MM-DD>`

## 1. Tóm tắt

- **Kết quả:** `<một câu: đạt/không đạt/lý do>`
- **Số bước đã thực hiện:** `<n>/<tổng>`
- **Bằng chứng:** `<n> ảnh · <n> video · <n> log`
- **Defect mới:** `<BUG-xxx hoặc "không">`
- **Ảnh hưởng phạm vi:** `<không | mô tả ngắn>`

## 2. Điều kiện thực tế khi chạy

| Hạng mục              | Giá trị                                        |
| --------------------- | ---------------------------------------------- |
| URL quan sát được     | `<https://pet.vietdeptrai.io.vn/...>`          |
| Tài khoản dùng        | `<qa.a+... — che PII>`                         |
| Dữ liệu tạo trong run | `<ID/email/tên bản ghi, đã che bớt>`           |
| Thời điểm / múi giờ   | `<... +07:00>`                                 |
| Ghi chú môi trường    | `<ví dụ: dùng Chromium 140, viewport 390×844>` |

## 3. Kết quả từng bước

| #   | Hành động     | Kỳ vọng     | Thực tế                                              | Kết quả                       | Evidence                     |
| --- | ------------- | ----------- | ---------------------------------------------------- | ----------------------------- | ---------------------------- |
| 1   | `<hành động>` | `<kỳ vọng>` | `<quan sát được: status/mã lỗi/nội dung/trạng thái>` | `<Pass/Fail/Blocked/Skipped>` | `screenshots/02-step-01.png` |
| 2   | `<...>`       | `<...>`     | `<...>`                                              | `<...>`                       | `<...>`                      |

> Ghi nguyên văn thông báo/status quan sát được. Không suy diễn từ kết quả dev hoặc tài liệu.

## 4. Bằng chứng

| #   | Loại        | Tệp                          | Mô tả                                               | Thời điểm             |
| --- | ----------- | ---------------------------- | --------------------------------------------------- | --------------------- |
| 1   | Ảnh ban đầu | `screenshots/01-initial.png` | `<trạng thái trước bước 1>`                         | `<HH:mm:ss>`          |
| 2   | Ảnh bước 1  | `screenshots/02-step-01.png` | `<kết quả bước 1>`                                  | `<HH:mm:ss>`          |
| 3   | Ảnh cuối    | `screenshots/NN-final.png`   | `<trạng thái sau bước cuối>`                        | `<HH:mm:ss>`          |
| 4   | Video       | `video/recording.webm`       | `<quay liên tục từ trước bước 1 đến sau bước cuối>` | `<HH:mm:ss–HH:mm:ss>` |
| 5   | Log         | `logs/<tên>`                 | `<console/network/HTTP/DB>`                         | —                     |

**Kiểm tra:** đã mở lại toàn bộ ảnh và video, nội dung đọc được, không che mất phần cần kiểm, không lộ mật khẩu/token/PII: `<Có/Không>`.

## 5. Defect

| ID                   | Severity        | Mô tả     | Bước tái hiện     | Evidence           | Trạng thái               |
| -------------------- | --------------- | --------- | ----------------- | ------------------ | ------------------------ |
| `<BUG-xxx hoặc "—">` | `<S1/S2/S3/S4>` | `<mô tả>` | `<1) ... 2) ...>` | `<link ảnh/video>` | `<Open/Fixed/Won't fix>` |

> Không có defect: ghi `—` và nêu rõ đã kiểm tra.

## 6. Đối chiếu kỳ vọng

- **Kỳ vọng nguồn:** `<dán từ test-case.md §5.2>`
- **Kết luận đối chiếu:** `<khớp hoàn toàn | khác tại bước n>`
- **Sai lệch (nếu có):** `<mô tả + evidence>`

## 7. Kết luận

- **Verdict:** `<Pass | Fail | Blocked | N/A (Withdrawn)>`
- **Lý do:** `<...>`
- **Điều kiện còn thiếu (nếu Blocked):** `<tài khoản/quyền/môi trường/dữ liệu + người cấp>`
- **Đề xuất:** `<chạy lại sau khi sửa | chấp nhận rủi ro | chuyển PO>`

## 8. Xác nhận

| Vai trò           | Tên     | Thời điểm | Ghi chú |
| ----------------- | ------- | --------- | ------- |
| Người chạy        | `<...>` | `<...>`   | `<...>` |
| Reviewer (nếu có) | `<...>` | `<...>`   | `<...>` |
