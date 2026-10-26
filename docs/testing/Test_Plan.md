# Kế hoạch Kiểm thử Tổng thể (Master Test Plan) — Pet Health

> **Chuẩn áp dụng:** IEEE 829-2008 (Software Test Documentation), đối chiếu IEEE 29119-3 cho cấu trúc test case.
> **Tài liệu chi tiết:** [Test_Cases.md](Test_Cases.md) — đặc tả test case, ma trận truy vết, lịch sử thực thi.
> **Phạm vi:** Giai đoạn 1 (Nhật ký sức khỏe) + Giai đoạn 2 (Bản tin ảnh thú cưng) — bản đang chạy trên máy dev.
> **Ngày lập:** 2026-10-26 · **Phiên bản:** 1.0 · **Trạng thái:** Draft — chờ Việt duyệt.

---

## 0. Thông tin tài liệu

| Thuộc tính | Giá trị |
|---|---|
| Mã tài liệu | **PH-MTP-001** |
| Tên tài liệu | Master Test Plan — Pet Health Web |
| Phiên bản | **1.0** |
| Ngày phát hành | 2026-10-26 |
| Trạng thái | **Draft** (đã soạn xong, chờ PO/Dev duyệt) |
| Mức bảo mật | Internal |
| Người soạn | QA Architect (Claude), theo yêu cầu của Việt |
| Người phê duyệt | Việt — Product Owner / Developer / QA |
| Chuẩn | IEEE 829-2008 §5.1–5.16; IEEE 29119-3 (test case); IEEE 29148-2018 (truy vết yêu cầu) |
| Baseline đầu vào | BRD v1.4 · PRD v1.4 · SRS v1.1 · SAD v1.2 · UI/UX Blueprint · User Stories 2026-10-26 · Implement_plan 2026-10-26 · `openapi.yaml` 1.0.0 |
| Môi trường nền | Chỉ **máy dev** + CI. Chưa có staging/production (S2-06 bỏ qua, S7 chưa làm, F-01/R2 chưa làm). |

### 0.1 Lịch sử phiên bản

| Phiên bản | Ngày | Tác giả | Tóm tắt |
|---|---|---|---|
| 0.1 | 2026-10-26 | Claude | Bản nháp đầu tiên: phân tích đầu vào, 20 rủi ro, 16 mục IEEE 829, lịch 4 tuần |
| 1.0 | 2026-10-26 | Claude | Hoàn thiện sau khi đối chiếu 141 FR, 41 NFR, 50 story, 86 API operation; tách Test_Cases.md |

### 0.2 Phê duyệt

| Vai trò | Họ tên | Chữ ký | Ngày | Trạng thái |
|---|---|---|---|---|
| Product Owner | Việt |  |  | Chờ duyệt |
| Developer | Việt |  |  | Chờ duyệt |
| QA Lead | Việt |  |  | Chờ duyệt |
| Người soạn | Claude (QA Architect) |  | 2026-10-26 | Đã soạn |

> **Quy ước:** Tài liệu chỉ có hiệu lực khi mục 16 được ký. Mọi thay đổi phạm vi, lịch hoặc tiêu chí đạt phải được ghi thành phiên bản mới (xem Phụ lục D).

### 0.3 Cách đọc tài liệu

- **Phần A** là kết quả phân tích đầu vào theo yêu cầu của `testPlan_prompt.md`: tài liệu, yêu cầu, thiết kế, UI, API, story, rủi ro.
- **Phần B** là 16 mục của IEEE 829-2008.
- **Phụ lục** chứa bảng trạng thái gate, bằng chứng hiện có và đối chiếu chuẩn.
- Mọi con số "hiện trạng" được chốt tại **2026-10-26**. Khi chạy lại test phải cập nhật Phụ lục B, không sửa số cũ trong lịch sử.

---

# PHẦN A — PHÂN TÍCH ĐẦU VÀO

## A.1 Kiểm kê tài liệu đầu vào

| Loại | Tài liệu | Phiên bản / ngày | Nguồn | Thông tin chính dùng để thiết kế test |
|---|---|---|---|---|
| Nghiệp vụ | [BRD.md](../requirements/BRD.md) | v1.4, 2026-10-26 | Product Owner | BR-001→BR-053, AC-001→AC-054, DEC-016→DEC-030, rủi ro nghiệp vụ |
| Sản phẩm | [PRD.md](../requirements/PRD.md) | v1.4, 2026-10-26 | Product Owner | 50 user story, luồng UX, trạng thái lỗi/rỗng, launch gate G-1→G-18, Phase 2 FG-1→FG-6, analytics §5.2 |
| Yêu cầu phần mềm | [SRS.md](../requirements/SRS.md) | v1.1, 2026-10-26 | Product Owner | **141 FR**, **41 NFR còn hiệu lực**, 11 IF, 6 DC, SD-001→SD-022, thuật toán §2.10, mô hình dữ liệu |
| Kiến trúc | [SAD.md](../design/SAD.md) | v1.2, 2026-10-22 | Kiến trúc | Modular monolith + Hexagonal, RLS, transaction, idempotency, media pipeline, CI, test architecture |
| UI/UX | [UI_UX_Blueprint.md](../design/UI_UX_Blueprint.md) | PH-UXD-001 | Thiết kế | 25 màn SCR-01→SCR-25, breakpoint, empty/error state, accessibility, luồng FLW-01→FLW-05 |
| User story | [User_Stories.md](../design/User_Stories.md) | 2026-10-26 | Product Owner | 40 story GĐ1 + 10 story GĐ2, AC Given/When/Then, truy vết BR/FR/SCR |
| Kế hoạch phát triển | [Implement_plan.md](../implement/Implement_plan.md) | 2026-10-26 | Dev | 8 sprint, DoD, chiến lược test, gate→sprint, rủi ro, Phase 2 |
| Hợp đồng API | [`openapi.yaml`](../../openapi.yaml) | 1.0.0 | Dev | **86 operation / 62 path**, schema, mã lỗi, auth, idempotency |
| Bằng chứng thực thi | [task_done/](../implement/task_done/README.md) | 2026-10-26 | Dev | 47/54 task GĐ1, 12/13 task GĐ2; unit 209, IDOR 136/136, E2E 72/72, axe 0 serious/critical, bundle 136,5 KB |
| CI | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | 2026-10-26 | Dev | lint, typecheck, depcruise, unit+coverage, integration, contract, security, size |
| E2E | [`e2e/playwright.config.ts`](../../e2e/playwright.config.ts) | 2026-10-26 | Dev | project `api`, `ui-phone` 390×844, `ui-tablet` 834×1112, FakeClock, Mailpit, `workers: 1` |
| Chuẩn | `testPlan_prompt.md` | 1.0 | QA | Cấu trúc IEEE 829 và các bảng bắt buộc |

**Khoảng trống tài liệu đã biết**

| ID | Khoảng trống | Ảnh hưởng đến test | Cách xử lý |
|---|---|---|---|
| GAP-D01 | Chưa có PRD/SRS riêng cho Bản tin; quy tắc nằm trong SRS §2.12 + task F-02→F-13 | Test case phải bám SRS §2.12 và AC của 10 story E8 | Đã đưa toàn bộ FR-SOC vào ma trận; UAT E8 dùng AC story |
| GAP-D02 | Chưa có frame Figma cho E8 | Không thể so khớp pixel-perfect | Kiểm theo Blueprint SCR-19→25 + review trực quan |
| GAP-D03 | Chưa có tài liệu vận hành production (S7) | G-4/G-6/G-7/G-10/G-14 chưa kiểm được | Đánh dấu **Pending**, không tuyên bố đạt |
| GAP-D04 | Chưa có báo cáo coverage mới nhất | G-2 chưa có bằng chứng tại ngày lập | Chạy lại `pnpm test:unit --coverage` ở C0 |
| GAP-D05 | Chưa có test plan riêng cho migration dữ liệu | Không có dữ liệu legacy | Phạm vi: chỉ migration từ DB rỗng + rollback |

## A.2 Trích yêu cầu chức năng

### A.2.1 Tổng hợp theo mô-đun

| Mô-đun | Số FR | P0 | P1 | P2 | Quy tắc nghiệp vụ trọng tâm |
|---|---:|---:|---:|---:|---|
| AUTH — Tài khoản, xác thực | 18 | 8 | 9 | 1 | Email chuẩn hóa/duy nhất; Argon2id; session 30 ngày; khóa 15 phút; reset one-time; đổi email 60 phút; xóa tài khoản cascade |
| PET — Hồ sơ thú cưng | 8 | 4 | 4 | 0 | Tối đa 10 bé; tuổi theo BRU-001; ảnh HEIC→JPG, bỏ EXIF; xóa phải nhập đúng tên |
| WGT — Cân nặng | 10 | 8 | 2 | 0 | 0,1–150 kg, 1 chữ số thập phân, nhận `,`/`.`; nhiều số đo/ngày; biểu đồ + mục tiêu |
| VIS — Sổ y tế | 8 | 4 | 4 | 0 | ≥1 trong triệu chứng/chẩn đoán; 20 bản ghi/trang; ≤5 ảnh; ảnh lỗi độc lập |
| MS — Mốc y tế | 13 | 11 | 2 | 0 | 3 loại; không đổi loại; DONE/CANCELLED; hoàn tác 10 giây; tự tạo mốc +12/+N tháng lịch; idempotent |
| NTF — Nhắc trong app | 11 | 9 | 2 | 0 | D7 = hạn−7, D1 = hạn−1, OVERDUE = hạn+1; chỉ tạo khi `appear_on > due_set_on`; tối đa 1 chưa xem/mốc; lưu 90 ngày |
| RT — Việc hằng ngày | 7 | 0 | 7 | 0 | Tối đa 20 việc/bé; checklist theo ngày địa phương; reset 00:00; giữ lịch sử |
| DSH — Dashboard | 7 | 4 | 3 | 0 | 1 request; banner + 3 panel; 5 mốc; breakpoint 768/1280; empty state |
| GEN — Hành vi hệ thống | 13 | 11 | 2 | 0 | UTC/date-only; offline; timeout 10 s; idempotency 24 h; draft; last-write-wins; nén ảnh 50 MB→5 MB |
| ANL — Analytics | 6 | 2 | 4 | 0 | Allowlist event/thuộc tính; không PII/nội dung; server event; lỗi analytics không ảnh hưởng chính |
| SOC — Bản tin | 40 | 0 | 40 | 0 | Hồ sơ/bài 1–5 ảnh; follow; feed cursor; like/comment idempotent; thông báo hoạt động; chặn 2 chiều; rate limit |
| **Tổng** | **141** | **61** | **79** | **1** | |

### A.2.2 Yêu cầu phi chức năng

| Nhóm | Tổng | Còn hiệu lực | Đã rút | Ghi chú |
|---|---:|---:|---:|---|
| PERF | 7 | 7 | 0 | LCP/INP/CLS, API p95, bundle, email ≤1 phút, tạo thông báo ≤50 ms, quy mô SD-011, upload 5 MB |
| SEC | 14 | 14 | 0 | Argon2id, cookie, HSTS, IDOR 100%, rate limit, URL ký 15 phút, CSP/XSS, dependency, log, secret, EXIF, pháp lý, rò dữ liệu Bản tin |
| REL | 5 | 3 | 2 | NFR-REL-002 (backup) và REL-004/005 (giám sát/bounce) đã rút |
| USA | 7 | 7 | 0 | 44 px, WCAG 2.1 AA, không chỉ màu, dark mode **không làm**, inputmode, ≤3 thao tác, vi/en |
| MNT | 6 | 6 | 0 | OpenAPI 100%, business rule ở server, coverage 90/70, contract test, E2E G-3, E2E Bản tin |
| PRT | 5 | 5 | 0 | Safari/Chrome, không cuộn ngang 360–1366, cookie/token, channel, storage độc lập |
| **Tổng** | **44** | **41** | **3** | |

### A.2.3 Giao diện ngoài và ràng buộc

