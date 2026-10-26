# UAT-007 — Nhất quán đa thiết bị

> **Mã test case:** `UAT-007` · **Loại:** Chấp nhận · **Cấp:** UAT · **Ưu tiên:** P0
> **Trạng thái trên ENV-05:** `Not Run` · **Trạng thái nguồn (dev):** Not Run
> **Môi trường:** https://pet.vietdeptrai.io.vn/ · **API:** `https://pet.vietdeptrai.io.vn/api/v1`
> **Thư mục artifact:** `test_reports/UAT-007/`
> **Nguồn:** `docs/testing/Test_Cases.md` → 7. Test case chấp nhận — UAT theo 50 story (UAT-001→UAT-079) → 7.1 Epic E1 — Tài khoản (8 story)
> **Ngày tạo hồ sơ:** 2026-10-26

> **Chưa có bằng chứng trên ENV-05.** Đây là đặc tả thực thi; mọi ảnh, video và report phải được tạo lại trong thư mục này. Không dùng kết quả baseline dev làm bằng chứng cho ENV-05.

## 1. Mục tiêu

Given 2 thiết bị, When lưu ở thiết bị 1, Then thiết bị 2 thấy dữ liệu mới

## 2. Truy vết

| Loại         | Giá trị                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Mã case      | `UAT-007`                                                                                        |
| Loại / cấp   | Chấp nhận / UAT                                                                                  |
| Ưu tiên      | P0                                                                                               |
| Truy vết     | US-007 Nhất quán đa thiết bị · TC-GEN-007, 008                                                   |
| Story        | US-007 Nhất quán đa thiết bị                                                                     |
| AC trọng tâm | Given 2 thiết bị, When lưu ở thiết bị 1, Then thiết bị 2 thấy dữ liệu mới                        |
| TC           | TC-GEN-007, 008                                                                                  |
| Nguồn        | 7. Test case chấp nhận — UAT theo 50 story (UAT-001→UAT-079) → 7.1 Epic E1 — Tài khoản (8 story) |

## 3. Điều kiện tiên quyết

- [ ] ENV-05 truy cập được tại https://pet.vietdeptrai.io.vn/ (API: `https://pet.vietdeptrai.io.vn/api/v1`).
- [ ] Thư mục `test_reports/UAT-007/` tồn tại; công cụ chụp ảnh và quay video hoạt động.
- [ ] PO/người đại diện tham gia; build ứng viên trên ENV-05; dữ liệu UAT được chuẩn bị trước.
- [ ] Tài khoản + dữ liệu UAT; biên bản UAT có chữ ký/xác nhận của PO sau khi xem bằng chứng.

## 4. Dữ liệu test

- Tài khoản A/B/C theo quy ước `qa.a+<run>@...`, `qa.b+<run>@...`, `qa.c+<run>@...`; mật khẩu lấy từ biến môi trường.
- Dữ liệu tạo mới trong run; ghi lại ID/email/username đã dùng (che bớt PII trong report).
- Với case DB/seed: dùng seed SD-011 hoặc fixture tương ứng; ghi rõ phiên bản seed.
- Ảnh: `small.jpg`, `6mb.jpg`, `12mb.heic`, `gps.jpg`, `fake.jpg`, `corrupt.heic` (khi case yêu cầu).
- Thời gian: ghi ISO-8601 + múi giờ; nếu dùng FakeClock, ghi T0 và các mốc đã đặt.

## 5. Kịch bản gốc

### 5.1 Các bước

| #   | Hành động                     | Ảnh tương ứng    |
| --- | ----------------------------- | ---------------- |
| 1   | Sửa trên phone, reload tablet | `02-step-01.png` |

### 5.2 Kỳ vọng

> Không cache cũ; last-write-wins

**Đối chiếu:** mọi quan sát phải khớp kỳ vọng trên. Nếu khác, ghi rõ khác ở đâu và tạo defect.

## 6. Nhiệm vụ bắt buộc của agent

> **Không được đánh dấu `Pass` nếu thiếu bất kỳ mục nào dưới đây.** Case không chạy được vì thiếu quyền/môi trường → `Blocked`; case đã rút → `N/A`.

- [ ] **A1 — Chuẩn bị & xác nhận môi trường:** mở https://pet.vietdeptrai.io.vn/, xác nhận đúng ENV-05; đăng nhập/chuẩn bị tài khoản; ghi ngày giờ, trình duyệt/phiên bản, build/commit nếu thấy.
- [ ] **A2 — Thực thi kịch bản:** thực hiện đúng 1 bước ở §5.1, không rút gọn; ghi actual cho từng bước.
- [ ] **A3 — Chụp ảnh bằng chứng:** chụp tối thiểu **3 ảnh** theo §7; ảnh phải thấy URL/terminal, trạng thái trước/sau và kết quả; che mật khẩu/token/PII.
- [ ] **A4 — Quay video:** quay **một video liên tục** toàn bộ quá trình, bắt đầu trước bước 1 và kết thúc sau khi kiểm tra cuối; thấy con trỏ, URL/terminal; lưu `video/recording.webm` (hoặc `.mp4`). Video phải thể hiện đúng luồng: Given 2 thiết bị, When lưu ở thiết bị 1, Then thiết bị 2 thấy dữ liệu mới.
- [ ] **A5 — Viết report:** tạo `report.md` theo `../_templates/REPORT_TEMPLATE.md`; điền verdict, actual, evidence, defect; tạo `result.json` theo `../_templates/result.json`.
- [ ] **A6 — Kiểm tra & cập nhật:** mở lại video/ảnh để chắc chắn đọc được; kiểm report có link tới mọi evidence; cập nhật `test_reports/INDEX.md` và `test_reports/manifest.json`.

