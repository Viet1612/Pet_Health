---
name: sdlc-requirements
description: Phân tích tài liệu yêu cầu nghiệp vụ (BRD) và sinh PRD + SRS có truy vết đầy đủ. Dùng khi người dùng đưa BRD (hoặc mô tả nghiệp vụ) và muốn "phân tích requirement", "viết PRD", "viết SRS", "tạo đặc tả yêu cầu", hoặc bắt đầu bước 1 của quy trình SDLC (requirements → design → implement → testing).
---

# SDLC bước 1 — Phân tích yêu cầu: BRD → PRD + SRS

Bước đầu của chuỗi 4 skill: `sdlc-requirements` → `sdlc-design` → `sdlc-implement` → `sdlc-testing`.
Đầu ra của bước này là đầu vào của `sdlc-design`.

## Đầu vào / đầu ra

|          | Đường dẫn mặc định                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Vào      | `docs/requirements/BRD.md` (hoặc file người dùng chỉ định / dán vào)                                                                     |
| Ra       | `docs/requirements/PRD.md`, `docs/requirements/SRS.md`                                                                                   |
| Cập nhật | `docs/requirements/BRD.md` — chỉ thêm §0 "Tóm tắt kiểm tra đầu vào" và câu hỏi mở, **không** sửa nội dung nghiệp vụ khi chưa được đồng ý |

Viết tài liệu bằng **ngôn ngữ của BRD** (BRD tiếng Việt → tài liệu tiếng Việt, thuật ngữ kỹ thuật giữ tiếng Anh trong ngoặc khi cần).

## Quy trình

### 1. Đọc và kiểm tra BRD

Đọc toàn bộ BRD. Lập bảng kiểm tra (đưa vào đầu PRD §0, và BRD §0 nếu BRD chưa có):

- Có đủ: mục tiêu nghiệp vụ, phạm vi in/out, stakeholder, yêu cầu nghiệp vụ (BR), quy tắc nghiệp vụ, ràng buộc, giả định, tiêu chí chấp nhận (AC), chỉ số thành công?
- BR nào **mơ hồ** (không đo được), **mâu thuẫn**, **thiếu AC**?
- Nếu BRD chưa có mã, gán mã: `BR-001…`, `AC-001…`, `BRL-001…` (quy tắc), `CON-001…` (ràng buộc).

**Chặn trước khi viết:** nếu có điểm mơ hồ ảnh hưởng phạm vi/kiến trúc (vd. nền tảng web hay mobile, có đa người dùng không, xác thực kiểu gì, dữ liệu nhạy cảm, ngân sách hạ tầng), gom thành tối đa 4 câu hỏi và hỏi người dùng bằng AskUserQuestion, mỗi câu kèm phương án khuyến nghị. Điểm nhỏ thì tự chọn mặc định hợp lý và ghi vào mục "Giả định / Quyết định".

### 2. Viết PRD

Theo khung trong [references/prd-template.md](references/prd-template.md). Điểm chính:

- Persona (2–4) + hành trình người dùng chính.
- Nhóm tính năng thành **epic** `E1…En`; mỗi user story `US-001…` dạng _"Là <persona>, tôi muốn … để …"_, ưu tiên MoSCoW, tiêu chí chấp nhận dạng **Given/When/Then**, truy vết về `BR-xxx`.
- Yêu cầu UX/UI mức sản phẩm (`UXD-001…`): nguyên tắc, màn hình chính, thiết bị, a11y, đa ngôn ngữ.
- Tiêu chí phát hành (**launch gate** `G-1…`) và chỉ số sau ra mắt.
- Bảng truy vết **BR → US** (mọi BR phải có ít nhất 1 US hoặc ghi rõ lý do loại).

### 3. Viết SRS

Theo khung trong [references/srs-template.md](references/srs-template.md) (cấu trúc ISO/IEC/IEEE 29148). Điểm chính:

- Chia **module** viết tắt 3–4 chữ (`AUTH`, `PET`, `GEN`…). Mỗi yêu cầu chức năng `FR-<MOD>-001` dùng từ khóa **phải / nên / có thể**, một yêu cầu một hành vi kiểm chứng được, có cột truy vết `US-xxx`.
- Yêu cầu phi chức năng `NFR-<CAT>-001` (`PERF`, `SEC`, `REL`, `USA`, `A11Y`, `MNT`, `PRIV`…) **có con số** (p95 < 300 ms, 99,5 %, WCAG 2.2 AA…).
- Giao diện ngoài: UI, API (liệt kê endpoint dự kiến), email, lưu trữ file, dịch vụ bên thứ ba.
- Mô hình dữ liệu logic: thực thể, thuộc tính chính, ràng buộc, vòng đời trạng thái.
- §7 Kiểm chứng: mỗi FR/NFR gắn phương pháp (Test / Demo / Inspection / Analysis).

### 4. Tự kiểm tra trước khi giao

- [ ] Mọi `BR` → ≥1 `US` → ≥1 `FR` (hoặc ghi lý do). Liệt kê các mã "mồ côi" nếu có.
- [ ] Không có FR chứa "nhanh", "dễ dùng", "thân thiện" mà không có số đo.
- [ ] Mã không trùng, đánh số liên tục.
- [ ] Câu hỏi mở và quyết định đã ghi rõ (ai quyết, ngày).
- [ ] Mỗi tài liệu có khối kiểm soát: phiên bản, ngày, trạng thái (Draft / Baseline), lịch sử thay đổi.

### 5. Báo cáo

Tóm tắt cho người dùng: số epic / US / FR / NFR, các giả định đã tự chọn, câu hỏi còn mở, và gợi ý bước tiếp theo `/sdlc-design`.

## Khi BRD thay đổi về sau

Không viết lại từ đầu. Thêm mục/giai đoạn mới (vd. "§8 Giai đoạn 2 — …"), giữ nguyên mã cũ, mã mới đánh tiếp. Tăng phiên bản (v1.0 → v1.1) và ghi lịch sử thay đổi trong cả BRD, PRD, SRS.
