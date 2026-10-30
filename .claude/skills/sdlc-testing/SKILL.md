---
name: sdlc-testing
description: Lập Test Plan (IEEE 829-2008) từ tài liệu yêu cầu + thiết kế + kế hoạch triển khai, sinh đặc tả test case có ma trận truy vết, tạo hồ sơ từng case trong test_reports/, rồi thực thi test theo test case, lưu bằng chứng (ảnh, video, log), report.md, result.json và báo cáo tổng hợp. Dùng khi người dùng muốn "testing", "test plan", "viết test case", "chạy test case", "test theo test case", "báo cáo test", hoặc bước 4 của quy trình SDLC. Tham số tùy chọn - "plan", "cases", "run <ID|nhóm>", "report".
---

# SDLC bước 4 — Kiểm thử: Test Plan → Test Cases → Thực thi → Test Reports

Chuỗi skill: `sdlc-requirements` → `sdlc-design` → `sdlc-implement` → **`sdlc-testing`**.

## Đầu vào / đầu ra

|     | Đường dẫn mặc định                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------- |
| Vào | `docs/requirements/{BRD,PRD,SRS}.md`, `docs/design/*`, `docs/implement/Implement_plan.md`, OpenAPI/mã nguồn |
| Ra  | `docs/testing/Test_Plan.md`                                                                                 |
|     | `docs/testing/Test_Cases.md`                                                                                |
|     | `test_reports/README.md`, `test_reports/manifest.json`, `test_reports/_templates/`                          |
|     | `test_reports/<ID>/{test-case.md, report.md, result.json, screenshots/, video/, logs/}`                     |
|     | `docs/testing/Test_Report_<chu-kỳ>.md` (báo cáo tổng hợp)                                                   |

## Chọn chế độ

- Chưa có `Test_Plan.md` → **A**. Chưa có `Test_Cases.md` → **B**. Chưa có `test_reports/` → **C**. Còn lại → **D** (thực thi) theo tham số, rồi **E**.
- Tham số `plan` / `cases` / `run <ID|tiền tố|all>` / `report` ghi đè.
- Sau A và B dừng cho người dùng duyệt trước khi sang bước sau.

## A — Test Plan (IEEE 829-2008)

Hướng dẫn chi tiết: [references/ieee829-test-plan-guide.md](references/ieee829-test-plan-guide.md). Cấu trúc:

- **Phần A — Phân tích đầu vào:** kiểm kê tài liệu (tên, phiên bản); trích FR, NFR, thành phần SAD, màn hình UI, endpoint API, story + AC; đánh giá rủi ro (khả năng × ảnh hưởng) để ưu tiên.
- **Phần B — 16 mục IEEE 829:** định danh · giới thiệu · hạng mục test · tính năng test / không test · cách tiếp cận (theo cấp: unit, integration, contract, API, E2E, UAT, regression, performance, security, accessibility, UI/UX, reliability, ops, maintainability) · tiêu chí đạt/không đạt · tạm dừng/tiếp tục · sản phẩm bàn giao · nhiệm vụ · môi trường (ENV-xx: URL, DB, dữ liệu, công cụ) · trách nhiệm · nhân sự · lịch · rủi ro · phê duyệt.
- Phụ lục: trạng thái launch gate, bằng chứng hiện có (kết quả test tự động gần nhất — ghi rõ môi trường của nó), đối chiếu IEEE 829.

## B — Test Cases (IEEE 29119-3)

`Test_Cases.md`:

1. **Quy ước mã:** `TC-<MOD>-<nn>` (chức năng, mỗi FR ≥1 case), `-N<n>` (âm), `-B<n>` (biên); `DB-`, `CON-`, `API-`, `E2E-`, `UAT-`, `REG-`, `PERF-`, `SEC-`, `ACC-`, `UI-`, `REL-`, `MNT-`, `OPS-`. Cấp: UT/IT/API/E2E/UI/UAT/SEC/PERF/ACC/OPS. Ưu tiên P0/P1/P2. Trạng thái: `Not Run` · `Pass` · `Fail` · `Blocked` · `N/A`.
2. **Mỗi case:** ID · tiêu đề · cấp · ưu tiên · truy vết (FR/NFR/US) · tiền điều kiện · dữ liệu test · các bước đánh số · kết quả mong đợi **cụ thể** (status code, mã lỗi, nội dung thông báo, trạng thái DB) · hậu điều kiện/dọn dẹp.
3. Mỗi FR có ít nhất 1 case dương; FR có kiểm tra đầu vào có case âm + biên; endpoint có tài nguyên theo chủ sở hữu có case IDOR (truy cập của người khác → 404).
4. UAT: mỗi story một case theo AC Given/When/Then.
5. **Ma trận truy vết** FR/NFR/US → case; liệt kê mục chưa có case (mục tiêu 100 %).
6. Hướng dẫn thực thi: môi trường, lệnh chạy bộ test tự động, cách điều khiển thời gian/dữ liệu.

