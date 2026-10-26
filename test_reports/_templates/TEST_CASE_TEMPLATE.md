# `<ID>` — `<Tên test case>`

> Mẫu dành cho case **thêm thủ công**. Hồ sơ của 393 case hiện có được sinh tự động bằng
> `node test_reports/_tools/generate-test-reports.mjs`; chỉ dùng mẫu này khi bổ sung case mới
> hoặc sửa tay một hồ sơ, và phải giữ đúng cấu trúc để checker đọc được.

> **Mã test case:** `<ID>` · **Loại:** `<loại>` · **Cấp:** `<UT/IT/API/E2E/UI/UAT/SEC/PERF/ACC/OPS>` · **Ưu tiên:** `<P0/P1/P2>`
> **Trạng thái trên ENV-05:** `Not Run` · **Trạng thái nguồn (dev):** `—`
> **Môi trường:** https://pet.vietdeptrai.io.vn/ · **API:** `https://pet.vietdeptrai.io.vn/api/v1`
> **Thư mục artifact:** `test_reports/<ID>/`
> **Nguồn:** `docs/testing/Test_Cases.md` → `<mục>`
> **Ngày tạo hồ sơ:** `<YYYY-MM-DD>`

> **Chưa có bằng chứng trên ENV-05.** Đây là đặc tả thực thi; mọi ảnh, video và report phải được tạo lại trong thư mục này.

## 1. Mục tiêu

`<Mục tiêu quan sát được, 1–3 câu>`

## 2. Truy vết

| Loại       | Giá trị                     |
| ---------- | --------------------------- |
| Mã case    | `<ID>`                      |
| Loại / cấp | `<loại> / <cấp>`            |
| Ưu tiên    | `<P0/P1/P2>`                |
| Truy vết   | `<FR/NFR/gate/story>`       |
| Nguồn      | `<mục trong Test_Cases.md>` |

## 3. Điều kiện tiên quyết

- [ ] ENV-05 truy cập được tại https://pet.vietdeptrai.io.vn/ (API: `https://pet.vietdeptrai.io.vn/api/v1`).
- [ ] Có tài khoản test A/B/C đã xác minh email; thông tin đăng nhập lấy từ biến môi trường.
- [ ] Thư mục `test_reports/<ID>/` tồn tại; công cụ chụp ảnh và quay video hoạt động.
- [ ] `<tiền điều kiện riêng của case>`

## 4. Dữ liệu test

- Tài khoản A/B/C theo quy ước `qa.a+<run>@...`; mật khẩu lấy từ biến môi trường.
- Dữ liệu tạo mới trong run; ghi lại ID/email đã dùng (che PII trong report).
- `<dữ liệu/fixture riêng>`

## 5. Kịch bản gốc

### 5.1 Các bước

| #   | Hành động     | Ảnh tương ứng    |
| --- | ------------- | ---------------- |
| 1   | `<hành động>` | `02-step-01.png` |
| 2   | `<hành động>` | `03-step-02.png` |

### 5.2 Kỳ vọng

> `<kỳ vọng quan sát được: status, mã lỗi, nội dung, trạng thái DB/UI>`

**Đối chiếu:** mọi quan sát phải khớp kỳ vọng trên. Nếu khác, ghi rõ khác ở đâu và tạo defect.

## 6. Nhiệm vụ bắt buộc của agent

> **Không được đánh dấu `Pass` nếu thiếu bất kỳ mục nào dưới đây.** Case không chạy được vì thiếu quyền/môi trường → `Blocked`; case đã rút → `N/A`.

- [ ] **A1 — Chuẩn bị & xác nhận môi trường:** mở ENV-05, xác nhận đúng môi trường; ghi ngày giờ, trình duyệt, build/commit.
- [ ] **A2 — Thực thi kịch bản:** thực hiện đúng `<n>` bước ở §5.1, ghi actual từng bước.
- [ ] **A3 — Chụp ảnh bằng chứng:** chụp tối thiểu **`<n>` ảnh** theo §7; che mật khẩu/token/PII.
- [ ] **A4 — Quay video:** quay **một video liên tục** toàn bộ quá trình; lưu `video/recording.webm` (hoặc `.mp4`).
- [ ] **A5 — Viết report:** tạo `report.md` theo `../_templates/REPORT_TEMPLATE.md` và `result.json`.
- [ ] **A6 — Kiểm tra & cập nhật:** mở lại video/ảnh; cập nhật `INDEX.md`, `manifest.json`; chạy checker.

## 7. Bằng chứng bắt buộc

| #   | Loại                   | Tên file                             | Nội dung bắt buộc                                                |
| --- | ---------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| 1   | Ảnh trạng thái ban đầu | `screenshots/01-initial.png`         | Trước bước 1; thấy URL/terminal, tài khoản (che PII), thời điểm. |
| 2   | Ảnh sau mỗi bước       | `screenshots/NN-step-NN.png`         | Kết quả quan sát được; thấy rõ trạng thái/thông báo/status.      |
| 3   | Ảnh trạng thái cuối    | `screenshots/NN-final.png`           | Trạng thái cuối + đối chiếu kỳ vọng.                             |
| 4   | Video toàn bộ          | `video/recording.webm` (hoặc `.mp4`) | Quay liên tục từ trước bước 1 đến sau bước cuối; không cắt.      |
| 5   | Report                 | `report.md`                          | Verdict, actual, evidence, defect.                               |
| 6   | Kết quả máy đọc        | `result.json`                        | Metadata + verdict + evidence.                                   |
| 7   | Log                    | `logs/`                              | Console/network/HTTP/DB log tùy loại case.                       |

**Quy tắc ảnh:** PNG/JPEG chất lượng cao, không cắt mất ngữ cảnh; che secret/PII. **Quy tắc video:** quay màn hình + con trỏ, ≥1280×720, không chỉnh sửa.

## 8. Tiêu chí đánh giá

- **Pass:** mọi quan sát khớp §5.2; đủ `<n>` ảnh + 1 video + report + `result.json`; không có defect S1/S2 mở.
- **Fail:** có quan sát sai kỳ vọng hoặc thiếu bằng chứng buộc kết luận không đạt.
- **Blocked:** thiếu tài khoản/quyền/môi trường/dữ liệu; ghi rõ cần gì.
- **N/A:** case đã rút; vẫn tạo report + ảnh/video xác nhận quyết định.

## 9. Mẫu report

Dùng `../_templates/REPORT_TEMPLATE.md` và `../_templates/result.json`.

## 10. Cần cấp / phụ thuộc

- [ ] `<tài khoản/quyền/dữ liệu cần cấp>`
- [ ] `<phê duyệt nếu là load/security test>`

## 11. An toàn & dọn dẹp

- Không dùng dữ liệu cá nhân thật; che mật khẩu/token/cookie trong ảnh, video và report.
- Dọn dữ liệu test sau khi chụp đủ bằng chứng nếu được phép; không xóa dữ liệu của người khác.
- Lưu artifact trong `test_reports/<ID>/`; không đưa secret/PII vào report.

## 12. Cấu trúc thư mục

```text
test_reports/<ID>/
├── test-case.md
├── report.md
├── result.json
├── screenshots/
├── video/
└── logs/
```
