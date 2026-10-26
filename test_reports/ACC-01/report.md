# Report — `ACC-01` — axe quét 25 màn ở trạng thái có dữ liệu (phone 390×844 + tablet 834×1112)

> **Mã case:** `ACC-01` · **Loại:** Accessibility · **Cấp:** ACC · **Ưu tiên:** P1
> **Verdict:** `Fail`
> **Môi trường:** `https://pet.vietdeptrai.io.vn/` · **API:** `https://pet.vietdeptrai.io.vn/api/v1`
> **Build/commit:** không xác định (ENV-05 không công bố mã build) · **Trình duyệt:** Chromium (Playwright 1.64.1), headless, DPR 2
> **Bắt đầu:** `2026-10-26T16:41:53+07:00` · **Kết thúc:** `2026-10-26T16:47:00+07:00` (5.1 phút)
> **Người chạy:** agent OpenCode (theo yêu cầu người dùng) · **Ngày viết report:** 2026-10-26

## 1. Tóm tắt

- **Kết quả:** Không đạt — 4 vi phạm serious/critical (2 nguyên nhân × 2 viewport) cần xử lý (xem §5).
- **Số bước đã thực hiện:** 1/1 (bước 1 = quét axe 25 màn × 2 viewport)
- **Bằng chứng:** 55 ảnh · 1 video · 7 log
- **Tổng vi phạm axe:** 2 critical · 2 serious · 0 moderate · 0 minor trên 52 lượt quét
- **Defect mới:** ACC-01-D1, ACC-01-D2
- **Ảnh hưởng phạm vi:** chặn tiêu chí NFR-USA-002 trên màn bị vi phạm

## 2. Điều kiện thực tế khi chạy

| Hạng mục                                | Giá trị                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL quan sát được                       | `https://pet.vietdeptrai.io.vn/` (đúng ENV-05; `healthz`/`readyz` = 200 `{"status":"ok"}` kiểm trước khi chạy)                                                                                                                                                                                                                                              |
| Tài khoản dùng                          | Tài khoản A — hồ sơ `@melody`, email đã che; tài khoản B — hồ sơ `@melody1` chỉ dùng tạo dữ liệu tương tác                                                                                                                                                                                                                                                  |
| Dữ liệu tạo trong run                   | Thú cưng "Kem" (`01a17752-ae65-71de-8713-bcf70932e767`); 1 lần khám `01a17793-47e3-76d3-85a0-29301aa78d5f` (2026-10-20, 2 ảnh); 1 mốc quá hạn + 2 mốc sắp tới + 1 mốc đã thực hiện; 2 việc hằng ngày; bài viết A `01a17758-db38-782e-9a77-6ebbef3ca761` (5 ảnh), bài viết B `01a17793-6e7d-7751-9d04-b23321166c59`; B thích + bình luận bài A; A theo dõi B |
| Thời điểm / múi giờ                     | 2026-10-26, Asia/Ho_Chi_Minh (+07:00); dùng ngày thật vì ENV-05 không có test clock (`/api/v1/__test/clock` → 404)                                                                                                                                                                                                                                          |
| Ghi chú môi trường                      | Không có Mailpit/hộp thư test trên ENV-05 → SCR-04/SCR-05 quét ở trạng thái **token không hợp lệ**; SCR-17 không có thông báo nhắc lịch tại thời điểm chạy (worker chưa sinh) → quét empty state                                                                                                                                                            |
| Công cụ                                 | axe-core qua `@axe-core/playwright` (tag `wcag2a, wcag2aa, wcag21a, wcag21aa`); ảnh `page.screenshot` (full page) + caption URL/thời điểm; video = bản ghi liên tục CDP screencast của đúng phiên chạy                                                                                                                                                      |
| Nhiễu harness (không phải lỗi sản phẩm) | Script chèn con trỏ mô phỏng chạy trước khi có `document.documentElement` nên `logs/console.log` có `pageerror: Cannot read properties of null (reading 'appendChild')` ở mỗi lần điều hướng; ngoài ra CSP của app chặn script Cloudflare Insights. Cả hai không ảnh hưởng axe/ảnh/video.                                                                   |
| Dữ liệu test còn lại                    | Giữ nguyên trên ENV-05 để tái dùng cho ACC-02→ACC-12 (ID đầy đủ trong `logs/data-setup.json`). Dọn khi không cần: `node test_reports/_tools/acc01/cleanup-data.mjs --apply` (mặc định chỉ liệt kê, không xoá).                                                                                                                                              |

