# OPS-05 — Upload bị bỏ dở 25 giờ; file mồ côi 2 ngày; ảnh FAILED

> **Mã test case:** `OPS-05` · **Loại:** Vận hành · **Cấp:** OPS · **Ưu tiên:** P1
> **Trạng thái trên ENV-05:** `Not Run` · **Trạng thái nguồn (dev):** Pass
> **Môi trường:** https://pet.vietdeptrai.io.vn/ · **API:** `https://pet.vietdeptrai.io.vn/api/v1`
> **Thư mục artifact:** `test_reports/OPS-05/`
> **Nguồn:** `docs/testing/Test_Cases.md` → 13. Test case độ tin cậy, vận hành và khả năng bảo trì → 13.2 Vận hành (OPS-01→OPS-10)
> **Ngày tạo hồ sơ:** 2026-10-26

> **Chưa có bằng chứng trên ENV-05.** Đây là đặc tả thực thi; mọi ảnh, video và report phải được tạo lại trong thư mục này. Không dùng kết quả baseline dev làm bằng chứng cho ENV-05.

## 1. Mục tiêu

Upload bị bỏ dở 25 giờ; file mồ côi 2 ngày; ảnh FAILED.

## 2. Truy vết

| Loại       | Giá trị                                                                                |
| ---------- | -------------------------------------------------------------------------------------- |
| Mã case    | `OPS-05`                                                                               |
| Loại / cấp | Vận hành / OPS                                                                         |
| Ưu tiên    | P1                                                                                     |
| Truy vết   | FR-SOC-007, S6-06                                                                      |
| Nguồn      | 13. Test case độ tin cậy, vận hành và khả năng bảo trì → 13.2 Vận hành (OPS-01→OPS-10) |

## 3. Điều kiện tiên quyết

- [ ] ENV-05 truy cập được tại https://pet.vietdeptrai.io.vn/ (API: `https://pet.vietdeptrai.io.vn/api/v1`).
- [ ] Thư mục `test_reports/OPS-05/` tồn tại; công cụ chụp ảnh và quay video hoạt động.
- [ ] Quyền xem log/CI/server hoặc dashboard vận hành; không thao tác production nếu chưa được phép.
- [ ] DB read-only/snapshot cho case cần kiểm dữ liệu.

## 4. Dữ liệu test

- Tài khoản A/B/C theo quy ước `qa.a+<run>@...`, `qa.b+<run>@...`, `qa.c+<run>@...`; mật khẩu lấy từ biến môi trường.
- Dữ liệu tạo mới trong run; ghi lại ID/email/username đã dùng (che bớt PII trong report).
- Với case DB/seed: dùng seed SD-011 hoặc fixture tương ứng; ghi rõ phiên bản seed.
- Ảnh: `small.jpg`, `6mb.jpg`, `12mb.heic`, `gps.jpg`, `fake.jpg`, `corrupt.heic` (khi case yêu cầu).
- Thời gian: ghi ISO-8601 + múi giờ; nếu dùng FakeClock, ghi T0 và các mốc đã đặt.

## 5. Kịch bản gốc

### 5.1 Các bước

| #   | Hành động                                               | Ảnh tương ứng    |
| --- | ------------------------------------------------------- | ---------------- |
| 1   | Upload bị bỏ dở 25 giờ; file mồ côi 2 ngày; ảnh FAILED. | `02-step-01.png` |

### 5.2 Kỳ vọng

> File incoming/ xóa; upload FAILED/ABANDONED; file mồ côi xóa; ảnh READY không đụng.

**Đối chiếu:** mọi quan sát phải khớp kỳ vọng trên. Nếu khác, ghi rõ khác ở đâu và tạo defect.

## 6. Nhiệm vụ bắt buộc của agent

> **Không được đánh dấu `Pass` nếu thiếu bất kỳ mục nào dưới đây.** Case không chạy được vì thiếu quyền/môi trường → `Blocked`; case đã rút → `N/A`.

