# Hồ sơ thực thi test case — Pet Health

> **Môi trường đích:** https://pet.vietdeptrai.io.vn/
> **API:** `https://pet.vietdeptrai.io.vn/api/v1` · **Tài liệu nguồn:** [`../docs/testing/Test_Cases.md`](../docs/testing/Test_Cases.md) (PH-TC-001 v1.1)
> **Ngày sinh hồ sơ:** 2026-10-26 · **Trạng thái chung:** `Not Run` (chưa thực thi)

Thư mục này chứa **hồ sơ thực thi riêng cho từng test case** của Pet Health. Mỗi case có một thư mục mang đúng mã case; khi chạy, agent/QA phải tạo **report + ảnh chụp màn hình + video** trong thư mục đó. Hồ sơ hiện tại là **đặc tả thực thi**, chưa phải kết quả test.

## 1. Tình trạng hiện tại

| Hạng mục                                   |                             Số lượng |
| ------------------------------------------ | -----------------------------------: |
| Test case có hồ sơ                         |                              **393** |
| Đã thực thi trên ENV-05                    |                                **0** |
| Có đủ report + ảnh + video                 |                                **0** |
| Case rút khỏi phạm vi (`OPS-08`, `OPS-09`) | **2** — trạng thái `N/A (Withdrawn)` |
| Case còn lại                               |       **391** — trạng thái `Not Run` |

> **Chưa có bằng chứng thực tế nào trên ENV-05.** Không dùng kết quả baseline dev (unit 209 Pass, IDOR 136/136, E2E 72/72, axe 14 màn) làm bằng chứng cho môi trường này. Mọi kết luận `Pass` phải đi kèm artifact được tạo trong lần chạy.

## 2. Môi trường

| Hạng mục              | Giá trị                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web                   | `https://pet.vietdeptrai.io.vn/`                                                                                                                       |
| API base              | `https://pet.vietdeptrai.io.vn/api/v1`                                                                                                                 |
| Health check          | `GET /api/v1/healthz` → `200 {"status":"ok"}` · `GET /api/v1/readyz` → `200 {"status":"ok"}`                                                           |
| Phiên chưa đăng nhập  | `GET /api/v1/auth/session` → `401`; trang chủ chuyển tới `/login?next=%2F`                                                                             |
| Trạng thái môi trường | Ứng dụng đã triển khai, dùng được để test theo yêu cầu của Việt                                                                                        |
| Lưu ý an toàn         | Môi trường dùng chung: chỉ dùng tài khoản test; không chạy migration/rollback, load test, quét bảo mật chủ động hoặc xóa diện rộng khi chưa được duyệt |

## 3. Cấu trúc một case

```text
test_reports/<ID>/
├── test-case.md          # hồ sơ sinh tự động: mục tiêu, truy vết, bước, kỳ vọng, nhiệm vụ, bằng chứng
├── report.md             # tạo khi chạy — theo _templates/REPORT_TEMPLATE.md
├── result.json           # tạo khi chạy — theo _templates/result.json
├── screenshots/          # 01-initial.png, 02-step-01.png, …, NN-final.png
├── video/                # recording.webm hoặc recording.mp4
└── logs/                 # console/network/HTTP/DB log
```

### Bằng chứng tối thiểu

| Loại    | Quy định                                                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ảnh     | **Số bước + 2**: `01-initial.png`, `NN-step-NN.png` cho từng bước, `NN-final.png`. Ảnh phải thấy URL/terminal, trạng thái trước/sau và kết quả; che mật khẩu/token/PII.                   |
| Video   | **Một video liên tục** từ trước bước 1 đến sau kiểm tra cuối, thấy con trỏ và URL/terminal; ≥1280×720; không cắt. Dài >10 phút thì chia `part-01`, `part-02` nhưng mỗi phần vẫn liên tục. |
| Report  | `report.md` có verdict, actual từng bước, bảng evidence, defect (nếu có), người chạy, thời gian.                                                                                          |
| Máy đọc | `result.json` có verdict + danh sách evidence trỏ đúng file.                                                                                                                              |
| Log     | Tùy loại case: console/network (UI), HTTP (API), DB (DB), test output (REG/MNT).                                                                                                          |

Case rút (`OPS-08`, `OPS-09`) dùng bộ bằng chứng riêng: `screenshots/01-decision.png`, `screenshots/02-case-folder.png`, `video/withdrawn-confirmation.webm`, report `N/A (Withdrawn)`.

## 4. Trạng thái

| Trạng thái        | Ý nghĩa                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| `Not Run`         | Chưa thực thi; mặc định cho 391 case                                     |
| `Pass`            | Khớp kỳ vọng + đủ ảnh/video/report/`result.json`; không còn defect S1/S2 |
| `Fail`            | Có quan sát sai kỳ vọng hoặc thiếu bằng chứng buộc kết luận không đạt    |
| `Blocked`         | Thiếu tài khoản/quyền/môi trường/dữ liệu; ghi rõ cần gì                  |
| `N/A (Withdrawn)` | Case đã rút; vẫn có artifact xác nhận quyết định                         |

