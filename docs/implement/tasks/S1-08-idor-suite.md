# S1-08 · Bộ test IDOR dùng chung

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S1 · T3–4 |
| Story | US-006 |
| Yêu cầu | FR-AUTH-013, FR-AUTH-014, NFR-SEC-004, AD-011, G-9 |
| Phụ thuộc | [S1-04](S1-04-login-session-api.md) |
| Ước lượng | 1 |
| Màn hình Figma | Không tìm thấy 404 (23:2916) — chỉ tham chiếu, giao diện 404 làm ở [S6-03](S6-03-system-states.md) |

## Mục tiêu
Một bộ test integration tự liệt kê mọi route của API và tự sinh ca kiểm: route có path parameter phải trả `404` khi tài khoản A dùng ID của tài khoản B, và dữ liệu của B không đổi; route không công khai phải trả `401` khi không có phiên; bảng có `owner_id` phải bật RLS. Route mới mà thiếu fixture IDOR thì CI đỏ, nên mọi task sau buộc phải mở rộng bộ test này.

## Phạm vi
**Trong phạm vi:**
- Harness `apps/api/test/idor/` (fixture 2 tài khoản, registry fixture theo tham số, bộ sinh ca).
- 3 meta-test: phủ route, deny-by-default, RLS cho bảng có `owner_id`.
- Route và bảng thử chỉ có trong test để chứng minh harness chạy (S1 chưa có route nghiệp vụ có path param).
- Chạy trong job integration của CI.

**Ngoài phạm vi:**
- Fixture cho `petId`, `id` (weights, visits, photos, milestones, routines), `uploads`, `notifications`: mỗi task tạo route đó tự thêm ([S2-01](S2-01-pets-api.md) trở đi).
- Kiểm `/media/{key}` (bảo vệ bằng chữ ký, không bằng phiên): [S2-02](S2-02-media-pipeline.md).
- Rà soát IDOR toàn hệ thống trước phát hành: [S7-04](S7-04-security-test.md).

## Chi tiết kỹ thuật

### 1. Thu thập route
`apps/api/test/idor/route-catalog.ts`: dựng app bằng `buildApp({ testMode: true })`, đăng ký hook `onRoute` **trước** các plugin mô-đun để ghi `{ method, url, config, schema }` của mọi route. Bỏ `HEAD`, `OPTIONS`. Tham số path lấy từ `url` (`/pets/:petId/weights` → `['petId']`).

### 2. Fixture tài khoản — `apps/api/test/idor/accounts.ts`
`createTwoAccounts(app)`: đăng ký A và B qua `POST /auth/register` thật (đi đủ Argon2, session, CSRF), trả `{ a, b }` với `cookie`, `csrfToken`, `userId`. Dùng `FakeClock` cố định.

### 3. Registry fixture — `apps/api/test/idor/registry.ts`
```ts
export interface IdorParamFixture {
  // Tạo tài nguyên thuộc owner, trả về giá trị cho path param
  create(ctx: { app: FastifyInstance; owner: Account; db: Kysely<DB> }): Promise<string>;
  // Ảnh chụp dữ liệu của owner liên quan tới tài nguyên, đọc bằng kết nối app_worker
  snapshot(ctx: { db: Kysely<DB>; ownerId: string; id: string }): Promise<unknown>;
}
export function registerIdorParam(routePattern: string | RegExp, param: string, fx: IdorParamFixture): void;
export function registerIdorBody(method: string, url: string, body: (ids: Record<string,string>) => unknown): void;
export function registerIdorCustom(name: string, run: (ctx) => Promise<void>): void; // ca đặc biệt
export function exemptFromIdor(method: string, url: string, reason: string): void;
```
- Mỗi mô-đun đặt fixture ở `apps/api/src/modules/<module>/adapters/http/__idor__/*.idor.ts`; harness nạp tất cả bằng `import.meta.glob` (Vitest).
- `registerIdorBody` cung cấp body hợp lệ cho `POST/PUT/PATCH` (để request không bị `422` trước khi tới bước kiểm quyền). Không có body đăng ký thì dùng `{}`.
- `registerIdorCustom` cho ca ID nằm trong body, ví dụ `POST /notifications/read` với ID của B phải bỏ qua âm thầm và `unreadCount` không đổi (SAD §3.1.2) — thêm ở [S4-03](S4-03-notifications-api.md).
- `exemptFromIdor` bắt buộc có lý do, in ra trong báo cáo test.

