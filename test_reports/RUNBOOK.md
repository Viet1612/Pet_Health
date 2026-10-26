# RUNBOOK — Chạy một test case có bằng chứng

> **Đối tượng:** agent/QA thực thi test case Pet Health.
> **Môi trường:** https://pet.vietdeptrai.io.vn/ · API `https://pet.vietdeptrai.io.vn/api/v1`
> **Nguyên tắc bất biến:** không có ảnh + video + report + `result.json` thì **không** có verdict `Pass`.

## 0. Kết quả cần đạt

Chạy một case `<ID>` và để lại trong `test_reports/<ID>/`:

```text
test-case.md                     # đã có sẵn, không sửa nội dung gốc
report.md                        # verdict + actual + evidence + defect
result.json                      # metadata máy đọc
screenshots/01-initial.png       # trước bước 1
screenshots/NN-step-NN.png       # sau mỗi bước
screenshots/NN-final.png         # sau bước cuối
video/recording.webm | .mp4      # quay liên tục cả case
logs/                            # console/network/HTTP/DB (tùy case)
```

## 1. Preflight

- [ ] Đọc `test_reports/<ID>/test-case.md` từ đầu đến cuối, gồm §3 tiền điều kiện, §5 bước, §5.2 kỳ vọng, §6 nhiệm vụ, §7 bằng chứng, §10 cần cấp.
- [ ] Kiểm môi trường: mở `https://pet.vietdeptrai.io.vn/`; gọi `GET https://pet.vietdeptrai.io.vn/api/v1/healthz` và `readyz` — cả hai phải `200 {"status":"ok"}`.
- [ ] Xác nhận trang chưa đăng nhập chuyển tới `/login?next=%2F`; đăng nhập bằng tài khoản test được cấp.
- [ ] Tạo thư mục còn thiếu: `screenshots/`, `video/`, `logs/` trong `test_reports/<ID>/`.
- [ ] Kiểm công cụ chụp ảnh/quay video; đặt cửa sổ trình duyệt hiển thị (một số harness chỉ chụp được tab đang focus/visible).
- [ ] Ghi lại: thời điểm bắt đầu (ISO-8601 + `+07:00`), trình duyệt/phiên bản, viewport, build/commit nếu thấy.
- [ ] Với case cần dữ liệu đặc biệt (DB, seed SD-011, fixture ảnh, FakeClock): chuẩn bị trước khi bắt đầu quay.

**Dừng ngay và ghi `Blocked`** nếu thiếu tài khoản/quyền/môi trường/dữ liệu. Không tự tạo tài khoản thật, không dùng dữ liệu người khác.

## 2. Bắt đầu quay video

Video phải là **bản ghi liên tục toàn bộ quá trình**, không phải ảnh ghép/slideshow. Bắt đầu quay **trước** ảnh `01-initial.png` và bước 1.

### Cách A — Playwright (khuyến nghị cho case UI/E2E)

```ts
// e2e/playwright.config.ts (hoặc config riêng cho lần chạy)
use: {
  video: 'on',
  screenshot: 'on',
  trace: 'retain-on-failure',
  viewport: { width: 1280, height: 720 },
}
```

Sau test, lưu video vào đúng thư mục:

```ts
await page.video()?.saveAs(`test_reports/${caseId}/video/recording.webm`);
```

Với bộ test có sẵn, có thể chạy:

```bash
pnpm e2e --grep "@<tag>"   # hoặc spec tương ứng trong test-case.md §2 "File"
```

Sau đó đổi tên/copy video Playwright vào `test_reports/<ID>/video/`.

### Cách B — Trình duyệt có harness ghi hình

Nếu harness có tool quay video/desktop: bật ghi hình toàn cửa sổ, hiển thị con trỏ, độ phân giải ≥1280×720, bắt đầu trước bước 1.

### Cách C — Quay màn hình hệ điều hành

- Windows: OBS Studio (Screen Capture) hoặc `ffmpeg -f gdigrab -framerate 30 -i desktop -c:v libx264 -pix_fmt yuv420p video/recording.mp4`.
- macOS: QuickTime Player → New Screen Recording.
- Linux: OBS/`ffmpeg -f x11grab`.