## 7. Bằng chứng bắt buộc

> Loại bằng chứng đặc thù: Ảnh chụp từng AC + video demo và xác nhận của PO trong report.

| #   | Loại                   | Tên file                             | Nội dung bắt buộc                                                                                                                                                           |
| --- | ---------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ảnh trạng thái ban đầu | `screenshots/01-initial.png`         | Trước khi thực hiện bước 1; thấy URL/terminal, tài khoản đang dùng (che PII), thời điểm.                                                                                    |
| 2   | Ảnh sau bước 1         | `screenshots/02-step-01.png`         | Kết quả quan sát được của bước 1; thấy rõ trạng thái/thông báo/status.                                                                                                      |
| 3   | Ảnh trạng thái cuối    | `screenshots/03-final.png`           | Trạng thái cuối + kết quả đối chiếu với kỳ vọng.                                                                                                                            |
| 4   | Video toàn bộ          | `video/recording.webm` (hoặc `.mp4`) | Quay liên tục từ trước bước 1 đến sau bước cuối; thấy con trỏ, URL/terminal; không cắt. Nội dung: Given 2 thiết bị, When lưu ở thiết bị 1, Then thiết bị 2 thấy dữ liệu mới |
| 5   | Report                 | `report.md`                          | Report theo mẫu, có verdict, actual, link ảnh/video, defect.                                                                                                                |
| 6   | Kết quả máy đọc        | `result.json`                        | Metadata + verdict + danh sách evidence.                                                                                                                                    |
| 7   | Log                    | `logs/`                              | Console/network/HTTP/DB log tùy loại case.                                                                                                                                  |

**Quy tắc ảnh:** PNG (hoặc JPEG chất lượng cao), không cắt mất ngữ cảnh, không che mất nội dung cần kiểm; ảnh lỗi phải chụp cả thông báo lỗi và URL/terminal. **Quy tắc video:** quay màn hình + con trỏ, độ phân giải ≥1280×720, không chỉnh sửa/cắt; nếu dài >10 phút, chia `part-01`, `part-02` nhưng vẫn liên tục trong từng phần.

## 8. Tiêu chí đánh giá

- **Pass:** tất cả quan sát khớp §5.2; đủ 3 ảnh + 1 video + report + result.json; không có defect S1/S2 mở.
- **Fail:** có ít nhất một quan sát sai kỳ vọng hoặc thiếu bằng chứng buộc phải kết luận không đạt.
- **Blocked:** không thể thực hiện vì thiếu tài khoản/quyền/môi trường/dữ liệu; ghi rõ cần gì.
- **N/A:** case đã rút theo quyết định (chỉ áp dụng OPS-08/OPS-09); vẫn tạo report + ảnh/video xác nhận quyết định.

## 9. Mẫu report

Dùng `../_templates/REPORT_TEMPLATE.md`. Tối thiểu phải có:

- Verdict `Pass / Fail / Blocked / N/A` + lý do.
- Bảng actual cho từng bước, đối chiếu kỳ vọng.
- Bảng evidence: tên file, mô tả, thời điểm chụp.
- Defect (nếu có): ID, severity, mô tả, bước tái hiện, evidence.
- Chữ ký/người chạy + thời gian bắt đầu/kết thúc.

## 10. Cần cấp / phụ thuộc

- [ ] PO/người đại diện.
- [ ] Tài khoản + dữ liệu UAT.
- [ ] Thời gian demo/sign-off.

## 11. An toàn & dọn dẹp

- Không dùng dữ liệu cá nhân thật; che mật khẩu/token/cookie trong ảnh, video và report.
- Dọn dữ liệu test sau khi chụp đủ bằng chứng nếu được phép; không xóa dữ liệu của người khác.
- Lưu artifact trong `test_reports/UAT-007/`; không đưa secret/PII vào report.

## 12. Cấu trúc thư mục

```text
test_reports/UAT-007/
├── test-case.md          # hồ sơ này
├── report.md             # tạo khi chạy
├── result.json           # tạo khi chạy
├── screenshots/          # 3 ảnh bắt buộc
├── video/                # recording.webm hoặc .mp4
└── logs/                 # console/network/HTTP/DB log
```
