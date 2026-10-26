# OPS-08 — Backup/restore, RPO/RTO

> **Mã test case:** `OPS-08` · **Loại:** Vận hành · **Cấp:** OPS · **Ưu tiên:** P1
> **Trạng thái trên ENV-05:** `N/A (Withdrawn)` · **Trạng thái nguồn (dev):** N/A (Withdrawn)
> **Môi trường:** https://pet.vietdeptrai.io.vn/ · **API:** `https://pet.vietdeptrai.io.vn/api/v1`
> **Thư mục artifact:** `test_reports/OPS-08/`
> **Nguồn:** `docs/testing/Test_Cases.md` → 13. Test case độ tin cậy, vận hành và khả năng bảo trì → 13.2 Vận hành (OPS-01→OPS-10)
> **Ngày tạo hồ sơ:** 2026-10-26

> **Case đã rút (Withdrawn) — không thực thi trên ENV-05.** Hồ sơ này yêu cầu xác nhận quyết định rút và lưu bằng chứng, **không** yêu cầu chạy kịch bản. Không đánh dấu `Pass`/`Fail`.

## 1. Mục tiêu

Xác nhận OPS-08 đã được rút khỏi phạm vi kiểm thử, lưu bằng chứng quyết định và đóng case với verdict `N/A (Withdrawn)`.

## 2. Truy vết

| Loại       | Giá trị                                                                                |
| ---------- | -------------------------------------------------------------------------------------- |
| Mã case    | `OPS-08`                                                                               |
| Loại / cấp | Vận hành / OPS                                                                         |
| Ưu tiên    | P1                                                                                     |
| Truy vết   | NT-01                                                                                  |
| Nguồn      | 13. Test case độ tin cậy, vận hành và khả năng bảo trì → 13.2 Vận hành (OPS-01→OPS-10) |

## 3. Căn cứ rút

- Nội dung nguồn: Không thực hiện — G-13/NFR-REL-002 đã rút (DEC-020).
- Quyết định tham chiếu: DEC-020.
- Truy vết liên quan: NT-01.
- Hệ quả: không có kết quả Pass/Fail cho case này; gate liên quan được đánh giá theo quyết định rút, không theo kết quả test.

## 4. Điều kiện tiên quyết

- [ ] Đọc được `docs/testing/Test_Cases.md` tại mục 13. Test case độ tin cậy, vận hành và khả năng bảo trì → 13.2 Vận hành (OPS-01→OPS-10).
- [ ] Có quyền ghi vào `test_reports/OPS-08/`.
- [ ] Công cụ chụp ảnh màn hình và quay video hoạt động.
- [ ] **Không** cần tài khoản test, không cần thao tác trên https://pet.vietdeptrai.io.vn/.

## 5. Nhiệm vụ bắt buộc của agent

> Case đã rút: **không thực hiện kịch bản test**. Nhiệm vụ là xác nhận và lưu bằng chứng quyết định.

- [ ] **W1 — Xác nhận quyết định:** mở `docs/testing/Test_Cases.md`, tìm đúng dòng `OPS-08`, xác nhận nội dung "Không thực hiện" và mã quyết định.
- [ ] **W2 — Chụp ảnh quyết định:** chụp màn hình vùng bảng chứa `OPS-08` (thấy mã case, kỳ vọng, trạng thái `N/A (Withdrawn)`) và lưu `screenshots/01-decision.png`.
- [ ] **W3 — Chụp ảnh hồ sơ:** mở `test_reports/INDEX.md` (hoặc hồ sơ này) và chụp trạng thái `N/A` của case; lưu `screenshots/02-case-folder.png`.
- [ ] **W4 — Quay video xác nhận:** quay video ngắn **10–30 giây** mở quyết định và hồ sơ, thấy rõ mã case; lưu `video/withdrawn-confirmation.webm`. Không thao tác nghiệp vụ trên ENV-05.
- [ ] **W5 — Viết report:** tạo `report.md` theo `../_templates/REPORT_TEMPLATE.md` với verdict `N/A (Withdrawn)`, lý do và link bằng chứng; tạo `result.json`.
- [ ] **W6 — Kiểm tra:** mở lại ảnh/video, xác nhận đọc được; cập nhật `test_reports/INDEX.md` và `test_reports/manifest.json` (giữ trạng thái `N/A`).

## 6. Bằng chứng bắt buộc

| #   | Loại            | Tên file                            | Nội dung bắt buộc                                                                               |
| --- | --------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Ảnh quyết định  | `screenshots/01-decision.png`       | Bảng nguồn chứa `OPS-08`, nội dung "Không thực hiện" và trạng thái `N/A (Withdrawn)`.           |
| 2   | Ảnh hồ sơ       | `screenshots/02-case-folder.png`    | `INDEX.md` hoặc hồ sơ case hiển thị trạng thái `N/A`, đường dẫn thư mục `test_reports/OPS-08/`. |
| 3   | Video xác nhận  | `video/withdrawn-confirmation.webm` | 10–30 giây, thấy thao tác mở tài liệu và mã case; không cắt.                                    |
| 4   | Report          | `report.md`                         | Verdict `N/A (Withdrawn)`, căn cứ, link ảnh/video.                                              |
| 5   | Kết quả máy đọc | `result.json`                       | Metadata + verdict + evidence.                                                                  |

## 7. Tiêu chí đánh giá

- **N/A (Withdrawn):** có đủ 2 ảnh + 1 video + report + result.json; nội dung khớp quyết định rút.
- **Fail:** không thể xác nhận quyết định, hoặc bằng chứng không khớp nguồn.
- **Blocked:** không đọc được nguồn hoặc không ghi được artifact.
- **Không áp dụng Pass:** case đã rút, không có kết quả thực thi.

## 8. Cần cấp / phụ thuộc

- Không cần tài khoản test, quyền DB hay quyền thao tác trên ENV-05.
- Chỉ cần quyền đọc `docs/testing/` và ghi `test_reports/OPS-08/`.

## 9. An toàn & dọn dẹp

- Không thực hiện backup/restore, không thay đổi cấu hình hệ thống.
- Không đưa thông tin hạ tầng/secret vào ảnh hoặc report.

## 10. Cấu trúc thư mục

```text
test_reports/OPS-08/
├── test-case.md                    # hồ sơ này
├── report.md                       # tạo khi xác nhận
├── result.json                     # tạo khi xác nhận
├── screenshots/
│   ├── 01-decision.png
│   └── 02-case-folder.png
├── video/
│   └── withdrawn-confirmation.webm
└── logs/                           # tùy chọn
```
