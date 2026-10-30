# Khung Implement_plan

```markdown
# Kế hoạch phát triển (Implementation Plan) — <Tên sản phẩm>

| Mã | <PRJ>-IMP-001 | Phiên bản | 1.0 | Ngày | YYYY-MM-DD | Nguồn | SAD v, UI/UX v, User Stories v |

## 1. Nguyên tắc triển khai

- Dựng nền (Sprint 0) trước tính năng; walking skeleton chạy end-to-end sớm.
- Mỗi sprint kết thúc bằng bản chạy được, demo được.
- Test đi cùng code; không gộp nợ test về cuối.
- Thứ tự theo phụ thuộc module (xem §4).

## 2. Lộ trình tổng quan

| Sprint | Tuần | Chủ đề               | Story chính | Kết quả demo                |
| ------ | ---- | -------------------- | ----------- | --------------------------- |
| S0     | T1–2 | Nền tảng             | —           | repo, CI, healthz, khung UI |
| S1     | T3–4 | Tài khoản            | US-001→006  | đăng ký/đăng nhập           |
| …      |      |                      |             |                             |
| Sn     |      | Cứng hóa & phát hành |             | launch gate                 |

## 3. Chi tiết từng sprint

### S0 — Nền tảng

- **Mục tiêu:** …
- **Hạng mục:** monorepo/lint/pre-commit · môi trường dev (docker compose DB, mail) · khung backend (framework, validation, OpenAPI, migration, job queue, healthz/readyz) · platform core (clock, logging redact, lỗi chuẩn, idempotency, rate limit) · khung web (router, data fetching, design token, component lõi) · api-client sinh type · CI · Docker image.
- **Kết quả:** … **Rủi ro:** …

### S1 — …

## 4. Thứ tự phụ thuộc giữa mô-đun

Sơ đồ/danh sách: platform → identity → <module> → … → dashboard.

## 5. Definition of Done

- [ ] Code + test (unit/integration) Pass, lint/typecheck sạch
- [ ] Tiêu chí chấp nhận của task/story đạt
- [ ] Kiểm tra phân quyền (IDOR) cho endpoint mới
- [ ] a11y cơ bản, i18n key đủ
- [ ] task_done ghi kết quả, commit

## 6. Chiến lược kiểm thử

| Cấp | Công cụ | Phạm vi | Khi chạy |
Unit · Integration (DB thật/Testcontainers) · Contract (OpenAPI diff) · E2E (Playwright) · a11y (axe) · bảo mật (IDOR suite, audit).

## 7. Ánh xạ launch gate → sprint

| Gate | Sprint đáp ứng | Bằng chứng |

## 8. Rủi ro triển khai

| Rủi ro | Ảnh hưởng | Giảm thiểu |

## 9. Ma trận story → sprint

| US | Sprint | Task |
```
