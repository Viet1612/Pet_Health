# S7-05 · Contract test Schemathesis, kiểm thử thiết bị và thời gian

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S7 · T15–16 |
| Story | — |
| Yêu cầu | G-4, G-5, G-17, FR-AUTH-011, FR-RT-004, FR-GEN-001, NFR-MNT-005 |
| Phụ thuộc | [S7-01](S7-01-production-stack.md) |
| Ước lượng | 1,5 ngày |
| Màn hình Figma | — |

## Mục tiêu

Chứng minh API đang chạy khớp 100% `openapi.yaml` (G-17), ứng dụng không còn lỗi Critical/High trên 4 nhóm thiết bị (G-4), và checklist cùng nhắc nhở chuyển ngày đúng 00:00 theo múi giờ tài khoản (G-5).

## Phạm vi

**Trong phạm vi:** Schemathesis trên staging, ma trận kiểm thử thiết bị thật, kiểm thử thời gian tự động (`FakeClock`) và thủ công (đổi múi giờ), bảng phân loại lỗi.

**Ngoài phạm vi:** viết mới E2E `FakeClock` → đã có ở [S4-06](S4-06-e2e-core-flow.md), ở đây chỉ chạy lại và bổ sung ca thiếu. Hiệu năng → [S7-03](S7-03-performance-test.md). Bảo mật → [S7-04](S7-04-security-test.md).

## Chi tiết kỹ thuật

**1. Schemathesis (G-17)**

Chạy trên máy chủ, vào thẳng mạng Docker staging, với tài khoản thử riêng `contract@test.local` (có 1 thú cưng, 1 mốc, 1 bản ghi khám):

```bash
docker run --rm --network ph-staging_edge -v "$PWD:/w" schemathesis/schemathesis:<phiên bản ghim> \
  run /w/openapi.yaml --url http://caddy/api/v1 \
  --checks all --max-examples 50 \
  -H "Cookie: __Host-ph_sid=$SID" -H "X-CSRF-Token: $CSRF" -H "Origin: https://staging.pethealth.example" \
  --exclude-operation-id deleteMe --exclude-operation-id logout \
  --exclude-operation-id changePassword --exclude-operation-id changeEmail \
  --report junit --report-dir /w/results/S7-05
```

- Loại các operation làm mất phiên hoặc xóa tài khoản thử (tên `operationId` lấy đúng theo `openapi.yaml`); kiểm riêng chúng bằng 1 lần gọi tay, so response với schema.
- Endpoint auth bị giới hạn tần suất: chạy riêng với `--include-path-regex '^/auth/' --max-examples 5`; response `429` phải có trong contract.
- Endpoint multipart (`/avatar`, `/photos`): chạy với `--max-examples 10`; `413`, `415` phải có trong contract.
- Đạt khi 0 lỗi ở các check `not_a_server_error`, `status_code_conformance`, `content_type_conformance`, `response_schema_conformance`, `response_headers_conformance`. Lỗi ở check khác (ví dụ `negative_data_rejection`) phân loại: sửa API hoặc sửa schema; không tắt check toàn cục.
- Mọi thay đổi `openapi.yaml` sinh lại từ Zod, commit kèm `packages/api-client` sinh lại; CI contract diff xanh.

**2. Ma trận thiết bị (G-4)**

| Thiết bị | Trình duyệt | Hướng | Viewport tham chiếu |
|---|---|---|---|
| iPad 10,5" | Safari | Dọc và ngang | 834 × 1112 / 1112 × 834 |
| iPhone | Safari | Dọc | 390 × 844 |
| Android phone | Chrome | Dọc | 412 × 915 |
| Desktop | Chrome | — | 1440 × 900 |

Kịch bản trên mỗi thiết bị (staging, tài khoản mới):

1. Đăng ký → xác minh email (Mailpit staging) → đăng nhập.
2. Tạo thú cưng có ảnh đại diện chụp bằng camera (iPhone: HEIC).
3. Thêm cân nặng, xem biểu đồ; thêm bản ghi khám có 2 ảnh, mở lightbox.
4. Tạo mốc VACCINE hạn hôm nay + 7 → banner D7 trên Dashboard, chuông có số → mở Thông báo → đánh dấu đã thực hiện → hoàn tác → đánh dấu lại → mốc kế tiếp.
5. Tạo 2 việc hằng ngày, tích/bỏ tích; lọc Dashboard theo thú cưng.
6. Cài đặt: đổi múi giờ, đổi mật khẩu; dark mode; đăng xuất.
7. Mất mạng giữa lúc lưu (chế độ máy bay) → thông báo lỗi tiếng Việt, bấm "Thử lại" không tạo bản ghi trùng.
8. Kiểm chung: không thanh cuộn ngang, bàn phím ảo không che nút lưu, vùng chạm ≥ 44 px, xoay iPad không mất dữ liệu đang nhập.