## C — Hồ sơ từng case

Sinh bằng script (Python/Node), không viết tay từng thư mục:

- `test_reports/<ID>/test-case.md` theo [references/TEST_CASE_TEMPLATE.md](references/TEST_CASE_TEMPLATE.md), nội dung lấy từ Test_Cases.md.
- `test_reports/_templates/` chứa [REPORT_TEMPLATE.md](references/REPORT_TEMPLATE.md) và [result.json](references/result.json) (thay `<WEB_URL>`, `<API_BASE>`, `<Tên dự án>`).
- `test_reports/manifest.json`: `{project, environment, apiBase, generatedAt, source, total, executed, cases:[{id,title,type,level,priority,trace,source,status,folder,testCase,report}]}`.
- `test_reports/README.md`: tình trạng (số case, đã chạy, Pass/Fail/Blocked), môi trường, cấu trúc thư mục, quy định bằng chứng, bảng trạng thái.
- Thêm vào `.gitignore`: `test_reports/**/logs/tmp/`, `test_reports/**/logs/frames/`, thư mục công cụ tạm.

## D — Thực thi

**Trước khi chạy:** xác nhận môi trường đích (dev/staging/prod) với người dùng. Trên môi trường dùng chung/production: chỉ dùng tài khoản test, **không** chạy migration/rollback, load test, quét bảo mật chủ động, xóa diện rộng khi chưa được cho phép.

Với mỗi case (theo ưu tiên P0 → P1 → P2):

1. Đọc `test-case.md`, chuẩn bị tiền điều kiện và dữ liệu (tên/email có hậu tố run-id để không đụng nhau).
2. Thực hiện từng bước bằng công cụ phù hợp:
   - UI/E2E/UAT/ACC: Playwright (script trong `test_reports/_tools/`, đã gitignore) — bật `recordVideo` (≥1280×720), chụp `screenshots/01-initial.png`, `NN-step-NN.png` mỗi bước, `NN-final.png`; lưu console + network log; axe cho a11y.
   - API/CON/SEC: HTTP client (curl/fetch), lưu request/response vào `logs/http.log` (che token, cookie, mật khẩu).
   - DB/REG/MNT/OPS: chạy lệnh/bộ test, lưu output vào `logs/`.
3. Ghi **thực tế quan sát được** (nguyên văn status, thông báo), so với kỳ vọng → Pass/Fail từng bước.
4. Viết `report.md` + `result.json` theo template; `verdict`:
   - `Pass` chỉ khi mọi bước Pass **và** có đủ bằng chứng tạo ra trong lần chạy này.
   - `Fail` kèm defect `BUG-xxx` (severity S1–S4, bước tái hiện, evidence).
   - `Blocked` kèm `notRunReason` (thiếu quyền/dữ liệu/môi trường gì, ai cấp).
5. Mở lại ảnh để kiểm tra đọc được và không lộ PII/secret.
6. Cập nhật `status` trong `manifest.json` và bảng tình trạng trong `test_reports/README.md`.

**Không bao giờ** đánh Pass dựa vào kết quả môi trường khác, tài liệu, hay suy luận. Không sửa code ứng dụng trong lúc test; lỗi tìm thấy ghi defect và báo người dùng (họ quyết định sửa qua `sdlc-implement`).

Nhiều case: gom theo nhóm, chạy tuần tự trong một script Playwright dùng chung đăng nhập; báo tiến độ sau mỗi nhóm.

## E — Báo cáo tổng hợp

`docs/testing/Test_Report_<chu-kỳ>.md`: tổng hợp theo nhóm (tổng/Pass/Fail/Blocked/Not Run), danh sách defect theo severity, trạng thái launch gate, phạm vi chưa chạy + lý do, kết luận (đạt/không đạt tiêu chí phát hành) và đề xuất.

Commit: test_reports có thể rất nhiều file — chia commit theo nhóm tiền tố để tránh lỗi hook "command line too long"; không `--no-verify`; chỉ push khi người dùng yêu cầu.
