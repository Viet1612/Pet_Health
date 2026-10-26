# Kiểm thử — Pet Health

Thư mục này chứa bộ tài liệu kiểm thử của dự án Pet Health, soạn theo **IEEE 829-2008** (Test Plan) và **IEEE 29119-3** (Test Case), bám sát baseline yêu cầu ngày **2026-10-26**.

## Tài liệu

| Tệp | Mã | Nội dung | Dùng khi nào |
|---|---|---|---|
| [Test_Plan.md](Test_Plan.md) | PH-MTP-001 | Master Test Plan: phân tích đầu vào, 20 rủi ro, 16 mục IEEE 829, lịch 4 tuần + S7, nguồn lực, gate dashboard | Cần hiểu **chiến lược, phạm vi, tiêu chí đạt, lịch, trách nhiệm** |
| [Test_Cases.md](Test_Cases.md) | PH-TC-001 | Đặc tả test case theo FR/NFR/API/UI + UAT 50 story + ma trận truy vết + hướng dẫn chạy + §16 hồ sơ thực thi | Cần **thực thi**, kiểm case nào phủ yêu cầu nào |
| [../../test_reports/README.md](../../test_reports/README.md) | — | Hồ sơ thực thi từng case: danh mục 393 case, cấu trúc artifact, trạng thái, việc cần cấp | Cần **chạy case** và lưu report/ảnh/video |
| [../../test_reports/RUNBOOK.md](../../test_reports/RUNBOOK.md) | — | Quy trình chạy một case: chuẩn bị, chụp ảnh, quay video, viết report, kiểm artifact | Cần quy trình từng bước cho agent/QA |
| [testPlan_prompt.md](testPlan_prompt.md) | — | Prompt gốc yêu cầu sinh tài liệu | Tham chiếu cấu trúc |

## Tình trạng tại 2026-10-26

| Hạng mục | Kết quả |
|---|---|
| Yêu cầu chức năng | **141 FR** (61 P0, 79 P1, 1 P2) — 141/141 có test case |
| Yêu cầu phi chức năng | **41 còn hiệu lực** (3 đã rút: NFR-REL-002/004/005) — 41/41 có case hoặc quyết định chấp nhận |
| User story | **50** (40 GĐ1 + 10 GĐ2) — 50/50 có UAT |
| API operation | **86** trên 62 path — 86/86 có case |
| Launch gate | **18** — 7 đạt trên dev, 4 một phần, 1 chưa đo, 4 pending, 2 withdrawn. **6** Phase 2 — 4 đạt, 1 một phần, 1 pending |
| Test case đã đặc tả | **393 ID** (168 chức năng + 225 xuyên suốt) |
| Hồ sơ thực thi | **393/393** case có `test_reports/<ID>/test-case.md`; **0** case đã chạy, **0** có bằng chứng |

**Môi trường hiện có:** **ENV-05** — môi trường test công khai `https://pet.vietdeptrai.io.vn/` (API `/api/v1`, `healthz`/`readyz` = 200) dùng cho thực thi có bằng chứng; dev local, CI GitHub Actions, E2E local (Playwright + FakeClock + Mailpit). **Chưa có** staging riêng, Cloudflare R2, SMTP Gmail, thiết bị thật, load test, Lighthouse, ZAP.

**Bằng chứng baseline (lịch sử, chưa chạy lại trong tài liệu này):** unit 209 Pass · IDOR 136/136 · E2E 72/72 · axe 0 serious/critical trên 14 màn · bundle 136,5 KB gzip. Baseline này **không** thay thế bằng chứng ENV-05.

## Đọc nhanh theo vai trò

- **PO/Chủ dự án:** [Test_Plan §7 Tiêu chí đạt](Test_Plan.md#7-tiêu-chí-đạtkhông-đạt-57) → [Phụ lục A gate](Test_Plan.md#phụ-lục-a--bảng-trạng-thái-launch-gate-tại-2026-10-26) → [Test_Cases §14.5](Test_Cases.md#145-gate--bằng-chứng) → [§15.7 trạng thái](Test_Cases.md#157-trạng-thái-hiện-tại-và-tổng-hợp-phủ-2026-10-26).
- **Dev:** [Test_Plan §6 Cách tiếp cận](Test_Plan.md#6-cách-tiếp-cận-56) → [Test_Cases §15 Hướng dẫn chạy](Test_Cases.md#15-hướng-dẫn-thực-thi) → case theo mô-đun ở §2–13.
- **QA:** [Test_Cases §14 Ma trận](Test_Cases.md#14-ma-trận-truy-vết) → chạy theo §15.4 → ghi báo cáo theo §15.5 → lưu artifact theo [RUNBOOK](../../test_reports/RUNBOOK.md) và [§16](Test_Cases.md#16-hồ-sơ-thực-thi-từng-test-case).
- **Reviewer bảo mật:** [Test_Cases §10](Test_Cases.md#10-test-case-bảo-mật-sec-01sec-22) + [Test_Plan §5](Test_Plan.md#5-tính-năng-không-kiểm-thử-55).

## Quy ước ID

| Tiền tố | Nghĩa |
|---|---|
| `FR-<MOD>-<nn>` / `NFR-<NHÓM>-<nn>` | Yêu cầu chức năng / phi chức năng (SRS) |
| `TC-<MOD>-<nn>` | Test case chức năng theo FR; hậu tố `-N#` âm, `-B#` biên |
| `DB`, `CON`, `API`, `E2E`, `UAT`, `REG`, `PERF`, `SEC`, `ACC`, `UI`, `REL`, `OPS`, `MNT` | Test case xuyên suốt theo cấp độ/loại |
| `G-1→G-18`, `FG-1→FG-6` | Launch gate GĐ1 / Phase 2 |
| `RSK-01→20`, `RSK-T01→15` | Rủi ro sản phẩm / rủi ro thực thi test |

## Nguyên tắc cập nhật

1. Thay đổi FR/NFR phải cập nhật **SRS trước**, rồi test case + ma trận.
2. Thay đổi API phải cập nhật `openapi.yaml`, chạy contract, rồi ma trận §14.4.
3. Không xóa case đã chạy — đánh dấu `Retired` kèm lý do.
4. Test không chạy được vì thiếu môi trường ghi **Pending/Blocked**, không suy ra Pass.
5. Mỗi chu kỳ cập nhật báo cáo theo mẫu §15.5 và Phụ lục B của Test_Plan; artifact của từng case nằm trong `test_reports/<ID>/` (report + ảnh + video + `result.json`).

## Việc còn mở trước khi phát hành

- Thực thi 393 case trên ENV-05 và lưu đủ report + ảnh + video trong `test_reports/<ID>/` (0/393 đã chạy).
- Đo lại coverage (G-2) và chạy Lighthouse/k6 (G-6, G-7).
- Bổ sung axe cho 11 màn còn lại + trạng thái động (FG-3).
- Kiểm bàn phím/screen reader (NFR-USA-002).
- Dựng staging/production, R2, SMTP Gmail, thiết bị thật, ZAP (S7).
- Rà soát pháp lý dữ liệu cá nhân (NFR-SEC-012).