## 3. Kết quả từng bước

| #   | Hành động                                                                 | Kỳ vọng                                                 | Thực tế                                                                                                                                                                                                                                     | Kết quả | Evidence                                                           |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| 1   | axe quét 25 màn ở trạng thái có dữ liệu (phone 390×844 + tablet 834×1112) | 0 vi phạm serious/critical; minor ghi nhận + quyết định | Đã quét 52 lượt = 26 route × 2 viewport trên tài khoản A có dữ liệu. Kết quả: 2 critical, 2 serious — button-name @ SCR-12; link-name @ SCR-23 (mỗi rule xuất hiện ở cả 2 viewport). Không có màn nào lỗi tải (axe chạy được ở cả 52 lượt). | Fail    | `screenshots/02-step-01.png`, `logs/axe-summary.html`, `logs/axe/` |

### 3.1 Chi tiết theo màn hình (số rule vi phạm; C=critical, S=serious, M=moderate, m=minor)

| Mã      | Màn hình                              | Phone 390×844         | Tablet 834×1112       | Ảnh                                                                |
| ------- | ------------------------------------- | --------------------- | --------------------- | ------------------------------------------------------------------ |
| SCR-01  | Đăng nhập                             | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-01-phone.png` · `screenshots/SCR-01-tablet.png`   |
| SCR-02  | Đăng ký                               | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-02-phone.png` · `screenshots/SCR-02-tablet.png`   |
| SCR-03  | Quên mật khẩu                         | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-03-phone.png` · `screenshots/SCR-03-tablet.png`   |
| SCR-04  | Đặt lại mật khẩu (token không hợp lệ) | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-04-phone.png` · `screenshots/SCR-04-tablet.png`   |
| SCR-05  | Xác minh email (token không hợp lệ)   | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-05-phone.png` · `screenshots/SCR-05-tablet.png`   |
| SCR-06  | Tổng quan                             | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-06-phone.png` · `screenshots/SCR-06-tablet.png`   |
| SCR-07  | Danh sách thú cưng                    | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-07-phone.png` · `screenshots/SCR-07-tablet.png`   |
| SCR-08  | Hồ sơ thú cưng                        | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-08-phone.png` · `screenshots/SCR-08-tablet.png`   |
| SCR-09  | Tạo thú cưng                          | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-09-phone.png` · `screenshots/SCR-09-tablet.png`   |
| SCR-09b | Sửa thú cưng (cùng màn SCR-09)        | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-09b-phone.png` · `screenshots/SCR-09b-tablet.png` |
| SCR-10  | Sức khỏe — Cân nặng                   | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-10-phone.png` · `screenshots/SCR-10-tablet.png`   |
| SCR-11  | Sức khỏe — Sổ y tế                    | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-11-phone.png` · `screenshots/SCR-11-tablet.png`   |
| SCR-12  | Chi tiết bản ghi khám                 | **1C / 0S / 0M / 0m** | **1C / 0S / 0M / 0m** | `screenshots/SCR-12-phone.png` · `screenshots/SCR-12-tablet.png`   |
| SCR-13  | Tạo bản ghi khám                      | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-13-phone.png` · `screenshots/SCR-13-tablet.png`   |
| SCR-14  | Lịch mốc y tế                         | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-14-phone.png` · `screenshots/SCR-14-tablet.png`   |
| SCR-15  | Chi tiết mốc                          | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-15-phone.png` · `screenshots/SCR-15-tablet.png`   |
| SCR-16  | Việc hằng ngày                        | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-16-phone.png` · `screenshots/SCR-16-tablet.png`   |
| SCR-17  | Thông báo — Nhắc lịch                 | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-17-phone.png` · `screenshots/SCR-17-tablet.png`   |
| SCR-18  | Cài đặt tài khoản                     | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-18-phone.png` · `screenshots/SCR-18-tablet.png`   |
| SCR-19  | Bản tin                               | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-19-phone.png` · `screenshots/SCR-19-tablet.png`   |
| SCR-20  | Soạn bài                              | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-20-phone.png` · `screenshots/SCR-20-tablet.png`   |
| SCR-21  | Tìm người                             | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-21-phone.png` · `screenshots/SCR-21-tablet.png`   |
| SCR-22  | Hồ sơ công khai                       | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-22-phone.png` · `screenshots/SCR-22-tablet.png`   |
| SCR-23  | Chi tiết bài                          | **0C / 1S / 0M / 0m** | **0C / 1S / 0M / 0m** | `screenshots/SCR-23-phone.png` · `screenshots/SCR-23-tablet.png`   |
| SCR-24  | Danh sách theo dõi                    | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-24-phone.png` · `screenshots/SCR-24-tablet.png`   |
| SCR-25  | Thông báo — Hoạt động                 | 0C / 0S / 0M / 0m     | 0C / 0S / 0M / 0m     | `screenshots/SCR-25-phone.png` · `screenshots/SCR-25-tablet.png`   |

> 26 route = 25 màn SCR-01→SCR-25 + `/pets/:petId/edit` (SCR-09b, cùng form với SCR-09). Mỗi lượt quét ghi JSON đầy đủ (rule, impact, node, selector) tại `logs/axe/<màn>-<viewport>.json`.

## 4. Bằng chứng

| #   | Loại         | Tập                                                                                                                                                     | Mô tả                                                                                                                                             | Thời điểm         |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | Ảnh ban đầu  | `screenshots/01-initial.png`                                                                                                                            | Dashboard sau khi đăng nhập tài khoản A, trước khi quét (có caption URL + thời điểm, email đã làm mờ)                                             | 16:41:53          |
| 2   | Ảnh bước 1   | `screenshots/02-step-01.png`                                                                                                                            | Bảng tổng hợp kết quả axe 26 route × 2 viewport (trang `logs/axe-summary.html`)                                                                   | 16:47:00          |
| 3   | Ảnh cuối     | `screenshots/03-final.png`                                                                                                                              | Màn cuối của lượt quét tablet (SCR-25) sau khi hoàn tất                                                                                           | 16:47:00          |
| 4   | Ảnh chi tiết | `screenshots/SCR-xx-{phone,tablet}.png` (52 ảnh)                                                                                                        | Ảnh full page từng màn ở từng viewport, caption kèm URL/thời điểm                                                                                 | 16:41:53–16:47:00 |
| 5   | Video        | `video/recording.mp4`                                                                                                                                   | Bản ghi liên tục toàn bộ phiên chạy (screencast CDP, 1440×1920, có caption mã màn + URL theo từng màn), từ trước bước 1 đến khi xem bảng tổng hợp | 16:41:53–16:47:00 |
| 6   | Log          | `logs/axe/*.json`, `logs/axe-summary.html`, `logs/axe-summary.md`, `logs/scan-results.json`, `logs/run.log`, `logs/console.log`, `logs/data-setup.json` | Kết quả axe từng lượt + console/network + dữ liệu test đã tạo                                                                                     | —                 |

**Kiểm tra:** đã mở lại ảnh và video, đọc được, không lộ mật khẩu/token/PII (email bị làm mờ bằng CSS trước khi chụp/ghi hình): **Có**.

## 5. Defect

| ID        | Severity | Mô tả                                                                                                                                                                                                                                                                                                         | Bước tái hiện                                                                                                                                                                                                                 | Evidence                                                                                                                                                                                              | Trạng thái |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| ACC-01-D1 | S1       | [SCR-12 Chi tiết bản ghi khám] button-name: Buttons must have discernible text — 2 node/viewport, cả phone + tablet · nguyên nhân gốc: apps/web/src/features/photos/PhotoGrid.tsx:38 truyền alt="" cho ServerPhotoTile có onOpen → PhotoTile.tsx:51 bọc ảnh trong <button className="size-full"> không có tên | 1) Đăng nhập tài khoản A 2) Mở https://pet.vietdeptrai.io.vn/visits/01a17793-47e3-76d3-85a0-29301aa78d5f ở viewport 390×844 và 834×1112 3) Chạy axe-core WCAG 2.1 A/AA → rule button-name (critical) trên 2 node mỗi viewport | [SCR-12-phone.png](screenshots/SCR-12-phone.png) [SCR-12-tablet.png](screenshots/SCR-12-tablet.png) [SCR-12-phone.json](logs/axe/SCR-12-phone.json) [SCR-12-tablet.json](logs/axe/SCR-12-tablet.json) | Open       |
| ACC-01-D2 | S2       | [SCR-23 Chi tiết bài] link-name: Links must have discernible text — 3 node/viewport, cả phone + tablet · nguyên nhân gốc: apps/web/src/features/social/CommentsPanel.tsx:57 bọc UserAvatar (chỉ có <span aria-hidden="true">) trong <Link> không có tên truy cập được                                         | 1) Đăng nhập tài khoản A 2) Mở https://pet.vietdeptrai.io.vn/p/01a17758-db38-782e-9a77-6ebbef3ca761 ở viewport 390×844 và 834×1112 3) Chạy axe-core WCAG 2.1 A/AA → rule link-name (serious) trên 3 node mỗi viewport         | [SCR-23-phone.png](screenshots/SCR-23-phone.png) [SCR-23-tablet.png](screenshots/SCR-23-tablet.png) [SCR-23-phone.json](logs/axe/SCR-23-phone.json) [SCR-23-tablet.json](logs/axe/SCR-23-tablet.json) | Open       |

### 5.1 Chi tiết vi phạm serious/critical

| Màn    | Viewport | Rule        | Impact   | Số node | Selector (tối đa 3)                                                                                                                                                                            |
| ------ | -------- | ----------- | -------- | ------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SCR-12 | phone    | button-name | critical |       2 | `.size-\[76px\].overflow-hidden.xl\:size-\[96px\]:nth-child(1) > .size-full`, `.size-\[76px\].overflow-hidden.xl\:size-\[96px\]:nth-child(2) > .size-full`                                     |
| SCR-23 | phone    | link-name   | serious  |       3 | `.gap-x-3.flex-wrap:nth-child(1) > .shrink-0[href$="melody1"]`, `.gap-x-3.flex-wrap:nth-child(2) > .shrink-0[href$="melody1"]`, `.gap-x-3.flex-wrap:nth-child(3) > .shrink-0[href$="melody1"]` |
| SCR-12 | tablet   | button-name | critical |       2 | `.size-\[76px\].overflow-hidden.xl\:size-\[96px\]:nth-child(1) > .size-full`, `.size-\[76px\].overflow-hidden.xl\:size-\[96px\]:nth-child(2) > .size-full`                                     |
| SCR-23 | tablet   | link-name   | serious  |       3 | `.gap-x-3.flex-wrap:nth-child(1) > .shrink-0[href$="melody1"]`, `.gap-x-3.flex-wrap:nth-child(2) > .shrink-0[href$="melody1"]`, `.gap-x-3.flex-wrap:nth-child(3) > .shrink-0[href$="melody1"]` |

## 6. Đối chiếu kỳ vọng

- **Kỳ vọng nguồn (test-case.md §5.2):** 0 vi phạm serious/critical; các vi phạm minor được ghi + quyết định.
- **Kết luận đối chiếu:** không khớp ở 4 lượt quét thuộc 2 nguyên nhân (xem §5.1).
- **Vi phạm minor/moderate:** không có.
- **Giới hạn độ phủ trạng thái (không phải defect):** SCR-04 và SCR-05 chỉ quét được trạng thái token không hợp lệ/hết hạn (không có hộp thư inbound trên ENV-05 để lấy token thật); SCR-17 quét trạng thái rỗng vì hệ thống chưa sinh thông báo nhắc lịch tại thời điểm chạy (0 mục, `unreadCount = 0`). Cả 3 màn vẫn được quét axe đầy đủ và không có vi phạm serious/critical.

## 7. Kết luận

- **Verdict:** `Fail`
- **Lý do:** có 4 vi phạm serious/critical (2 nguyên nhân × 2 viewport), không đạt tiêu chí NFR-USA-002 của case.
- **Điều kiện còn thiếu (nếu Blocked):** không — case chạy được đầy đủ; riêng token email thật cho SCR-04/SCR-05 cần hộp thư test (Mailpit) hoặc quyền truy cập email, đã ghi ở §6.
- **Đề xuất:** giao ACC-01-D1 + ACC-01-D2 cho dev sửa theo nguyên nhân gốc ở §5, thêm tên truy cập cho nút mở ảnh (SCR-12) và avatar bình luận (SCR-23), rồi chạy lại ACC-01; bổ sung Mailpit cho ENV-05 để lần sau quét được SCR-04/05 với token thật.

## 8. Xác nhận

| Vai trò    | Tên                                           | Thời điểm                 | Ghi chú                                                                |
| ---------- | --------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| Người chạy | agent OpenCode (Playwright 1.64.1 + axe-core) | 2026-10-26T16:41:53+07:00 | Chạy tự động, không can thiệp thủ công vào DOM ngoài việc làm mờ email |
| Reviewer   | —                                             | —                         | Chờ review                                                             |