| Nhóm | Còn hiệu lực | Đã rút | Nội dung kiểm |
|---|---:|---:|---|
| IF-UI | 4 | 0 | Blueprint là ràng buộc; bottom sheet phone / modal tablet; Bản tin SCR-19→25 |
| IF-SW | 3 | 1 | SMTP Gmail (chỉ xác minh/reset), kho ảnh (local → R2), kho analytics; IF-SW-004 giám sát đã rút |
| IF-COM | 4 | 1 | HTTPS/TLS ≥1.2, REST JSON `/api/v1`, problem+json, endpoint Bản tin; webhook email đã rút |
| DC | 6 | 0 | Web-only, không offline业务, không WebSocket/SSE, backend dùng lại GĐ2, chi phí thấp, tự dựng + Cloudflare |

### A.2.4 Quyết định đặc tả ảnh hưởng test

| ID | Nội dung | Test phải xác nhận |
|---|---|---|
| SD-001 | Mật khẩu 8–128, không bắt buộc ký tự đặc biệt | Biên 7/8/128/129 |
| SD-002 | Verify 24 h, reset 60 phút, dùng 1 lần | Hết hạn/đã dùng/sai |
| SD-003 | Session 30 ngày trượt | Giả lập thời gian |
| SD-004 | Không đổi loại mốc | PATCH type bị từ chối |
| SD-005 | Tối đa 20 việc/bé | Biên 20/21, đồng thời |
| SD-006 | Ghi chú ≤500, chu kỳ 1–60 | Biên 0/1/60/61 |
| SD-007 | Bỏ EXIF/GPS | Ảnh có GPS thật |
| SD-008 | Xóa việc vẫn giữ lịch sử | Kiểm tra MET-003 |
| SD-009 | Xóa bé so khớp tên trim/không phân biệt hoa thường | Biến thể tên |
| SD-011 | 1.000 user / 10.000 bé / 50.000 mốc | Seed hiệu năng |
| SD-012 | Khả dụng 98%, không RPO/RTO | Không đo được khi chưa có prod |
| SD-013 | Thông báo lưu 90 ngày | Job dọn dẹp |
| SD-014 | 20 mục/trang, badge "9+" | Phân trang + badge |
| SD-015 | Bản tin chỉ người đăng nhập | Khách → login |
| SD-016 | Bảng sức khỏe giữ RLS; bài chỉ hiện tên bé | Quét rò rỉ |
| SD-017 | Không báo cáo/kiểm duyệt | Xác nhận không có UI/API |
| SD-018 | 5 ảnh/bài, 30 bài/ngày, nén 50 MB | Biên + nén |
| SD-019 | Một hồ sơ/một lưới | Kiểm hồ sơ |
| SD-020 | Đổi username 14 ngày | Giả lập thời gian |
| SD-021 | Thông báo hoạt động 90 ngày, chuông chung | Job + badge |
| SD-022 | Nickname + ngày sinh bắt buộc | Đăng ký/backfill |

## A.3 Trích thiết kế từ SAD

| View | Thành phần | Loại | Giao diện | Trạng thái | Phụ thuộc |
|---|---|---|---|---|---|
| Composition | `apps/api` | Fastify 5 + Zod + Kysely | REST `/api/v1` | — | PostgreSQL, pg-boss, SMTP, media |
| Composition | `apps/web` | React 19 + Vite + TanStack | HTTP/JSON | — | `packages/api-client` |
| Composition | `apps/api` worker | Node worker | pg-boss job | — | DB, SMTP, media |
| Component | `platform/` | Clock, calendar, idempotency, rate limit, logging, queue, security | Port + adapter | — | DB |
| Component | `identity` | Auth/session/token | Use case + repo | Session active/expired | users, sessions, auth_tokens |
| Component | `pets` | CRUD + avatar | REST | — | media, identity |
| Component | `media` | Upload/process/sign | Port `ObjectStoragePort` | `PENDING→READY/FAILED/ABANDONED` | filesystem (R2 planned) |
| Component | `health-records` | Weight, visit | REST | — | pets, media |
| Component | `scheduling` | Milestone | State machine | `PENDING→DONE/CANCELLED` | pets, notifications |
| Component | `notifications` | In-app reminder | Sync service | unread/read/processed | milestones |
| Component | `routines` | Daily checklist | REST | done/not done theo ngày | pets |
| Component | `dashboard` | Aggregate read model | 1 request | — | 4 module |
| Component | `analytics` | Event append | REST + SQL view | — | DB partition |
| Component | `social` | Profile/post/follow/like/comment/block/notification | REST + RLS | `DRAFT→PUBLISHED` | pets, media, notifications |
| Information | PostgreSQL 16 | 22 bảng | SQL | — | RLS, role `app_rw`/`app_worker` |
| Interface | OpenAPI 1.0.0 | 86 operation | REST | — | Zod schema |
| State | Milestone | `PENDING`, `DONE`, `CANCELLED` | Command | Hoàn tác 10 s | notification |
| State | Notification | unread → read → processed | Sync | Lý do DONE/CANCELLED/RESCHEDULED | milestone |
| State | Upload | `PENDING`, `READY`, `FAILED`, `ABANDONED` | Worker | Retry | media |
| State | Post | `DRAFT`, `PUBLISHED` | Worker | Ảnh cuối READY | media |

**Bảng dữ liệu chính:** `users`, `sessions`, `auth_tokens`, `pets`, `uploads`, `weight_entries`, `visits`, `visit_photos`, `milestones`, `notifications`, `routine_tasks`, `routine_completions`, `idempotency_keys`, `rate_limits`, `analytics_events`, `profiles`, `posts`, `post_photos`, `follows`, `post_likes`, `post_comments`, `blocks`, `social_notifications`.

**Ràng buộc kiến trúc ảnh hưởng test**

1. Mọi bảng sức khỏe bật RLS `owner_isolation`; 8 bảng social bật RLS + FORCE, đọc theo `not_blocked()`, ghi chỉ chủ.
2. Command của milestone + notification + mốc kế tiếp nằm trong **một transaction**.
3. `POST` tạo mới phải có `Idempotency-Key`; replay trong 24 h trả kết quả cũ.
4. Media chỉ truy cập qua URL ký HMAC ≤15 phút; ảnh bỏ EXIF, HEIC→JPG.
5. Web không có đường truy cập dữ liệu riêng; mọi thứ qua API công khai.
6. Không có job gửi nhắc ra ngoài; thông báo được tạo khi đọc (sync).

## A.4 Trích thành phần UI/UX

| Nhóm màn hình | Màn | Tương tác chính | Trạng thái phải kiểm | A11y |
|---|---|---|---|---|
| Auth | SCR-01→05 | Đăng nhập/đăng ký/quên/reset/verify | loading, lỗi chung, lỗi trường, hết hạn token, thành công | Label, autocomplete, lỗi `aria-describedby`, focus |
| Dashboard | SCR-06 | Banner, 3 panel, lọc, QuickAdd | có/không nhắc, chưa xác minh, chưa có bé, loading | Landmark, heading, màu + nhãn chữ |
| Thú cưng | SCR-07→09 | Danh sách, hồ sơ, tạo/sửa, xóa, avatar | rỗng, 10 bé, lỗi ảnh, xác nhận tên | 44 px, form, dialog |
| Sức khỏe | SCR-10→13 | Cân nặng, biểu đồ, mục tiêu, sổ y tế, ảnh, lightbox | 0/1 điểm, lỗi upload, ảnh lớn, lightbox | Bảng dữ liệu biểu đồ, alt, bàn phím |
| Mốc/Nhắc | SCR-14, 15, 17 | Tạo/sửa/hủy/hoàn tất/hoàn tác, chuông, banner | 4 nhóm, quá hạn, đã xử lý, 20/trang | Live region, nhãn trạng thái |
| Việc hằng ngày | SCR-16 | Checklist, thêm/sửa/xóa | 0 việc, 20 việc, optimistic rollback | Checkbox, 44 px |
| Cài đặt | SCR-18 | Email/mật khẩu/múi giờ/ngôn ngữ/xóa tài khoản | lỗi trường, vùng nguy hiểm | Dialog xác nhận |
| Bản tin | SCR-19→25 | Soạn bài, feed, hồ sơ, chi tiết, tìm, theo dõi, tim, bình luận, chặn | rỗng, lỗi ảnh, draft, bị chặn, 404 | Carousel "Ảnh i/n", reduced motion, 44 px |

**Breakpoint bắt buộc:** 360, 390, 768, 834, 1024, 1280, 1366 px; cả dọc và ngang. Không cuộn ngang trong khoảng 360–1366 px.

## A.5 Trích thành phần API

| Thuộc tính | Giá trị |
|---|---|
| Số operation | **86** |
| Số path | **62** |
| Base path | `/api/v1` |
| Định dạng | JSON UTF-8; lỗi `application/problem+json` |
| Auth | Cookie phiên `HttpOnly`, `Secure`, `SameSite=Lax`; CSRF cho mọi request ghi |
| Idempotency | `Idempotency-Key` bắt buộc cho POST tạo mới; lưu 24 h |
| Phân trang | Keyset/cursor; kích thước 10/18/20/30 tùy tài nguyên |
| Media | `PUT` upload, `GET /uploads/{id}` trạng thái, URL ký cho ảnh |
| Rate limit | Auth, analytics, social theo ngưỡng SRS/NFR-SEC-005/014 |
| Nhóm operation | system 2; analytics 1; auth 10; me 6; pets 7; weights 5; visits 7; milestones 7; notifications 4; routines 5; dashboard 1; social 31 |