### 4. Bộ sinh ca — `apps/api/test/idor/idor.test.ts`
Với mỗi route có ít nhất một path param và không `public`, không exempt:
1. Tạo tài nguyên của B cho từng param bằng fixture → `ids`.
2. `before = snapshot(B)`.
3. A gọi route với `ids` của B, kèm cookie, `X-CSRF-Token`, `Idempotency-Key` mới (cho `POST`), body từ registry.
4. Kỳ vọng `404`, `content-type: application/problem+json`, `code = "NOT_FOUND"`.
5. `after = snapshot(B)`; `expect(after).toEqual(before)`.
6. Ca thứ hai: A gọi với UUIDv7 ngẫu nhiên không tồn tại → `404`; body của hai ca bằng nhau sau khi bỏ `ref` (không phân biệt "không tồn tại" với "của người khác").
7. Ca thứ ba (kiểm fixture đúng): B gọi chính route đó với `ids` của mình → không phải `404` (với route xóa thì chạy ca này sau cùng).

Tên ca sinh tự động: `IDOR ${method} ${url} [${param}]` để báo cáo đọc được.

### 5. Meta-test
- **Phủ route:** mọi cặp (route có path param, param) phải có fixture hoặc exempt; thiếu → test fail với thông điệp `Thiếu fixture IDOR cho GET /pets/:petId (petId). Thêm file __idor__/*.idor.ts`.
- **Deny by default:** mọi route không `config.public` gọi không có cookie → `401 UNAUTHENTICATED` (không phải `404`, `200` hay `500`). Danh sách route `public` được so với danh sách cho phép cố định trong test (`/auth/register`, `/auth/login`, `/auth/verify-email`, `/auth/password/forgot`, `/auth/password/reset`, `/healthz`, `/readyz`, `/media/:key`); route public mới phải thêm vào danh sách này một cách có chủ đích.
- **RLS:** truy vấn `information_schema.columns` tìm mọi bảng `public` có cột `owner_id`; mỗi bảng phải có `pg_class.relrowsecurity = true`, `relforcerowsecurity = true` và policy `owner_isolation`. Thiếu → fail, nêu tên bảng.

### 6. Route thử để chứng minh harness
Chỉ khi `testMode`: bảng `idor_probe(id uuid PK, owner_id uuid NOT NULL, note text)` (tạo trong setup test, bật `enableOwnerRls`) và route `GET/PATCH/DELETE /__test/idor-probe/:id` dùng `req.withTx()` và repository có điều kiện `owner_id`. Registry có fixture cho nó. Thêm một biến thể cố ý lỗi (`/__test/idor-probe-broken/:id` không lọc `owner_id` ở repository) để chứng minh RLS vẫn chặn → vẫn `404`.

### 7. CI
Script `pnpm --filter api test:idor` (Vitest project `idor`, Testcontainers PostgreSQL 16) chạy trong bước integration của [S0-09](S0-09-ci-pipeline.md). Thời gian mục tiêu < 60 s cho toàn bộ route của Giai đoạn 1.

## Giao diện
Không có.

## Tiêu chí chấp nhận
- [ ] **Given** tài khoản A đã đăng nhập, **When** A đọc, sửa hoặc xóa tài nguyên của B bằng ID trực tiếp, **Then** server trả `404` và dữ liệu của B không đổi — kiểm tự động cho mọi route có path parameter.
- [ ] **Given** chưa đăng nhập, **When** gọi bất kỳ route không công khai, **Then** `401` và không có dữ liệu trả về.
- [ ] Phản hồi `404` cho ID của người khác và ID không tồn tại giống nhau (trừ `ref`).
- [ ] Thêm một route có path param mà không thêm fixture → CI đỏ với thông điệp nêu route và param.
- [ ] Thêm một bảng có `owner_id` mà không gọi `enableOwnerRls` → CI đỏ nêu tên bảng.
- [ ] Route thử `idor-probe-broken` (thiếu lọc ở repository) vẫn trả `404` nhờ RLS.
- [ ] Route thử `/__test/*` không được đăng ký khi `NODE_ENV ≠ test`.
- [ ] Bộ test chạy trong CI ở mỗi PR.

## Kiểm thử
Chính task này là test. Kiểm lại harness bằng cách: (1) tạm bỏ lọc `owner_id` và tắt RLS trên `idor_probe` → các ca IDOR phải fail; (2) xóa fixture của route thử → meta-test phủ route phải fail; (3) bỏ `public` khỏi `/auth/login` → meta-test deny-by-default phải fail. Ghi kết quả ba lần kiểm này vào mô tả PR.

## Ghi chú
- `snapshot` đọc bằng kết nối `app_worker` (`BYPASSRLS`) để thấy dữ liệu của B bất kể RLS.
- Route xóa làm mất tài nguyên ở bước 7; tạo tài nguyên mới cho mỗi ca thay vì dùng chung.
- Từ S2, Definition of Done của mọi endpoint mới gồm file `*.idor.ts` tương ứng.