**3. Kiểm thử thời gian (G-5)**

*Tự động:* chạy lại E2E `FakeClock` của S4-06 (stack CI, `NODE_ENV=test`, `POST /__test/clock`); bảo đảm có đủ các ca:

| # | Ca | Kỳ vọng |
|---|---|---|
| T1 | Đặt đồng hồ 23:59:59 giờ tài khoản → 00:00:00 | Checklist ngày mới chưa tích; ngày cũ giữ nguyên trạng thái |
| T2 | Mốc hạn D; đồng hồ D−8 23:59 → D−7 00:00 | Trước: không nhắc. Sau: nhắc D7 |
| T3 | D−2 23:59 → D−1 00:00 | Nhắc D1, D7 bị supersede |
| T4 | D 23:59 → D+1 00:00 | Nhắc Quá hạn |
| T5 | Cùng thời điểm UTC, tài khoản `Asia/Ho_Chi_Minh` và `America/Los_Angeles` | "Hôm nay" khác nhau đúng theo múi giờ |
| T6 | Đổi múi giờ tài khoản khi đã có thông báo | Thông báo đã tạo giữ nguyên; mức nhắc mới tính theo múi giờ mới (FR-AUTH-011) |
| T7 | Server tắt 3 ngày (nhảy đồng hồ D−8 → D+1) | Chỉ có nhắc Quá hạn mới nhất chưa đọc, không có bản trùng |

*Thủ công trên staging (đồng hồ thật):* chọn một múi giờ IANA mà giờ địa phương hiện tại là khoảng 23:50 (ví dụ tra bằng `TZ=<zone> date`). Trong Cài đặt đặt múi giờ tài khoản sang zone đó; tạo mốc hạn = (ngày mai theo zone đó) + 7 và tích 1 việc hằng ngày. Trước 00:00: không có banner, việc đã tích. Sau 00:00 tải lại: banner D7 xuất hiện, checklist reset. Lặp với mốc hạn ngày mai + 1 (D1) và hạn hôm nay (Quá hạn). Đổi múi giờ **thiết bị** khác múi giờ tài khoản → kết quả vẫn theo múi giờ tài khoản.

**4. Bảng phân loại lỗi — `docs/implement/results/S7-05/bugs.md`**

| ID | Thiết bị / công cụ | Bước tái hiện | Kết quả thực tế | Kỳ vọng | Mức độ | Trạng thái | Commit sửa |
|---|---|---|---|---|---|---|---|
| BUG-001 | iPhone Safari | … | … | … | High | Đã sửa | `abc1234` |

Mức độ: **Critical** — mất/sai dữ liệu, lộ dữ liệu người khác, không dùng được luồng G-3. **High** — một chức năng P0 không dùng được hoặc nhắc sai ngày, không có cách vòng. **Medium** — lỗi có cách vòng, lỗi hiển thị làm khó dùng. **Low** — thẩm mỹ.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] Schemathesis: 0 lỗi ở 5 check bắt buộc trên mọi operation; operation bị loại đã kiểm tay; CI contract diff xanh (G-17).
- [ ] 5 cấu hình thiết bị × 8 bước đều chạy hết; 0 lỗi Critical/High ở trạng thái mở (G-4).
- [ ] E2E `FakeClock` T1–T7 Pass trên SHA phát hành (G-5).
- [ ] Kiểm thủ công qua 00:00: checklist reset, D7/D1/Quá hạn xuất hiện đúng từ 00:00 múi giờ tài khoản (G-5).
- [ ] `bugs.md` liệt kê mọi lỗi tìm thấy kèm mức độ và trạng thái.

## Kiểm thử

Chạy Schemathesis trước (lỗi contract thường kéo theo lỗi giao diện), sửa, deploy staging, rồi đi ma trận thiết bị. Lỗi Critical/High sửa xong phải kiểm lại trên đúng thiết bị đã phát hiện và chạy lại bước 4 (luồng nhắc) trên 1 thiết bị khác. Kiểm thử qua 00:00 thủ công làm sau cùng, trên SHA sẽ phát hành.

## Ghi chú

- Lỗi Medium/Low không chặn phát hành; giữ trong `bugs.md` để xử lý sau ra mắt.
- Xóa tài khoản thử trên staging sau khi xong.