**Ma trận 86 operation → test case** nằm ở [Test_Cases.md §14.4](Test_Cases.md#144-ma-trận-api--test-case).

## A.6 Trích user story và tiêu chí chấp nhận

| Epic | Story | Số story | Ưu tiên | Điểm nhấn kiểm thử |
|---|---|---|---:|---|
| E1 — Tài khoản | US-001→008 | 8 | 6 P0, 1 P1, 1 P2 | Đăng ký/verify/login/reset/quyền/xóa |
| E2 — Thú cưng | US-010→015 | 6 | 4 P0, 2 P1 | CRUD, tuổi, ảnh, giới hạn 10 |
| E3 — Cân nặng | US-020→023 | 4 | 3 P0, 1 P1 | Nhập, biểu đồ, mục tiêu, sửa/xóa |
| E4 — Sổ y tế | US-030→034 | 5 | 3 P0, 2 P1 | Bản ghi, danh sách, ảnh, lightbox |
| E5 — Mốc & nhắc | US-040→049 | 10 | 7 P0, 3 P1 | Vòng đời mốc, D7/D1/quá hạn, hoàn tác, tự tạo |
| E6 — Việc hằng ngày | US-050→053, 045 | 5 | 0 P0, 5 P1 | Checklist, reset ngày, lịch sử |
| E7 — Dashboard | US-060→062 | 3 | 2 P0, 1 P1 | Tổng hợp, lọc, banner |
| E8 — Bản tin | US-070→079 | 10 | 0 P0, 10 P1 | Hồ sơ, bài, feed, tim, bình luận, thông báo, chặn |
| **Tổng** |  | **50** | **21 P0, 28 P1, 1 P2** |  |

> Mỗi story có tối thiểu một UAT case và các AC được ánh xạ sang test case chi tiết. Ma trận đầy đủ ở [Test_Cases.md §14.1](Test_Cases.md#141-story--fr--test-case).

## A.7 Đánh giá rủi ro

**Thang điểm:** Khả năng (L) 1–5 × Tác động (I) 1–5 = điểm 1–25. Ưu tiên: **Cao ≥15**, **Trung bình 8–14**, **Thấp ≤7**.

| ID | Rủi ro | L | I | Điểm | Mức | Giảm thiểu / trọng tâm test |
|---|---|---:|---:|---:|---|---|
| RSK-01 | Sai logic nhắc D7/D1/OVERDUE (múi giờ, `due_set_on`, supersede) | 4 | 5 | 20 | Cao | Unit 9 ca SRS §2.6 + bảng quyết định + E2E FakeClock; test biên 00:00 |
| RSK-02 | Cộng tháng lịch sai (31/01, 29/02) | 3 | 4 | 12 | TB | Unit bảng 4 ca SRS §2.10.2 + property test; test qua API |
| RSK-03 | Lộ dữ liệu sức khỏe qua Bản tin/IDOR | 3 | 5 | 15 | Cao | IDOR 136 ca, quét rò rỉ JSON, meta-test RLS, SEC-18 |
| RSK-04 | Ảnh HEIC/EXIF/URL ký lỗi | 3 | 4 | 12 | TB | Fixture HEIC/GPS thật, integration pipeline, test URL hết hạn/sửa chữ ký |
| RSK-05 | Trùng thông báo/mốc do chạy song song | 3 | 4 | 12 | TB | Unique constraint, 10 request song song, reload nhiều thiết bị |
| RSK-06 | Không có staging/production → G-4/G-6/G-7/G-10/G-14 chưa kiểm | 5 | 4 | 20 | Cao | Ghi **Pending**, test trên dev, lên kế hoạch S7; không tuyên bố đạt |
| RSK-07 | Mất dữ liệu, không backup (đã chấp nhận DEC-020) | 2 | 5 | 10 | TB | Không mở cho người ngoài; cảnh báo; kiểm tra trước khi public |
| RSK-08 | Không monitoring (đã chấp nhận DEC-017) | 3 | 3 | 9 | TB | Kiểm thủ công, log/healthcheck, không cam kết SLA |
| RSK-09 | Hiệu năng chưa đo ở quy mô SD-011 | 4 | 3 | 12 | TB | Seed 1.000/10.000/50.000; k6; Lighthouse |
| RSK-10 | Chỉ Chromium + emulation, chưa thiết bị thật | 4 | 3 | 12 | TB | G-4 thủ công trước public (iPhone/iPad/Android) |
| RSK-11 | Analytics rò PII/nội dung | 2 | 5 | 10 | TB | Allowlist trường, quét DB/JSON, SEC-21 |
| RSK-12 | Email vào spam | 3 | 3 | 9 | TB | Mailpit + kiểm Gmail/Outlook ở S7 |
| RSK-13 | Dữ liệu test bẩn, không cô lập | 3 | 3 | 9 | TB | Prefix email duy nhất, DB riêng, reset trước mỗi suite |
| RSK-14 | E2E flaky do FakeClock dùng chung | 3 | 3 | 9 | TB | `workers: 1`, reset clock, trace, chạy lặp |
| RSK-15 | Bỏ sót rate limit/spam | 2 | 4 | 8 | TB | Test biên, cửa sổ cố định, tài khoản <24 h |
| RSK-16 | A11y regression ở màn mới | 3 | 3 | 9 | TB | axe mỗi màn + kiểm bàn phím/screen reader |
| RSK-17 | Chuỗi cung ứng dependency | 2 | 4 | 8 | TB | `pnpm audit`, OSV, gitleaks, pin SHA |
| RSK-18 | Một người làm → key person | 3 | 4 | 12 | TB | Tài liệu hóa, tự động hóa, AI review |
| RSK-19 | Xóa tài khoản/bé không hết dữ liệu | 2 | 5 | 10 | TB | Cascade test, kiểm media/DB sau xóa |
| RSK-20 | Hết dung lượng media local | 3 | 2 | 6 | Thấp | Theo dõi dung lượng, R2 ở S7 |

**Rủi ro chấp nhận có chủ đích (phải ghi trong báo cáo phát hành):** RSK-07 (không backup), RSK-08 (không monitoring), cùng các mục đã rút G-13/G-16, NFR-REL-002/004/005, IF-SW-004, SD-010. Đây là quyết định của chủ dự án (DEC-016, DEC-017, DEC-020), không phải lỗi test.

---

# PHẦN B — KẾ HOẠCH KIỂM THỬ THEO IEEE 829-2008

## 1. Định danh kế hoạch kiểm thử (5.1)

| Thuộc tính | Giá trị |
|---|---|
| **Document ID** | PH-MTP-001 |
| **Document Version** | 1.0 |
| **Issue Date** | 2026-10-26 |
| **Status** | Draft |
| **Classification** | Internal |
| **Prepared By** | QA Architect (Claude) |
| **Approved By** | Việt (chờ ký) |
| **Supersedes** | Không (bản đầu tiên) |
| **Liên quan** | PH-TC-001 (`Test_Cases.md`), PH-TR-001 (báo cáo thực thi, sẽ tạo theo mẫu §9) |

## 2. Giới thiệu (5.2)

### 2.1 Mục đích

Kế hoạch này xác định cách kiểm chứng rằng Pet Health:

1. Thực hiện đúng **141 yêu cầu chức năng** và **41 yêu cầu phi chức năng còn hiệu lực**.
2. Đáp ứng **50 user story** với toàn bộ AC Given/When/Then.
3. Tuân thủ **11 giao diện ngoài** và **6 ràng buộc thiết kế**.
4. Không rò rỉ dữ liệu sức khỏe, không hồi quy ở các luồng P0.
5. Có bằng chứng rõ ràng cho từng launch gate G-1→G-18 và FG-1→FG-6, kể cả các gate **chưa thể kiểm** vì thiếu staging/production.

### 2.2 Phạm vi

**Trong phạm vi**

- Toàn bộ Giai đoạn 1: tài khoản, thú cưng, cân nặng, sổ y tế, mốc y tế, nhắc trong app, việc hằng ngày, Dashboard, cài đặt, analytics, job bảo trì.
- Toàn bộ Giai đoạn 2: hồ sơ công khai, bài đăng, bản tin, theo dõi/tìm, tim, bình luận, thông báo hoạt động, chặn.
- Các cấp độ: unit, integration/DB, contract, API, system/E2E, acceptance/UAT, regression.
- Các loại: chức năng, phi chức năng (hiệu năng, bảo mật, accessibility, UI/UX, độ tin cậy, khả năng bảo trì), dữ liệu, vận hành job.
- Kiểm thử tự động (Vitest, Playwright, axe) và kiểm thử thủ công (khám phá, thiết bị, screen reader, UAT).
- Môi trường dev + CI + E2E local. Staging/production được mô tả để chuẩn bị, nhưng **chưa thực thi**.

**Ngoài phạm vi**

- Ứng dụng native/PWA, push notification, video, tin nhắn, hashtag, khám phá, quảng cáo (thuộc ý tưởng Phase 2, chưa làm).
- Thanh toán, gói cước, đa người thuê, cổng bác sĩ thú y, chẩn đoán bằng AI.
- Hạ tầng vật lý, điện, UPS, mạng, cấu hình Cloudflare chi tiết (S7; kiểm ở mức smoke khi có).
- Kiểm thử xâm nhập chuyên sâu bởi bên thứ ba (chỉ ZAP baseline + kiểm soát OWASP Top 10 cơ bản).
- Đánh giá pháp lý/tuân thủ đầy đủ (NFR-SEC-012) — cần rà soát pháp lý độc lập trước khi mở cho người ngoài.
- Khôi phục sau thảm họa/backup (G-13, NFR-REL-002 đã rút).
- Giám sát/cảnh báo vận hành (G-16, NFR-REL-004 đã rút).
- Stress vượt 2× tải SD-011, soak > 2 giờ, chaos engineering.

### 2.3 Mục tiêu và tiêu chí thành công

| ID | Mục tiêu | Tiêu chí thành công | Truy vết |
|---|---|---|---|
| OBJ-01 | Kiểm chứng 100% FR | 141/141 FR có ≥1 test case; 61/61 P0 Pass trước phát hành | SRS §2 |
| OBJ-02 | Kiểm chứng 100% NFR còn hiệu lực | 41/41 NFR có case hoặc quyết định chấp nhận có ký | SRS §4 |
| OBJ-03 | Kiểm chứng 50 story/AC | 50/50 UAT story Pass hoặc accepted; 100% AC P0 Pass | User_Stories |
| OBJ-04 | Phủ 100% API operation | 86/86 operation có case; contract không breaking | `openapi.yaml` |
| OBJ-05 | Không rò rỉ dữ liệu | IDOR 136/136 Pass; quét JSON/DB 0 trường cấm | NFR-SEC-004/013 |
| OBJ-06 | Chất lượng hiệu năng | Đạt NFR-PERF-001→007 hoặc ghi Pending có lý do | PRD G-6/G-7/G-8 |
| OBJ-07 | Accessibility | axe 0 serious/critical trên 25 màn; kiểm bàn phím/screen reader Pass | NFR-USA-002 |
| OBJ-08 | Chất lượng UI/UX | Khớp Blueprint 390 px; không cuộn ngang 360–1366; đủ empty/error/loading | IF-UI-001→004 |
| OBJ-09 | Độ tin cậy | Không trùng/mất thông báo; job bảo trì idempotent | NFR-REL-003, G-15 |
| OBJ-10 | Khả năng bảo trì | Coverage 90/70; OpenAPI khớp; bundle <250 KB | NFR-MNT-003/004, G-2/G-17 |
| OBJ-11 | Truy vết | 100% FR/NFR/story/API/gate có ma trận | IEEE 29148 |
| OBJ-12 | Minh bạch trạng thái | Mọi gate chưa kiểm được ghi Pending/Blocked, không tuyên bố đạt | §7, Phụ lục A |

### 2.4 Tài liệu tham chiếu

| Tài liệu | Phiên bản | Nguồn |
|---|---|---|
| [SRS](../requirements/SRS.md) | 1.1 | Product Owner |
| [PRD](../requirements/PRD.md) | 1.4 | Product Owner |
| [BRD](../requirements/BRD.md) | 1.4 | Product Owner |
| [SAD](../design/SAD.md) | 1.2 | Kiến trúc |
| [UI/UX Blueprint](../design/UI_UX_Blueprint.md) | PH-UXD-001 | Thiết kế |
| [User Stories](../design/User_Stories.md) | 2026-10-26 | Product Owner |
| [Implement_plan](../implement/Implement_plan.md) | 2026-10-26 | Dev |
| [`openapi.yaml`](../../openapi.yaml) | 1.0.0 | Dev |
| [Figma Pet Health](https://www.figma.com/design/LFyXuFes0btRKxTORNwgpo) | — | Thiết kế |
| IEEE 829-2008 | 2008 | IEEE |
| IEEE 29119-3 | 2021 | IEEE |
| OWASP ASVS 4.0.3 / Top 10 2021 | — | OWASP |
| WCAG 2.1 AA | — | W3C |

### 2.5 Thuật ngữ và viết tắt

| Thuật ngữ | Nghĩa |
|---|---|
| FR / NFR | Yêu cầu chức năng / phi chức năng |
| AC | Acceptance Criteria — tiêu chí chấp nhận |
| UAT | User Acceptance Testing |
| IDOR | Insecure Direct Object Reference — truy cập tài nguyên người khác |
| RLS | Row-Level Security của PostgreSQL |
| D7 / D1 / OVERDUE | Mức nhắc trước 7 ngày / 1 ngày / quá hạn |
| FakeClock | Đồng hồ giả chỉ bật khi `NODE_ENV=test`, điều khiển qua `POST /__test/clock` |
| SD-011 | Quy mô thiết kế 1.000 user / 10.000 bé / 50.000 mốc |
| Gate | Điều kiện phát hành G-1→G-18, FG-1→FG-6 |
| Pending / Blocked | Chưa thực thi được / bị chặn bởi điều kiện môi trường |

## 3. Hạng mục kiểm thử (5.3)

### 3.1 Hạng mục phần mềm

| ID | Hạng mục | Phiên bản / nguồn | Loại | Test artifact |
|---|---|---|---|---|
| SI-01 | API Fastify (`apps/api`) | Working tree 2026-10-26 | Service | Unit, integration, API, contract |
| SI-02 | Worker email + media + job (`main-worker`) | Working tree 2026-10-26 | Worker | Integration, E2E, job test |
| SI-03 | Web React (`apps/web`) | Working tree 2026-10-26 | SPA | Unit (nếu có), E2E, UI, a11y |
| SI-04 | `packages/api-client` | Sinh từ OpenAPI | Library | Contract, typecheck |
| SI-05 | `packages/email-templates` | Working tree | Template | Integration (Mailpit), i18n |
| SI-06 | PostgreSQL schema + migration | 22 migration | Database | Integration, DB, migration |
| SI-07 | Media pipeline (libvips/libheif) | Working tree | Component | Integration, fixture ảnh |
| SI-08 | `maintenance.daily` job | Working tree | Job | Integration, OPS |
| SI-09 | Analytics event + SQL view | Working tree | Data pipeline | API, DB, privacy |
| SI-10 | `openapi.yaml` | 1.0.0 | Contract | Contract |
| SI-11 | CI pipeline | `ci.yml` | Process | Static/security/size |
| SI-12 | `infra/compose.dev.yml`, Dockerfile | Working tree | Environment | Smoke |
| SI-13 | Test fixtures/seed | `e2e/`, `apps/api/test/` | Testware | Tự kiểm |
| SI-14 | Tài liệu vận hành/rollback | Chưa có (S7) | Doc | Review — **Pending** |

### 3.2 Testware đi kèm

| ID | Tên | Định dạng | Nguồn |
|---|---|---|---|
| TA-01 | Đặc tả test case + ma trận | Markdown | `Test_Cases.md` |
| TA-02 | Dữ liệu test | SQL/TS fixture | `e2e/`, `apps/api/test/` |
| TA-03 | Script tự động | TypeScript (Vitest/Playwright) | `apps/**/*.test.ts`, `e2e/**/*.spec.ts` |
| TA-04 | Môi trường | Docker Compose, ServBay, GitHub Actions | `infra/`, `.github/` |
| TA-05 | Mock/Stub | FakeClock, Mailpit, Testcontainers, port giả | `apps/api/test/`, `e2e/support/` |
| TA-06 | Báo cáo | HTML/JSON/Markdown | `.data/e2e-report`, `coverage/` |

## 4. Tính năng được kiểm thử (5.4)

### 4.1 Ma trận ưu tiên kiểm thử

| Ưu tiên | Mô-đun / tính năng | Story | FR | Điểm rủi ro | Cấp độ chính |
|---|---|---|---|---:|---|
| **Cao** | Mốc y tế + nhắc D7/D1/quá hạn | US-040→049 | FR-MS-001→013, FR-NTF-001→011 | 20 | Unit, integration, API, E2E, UAT |
| **Cao** | Tài khoản, phiên, quyền, xóa tài khoản | US-001→008 | FR-AUTH-001→018 | 15 | Unit, API, IDOR, E2E, UAT |
| **Cao** | Bản tin + quyền riêng tư | US-070→079 | FR-SOC-001→040 | 15 | API, integration, E2E, IDOR, UAT |
| **Cao** | Media pipeline + URL ký | US-012, 033, 070, 071 | FR-PET-005, FR-VIS-005→008, FR-SOC-009 | 12 | Integration, E2E, security |
| **Cao** | Hành vi hệ thống (idempotency, offline, timeout) | US-007, 020, 042 | FR-GEN-001→013 | 12 | Unit, API, E2E |
| **Cao** | Cân nặng + sổ y tế | US-020→034 | FR-WGT-001→010, FR-VIS-001→008 | 12 | Unit, API, E2E, UAT |
| **Trung bình** | Thú cưng | US-010→015 | FR-PET-001→008 | 10 | API, E2E, UAT |
| **Trung bình** | Dashboard | US-060→062 | FR-DSH-001→007 | 9 | API, E2E, UI, perf |
| **Trung bình** | Việc hằng ngày | US-045, 050→053 | FR-RT-001→007 | 9 | API, E2E, timezone |
| **Trung bình** | Analytics | FR-ANL-001→006 | 6 FR | 10 | API, DB, privacy |
| **Thấp** | Cài đặt, i18n, empty state | US-005, 008, 007 | FR-AUTH-010/011/015/016, FR-GEN-002/012 | 6 | UI, E2E |
| **Thấp** | Job bảo trì | S6-06 | FR-NTF-011, SD-013/021 | 6 | Integration, OPS |

### 4.2 Ma trận tính năng theo cấp độ

| Tính năng | Unit | Integration | API | E2E | UAT | Regression |
|---|---|---|---|---|---|---|
| AUTH | Thuật toán token, chuẩn hóa email | Session, token, RLS, unique | 18 FR | 6 luồng | E1 | R2 |
| PET | Tuổi | CRUD, cascade, media | 8 FR | 4 luồng | E2 | R3 |
| WGT | Biên số, format | Numeric, query | 10 FR | 4 luồng | E3 | R4 |
| VIS | Validate | Keyset, cascade ảnh | 8 FR | 4 luồng | E4 | R4 |
| MS | Cộng tháng, state machine | Transaction, unique | 13 FR | 7 luồng | E5 | R5 |
| NTF | appearOn, level, label | Sync, unique, 90 ngày | 11 FR | 6 luồng | E5 | R5 |
| RT | Ngày địa phương | Completion unique | 7 FR | 4 luồng | E6 | R6 |
| DSH | — | Aggregate | 7 FR | 4 luồng | E7 | R6 |
| GEN | Format, idempotency | Transaction | 13 FR | 5 luồng | E1/E7 | R1 |
| ANL | Allowlist | Partition, view | 6 FR | 2 luồng | E8 | R8 |
| SOC | Username, threshold, nén ảnh | RLS, feed cursor, unique | 40 FR | 12 luồng | E8 | R8 |
| Media/OPS | — | HEIC/EXIF, job | — | 3 luồng | E2/E4 | R3/R5 |

### 4.3 Thuộc tính chất lượng

| Thuộc tính | NFR | Cách kiểm | Gate |
|---|---|---|---|
| Hiệu năng | PERF-001→007 | Lighthouse, k6, size-limit, Mailpit | G-6, G-7, G-8 |
| Bảo mật | SEC-001→014 | IDOR, OWASP, ZAP (S7), audit/OSV, kiểm cookie/CSP | G-9→G-12 |
| Độ tin cậy | REL-001, 003 | Test song song, restart, job idempotent | G-15 |
| Khả dụng | USA-001→007 | axe, bàn phím, screen reader, đo thao tác | G-4 |
| Bảo trì | MNT-001→006 | depcruise, coverage, contract, typecheck | G-2, G-17 |
| Khả chuyển | PRT-001→005 | Emulation + thiết bị thật (S7) | G-4 |
| Tuân thủ | SEC-012 | Rà soát pháp lý độc lập | Trước public |

### 4.4 Giao diện và trạng thái phải kiểm

| Thành phần | Trạng thái / luồng |
|---|---|
| Auth | loading, lỗi chung, lỗi trường, token hết hạn/đã dùng, thành công, redirect `next` |
| Dashboard | có nhắc, không nhắc, chưa xác minh, chưa có bé, "Tất cả"/từng bé, loading |
| Milestone | 4 nhóm, quá hạn, sắp tới, đã thực hiện, đã hủy, hoàn tác 10 s |
| Notification | chưa xem, đã xem, đã xử lý, badge 0/1/9+, 2 tab, polling 30 s |
| Routine | 0/20 việc, xong/chưa xong, rollback, qua 00:00 |
| Media | đang tải, xử lý, lỗi, thử lại, ảnh >5 MB, HEIC, lightbox |
| Post | draft, đang đăng, published, ảnh lỗi, bỏ ảnh, last photo |
| Social | chưa hồ sơ, feed rỗng, bị chặn, 404, hết bài, có bài mới |
| Toàn hệ thống | offline, timeout 10 s, 5xx, 404, mất phiên, bản nháp |

## 5. Tính năng không kiểm thử (5.5)

| ID | Tính năng / hạng mục | Lý do | Rủi ro | Kiểm soát thay thế | Ảnh hưởng gate |
|---|---|---|---|---|---|
| NT-01 | Backup/restore, RPO/RTO | DEC-020, chưa làm; G-13 rút | Cao nếu mở public | Cảnh báo, không mở cho người ngoài; lập kế hoạch trước public | G-13 withdrawn |
| NT-02 | Giám sát/cảnh báo vận hành | DEC-017; G-16/NFR-REL-004 rút | TB | Healthcheck, log, kiểm thủ công | G-16 withdrawn |
| NT-03 | Email nhắc ra ngoài | DEC-016; SD-010 rút | Thấp | Nhắc trong app đã kiểm | — |
| NT-04 | Báo cáo/kiểm duyệt nội dung | SD-017 | TB | Chặn + rate limit; gỡ thủ công bằng SQL | — |
| NT-05 | Dark mode | S6-04 quyết định chỉ giao diện sáng | Thấp | Kiểm giao diện sáng | — |
| NT-06 | Cloudflare R2 + production storage | F-01 chưa làm, S7 | Cao | Test local filesystem; đánh dấu Pending | FG-6 pending |
| NT-07 | HTTPS/HSTS/WAF/Cloudflare production | Chưa có prod | Cao | Kiểm header ở dev; ZAP/TLS ở S7 | G-10 pending |
| NT-08 | Gmail/Outlook deliverability | Chưa có SMTP Gmail | TB | Mailpit; kiểm thủ công S7 | G-14 pending |
| NT-09 | Thiết bị thật (iPhone/iPad/Android) | Chưa có thiết bị | TB | Emulation Chromium; kiểm thủ công trước public | G-4 pending |
| NT-10 | Load test production | Chưa có prod | TB | k6 trên dev/staging khi có | G-7 pending |
| NT-11 | Penetration test độc lập | Chưa có ngân sách | TB | ZAP baseline + checklist OWASP | G-12 partial |
| NT-12 | Tuân thủ pháp lý đầy đủ | Cần chuyên gia | Cao | Rà soát trước khi mở public | NFR-SEC-012 |
| NT-13 | Ứng dụng native/PWA/push | Chưa làm | Thấp | Không kiểm | — |
| NT-14 | Thanh toán/gói cước/đa người thuê | Ngoài phạm vi sản phẩm | — | Không kiểm | — |
| NT-15 | Stress >2× tải, soak >2 h, chaos | Ngoài phạm vi GĐ1 | Thấp | Load test 50 req/s × 10 phút | — |
| NT-16 | Migration từ hệ thống cũ | Không có legacy | — | Chỉ migration DB rỗng | — |

> **Nguyên tắc:** Không có mục nào bị bỏ qua mà không có lý do, rủi ro và người chấp nhận. Các mục Pending phải xuất hiện trong báo cáo phát hành.

## 6. Cách tiếp cận (5.6)

### 6.1 Nguyên tắc

1. **Risk-based:** P0 và rủi ro cao (mốc/nhắc, quyền, media, Bản tin) được test trước và sâu nhất.
2. **Test pyramid:** nhiều unit/integration nhanh; API là tầng chính; E2E chỉ cho luồng có giá trị cao; UAT theo story.
3. **Automation-first, manual-for-judgment:** tự động hóa hồi quy; thủ công cho thiết bị, screen reader, thẩm mỹ, khám phá.
4. **Shift-left:** business rule thuần được test trước khi nối DB/UI; contract kiểm mỗi PR.
5. **Một nguồn sự thật:** FR/NFR lấy SRS; AC lấy User Stories; API lấy `openapi.yaml`; gate lấy PRD.
6. **Bằng chứng trung thực:** test không chạy = Pending/Blocked, không suy ra Pass từ việc "code đã xong".

### 6.2 Cấp độ kiểm thử

| Cấp độ | Mục tiêu | Phạm vi | Công cụ | Điều kiện vào | Điều kiện ra | Bằng chứng |
|---|---|---|---|---|---|---|
| **Unit** | Đúng thuật toán/quy tắc, nhanh | Hàm thuần, use case với port giả, validation | Vitest, V8 coverage | Code build, lint pass | 100% case Pass; coverage domain ≥90%, tổng ≥70% | `coverage/`, log Vitest |
| **Integration** | Đúng DB/RLS/transaction/media | Repository, migration, RLS, unique, pipeline, job | Vitest + Testcontainers PostgreSQL 16 | Docker + migration | 100% case Pass; RLS/IDOR pass | Log integration, DB snapshot |
| **Contract** | API khớp tài liệu, không breaking | 86 operation, schema, lỗi | `openapi:gen`, api-client gen, oasdiff, Schemathesis (S7) | OpenAPI sinh được | Không diff; không breaking; Schemathesis 0 lỗi 5xx | CI log/diff |
| **API** | Đúng hành vi HTTP, quyền, lỗi | 86 operation + negative/IDOR | Playwright APIRequest, Vitest route | API + DB test chạy | 100% operation có case; P0 Pass | Report API |
| **System/E2E** | Luồng người dùng thật | Luồng G-3, Bản tin, auth, CRUD, offline | Playwright, FakeClock, Mailpit | API 3100, web 5174, DB E2E, Mailpit | 100% luồng critical Pass; 0 flake sau 2 lần | `.data/e2e-report` |
| **Acceptance/UAT** | Đáp ứng nhu cầu nghiệp vụ | 50 story/AC | Checklist + demo + AC matrix | Build ứng viên, dữ liệu UAT | 100% AC P0 Pass; P1 ≥95%; PO ký | Biên bản UAT |
| **Regression** | Không vỡ chức năng cũ | R1→R3 | Playwright + Vitest + manual | Build mới | 100% R1/R2 Pass; R3 ≥98% | Report regression |

### 6.3 Loại kiểm thử

| Loại | ID prefix | Phạm vi | Công cụ / chuẩn | Điều kiện vào | Điều kiện ra |
|---|---|---|---|---|---|
| Chức năng | `TC-*` | 141 FR, 50 story | Vitest, Playwright | Build + DB | P0 100%, P1 ≥95% |
| Tích hợp | `DB-*`, `INT-*` | DB, RLS, media, job, mail | Testcontainers, Mailpit | Docker | 100% Pass |
| Hợp đồng | `CON-*` | OpenAPI, api-client, problem+json | oasdiff, Schemathesis | OpenAPI sinh | 0 diff/breaking |
| Hệ thống/E2E | `E2E-*` | Luồng người dùng | Playwright | Môi trường E2E | 100% critical Pass |
| Chấp nhận | `UAT-*` | 50 story | Checklist Given/When/Then | Ứng viên phát hành | PO ký |
| Hồi quy | `REG-*` | P0/P1 + mô-đun bị ảnh hưởng | Playwright + Vitest | Build mới | R1/R2 100%, R3 ≥98% |
| Hiệu năng | `PERF-*` | NFR-PERF-001→007 | Lighthouse, k6, size-limit | Seed SD-011 | Đạt ngưỡng hoặc Pending |
| Bảo mật | `SEC-*` | NFR-SEC-001→014, OWASP | IDOR suite, ZAP, audit, OSV, gitleaks | Build + DB | 0 High/Critical; IDOR 100% |
| Accessibility | `ACC-*` | NFR-USA-001→003, WCAG 2.1 AA | axe, bàn phím, NVDA/VoiceOver | UI ổn định | 0 serious/critical; manual Pass |
| UI/UX | `UI-*` | 25 màn, 7 breakpoint, state | So khớp Blueprint, checklist | UI ổn định | 100% màn đạt checklist |
| Độ tin cậy | `REL-*` | NFR-REL-001/003, G-15 | Test song song, restart, job | DB + worker | Không trùng/mất |
| Khả năng bảo trì | `MNT-*` | NFR-MNT-001→006 | lint, typecheck, depcruise, coverage, contract | Code | Tất cả gate CI Pass |
| Dữ liệu/DB | `DB-*` | Migration, RLS, cascade, constraint | Testcontainers | DB rỗng | 100% Pass |
| Vận hành | `OPS-*` | Health, job, purge, capacity | Script + integration | Môi trường | 100% Pass hoặc Pending |

### 6.4 Kỹ thuật thiết kế test

| Kỹ thuật | Áp dụng |
|---|---|
| Phân vùng tương đương | Email, mật khẩu, cân nặng, ngày, chu kỳ, username, caption |
| Giá trị biên | 7/8/128/129 ký tự; 0/0,1/150/150,1; 0/1/5 ảnh; 0/1/20/21 việc; 1/60/61 tháng; 19/20/21 mục |
| Bảng quyết định | D7/D1/OVERDUE × `due_set_on` × ngày mở app (9 ca SRS) |
| Chuyển trạng thái | Milestone `PENDING→DONE→PENDING` (10 s), post `DRAFT→PUBLISHED`, upload |
| Pairwise | Trình duyệt × viewport × ngôn ngữ × trạng thái dữ liệu |
| Phân tích nguyên nhân gốc | Defect lặp, flaky test, lỗi timezone |
| Đoán lỗi | IDOR, thiếu CSRF, double submit, back button, refresh giữa luồng |
| Kiểm thử khám phá | 60–90 phút/phiên trên luồng P0 và Bản tin |
| Kiểm thử dựa trên mô hình | State machine milestone/notification/post |
| Property-based (khuyến nghị) | Cộng tháng lịch, tuổi, chuẩn hóa username |

### 6.5 Chiến lược dữ liệu kiểm thử

| Nhóm | Dữ liệu | Mục đích |
|---|---|---|
| Tài khoản | A `qa.a+<run>@example.test`, B, C; mật khẩu test riêng | IDOR, social 3 tài khoản, xóa tài khoản |
| Thú cưng | Mochi (Poodle, 2019-03-15), Bơ (British Shorthair, 2026-05-01), 8 bé phụ | Tuổi, giới hạn 10, ảnh |
| Cân nặng | 9,2; 0,1; 150; 9,25 (lỗi); nhiều điểm cùng ngày | Biên, biểu đồ, mục tiêu |
| Sổ y tế | 25 bản ghi (2 trang), có/không ảnh, triệu chứng/chẩn đoán rỗng | Phân trang, validate, cascade |
| Mốc | Hạn T0−1, T0, T0+1, T0+7, T0+8, T0+30; không chu kỳ; 1/12/60 tháng | D7/D1/OVERDUE, cộng tháng |
| Việc | 0, 1, 20 việc; giờ 00:00/23:59 | Checklist, giới hạn |
| Media | `small.jpg`, `6mb.jpg`, `12mb.heic`, `gps.jpg`, `fake.jpg` (text đổi đuôi), `corrupt.heic`, `50mb.jpg` | Pipeline, bảo mật, nén |
| Social | A có 2 bài (2 ảnh + 1 ảnh), B/C theo dõi, tim, bình luận, chặn | Feed, đếm, thông báo, chặn |
| Hiệu năng | 1.000 user, 10.000 bé, 50.000 mốc; 50 follow/200 bài | SD-011, p95 |
| Thời gian | `FakeClock` T0 = 2026-11-01 09:00 `Asia/Ho_Chi_Minh`; đổi sang `America/New_York` cho DST | Biên ngày, múi giờ |

**Quy tắc dữ liệu**

- Chỉ dữ liệu tổng hợp; không dùng email/số điện thoại/ảnh thật của người khác.
- Mỗi lần chạy dùng prefix duy nhất để tránh trùng email/username.
- DB E2E `pethealth_e2e` tách khỏi DB dev `pethealth`; reset trước suite.
- `FakeClock` chỉ bật khi `NODE_ENV=test`; không gọi endpoint test ở môi trường khác.
- Mailpit nhận toàn bộ email; xóa hộp thư trước mỗi case email.
- Ảnh/DB test nằm trong `.data/` và không commit.

### 6.6 Tự động hóa và CI

| Khi nào | Chạy gì | Gate |
|---|---|---|
| Mỗi PR | format, lint, typecheck, depcruise, unit + coverage, integration (Testcontainers), contract diff, audit/OSV/gitleaks, size | CI xanh |
| Trước merge P0 | Thêm API smoke + IDOR suite | Không hồi quy |
| Hằng ngày (khuyến nghị) | E2E API + UI phone/tablet, axe | 0 fail critical |
| Trước phát hành | Full E2E, regression, perf, ZAP, Schemathesis, UAT | §7.4 |
| Sau deploy (khi có) | Smoke G-3, healthcheck, kiểm media | S7 |

**Quy ước automation**

- E2E chạy `workers: 1` vì FakeClock dùng chung; retries 0; trace khi fail.
- Mỗi test E2E tự tạo dữ liệu, không phụ thuộc thứ tự; dọn dẹp hoặc dùng DB riêng.
- Test API ưu tiên `APIRequestContext`; test UI chỉ cho luồng người dùng.
- Không mock server trong E2E; chỉ mock thời gian và email.
- Test IDOR dùng fixture sinh tự động cho mọi route có path parameter.

### 6.7 Điều kiện vào/ra tổng hợp

| Cấp độ | Vào | Ra |
|---|---|---|
| Unit | `pnpm install`, lint/typecheck pass | Tất cả Pass; coverage đạt |
| Integration | Docker/Testcontainers, migration chạy | Tất cả Pass; RLS/IDOR Pass |
| Contract | OpenAPI sinh được, base branch có | Không diff; oasdiff không ERR |
| API | API + DB + worker + Mailpit | 86/86 operation; P0 Pass |
| E2E | Web + API 3100/5174 + DB E2E + Mailpit + FakeClock | Luồng critical Pass; không flake |
| UAT | Ứng viên + dữ liệu + PO | AC P0 100%; PO ký |
| Perf | Seed SD-011, môi trường ổn định | Ngưỡng NFR hoặc Pending |
| Security | Build + DB + quyền truy cập | 0 High/Critical; IDOR 100% |
| Accessibility | UI ổn định | axe 0 serious/critical; manual Pass |
| Regression | Build mới + bộ R1/R2 | 100% R1/R2; R3 ≥98% |

### 6.8 Truy vết và quy tắc phủ

- Mỗi FR phải có **ít nhất một** `TC-<MOD>-<số>`; FR P0 phải có thêm case âm/boundary và E2E/UAT nếu là luồng người dùng.
- Mỗi NFR phải có case hoặc quyết định chấp nhận có chữ ký.
- Mỗi story phải có UAT; mỗi AC P0 phải được ánh xạ tới ít nhất một bước kiểm.
- Mỗi operation trong `openapi.yaml` phải có case API và nằm trong contract test.
- Mỗi gate G-1→G-18/FG-1→FG-6 phải có dòng trạng thái + bằng chứng (Phụ lục A).
- **Phủ thiết kế** (design coverage) khác **phủ thực thi** (execution coverage). Tài liệu này đạt 100% phủ thiết kế; phủ thực thi được cập nhật theo từng chu kỳ.

### 6.9 Quản lý defect

| Trạng thái | Ý nghĩa |
|---|---|
| New | Mới ghi nhận, chưa phân loại |
| Triaged | Đã xác nhận, có severity/priority, owner |
| In Progress | Đang sửa |
| Fixed | Đã sửa, chờ retest |
| Verified | Retest Pass |
| Closed | Đóng sau regression |
| Deferred | Chấp nhận hoãn, có lý do + người duyệt |
| Rejected | Không phải lỗi / không tái hiện |

**Mẫu defect:** ID, tiêu đề, môi trường/build, precondition, bước, kỳ vọng, thực tế, severity, priority, FR/TC liên quan, log/ảnh, người phát hiện, người sửa, trạng thái.

### 6.10 Chỉ số đo

| Chỉ số | Công thức | Mục tiêu |
|---|---|---|
| Design coverage FR | FR có case / 141 | 100% |
| Design coverage NFR | NFR có case/quyết định / 41 | 100% |
| Story coverage | Story có UAT / 50 | 100% |
| API coverage | Operation có case / 86 | 100% |
| Execution coverage | Case đã chạy / case trong phạm vi | ≥95% |
| Pass rate | Pass / executed | P0 100%, P1 ≥95% |
| Automation rate | Case tự động / case chạy được | ≥70% (mục tiêu) |
| Defect density | Defect / 10 FR | Theo dõi, không áp KPI cứng |
| Defect leakage | Defect phát hiện sau UAT / tổng | 0 P0/P1 |
| Flake rate | Lần fail không do sản phẩm / tổng lần chạy | <2% |
| Blocked rate | Blocked / tổng case | <10% (trừ gate Pending) |
| Thời gian sửa S1/S2 | Từ triage đến verified | S1 ≤1 ngày, S2 ≤3 ngày |

## 7. Tiêu chí đạt/không đạt (5.7)

### 7.1 Trạng thái test case

| Trạng thái | Định nghĩa |
|---|---|
| **Pass** | Kết quả thực tế khớp 100% kỳ vọng; không có lỗi phụ |
| **Fail** | Khác kỳ vọng, crash, sai mã lỗi/trạng thái, rò dữ liệu |
| **Blocked** | Không chạy được vì môi trường/dữ liệu/quyền; có lý do |
| **Pending** | Chưa đến lịch hoặc phụ thuộc gate chưa có (staging/production) |
| **Not Run** | Chưa thực thi, không thuộc phạm vi chu kỳ |
| **N/A** | Không áp dụng, có lý do (ví dụ dark mode đã bỏ) |

### 7.2 Tiêu chí đạt cho một hạng mục

Một hạng mục (FR/module/build) đạt khi:

1. 100% case P0 Pass; ≥95% case P1 Pass; không còn S1/S2 mở.
2. Không có case Fail chưa được triage.
3. Không có Blocked/Pending thuộc phạm vi phát hành mà chưa được chấp nhận.
4. Bằng chứng (log/report/ảnh) được lưu và liên kết.
5. Với NFR: đạt ngưỡng hoặc có quyết định chấp nhận rủi ro có chữ ký.

### 7.3 Tiêu chí ra từng cấp độ

| Cấp độ | Đạt khi |
|---|---|
| Unit | 100% Pass; domain/platform calendar ≥90% dòng; tổng ≥70% |
| Integration | 100% Pass; RLS/IDOR/constraint Pass; migration từ DB rỗng Pass |
| Contract | `openapi.yaml` không diff; api-client không diff; oasdiff không ERR; Schemathesis 0 lỗi 5xx (S7) |
| API | 86/86 operation có case; P0 100%; lỗi đúng `problem+json`; IDOR 100% |
| E2E | 100% luồng critical Pass; chạy lặp 2 lần không flake; trace có khi fail |
| UAT | 50/50 story có kết quả; AC P0 100%; PO ký |
| Perf | Đạt tất cả ngưỡng, hoặc Pending có kế hoạch đo |
| Security | 0 High/Critical; IDOR 100%; secret scan sạch; ZAP baseline 0 High (S7) |
| Accessibility | axe 0 serious/critical; bàn phím/screen reader Pass; 44 px |
| Regression | R1/R2 100%; R3 ≥98%; không hồi quy P0 |

### 7.4 Tiêu chí phát hành

Chỉ đề xuất phát hành khi:

- **Bắt buộc:** 61/61 FR P0 Pass; 100% AC P0 Pass; 0 defect S1/S2 mở; IDOR 136/136; contract không breaking; bundle <250 KB; không rò PII.
- **Bắt buộc hoặc chấp nhận:** 41/41 NFR có bằng chứng hoặc quyết định chấp nhận; các gate G-4/G-6/G-7/G-10/G-14 nếu chưa đo phải ghi Pending và không được coi là đạt.
- **UAT:** 50/50 story có kết quả; P1 ≥95%; các story Fail phải có quyết định.
- **Tài liệu:** báo cáo test, danh sách known issues, hướng dẫn vận hành, rollback.
- **Ký:** PO + Dev + QA.

### 7.5 Phân loại severity/priority

| Severity | Định nghĩa | Ví dụ | SLA |
|---|---|---|---|
| **S1 — Blocker** | Mất dữ liệu, lộ dữ liệu, bypass auth, sập toàn hệ thống, không thể dùng | B xem được sổ y tế A; mất mốc; không đăng nhập được | Sửa ngay, chặn phát hành |
| **S2 — Critical** | Luồng P0 hỏng, không có workaround | Không tạo được mốc; nhắc không xuất hiện; feed trắng | ≤3 ngày |
| **S3 — Major** | Chức năng P1 hỏng hoặc P0 có workaround | Sai thứ tự nhóm mốc; lỗi i18n; ảnh không nén | Trước phát hành hoặc chấp nhận |
| **S4 — Minor** | Thẩm mỹ, văn bản, hiếm gặp | Lệch 2 px; chữ thừa | Backlog |

| Priority | Ý nghĩa |
|---|---|
| P0 | Sửa trước khi merge/phát hành |
| P1 | Sửa trong sprint hiện tại |
| P2 | Sửa sprint sau |
| P3 | Backlog |

## 8. Tạm dừng và tiếp tục (5.8)

### 8.1 Điều kiện tạm dừng

Tạm dừng toàn bộ hoặc một phần khi:

1. Phát hiện **S1** (rò dữ liệu, bypass auth, mất dữ liệu) → dừng ngay, bảo toàn bằng chứng.
2. Môi trường test không dùng được >4 giờ (DB/Mailpit/API/web) mà không có phương án.
3. Build không chạy hoặc migration hỏng >1 ngày.
4. >30% case trong chu kỳ bị Blocked vì cùng một nguyên nhân.
5. Dữ liệu test bị nhiễm/bẩn không thể reset.
6. FakeClock/Mailpit/Testcontainers hỏng, làm kết quả không tin cậy.
7. Yêu cầu thay đổi phạm vi chưa được baseline lại.

### 8.2 Điều kiện tiếp tục

1. Nguyên nhân dừng được xác định và khắc phục.
2. Fix được verify bằng case tối thiểu + regression liên quan.
3. Môi trường xanh lại: healthcheck, DB, mail, worker.
4. Dữ liệu được reset/seed lại; clock về T0.
5. Người phụ trách xác nhận bằng văn bản (ghi chú trong báo cáo chu kỳ).

### 8.3 Xử lý khi tạm dừng

- Ghi thời điểm, lý do, case bị ảnh hưởng, bằng chứng.
- Không chạy tiếp các case phụ thuộc dữ liệu bẩn.
- Thông báo PO/Dev trong ngày.
- Khi tiếp tục, chạy lại smoke R1 trước khi chạy phần còn lại.

## 9. Sản phẩm bàn giao (5.9)

| ID | Sản phẩm | Định dạng | Thời điểm | Người nhận |
|---|---|---|---|---|
| DEL-01 | Master Test Plan (tài liệu này) | Markdown | Đầu dự án | PO/Dev |
| DEL-02 | Đặc tả test case + ma trận | Markdown | Trước C0 | PO/Dev |
| DEL-03 | Bộ unit test + báo cáo coverage | TS + HTML | Mỗi PR | CI/Dev |
| DEL-04 | Bộ integration/DB test | TS + log | Mỗi PR | CI/Dev |
| DEL-05 | Bộ API/contract test | TS + report | Mỗi PR | CI/Dev |
| DEL-06 | Bộ E2E Playwright | TS + HTML report | Mỗi chu kỳ | PO/Dev |
| DEL-07 | Báo cáo axe + checklist a11y | JSON/Markdown | Mỗi chu kỳ | PO/Dev |
| DEL-08 | Báo cáo hiệu năng (Lighthouse/k6) | HTML/JSON | C2–C3 | PO/Dev |
| DEL-09 | Báo cáo bảo mật (IDOR, audit, ZAP) | Markdown | C2–C3 | PO/Dev |
| DEL-10 | Nhật ký defect | Markdown/CSV | Liên tục | PO/Dev |
| DEL-11 | Báo cáo chu kỳ test | Markdown | Cuối mỗi chu kỳ | PO |
| DEL-12 | Biên bản UAT + chữ ký | Markdown/PDF | Cuối C3 | PO |
| DEL-13 | Danh sách known issues + rủi ro chấp nhận | Markdown | Trước phát hành | PO |
| DEL-14 | Khuyến nghị phát hành | Markdown | Cuối C3 | PO |
| DEL-15 | Bằng chứng gate G/FG | Markdown + link | Trước phát hành | PO |
| DEL-16 | Hướng dẫn chạy test | Markdown | C0 | Dev/QA |
| DEL-17 | Dữ liệu test/seed | SQL/TS | C0 | QA |
| DEL-18 | Bài học kinh nghiệm | Markdown | Sau phát hành | PO/Dev |

## 10. Nhiệm vụ kiểm thử (5.10)

| ID | Nhiệm vụ | Pha | Phụ thuộc | Công sức (người-ngày) | Đầu ra |
|---|---|---|---:|---:|---|
| T-01 | Chốt baseline tài liệu, phạm vi, gate | Lập kế hoạch | — | 0,5 | MTP v1.0 |
| T-02 | Thiết kế test case FR/NFR/API/story | Lập kế hoạch | T-01 | 3 | Test_Cases.md |
| T-03 | Review truy vết 141 FR/41 NFR/50 story/86 API | Lập kế hoạch | T-02 | 1 | Ma trận đã duyệt |
| T-04 | Chuẩn bị dữ liệu, fixture ảnh, seed SD-011 | Chuẩn bị | T-01 | 1 | Seed/fixture |
| T-05 | Kiểm tra môi trường dev/CI/E2E | Chuẩn bị | T-01 | 0,5 | Checklist môi trường |
| T-06 | Chạy unit + coverage, đối chiếu G-2 | C0 | T-05 | 1 | Báo cáo coverage |
| T-07 | Chạy integration/DB/RLS | C0 | T-05 | 1,5 | Báo cáo integration |
| T-08 | Chạy contract + oasdiff + api-client | C0 | T-05 | 0,5 | Báo cáo contract |
| T-09 | Rà soát API 86 operation, bổ sung case thiếu | C0 | T-02, T-08 | 1 | API report |
| T-10 | Chạy E2E API + UI phone/tablet | C1 | T-06, T-07 | 2 | E2E report |
| T-11 | Chạy axe + kiểm bàn phím/screen reader | C1 | T-10 | 1,5 | A11y report |
| T-12 | Kiểm UI/UX 25 màn, 7 breakpoint, vi/en | C1 | T-10 | 2 | UI checklist |
| T-13 | Kiểm bảo mật: IDOR, auth, CSRF, rate limit, XSS | C2 | T-09 | 2 | Security report |
| T-14 | Chạy Lighthouse mobile | C2 | T-10 | 0,5 | Lighthouse report |
| T-15 | Chạy k6 tải SD-011 | C2 | T-04 | 1,5 | k6 report |
| T-16 | Kiểm độ tin cậy: song song, restart, job, 90 ngày | C2 | T-07 | 1 | Reliability report |
| T-17 | Regression R1 (smoke P0) | C2, C3 | T-10 | 0,5/lần | Regression log |
| T-18 | Regression R2 (theo mô-đun) | C3 | T-17 | 1,5 | Regression log |
| T-19 | Regression R3 (đầy đủ) | C3 | T-18 | 2 | Regression log |
| T-20 | UAT 50 story + demo | C3 | T-19 | 2 | Biên bản UAT |
| T-21 | Kiểm thiết bị thật (S7) | S7 | Thiết bị | 1 | Device report |
| T-22 | ZAP baseline + Schemathesis (S7) | S7 | Staging | 1,5 | Security/contract report |
| T-23 | Kiểm Gmail/Outlook deliverability (S7) | S7 | SMTP Gmail | 0,5 | Email report |
| T-24 | Kiểm HTTPS/HSTS/WAF/R2 (S7) | S7 | Production | 1 | Ops report |
| T-25 | Tổng hợp gate + known issues | Trước phát hành | T-19, T-20 | 1 | Gate dashboard |
| T-26 | Khuyến nghị phát hành + họp sign-off | Trước phát hành | T-25 | 0,5 | Release recommendation |
| T-27 | Viết bài học kinh nghiệm | Sau phát hành | T-26 | 0,5 | Retrospective |
| T-28 | Cập nhật test plan/case cho thay đổi | Liên tục | Thay đổi | 0,5/thay đổi | Phiên bản mới |

**Tổng công sức ước tính:** ~35 người-ngày cho phạm vi dev + CI + UAT; ~6 người-ngày cho S7 khi có môi trường. Đây là ước tính cho một người + hỗ trợ AI, chưa gồm thời gian sửa defect.

## 11. Nhu cầu môi trường (5.11)

### 11.1 Môi trường

| ID | Môi trường | Thành phần | Phiên bản / cấu hình | Trạng thái | Dùng cho |
|---|---|---|---|---|---|
| ENV-01 | Dev local | Windows 11, Node 22, pnpm 12.15, PostgreSQL 16 (ServBay), Mailpit, API 3000, web 5173 | Node ≥22 <23; DB `pethealth`; Mailpit 8025 | **Có** | Unit, integration, API thủ công, UI dev |
| ENV-02 | CI | GitHub Actions `ubuntu-latest`, Node 22, pnpm, PostgreSQL 16 Testcontainers | Theo `.nvmrc`, `ci.yml` | **Có** (chưa xác nhận lần chạy GitHub gần nhất) | Lint, unit, integration, contract, security, size |
| ENV-03 | E2E local | API 3100, web 5174, DB `pethealth_e2e`, Mailpit, FakeClock, Chromium Playwright | `NODE_ENV=test`, `workers: 1`, viewport 390×844 và 834×1112 | **Có** | E2E API + UI, axe |
| ENV-04 | Staging | Máy chủ riêng + Cloudflare Access, image GHCR, SMTP Gmail | S2-06 bỏ qua | **Không có** | G-4/G-6/G-7/G-10/G-14, ZAP, Schemathesis |
| ENV-05 | Production | `ph-prod`, Caddy, Cloudflare Tunnel, R2 | S7 chưa làm; F-01 chưa làm | **Không có** | Smoke, TLS, R2, deliverability |
| ENV-06 | Device lab | iPhone Safari, iPad 10,5" Safari, Android Chrome, desktop Chrome | Thiết bị thật | **Không có** | G-4, cảm ứng, xoay ngang |

### 11.2 Công cụ

| Nhóm | Công cụ | Phiên bản / ghi chú |
|---|---|---|
| Unit/integration | Vitest, `@vitest/coverage-v8`, Testcontainers | Theo `package.json` |
| E2E | Playwright, `@axe-core/playwright` | Chromium; config `e2e/playwright.config.ts` |
| Contract | `openapi-typescript`, `openapi-fetch`, oasdiff, Schemathesis (S7) | OpenAPI 1.0.0 |
| Hiệu năng | Lighthouse, k6, `size-limit` | k6 cài khi chạy C2 |
| Bảo mật | IDOR suite, `pnpm audit`, OSV-Scanner, gitleaks, OWASP ZAP (S7) | CI + local |
| Email | Mailpit | 8025 |
| DB | PostgreSQL 16, `psql`, migration Kysely | ServBay/Testcontainers |
| Quản lý | Git, GitHub Actions, Markdown | — |

### 11.3 Yêu cầu kỹ thuật và an toàn

- Máy dev có Docker (cho Testcontainers/Mailpit) và PostgreSQL 16.
- Cổng 3000/3100/5173/5174/5432/8025 không bị chiếm.
- Dung lượng trống ≥10 GB cho media/seed/log.
- Không dùng dữ liệu cá nhân thật; không commit `.env`, ảnh, DB dump.
- Quyền DB: `app_rw` (RLS), `app_worker` (BYPASSRLS), `ph_owner` (migration) — test phải dùng đúng role.
- Staging/production khi có: truy cập qua Cloudflare Access, không mở DB ra Internet.

## 12. Trách nhiệm (5.12)

### 12.1 Vai trò

| Vai trò | Người | Trách nhiệm chính |
|---|---|---|
| Product Owner (PO) | Việt | Chốt phạm vi, ưu tiên, AC, UAT, chấp nhận rủi ro, ký phát hành |
| Developer (Dev) | Việt | Sửa defect, migration, API, UI, job, cấu hình môi trường |
| QA Lead / Tester | Việt + Claude | Thiết kế case, thực thi, báo cáo, truy vết, gate |
| DevOps | Việt | CI, Docker, DB, Mailpit, staging/production, backup (khi có) |
| Security reviewer | Bên ngoài (khi mở public) | Rà soát OWASP, ZAP, cấu hình TLS/Cloudflare |
| Accessibility reviewer | Claude + kiểm thủ công | axe, bàn phím, screen reader, WCAG |
| Người phê duyệt cuối | Việt | Ký MTP, UAT, phát hành |

### 12.2 Ma trận RACI

> R = Responsible, A = Accountable, C = Consulted, I = Informed.

| Hoạt động | PO | Dev | QA | DevOps | Security | A11y |
|---|---|---|---|---|---|---|
| Chốt phạm vi/gate | A/R | C | C | I | I | I |
| Thiết kế test case | C | C | A/R | I | C | C |
| Unit/integration | I | A/R | C | I | I | I |
| Contract/API | I | A/R | R | I | C | I |
| E2E/UI | I | C | A/R | C | I | C |
| Hiệu năng | I | C | A/R | C | I | I |
| Bảo mật | A | R | R | C | C | I |
| Accessibility | I | C | R | I | I | A/R |
| UAT | A/R | C | R | I | I | C |
| Staging/production | I | R | C | A/R | C | I |
| Báo cáo/gate | A | C | R | C | C | C |
| Ký phát hành | A/R | C | C | C | C | I |

**Kiêm nhiệm:** Dự án một người, Việt giữ nhiều vai trò. Giảm thiểu bằng: tự động hóa CI, review độc lập của AI, checklist có bằng chứng, và security review bên ngoài trước khi mở public.

## 13. Nhân sự và đào tạo (5.13)

### 13.1 Nhân sự

| Vai trò | Số lượng | Thời lượng | Ghi chú |
|---|---:|---|---|
| PO/Dev/QA | 1 FTE | 4 tuần test + S7 | Việt |
| Hỗ trợ QA Architect (AI) | 0,5 FTE | 4 tuần | Thiết kế case, review, sinh báo cáo |
| Security reviewer | 1 | 2 ngày (S7) | Thuê ngoài khi mở public |
| A11y reviewer | 1 | 1 ngày | Kiểm screen reader thủ công |

### 13.2 Kỹ năng và đào tạo

| Kỹ năng | Mức cần | Đào tạo / nguồn |
|---|---|---|
| Vitest, Testcontainers | Trung bình | Docs + code hiện có |
| Playwright, trace, FakeClock | Trung bình–cao | `e2e/` hiện có, Playwright docs |
| axe/WCAG 2.1 AA | Trung bình | axe docs, checklist nội bộ |
| k6/Lighthouse | Cơ bản | Hướng dẫn trong `Test_Cases.md` §13 |
| OWASP Top 10, ZAP | Cơ bản | OWASP ASVS, ZAP baseline |
| PostgreSQL RLS | Trung bình | SAD §2.3, migration/test hiện có |
| IEEE 829/29119 | Cơ bản | Tài liệu này + prompt |
| Tiếng Việt/Anh (i18n) | Trung bình | Chuỗi `vi.ts`/`en.ts` |

## 14. Lịch trình (5.14)

### 14.1 Giả định

- Bắt đầu 2026-10-27; làm 5 ngày/tuần.
- Code GĐ1 + GĐ2 đã có trên dev; không chờ phát triển tính năng mới.
- Staging/production chưa có; các gate phụ thuộc được đánh dấu Pending và chuyển sang S7.
- Thời gian sửa defect nằm ngoài lịch test; nếu S1/S2 phát sinh, lịch dừng và lùi tương ứng.

### 14.2 Chu kỳ

| Chu kỳ | Thời gian | Trọng tâm | Đầu ra |
|---|---|---|---|
| **C0 — Nền tảng** | 2026-10-27 → 2026-11-01 | Unit, integration, contract, API inventory, môi trường, coverage | DEL-03→05, DEL-16, báo cáo C0 |
| **C1 — Hệ thống** | 2026-11-02 → 2026-11-08 | E2E, UI/UX, accessibility, regression R1 | DEL-06, 07, báo cáo C1 |
| **C2 — Phi chức năng** | 2026-11-09 → 2026-11-15 | Security, performance, reliability, regression R2 | DEL-08, 09, báo cáo C2 |
| **C3 — Chấp nhận** | 2026-11-16 → 2026-11-22 | UAT, regression R3, gate, known issues | DEL-11→15, biên bản UAT |
| **S7 — Production** | Sau khi có môi trường (dự kiến 2026-11-23 → 2026-12-06) | Staging, R2, HTTPS, Gmail, ZAP/Schemathesis, thiết bị thật | DEL-15 cập nhật, smoke production |

### 14.3 Lịch chi tiết

| Tuần | Ngày | Công việc | Người | Mốc |
|---|---|---|---|---|
| W1 | 27/10 | Kick-off, chốt baseline, review MTP | PO/QA | MTP Draft |
| W1 | 28–29/10 | Hoàn thiện test case + ma trận | QA | Test_Cases v1.0 |
| W1 | 30/10 | Chuẩn bị dữ liệu/fixture/seed | QA/Dev | Seed sẵn sàng |
| W1 | 31/10–01/11 | Chạy unit/integration/contract; đo coverage | QA | C0 report |
| W2 | 02–04/11 | E2E API + UI; sửa flaky | QA/Dev | E2E report |
| W2 | 05–06/11 | axe + bàn phím + screen reader | QA | A11y report |
| W2 | 07–08/11 | UI/UX 25 màn/7 breakpoint/vi-en; R1 | QA | C1 report |
| W3 | 09–10/11 | Security: IDOR, auth, CSRF, rate limit, leak scan | QA/Dev | Security report |
| W3 | 11–12/11 | Lighthouse + k6 SD-011 | QA | Perf report |
| W3 | 13–14/11 | Reliability: song song, restart, job, 90 ngày; R2 | QA/Dev | C2 report |
| W3 | 15/11 | Triage defect, quyết định go/no-go sơ bộ | PO/QA | Danh sách defect |
| W4 | 16–18/11 | UAT 50 story + demo | PO/QA | Biên bản UAT |
| W4 | 19–20/11 | Regression R3 + kiểm known issues | QA | Regression report |
| W4 | 21/11 | Tổng hợp gate, known issues, khuyến nghị | QA | Gate dashboard |
| W4 | 22/11 | Họp sign-off | PO/Dev/QA | Ký quyết định |
| S7 | 23/11–06/12 | Staging/production, R2, TLS, Gmail, ZAP, thiết bị | PO/Dev/QA | Go-live |

### 14.4 Phụ thuộc và đường găng

```text
T-01 → T-02 → T-03 → T-04 → T-06 → T-07 → T-08 → T-10 → T-13 → T-15 → T-17 → T-19 → T-20 → T-25 → T-26
                                 ↘ T-11 → T-12 → T-17
                                 ↘ T-14 → T-15
                                 ↘ T-16 → T-19
```

**Đường găng:** Test case → E2E → security/perf → regression → UAT → sign-off. Bất kỳ S1/S2 nào cũng đẩy lùi mốc.

### 14.5 Điều kiện chuyển S7

- C0–C3 hoàn tất, không còn S1/S2.
- Staging dựng được; R2/F-01 xong; Cloudflare/TLS cấu hình.
- Có SMTP Gmail và thiết bị thật.
- PO chấp thuận chi phí/thời gian.

## 15. Rủi ro và phương án dự phòng (5.15)

| ID | Rủi ro thực thi test | L | I | Điểm | Phương án |
|---|---|---:|---:|---:|---|
| RSK-T01 | Không có staging/production → không đo G-4/G-6/G-7/G-10/G-14 | 5 | 4 | 20 | Test dev; ghi Pending; không tuyên bố đạt; S7 bắt buộc trước public |
| RSK-T02 | Không có R2 → khác biệt storage local/production | 4 | 3 | 12 | Test local; F-01 + smoke S7; kiểm dung lượng/quyền |
| RSK-T03 | Không có thiết bị thật | 4 | 3 | 12 | Emulation; mượn/ thuê thiết bị 1 ngày trước public |
| RSK-T04 | FakeClock dùng chung làm E2E flaky | 3 | 3 | 9 | `workers: 1`; reset T0; tránh test phụ thuộc thứ tự |
| RSK-T05 | Mailpit khác Gmail → không kiểm spam | 3 | 3 | 9 | Mailpit cho logic; Gmail/Outlook thủ công S7 |
| RSK-T06 | Thiếu coverage ở UI (chỉ E2E) | 3 | 2 | 6 | Bổ sung unit cho hook/format nếu cần; ưu tiên E2E P0 |
| RSK-T07 | Dữ liệu test nhiễm giữa các lần chạy | 3 | 3 | 9 | Prefix duy nhất; reset DB; kiểm tra email trùng |
| RSK-T08 | Một người làm, thiếu review độc lập | 3 | 4 | 12 | AI review; checklist; security reviewer ngoài |
| RSK-T09 | Test case quá nhiều, không kịp chạy | 3 | 3 | 9 | Ưu tiên P0/P1; R1/R2; hoãn P2 có ký |
| RSK-T10 | Defect S1 phát hiện muộn | 2 | 5 | 10 | Test IDOR/auth sớm C0–C2; dừng ngay khi phát hiện |
| RSK-T11 | Thay đổi yêu cầu giữa chu kỳ | 3 | 3 | 9 | Baseline lại; cập nhật ma trận; chạy lại case ảnh hưởng |
| RSK-T12 | Công cụ (k6/ZAP) chưa cài | 3 | 2 | 6 | Cài ở C2; nếu không, ghi Pending |
| RSK-T13 | Dung lượng media/DB đầy | 2 | 3 | 6 | Dọn `.data`; theo dõi trước seed lớn |
| RSK-T14 | Kết quả phụ thuộc máy dev (không tái lập) | 2 | 4 | 8 | Ghi phiên bản; chạy CI; container hóa khi có |
| RSK-T15 | Bỏ sót kiểm tra pháp lý | 2 | 5 | 10 | Rà soát pháp lý trước public; không chỉ dựa test |

**Phương án dự phòng chung**

- Nếu không đủ thời gian: cắt P2/UI thẩm mỹ, giữ P0 + bảo mật + dữ liệu; ghi rõ phần cắt.
- Nếu môi trường hỏng: chuyển sang test unit/integration/contract; không chạy E2E trên dữ liệu bẩn.
- Nếu phát hiện S1: dừng, bảo toàn bằng chứng, thông báo ngay, không tiếp tục các case có thể làm mất dấu.
- Nếu gate không đạt: không phát hành; cập nhật known issues và yêu cầu PO chấp nhận bằng văn bản (chỉ với S3/S4).

## 16. Phê duyệt (5.16)

| Hạng mục | Người duyệt | Kết quả | Ngày | Ghi chú |
|---|---|---|---|---|
| Master Test Plan | Việt (PO) | ☐ Đồng ý ☐ Sửa ☐ Từ chối |  |  |
| Phạm vi & gate | Việt (PO) | ☐ Đồng ý ☐ Sửa ☐ Từ chối |  |  |
| Lịch & nguồn lực | Việt (PO/Dev) | ☐ Đồng ý ☐ Sửa ☐ Từ chối |  |  |
| Tiêu chí phát hành | Việt (PO) | ☐ Đồng ý ☐ Sửa ☐ Từ chối |  |  |
| Rủi ro chấp nhận (RSK-07/08, G-13/G-16) | Việt (PO) | ☐ Đồng ý ☐ Sửa ☐ Từ chối |  |  |

**Điều kiện phê duyệt:** các mục trên được đánh dấu "Đồng ý"; nếu "Sửa", tài liệu quay lại Draft và tăng phiên bản.

---

## Phụ lục A — Bảng trạng thái launch gate (tại 2026-10-26)

> **Đọc bảng:** "Đạt" chỉ khi có bằng chứng chạy được và liên kết. "Một phần" = có bằng chứng cho phần dev nhưng thiếu môi trường/thiết bị. "Pending" = chưa thực thi. "Withdrawn" = đã rút theo quyết định.

| Gate | Nội dung | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|---|
| G-1 | 100% story P0 đạt AC | **Một phần** | 21/21 story P0 đã có code + test; UAT/AC sign-off chưa chạy |
| G-2 | Coverage ≥90% logic, ≥70% tổng | **Chưa đo lại** | CI có gate; cần chạy `pnpm test:unit --coverage` C0 |
| G-3 | E2E đăng ký→xác minh→bé→mốc→nhắc→hoàn tất→mốc kế | **Đạt (dev)** | `e2e/api/core-flow.api.spec.ts`, 17/17 ở S4-06; tổng E2E 72/72 |
| G-4 | Thiết bị thật, 0 Critical/High | **Pending** | Chưa có thiết bị; chỉ Chromium emulation |
| G-5 | Đổi múi giờ/qua 00:00/D7/D1/Quá hạn | **Đạt (dev)** | `timezone.api.spec.ts`, test FakeClock; cần bổ sung DST |
| G-6 | LCP <2,5 s, INP <200 ms, CLS <0,1 | **Pending** | Chưa chạy Lighthouse |
| G-7 | API đọc p95 <500 ms, ghi <800 ms | **Pending** | Chưa chạy k6 |
| G-8 | Bundle <250 KB gzip | **Đạt** | 136,5 KB (F-13); size-limit trong CI |
| G-9 | IDOR 100% | **Đạt (dev)** | 136/136 (F-13) |
| G-10 | HTTPS, Argon2id, cookie an toàn | **Một phần** | Code/test Argon2id + cookie; HTTPS/HSTS chưa có prod |
| G-11 | Ảnh storage riêng, URL ký ≤15 phút | **Đạt (dev)** | Pipeline + test URL hết hạn; R2 pending F-01 |
| G-12 | Không High/Critical dependency/OWASP | **Một phần** | audit/OSV/gitleaks CI; ZAP chưa chạy |
| G-13 | Backup/restore | **Withdrawn** | DEC-020; rủi ro chấp nhận |
| G-14 | Email Gmail/Outlook không spam | **Pending** | Chỉ Mailpit; chưa có SMTP Gmail |
| G-15 | Nhắc idempotent | **Đạt (dev)** | Test reload/multi-device/song song |
| G-16 | Cảnh báo job nhắc | **Withdrawn** | DEC-017 |
| G-17 | OpenAPI khớp 100% | **Một phần** | CI contract có; cần xác nhận chạy GitHub + Schemathesis S7 |
| G-18 | E2E G-3 chỉ qua API | **Đạt (dev)** | `api` project; 17/17 |
| FG-1 | IDOR 100% + quét rò rỉ | **Đạt (dev)** | 136/136 + leak scan F-13 |
| FG-2 | E2E 3 tài khoản phone/tablet | **Đạt (dev)** | 72/72, `social-cross.api.spec.ts` |
| FG-3 | axe 0 serious/critical + 44 px | **Đạt (dev)** | 14 màn, phone + tablet, F-13/S6-04 |
| FG-4 | Chuỗi vi/en + mã lỗi | **Đạt (dev)** | Typecheck `Messages`; chưa click hết bản tiếng Anh |
| FG-5 | Analytics không PII/nội dung | **Đạt (dev)** | Allowlist + quét DB F-13/S6-05 |
| FG-6 | Ảnh trên R2 trước production | **Pending** | F-01 chưa làm |

## Phụ lục B — Bằng chứng hiện có (baseline 2026-10-26)

| Hạng mục | Kết quả ghi nhận | Nguồn | Độ tin cậy |
|---|---|---|---|
| Unit test | **209 Pass** | `Implement_plan` §10.4; task_done | Trung bình — chưa chạy lại trong tài liệu này |
| IDOR | **136/136 Pass** | `F-13-cross-account-tests.md` | Cao — có mô tả fixture/leak scan |
| E2E | **72/72 Pass** | `F-13`; `Implement_plan` §10.4 | Cao — Playwright report |
| Accessibility | **axe 0 serious/critical**, 14 màn, 44 px | `S6-04`, `F-13` | Cao — nhưng chưa gồm dialog |
| Bundle | **136,5 KB gzip** (giới hạn 250) | `S6-05` | Cao — size-limit |
| i18n | vi/en đủ khóa, typecheck | `F-13` | Trung bình — chưa kiểm UI tiếng Anh đầy đủ |
| Analytics | Event allowlist + funnel, không PII | `S6-05`, `F-13` | Cao |
| Maintenance job | 8 bước, integration Pass | `S6-06` | Cao |
| Coverage | Chưa có số mới | — | Thấp — cần chạy C0 |
| Performance | Chưa có Lighthouse/k6 | — | — |
| Staging/production | Chưa có | S2-06, S7 | — |

> Các số trên là **baseline lịch sử**, không thay thế việc chạy lại. Báo cáo C0–C3 phải ghi ngày chạy, commit, môi trường và lệnh.

## Phụ lục C — Đối chiếu IEEE 829-2008

| Clause | Mục trong tài liệu | Trạng thái |
|---|---|---|
| 5.1 Test plan identifier | §1 | Đầy đủ |
| 5.2 Introduction | §2 | Đầy đủ |
| 5.3 Test items | §3 | Đầy đủ |
| 5.4 Features to be tested | §4 + Phần A | Đầy đủ |
| 5.5 Features not to be tested | §5 | Đầy đủ |
| 5.6 Approach | §6 | Đầy đủ |
| 5.7 Item pass/fail criteria | §7 | Đầy đủ |
| 5.8 Suspension/resumption | §8 | Đầy đủ |
| 5.9 Test deliverables | §9 | Đầy đủ |
| 5.10 Testing tasks | §10 | Đầy đủ |
| 5.11 Environmental needs | §11 | Đầy đủ |
| 5.12 Responsibilities | §12 | Đầy đủ |
| 5.13 Staffing/training | §13 | Đầy đủ |
| 5.14 Schedule | §14 | Đầy đủ |
| 5.15 Risks and contingencies | §15 + A.7 | Đầy đủ |
| 5.16 Approvals | §16 | Đầy đủ |
| Test case specification | `Test_Cases.md` §1–13 | Đầy đủ |
| Traceability | `Test_Cases.md` §14 | Đầy đủ |

## Phụ lục D — Kiểm soát thay đổi

1. Mọi thay đổi phạm vi, lịch, gate, tiêu chí phải tăng phiên bản tài liệu (1.1, 1.2…).
2. Thay đổi FR/NFR phải cập nhật SRS trước, rồi mới cập nhật test case/ma trận.
3. Thay đổi API phải cập nhật `openapi.yaml`, chạy contract, rồi cập nhật ma trận API.
4. Không xóa case đã chạy; đánh dấu `Retired` kèm lý do.
5. Báo cáo chu kỳ phải ghi commit/build, môi trường, người chạy, thời gian.

## Phụ lục E — Liên kết nhanh

- [Đặc tả test case và ma trận truy vết](Test_Cases.md)
- [Hướng dẫn chạy test](Test_Cases.md#15-hướng-dẫn-thực-thi)
- [Ma trận story → FR → TC](Test_Cases.md#141-story--fr--test-case)
- [Ma trận FR → TC](Test_Cases.md#142-fr--test-case)
- [Ma trận NFR → TC](Test_Cases.md#143-nfr--test-case)
- [Ma trận API → TC](Test_Cases.md#144-ma-trận-api--test-case)
- [Ma trận gate → bằng chứng](Test_Cases.md#145-gate--bằng-chứng)

---

**Hết tài liệu PH-MTP-001 v1.0.**