- [ ] **A1 — Chuẩn bị & xác nhận môi trường:** mở https://pet.vietdeptrai.io.vn/, xác nhận đúng ENV-05; đăng nhập/chuẩn bị tài khoản; ghi ngày giờ, trình duyệt/phiên bản, build/commit nếu thấy.
- [ ] **A2 — Thực thi kịch bản:** thực hiện đúng 1 bước ở §5.1, không rút gọn; ghi actual cho từng bước.
- [ ] **A3 — Chụp ảnh bằng chứng:** chụp tối thiểu **3 ảnh** theo §7; ảnh phải thấy URL/terminal, trạng thái trước/sau và kết quả; che mật khẩu/token/PII.
- [ ] **A4 — Quay video:** quay **một video liên tục** toàn bộ quá trình, bắt đầu trước bước 1 và kết thúc sau khi kiểm tra cuối; thấy con trỏ, URL/terminal; lưu `video/recording.webm` (hoặc `.mp4`). Video phải thể hiện đúng luồng: Upload bị bỏ dở 25 giờ; file mồ côi 2 ngày; ảnh FAILED.
- [ ] **A5 — Viết report:** tạo `report.md` theo `../_templates/REPORT_TEMPLATE.md`; điền verdict, actual, evidence, defect; tạo `result.json` theo `../_templates/result.json`.
- [ ] **A6 — Kiểm tra & cập nhật:** mở lại video/ảnh để chắc chắn đọc được; kiểm report có link tới mọi evidence; cập nhật `test_reports/INDEX.md` và `test_reports/manifest.json`.

## 7. Bằng chứng bắt buộc

> Loại bằng chứng đặc thù: Ảnh chụp terminal/CI/dashboard + video thao tác.

| #   | Loại                   | Tên file                             | Nội dung bắt buộc                                                                                                                                         |
| --- | ---------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ảnh trạng thái ban đầu | `screenshots/01-initial.png`         | Trước khi thực hiện bước 1; thấy URL/terminal, tài khoản đang dùng (che PII), thời điểm.                                                                  |
| 2   | Ảnh sau bước 1         | `screenshots/02-step-01.png`         | Kết quả quan sát được của bước 1; thấy rõ trạng thái/thông báo/status.                                                                                    |
| 3   | Ảnh trạng thái cuối    | `screenshots/03-final.png`           | Trạng thái cuối + kết quả đối chiếu với kỳ vọng.                                                                                                          |
| 4   | Video toàn bộ          | `video/recording.webm` (hoặc `.mp4`) | Quay liên tục từ trước bước 1 đến sau bước cuối; thấy con trỏ, URL/terminal; không cắt. Nội dung: Upload bị bỏ dở 25 giờ; file mồ côi 2 ngày; ảnh FAILED. |
| 5   | Report                 | `report.md`                          | Report theo mẫu, có verdict, actual, link ảnh/video, defect.                                                                                              |
| 6   | Kết quả máy đọc        | `result.json`                        | Metadata + verdict + danh sách evidence.                                                                                                                  |
| 7   | Log                    | `logs/`                              | Console/network/HTTP/DB log tùy loại case.                                                                                                                |

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

- [ ] Quyền log/CI/server hoặc dashboard.
- [ ] DB read-only/snapshot.
- [ ] Người trực vận hành khi test.

## 11. An toàn & dọn dẹp

- Không dùng dữ liệu cá nhân thật; che mật khẩu/token/cookie trong ảnh, video và report.
- Dọn dữ liệu test sau khi chụp đủ bằng chứng nếu được phép; không xóa dữ liệu của người khác.
- Lưu artifact trong `test_reports/OPS-05/`; không đưa secret/PII vào report.

## 12. Cấu trúc thư mục

```text
test_reports/OPS-05/
├── test-case.md          # hồ sơ này
├── report.md             # tạo khi chạy
├── result.json           # tạo khi chạy
├── screenshots/          # 3 ảnh bắt buộc
├── video/                # recording.webm hoặc .mp4
└── logs/                 # console/network/HTTP/DB log
```
