# S0-09 · CI GitHub Actions — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S0-09](../tasks/S0-09-ci-pipeline.md) |
| Trạng thái | Xong (code), chưa chạy trên GitHub |
| Ngày hoàn thành | 2026-10-24 |
| Commit | `d90326a` |

## Kết quả

- **`.github/workflows/ci.yml`:** 6 job nối tiếp: `lint` → `unit` → `integration` → `contract` → `security` → `size`.
  - Chạy trên `pull_request` và `push` vào `main`; `cancel-in-progress`; quyền `contents: read`.
  - `lint`: `format:check`, `lint`, `typecheck`, `depcruise`.
  - `unit`: `test:unit --coverage`, tải `coverage/` lên artifact.
  - `integration`: `test:integration` (Testcontainers `postgres:16`).
  - `contract`: `openapi.yaml` và `packages/api-client` phải khớp code (`git diff --exit-code`); trên PR thêm `oasdiff breaking` so với nhánh đích (`fail-on: ERR`).
  - `security`: `pnpm audit --audit-level high`, OSV-Scanner, gitleaks (toàn lịch sử).
  - `size`: build web rồi `size-limit`.
  - Mọi action ghim theo SHA commit, tag ghi ở chú thích.
- **`.dependency-cruiser.cjs`:** 8 luật `domain-no-adapters`, `domain-only-calendar`, `no-foreign-persistence`, `web-not-api`, `ui-pure`, `feature-public-index`, `api-client-standalone`, `no-circular`.
- **Coverage gate** trong `vitest.config.ts` (provider v8): toàn hệ thống ≥ 70% dòng; `modules/*/domain` và `platform/calendar` ≥ 90%.
- **`apps/web/.size-limit.json`:** JS ban đầu ≤ 250 KB gzip, CSS ≤ 25 KB gzip.
- **`.github/dependabot.yml`:** npm, github-actions, docker (`/infra`), hằng tuần, gom bản vá nhỏ.
- **Script mới:** `test:unit`, `test:integration`, `depcruise` (gốc), `size` (web).

## Tiêu chí chấp nhận

| Tiêu chí | Kết quả |
|---|---|
| PR chạy đủ 6 job đúng thứ tự, tất cả xanh | **Chưa kiểm**: chưa push, chưa có PR |
| Import `kysely` trong `modules/x/domain/` → `lint` đỏ (`domain-no-adapters`) | Đạt khi chạy `pnpm depcruise` local |
| Import persistence của mô-đun khác → đỏ; cùng mô-đun → qua | Code xong, chưa thử |
| Import `apps/api` trong `apps/web` → đỏ | Code xong, chưa thử; luật `ui-pure` (cùng dạng) đã thử đỏ đúng |
| Coverage `platform/calendar` < 90% → `unit` đỏ | Code xong, chưa chạy coverage |
| Sửa schema không chạy `openapi:gen` → `contract` đỏ; xóa trường bắt buộc → `oasdiff` đỏ | Code xong, chưa kiểm trên GitHub |
| Dependency lỗ hổng High / chuỗi bí mật → `security` đỏ | Code xong, chưa kiểm trên GitHub |
| JS ban đầu > 250 KB → `size` đỏ | Code xong; hiện 106,6 KB JS + 4,2 KB CSS |
| Toàn pipeline < 10 phút | Chưa đo |

## Phiên bản action đã ghim

| Action | Tag | SHA |
|---|---|---|
| actions/checkout | v7.0.1 | `3d3c42e5…` |
| actions/setup-node | v7.1.0 | `949feb24…` |
| actions/upload-artifact | v7.0.2 | `cf430e03…` |
| pnpm/action-setup | v6.1.0 | `ea17c68d…` |
| gitleaks/gitleaks-action | v3.0.0 | `e0c47f4f…` |
| google/osv-scanner-action | v2.7.0 | `b1d267ae…` |
| oasdiff/oasdiff-action | v0.1.20 | `9ce3a29e…` |

Dependency mới: `dependency-cruiser` 18.7, `@vitest/coverage-v8` 5.0.5, `size-limit` + `@size-limit/file`.

## Ghi chú

- **Sửa trong lúc làm:** mẫu `exclude` ban đầu `(^|/)(dist|coverage)/` loại luôn `node_modules/.../kysely/dist/…`, nên luật cấm import framework không bao giờ kích hoạt. Đã giới hạn thành `^(apps|packages)/[^/]+/(dist|coverage)/`.
- **Bảo vệ nhánh `main`** (bắt buộc 6 job xanh trước khi merge) phải bật trong Settings của repo GitHub; không cấu hình được bằng file.
- **Job `integration` chưa có test nào ở S0 ngoài `db.int.test.ts`;** job này cần Docker (runner `ubuntu-latest` có sẵn).
