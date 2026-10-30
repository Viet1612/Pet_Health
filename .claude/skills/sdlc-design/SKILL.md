---
name: sdlc-design
description: Từ PRD + SRS sinh bộ tài liệu thiết kế gồm SAD (kiến trúc, ADR), UI/UX Blueprint (IEEE 1016), User Stories chi tiết và sơ đồ use case draw.io. Dùng khi người dùng muốn "design", "thiết kế hệ thống", "viết SAD", "UI/UX blueprint", "user stories", "use case diagram", hoặc bước 2 của quy trình SDLC sau sdlc-requirements.
---

# SDLC bước 2 — Thiết kế: PRD + SRS → SAD, UI/UX Blueprint, User Stories, Use case diagram

Chuỗi skill: `sdlc-requirements` → **`sdlc-design`** → `sdlc-implement` → `sdlc-testing`.

## Đầu vào / đầu ra

|     | Đường dẫn mặc định                             |
| --- | ---------------------------------------------- |
| Vào | `docs/requirements/BRD.md`, `PRD.md`, `SRS.md` |
| Ra  | `docs/design/SAD.md`                           |
|     | `docs/design/UI_UX_Blueprint.md`               |
|     | `docs/design/User_Stories.md`                  |
|     | `docs/design/usecase_diagram.drawio`           |

Nếu thiếu PRD/SRS: dừng và đề nghị chạy `/sdlc-requirements` trước. Viết bằng ngôn ngữ của tài liệu nguồn.

## Quy trình

### 1. Đọc nguồn và chốt quyết định kiến trúc lớn

Đọc PRD, SRS (đặc biệt NFR và ràng buộc). Liệt kê các **quyết định có ảnh hưởng lớn** chưa được tài liệu chốt, ví dụ:

- Kiểu ứng dụng (web SPA / SSR / mobile / PWA), monolith mô-đun hay microservice.
- Ngôn ngữ, framework backend/frontend, CSDL, hàng đợi job, lưu trữ file.
- Hạ tầng triển khai (VPS + Docker, PaaS, serverless), ngân sách.
- Cách xác thực (session cookie / JWT / OAuth), cách cô lập dữ liệu (RLS, tenant).

Nếu codebase đã tồn tại, đọc nó và giữ nhất quán. Nếu chưa, hỏi người dùng bằng AskUserQuestion (≤4 câu, mỗi câu có phương án khuyến nghị và lý do ngắn). Mặc định ưu tiên: đơn giản, ít thành phần vận hành, phù hợp người làm một mình.

### 2. SAD — [references/sad-template.md](references/sad-template.md)

- Quyết định kiến trúc đánh mã `AD-001…`; quyết định quan trọng viết **ADR** (bối cảnh, phương án, quyết định, hệ quả).
- Phân rã thành phần: module backend (theo bounded context, layer `domain/application/adapters`), frontend, worker, hạ tầng.
- Kiến trúc dữ liệu: bảng chính, khóa, index, chính sách phân quyền dữ liệu, migration.
- Hợp đồng API: quy ước (versioning, lỗi `problem+json`, phân trang, idempotency), bảng endpoint ↔ FR.
- Mối quan tâm xuyên suốt: bảo mật, log/quan sát, cấu hình/secret, xử lý thời gian/múi giờ, i18n, hiệu năng, backup, CI/CD, môi trường dev/staging/prod.
- Bảng truy vết **FR/NFR → thành phần/AD**. Rủi ro kỹ thuật + câu hỏi mở.

### 3. UI/UX Blueprint — [references/uiux-template.md](references/uiux-template.md)

- Design token (màu, chữ, khoảng cách, bo góc), component lõi, layout responsive (mobile-first, breakpoint).
- Danh sách màn hình `SCR-01…`: mục đích, route, thành phần, trạng thái (loading / empty / error / success), hành vi, FR/US liên quan.
- Luồng điều hướng chính, thông báo lỗi/thành công, a11y (WCAG 2.2 AA, vùng chạm ≥44px, focus, aria), i18n.
- Nếu người dùng có Figma: đọc qua công cụ Figma MCP và đối chiếu; không có thì mô tả bằng wireframe ASCII ngắn.

### 4. User Stories — [references/user-stories-template.md](references/user-stories-template.md)

Mở rộng US của PRD thành story sẵn sàng phát triển: nhóm theo epic, mỗi story có AC Given/When/Then (gồm case lỗi + biên), ưu tiên, ước lượng điểm, phụ thuộc, FR + SCR + endpoint liên quan, ghi chú kỹ thuật. Cuối file có **ma trận truy vết** US ↔ FR ↔ SCR ↔ API.

### 5. Use case diagram (draw.io)

Sinh file `.drawio` hợp lệ (XML mxfile) theo [references/usecase-drawio.md](references/usecase-drawio.md): actor bên ngoài khung hệ thống, use case (ellipse) nhóm theo module (band), quan hệ association / `<<include>>` / `<<extend>>`, nhãn có mã `UC-xx` và FR liên quan. Kiểm tra XML parse được (vd. `python -c "import xml.dom.minidom,sys;xml.dom.minidom.parse(sys.argv[1])" file`).

### 6. Tự kiểm tra

- [ ] Mọi FR có thành phần xử lý trong SAD; mọi US có ít nhất 1 màn hình (hoặc là API/job thuần, ghi rõ).
- [ ] Mọi NFR có cơ chế đáp ứng cụ thể (không chỉ "sẽ tối ưu").
- [ ] Màn hình nào cũng có đủ 4 trạng thái loading/empty/error/success.
- [ ] Mã AD/ADR/SCR/UC không trùng; tham chiếu chéo đúng file.
- [ ] File drawio mở được.

### 7. Báo cáo

Tóm tắt: stack đã chọn, số AD/ADR, số màn hình, số story, các rủi ro/câu hỏi mở. Gợi ý bước tiếp `/sdlc-implement`.

## Khi yêu cầu thay đổi

Thêm mục/giai đoạn mới cuối mỗi tài liệu (vd. "§7 Giai đoạn 2 — …"), không đổi mã cũ, tăng phiên bản, ghi lịch sử thay đổi; cập nhật ma trận truy vết.