## 5. Phân bố 393 case

| Nhóm                         | Số case |
| ---------------------------- | ------: |
| AUTH — Tài khoản/xác thực    |      21 |
| PET — Hồ sơ thú cưng         |      10 |
| WGT — Cân nặng               |      12 |
| VIS — Sổ y tế                |      10 |
| MS — Mốc y tế                |      16 |
| NTF — Nhắc nhở trong app     |      13 |
| RT — Việc chăm sóc hằng ngày |       9 |
| DSH — Dashboard              |       8 |
| GEN — Hành vi toàn hệ thống  |      15 |
| ANL — Analytics              |       8 |
| SOC — Bản tin ảnh thú cưng   |      46 |
| DB — Tích hợp DB/RLS/media   |      23 |
| CON — Hợp đồng API           |      10 |
| API — Xuyên suốt             |      16 |
| E2E — Hệ thống               |      26 |
| UAT — Chấp nhận theo story   |      50 |
| REG — Hồi quy                |      12 |
| PERF — Hiệu năng             |      12 |
| SEC — Bảo mật                |      22 |
| ACC — Accessibility          |      12 |
| UI — UI/UX                   |      14 |
| REL — Độ tin cậy             |       8 |
| OPS — Vận hành               |      10 |
| MNT — Bảo trì                |      10 |

Tổng: **168 case chức năng** (TC-*) + **225 case xuyên suốt** = **393**.

## 6. Cách dùng

| Việc                                                                           | Ở đâu                                                                |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Xem toàn bộ case, trạng thái, link hồ sơ                                       | [`INDEX.md`](INDEX.md)                                               |
| Quy trình chạy một case (chuẩn bị → quay video → chụp ảnh → report → kiểm tra) | [`RUNBOOK.md`](RUNBOOK.md)                                           |
| Mẫu report / result / case                                                     | [`_templates/`](_templates/)                                         |
| Sinh lại hồ sơ từ `Test_Cases.md`                                              | `node test_reports/_tools/generate-test-reports.mjs`                 |
| Kiểm tra artifact sau khi chạy                                                 | `node test_reports/_tools/check-artifacts.mjs`                       |
| Dữ liệu máy đọc                                                                | [`manifest.json`](manifest.json)                                     |
| Đặc tả gốc                                                                     | [`../docs/testing/Test_Cases.md`](../docs/testing/Test_Cases.md) §16 |
| Kế hoạch kiểm thử                                                              | [`../docs/testing/Test_Plan.md`](../docs/testing/Test_Plan.md) §11   |

## 7. Cần bạn cung cấp khi bắt đầu thực thi

| #   | Hạng mục                                            | Dùng cho                       | Ghi chú                                            |
| --- | --------------------------------------------------- | ------------------------------ | -------------------------------------------------- |
| 1   | Tài khoản test A, B, C đã xác minh email + mật khẩu | Hầu hết case UI/API/E2E/UAT    | Không dùng tài khoản thật; cấp qua biến môi trường |
| 2   | Hộp thư test nhận email xác minh/reset              | AUTH, E2E, UAT                 | Mailpit hoặc hộp thư test; cần quyền truy cập      |
| 3   | Quyền tạo/sửa/xóa dữ liệu test trên ENV-05          | CRUD, xóa, reset, SOC          | Xác nhận phạm vi được phép                         |
| 4   | `DATABASE_URL` read-only hoặc snapshot DB           | DB-01→DB-23, case kiểm dữ liệu | Không cấp quyền migration trên ENV-05              |
| 5   | Quyền xem log/CI/dashboard                          | OPS, REL, MNT                  | Hoặc ảnh chụp/export log                           |
| 6   | Phê duyệt chạy Lighthouse/k6                        | PERF-01→PERF-12                | Kèm khung giờ và ngưỡng                            |
| 7   | Phê duyệt kiểm thử bảo mật trong phạm vi            | SEC-01→SEC-22                  | Chỉ test trong phạm vi văn bản duyệt               |
| 8   | PO/người đại diện + lịch sign-off                   | UAT-001→UAT-079                | Cần xác nhận sau khi xem bằng chứng                |
| 9   | Xác nhận build/commit đang chạy trên ENV-05         | Mọi case                       | Để ghi vào report                                  |

Nếu thiếu hạng mục nào, case phụ thuộc sẽ được ghi `Blocked` kèm lý do — **không** suy ra `Pass`.

## 8. Nguyên tắc

1. Không đổi mã case, không gộp case, không bỏ bước.
2. Không đánh `Pass` khi thiếu ảnh/video/report/`result.json`.
3. Không dùng lại ảnh/video của case khác hoặc của lần chạy trước.
4. Không đưa mật khẩu, token, cookie, PII vào ảnh, video, report, log.
5. Case `Blocked`/`N/A` vẫn phải có report và bằng chứng tương ứng.
6. Sau mỗi lần chạy: cập nhật `INDEX.md` + `manifest.json` và chạy checker.