Không dùng ảnh tĩnh ghép thành video; không cắt bỏ đoạn lỗi.

## 3. Chụp ảnh

| Ảnh                | Thời điểm         | Nội dung bắt buộc                                                                 |
| ------------------ | ----------------- | --------------------------------------------------------------------------------- |
| `01-initial.png`   | Trước bước 1      | URL/terminal, tài khoản đang dùng (che PII), dữ liệu ban đầu, thời điểm           |
| `02-step-01.png` … | Ngay sau mỗi bước | Kết quả quan sát được: trạng thái, thông báo, status/mã lỗi, dữ liệu sau thao tác |
| `NN-final.png`     | Sau bước cuối     | Trạng thái cuối + kết quả đối chiếu kỳ vọng                                       |

Quy tắc:

- Đánh số 2 chữ số, tăng dần; `NN` của ảnh cuối = số bước + 2.
- Chụp **full page** cho màn hình dài; chụp thêm vùng kết quả nếu chữ nhỏ.
- Case API: chụp request + response (status, header, body) — che `Authorization`, cookie, token.
- Case DB: chụp câu lệnh + kết quả; che chuỗi kết nối/mật khẩu.
- Case lỗi: chụp cả thông báo lỗi **và** URL/terminal để chứng minh ngữ cảnh.
- Không che mất phần cần kiểm; không dùng ảnh của case khác.

## 4. Thực thi và ghi actual

- Làm đúng thứ tự và đủ số bước trong `test-case.md` §5.1; không rút gọn, không bỏ bước khó.
- Sau mỗi bước ghi ngay: thao tác, quan sát thực tế (nguyên văn thông báo/status), thời điểm, ảnh tương ứng.
- Case dùng `FakeClock`: ghi T0 và các mốc đã đặt; case email: xóa hộp thư trước khi bắt đầu.
- Case IDOR: dùng tài khoản B gọi ID của A; xác nhận dữ liệu A không đổi.
- Nếu thao tác phụ (chuẩn bị dữ liệu) không thuộc kịch bản, ghi vào `logs/` và nêu trong report, không tính là bước.

## 5. Kết thúc và kiểm media

- [ ] Dừng quay **sau** khi đã chụp ảnh cuối và kiểm tra kết quả.
- [ ] Mở lại video: thấy con trỏ, URL/terminal, toàn bộ thao tác; không đen/không hỏng.
- [ ] Mở lại từng ảnh: đọc được, đúng thứ tự, không lộ secret/PII.
- [ ] Đếm ảnh: `>= số bước + 2` (case withdrawn: 2 ảnh).
- [ ] Kiểm dung lượng: ảnh không vượt giới hạn lưu trữ; video không quá lớn gây khó mở (nếu >10 phút, chia phần liên tục).

## 6. Viết `report.md`

Dùng [`_templates/REPORT_TEMPLATE.md`](_templates/REPORT_TEMPLATE.md). Bắt buộc:

- Verdict + lý do.
- Bảng actual từng bước, đối chiếu §5.2.
- Bảng evidence trỏ đúng file.
- Defect (nếu có): ID, severity, mô tả, bước tái hiện, evidence.
- Người chạy, thời gian bắt đầu/kết thúc, build/trình duyệt.

## 7. Viết `result.json`

Dùng [`_templates/result.json`](_templates/result.json). Lưu ý:

- `verdict` chỉ nhận `Pass`, `Fail`, `Blocked`, `N/A (Withdrawn)`.
- `evidence.screenshots` / `video` / `logs` là đường dẫn **tương đối trong thư mục case**.
- Mỗi bước có `result` và `evidence` riêng.
- `startedAt`/`finishedAt`/`updatedAt` theo ISO-8601 kèm múi giờ.

## 8. Cập nhật danh mục

