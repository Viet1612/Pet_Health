---
name: sdlc-implement
description: Từ tài liệu thiết kế (SAD, UI/UX Blueprint, User Stories) lập Implement_plan theo sprint, chia thành các task file nhỏ có tiêu chí chấp nhận, rồi tự thực hiện từng task (code, test, ghi kết quả task_done, commit). Dùng khi người dùng muốn "implement", "lập kế hoạch phát triển", "chia task", "làm task tiếp", "làm task S1-03", hoặc bước 3 của quy trình SDLC sau sdlc-design. Tham số tùy chọn - "plan" (chỉ lập kế hoạch), "tasks" (chỉ chia task), "next" hoặc mã task (thực hiện task).
---

# SDLC bước 3 — Triển khai: Thiết kế → Implement_plan → Tasks → Code

Chuỗi skill: `sdlc-requirements` → `sdlc-design` → **`sdlc-implement`** → `sdlc-testing`.

## Đầu vào / đầu ra

|     | Đường dẫn mặc định                                                                    |
| --- | ------------------------------------------------------------------------------------- |
| Vào | `docs/requirements/{PRD,SRS}.md`, `docs/design/{SAD,UI_UX_Blueprint,User_Stories}.md` |
| Ra  | `docs/implement/Implement_plan.md`                                                    |
|     | `docs/implement/tasks/README.md` + `docs/implement/tasks/<ID>-<slug>.md`              |
|     | `docs/implement/task_done/README.md` + `docs/implement/task_done/<ID>-<slug>.md`      |
|     | Mã nguồn + test, mỗi task một commit                                                  |

## Chọn chế độ theo trạng thái

1. Chưa có `Implement_plan.md` → **Giai đoạn A** (lập kế hoạch), xong dừng cho người dùng duyệt.
2. Có plan nhưng chưa có `tasks/README.md` → **Giai đoạn B** (chia task), xong dừng cho người dùng duyệt.
3. Đã có task → **Giai đoạn C**: làm task được chỉ định, hoặc task đầu tiên chưa có trong `task_done/README.md` mà mọi phụ thuộc đã xong.

Tham số `plan` / `tasks` / `next` / `<mã task>` ghi đè lựa chọn trên.

## Giai đoạn A — Implement_plan

Theo [references/plan-template.md](references/plan-template.md):

- Nguyên tắc triển khai (dựng nền trước, mỗi sprint ra được thứ chạy được, test đi cùng code).
- Lộ trình: Sprint 0 nền tảng (repo, môi trường dev, khung backend/frontend, CI, core platform) → các sprint tính năng theo thứ tự phụ thuộc module → sprint cứng hóa (bảo mật, hiệu năng, a11y) → sprint phát hành.
- Mỗi sprint: mục tiêu, story/FR, hạng mục kỹ thuật, kết quả demo được, rủi ro.
- Definition of Done, chiến lược test theo cấp, ánh xạ launch gate → sprint, rủi ro, ma trận **story → sprint** (mọi US Must phải nằm trong một sprint).

## Giai đoạn B — Chia task

- Mỗi task 0,5–2 ngày công, một mục tiêu, kiểm chứng được độc lập. Lớn hơn thì tách.
- Mã `S<sprint>-<nn>` (hoặc tiền tố giai đoạn, vd. `F-01` cho tính năng bổ sung). Tên file `S1-03-register-api.md`.
- `tasks/README.md`: theo từng sprint, bảng `Task | Tên | Story / FR | Phụ thuộc | Ước lượng`.
- Mỗi file task theo [references/task-template.md](references/task-template.md): Mục tiêu · Phạm vi (làm / không làm) · Chi tiết kỹ thuật (endpoint, schema, use case, tệp cần tạo/sửa) · Giao diện · Tiêu chí chấp nhận (checklist) · Kiểm thử · Ghi chú.
- Task phải đủ chi tiết để một người khác (hoặc agent ở phiên sau) làm được mà không cần đọc lại toàn bộ thiết kế: dẫn link đến mục SAD/SRS cụ thể.

## Giai đoạn C — Thực hiện task

Với mỗi task:

1. **Đọc** file task, các mục SAD/SRS/UI được dẫn, và code hiện có liên quan. Theo đúng quy ước code đang có (tên, cấu trúc, mật độ comment).
2. **Kiểm tra phụ thuộc** đã xong (có trong `task_done/README.md`). Chưa xong thì báo và đề nghị làm task phụ thuộc trước.
3. **Code** đúng phạm vi task. Không làm lấn sang task khác; phát hiện việc cần thêm thì ghi vào "Khác với file task" trong kết quả.
4. **Test** theo mục Kiểm thử của task: viết unit/integration test cho logic mới; chạy lint + typecheck + test liên quan. Tuân theo mức độ test người dùng đã dặn (memory/CLAUDE.md) — nếu họ muốn test nhẹ thì chỉ chạy test liên quan, không tự chạy lệnh DB phá hủy.
5. **Ghi kết quả** `task_done/<ID>-<slug>.md` theo [references/task-done-template.md](references/task-done-template.md): trạng thái, ngày, kết quả (đã làm gì, tệp chính), tiêu chí chấp nhận (đánh dấu từng mục + bằng chứng: lệnh test, số test Pass), khác với file task.
6. **Cập nhật** `task_done/README.md`: thêm dòng `| Task | Tên | Ngày | Commit |`; điền hash commit cho dòng của task **trước đó** (hash của task hiện tại chưa có trước khi commit).
7. **Commit** một commit cho task (conventional commits, vd. `feat(S1-03): register API`), kèm dòng attribution theo hướng dẫn hệ thống. Không `--no-verify`; hook lỗi thì sửa nguyên nhân. Hook lỗi "command line too long" khi quá nhiều file → chia commit theo nhóm.
8. **Không push, không deploy** khi người dùng chưa cho phép rõ ràng.
9. Báo cáo ngắn: đã làm gì, test gì, còn gì; hỏi có làm tiếp task kế không (hoặc làm tiếp luôn nếu người dùng đã bảo "làm hết các task").

## Nguyên tắc an toàn

- Không đưa secret/credential vào repo; dùng `.env` (đã gitignore) và `.env.example` có giá trị giả.
- Thay đổi schema luôn qua migration mới, không sửa migration đã chạy.
- Lỗi khó: tìm nguyên nhân gốc, không vá triệu chứng; ghi lại trong task_done.
- Khi yêu cầu thay đổi giữa chừng: cập nhật file task (hoặc tạo task mới, vd. `S4-07`) và ghi chú ngày thay đổi trong `tasks/README.md`, rồi mới code.