1. `test_reports/INDEX.md`: đổi trạng thái case, thêm link tới `report.md` trong thư mục case.
2. `test_reports/manifest.json`: cập nhật `status`, `report`, `screenshots`, `video` cho case.3. Không sửa `test-case.md` gốc trừ khi đặc tả sai; nếu đặc tả sai, ghi rõ trong report và báo PO.

## 9. Chạy checker

```bash
node test_reports/_tools/check-artifacts.mjs            # toàn bộ
node test_reports/_tools/check-artifacts.mjs --id TC-AUTH-001
```

Checker kiểm: `report.md`, `result.json`, verdict hợp lệ, đủ số ảnh tối thiểu, có video, file evidence tồn tại, case `Pass` không còn defect S1/S2 mở. Kết quả `FAIL` phải sửa trước khi báo cáo.

## 10. Case `Blocked` và case withdrawn

### Blocked

- Vẫn tạo `report.md` + `result.json` với `verdict: "Blocked"`.
- Chụp 1 ảnh `01-initial.png` chứng minh đã mở môi trường (hoặc thông báo thiếu quyền) và quay video ngắn thao tác kiểm tra.
- Ghi rõ thiếu gì, ai cấp, có thể chạy lại khi nào. Không cần đủ ảnh từng bước.

### Withdrawn (`OPS-08`, `OPS-09`)

- **Không thực thi kịch bản**, không thao tác trên ENV-05.
- Chụp `01-decision.png` (dòng quyết định trong `docs/testing/Test_Cases.md`) và `02-case-folder.png` (INDEX/hồ sơ hiển thị `N/A`).
- Quay `video/withdrawn-confirmation.webm` dài 10–30 giây mở tài liệu, thấy mã case.
- Report verdict `N/A (Withdrawn)`, căn cứ + mã quyết định (`DEC-xxx`).

## 11. Xử lý sự cố thường gặp

| Hiện tượng                      | Cách xử lý                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Chụp ảnh lỗi "cần tab hiển thị" | Focus tab, đưa cửa sổ trình duyệt lên trước, không thu nhỏ; thử lại                                                             |
| Ảnh đen/trắng                   | Tắt chế độ headless hoặc dùng Playwright `screenshot`; kiểm GPU/driver                                                          |
| Video không có con trỏ          | Bật "capture cursor" trong OBS/ffmpeg; dùng Playwright video                                                                    |
| Video quá ngắn/thiếu đoạn đầu   | Quay lại từ trước bước 1; không cắt ghép                                                                                        |
| Tiếng Việt trong file bị lỗi    | Ghi file UTF-8; kiểm bằng `node -e "console.log(fs.readFileSync(...))"`; không dùng PowerShell `Get-Content` làm nguồn xác nhận |
| `healthz` không 200             | Ghi `Blocked`, báo môi trường down; không tiếp tục các bước                                                                     |
| Thiếu tài khoản giữa chừng      | Dừng, ghi `Blocked`, giữ video/ảnh đã có                                                                                        |

## 12. An toàn và dọn dẹp

- Chỉ dùng tài khoản/dữ liệu test; che PII/secret trong mọi artifact.
- Không chạy migration/rollback, load test, quét bảo mật chủ động trên ENV-05 khi chưa được duyệt.
- Dọn dữ liệu test sau khi đã chụp đủ bằng chứng (nếu được phép); không xóa dữ liệu của người khác.
- Không commit video/ảnh chứa dữ liệu nhạy cảm lên kho công khai.

## 13. Definition of Done

Một case chỉ được báo `Pass` khi tất cả đúng:

- [ ] Đã thực hiện đủ số bước, không bỏ qua.
- [ ] Mọi quan sát khớp kỳ vọng §5.2.
- [ ] Đủ `số bước + 2` ảnh, đúng tên, đọc được, không lộ secret.
- [ ] Có video liên tục, mở được, thấy toàn bộ quá trình.
- [ ] `report.md` có verdict + actual + evidence + người chạy/thời gian.
- [ ] `result.json` hợp lệ, evidence trỏ đúng file.
- [ ] `INDEX.md` và `manifest.json` đã cập nhật.
- [ ] `node test_reports/_tools/check-artifacts.mjs --id <ID>` trả `OK`.
