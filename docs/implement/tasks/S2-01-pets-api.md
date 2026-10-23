# S2-01 · Schema `pets`, API CRUD, giới hạn 10, tuổi

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S2 · T5–6 |
| Story | US-010, US-011, US-013, US-015 (phần backend) |
| Yêu cầu | FR-PET-001, 002, 003, 004, 006; BRU-001, BRU-009; NFR-SEC-004, 007; AD-011, AD-012; G-9 |
| Phụ thuộc | [S1-08](S1-08-idor-suite.md) |
| Ước lượng | 1,5 |
| Màn hình Figma | — |

## Mục tiêu

Có mô-đun `pets` chạy đủ lát backend: migration bảng `pets` có RLS, 4 endpoint `GET/POST /pets`, `GET/PATCH /pets/{petId}`, giới hạn 10 thú cưng an toàn khi gọi song song, `ageText` tính ở server theo múi giờ tài khoản. Mọi route có ca IDOR.

## Phạm vi

**Trong phạm vi:** migration `pets` + RLS + grant; domain kiểm tra dữ liệu; 4 use case; route + schema Zod + `openapi.yaml`; cập nhật `packages/api-client`; ca IDOR; trường `avatarUrl`/`avatarThumbUrl` có trong schema, luôn `null` ở task này.

**Ngoài phạm vi:** ảnh đại diện và URL ký ([S2-03](S2-03-pet-avatar-api.md)); `DELETE /pets/{petId}` ([S2-05](S2-05-delete-pet.md)); mục tiêu cân nặng `weight-target` (S3-01, cột đã tạo ở đây); giao diện ([S2-04](S2-04-pets-ui.md)).

## Chi tiết kỹ thuật

**Vị trí mã** (SAD §1.2.1, §4.4.2)

```
apps/api/migrations/0200_pets.ts
apps/api/src/modules/pets/
  domain/pet.ts                 # PetInput, validatePetInput(), PET_LIMIT = 10
  application/{create-pet,update-pet,get-pet,list-pets}.ts
  application/ports.ts          # PetRepository
  adapters/http/pets.routes.ts  # route + schema Zod
  adapters/persistence/kysely-pet-repository.ts
```

**Migration** (SAD §3.1.3, §3.1.2)

```sql
CREATE TABLE pets (
  id               uuid PRIMARY KEY,                       -- UUIDv7 sinh ở ứng dụng
  owner_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             varchar(50)  NOT NULL CHECK (length(btrim(name)) >= 1),
  breed            varchar(50)  NOT NULL CHECK (length(btrim(breed)) >= 1),
  sex              text NOT NULL CHECK (sex IN ('MALE','FEMALE')),
  birth_date       date NOT NULL,
  description      varchar(2000),
  avatar_key       text,
  weight_target_kg numeric(4,1) CHECK (weight_target_kg BETWEEN 0.1 AND 150),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pets_owner_id_idx ON pets(owner_id);
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_isolation ON pets
  USING (owner_id = current_setting('app.user_id')::uuid)
  WITH CHECK (owner_id = current_setting('app.user_id')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON pets TO app_rw, app_worker;
```

`birth_date ≤ hôm nay` không đặt CHECK trong DB vì "hôm nay" phụ thuộc múi giờ tài khoản; kiểm ở use case.

**Quy tắc kiểm tra** (`domain/pet.ts`, dùng chung cho POST và PATCH)

| Trường | Quy tắc | `code` lỗi · thông điệp |
|---|---|---|
| `name` | Bỏ khoảng trắng đầu/cuối; 1–50 ký tự | `REQUIRED` "Trường bắt buộc" · `TOO_LONG` "Tối đa 50 ký tự" |
| `breed` | Như `name` | như trên |
| `sex` | `MALE` \| `FEMALE` | `REQUIRED` / `INVALID_ENUM` |
| `birthDate` | `YYYY-MM-DD`, ngày lịch hợp lệ, `≤ todayIn(user.timezone, clock.now())` | `REQUIRED` · `INVALID_DATE` · `FUTURE_DATE` "Ngày sinh không được ở tương lai" |
| `description` | Tùy chọn, ≤ 2000 ký tự; chuỗi rỗng sau trim → `null` | `TOO_LONG` "Tối đa 2.000 ký tự" |

Lỗi trả `422 VALIDATION_FAILED` với mảng `errors[{field, code, message}]` (SAD §2.4.3). Đếm độ dài theo code point (`[...s].length`) để khớp `varchar` của Postgres.

**Endpoint** (SAD §2.4.2; mọi route yêu cầu phiên, method ghi yêu cầu `X-CSRF-Token`; phản hồi `Cache-Control: no-store`)

| Method + Path | Input | Thành công | Lỗi |
|---|---|---|---|
| `GET /api/v1/pets` | — | `200 { items: Pet[] }`, sắp `created_at ASC, id ASC` | `401` |
| `POST /api/v1/pets` | `{ name, breed, sex, birthDate, description? }` + `Idempotency-Key` | `201 Pet` | `400 IDEMPOTENCY_KEY_REQUIRED`, `409 PET_LIMIT_REACHED`, `422` |
| `GET /api/v1/pets/{petId}` | — | `200 Pet` | `404 NOT_FOUND` |
| `PATCH /api/v1/pets/{petId}` | ≥ 1 trường trong 5 trường trên | `200 Pet` | `404`, `422` |

```json
{ "id": "0192...", "name": "Mochi", "breed": "Poodle", "sex": "FEMALE",
  "birthDate": "2019-03-15", "ageText": "7 năm 7 tháng",
  "description": "Lông trắng, tai nâu nhạt...", "avatarUrl": null, "avatarThumbUrl": null,
  "createdAt": "2026-11-01T02:00:00Z", "updatedAt": "2026-11-01T02:00:00Z" }
```

**Tạo thú cưng — giới hạn 10 (BRU-009)**

1. Middleware idempotency (S0-05) kiểm `Idempotency-Key`; trùng key cùng body → trả lại phản hồi đã lưu.
2. `BEGIN`; `set_config('app.user_id', $userId, true)`.
3. `SELECT timezone FROM users WHERE id = $1 FOR UPDATE` — khóa dòng user để hai request song song không cùng đếm được 9.
4. `SELECT count(*) FROM pets WHERE owner_id = $1`; `≥ 10` → `ROLLBACK`, `409 PET_LIMIT_REACHED`, `title` "Đã đạt tối đa 10 thú cưng".
5. Kiểm `birthDate` theo `todayIn(timezone, clock.now())`; `INSERT` với `id = uuidv7()`; lưu idempotency; `COMMIT`.

**Sửa:** `UPDATE pets SET …, updated_at = now() WHERE id = $1 AND owner_id = $2 RETURNING *`; 0 dòng → `404`. Last-write-wins (FR-GEN-007). Tài nguyên của người khác hoặc không tồn tại đều `404` (FR-AUTH-013).

**Tuổi (US-011):** `ageText = formatAge(ageInMonths(birthDate, todayIn(user.timezone, clock.now())))` từ `platform/calendar` (S0-06). Client không tự tính.

**OpenAPI và client:** schema `Pet`, `PetCreate`, `PetPatch` đăng ký vào `openapi.yaml`; chạy `pnpm --filter api-client generate` và commit.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] Given có < 10 thú cưng, When `POST /pets` với đủ 4 trường hợp lệ, Then `201`, thú cưng có trong `GET /pets`.
- [ ] Given thiếu trường bắt buộc, When `POST /pets`, Then `422` có lỗi `REQUIRED` đúng trường, không tạo bản ghi.
- [ ] Given ngày sinh ở tương lai (theo múi giờ tài khoản), When tạo hoặc sửa, Then `422` `FUTURE_DATE` "Ngày sinh không được ở tương lai".
- [ ] Given tài khoản có 10 thú cưng, When `POST /pets`, Then `409 PET_LIMIT_REACHED`; 20 request song song từ 0 thú cưng chỉ tạo đúng 10.
- [ ] `ageText` đúng 4 ca SRS §2.10.1; sửa `birthDate` thì `ageText` trong phản hồi `PATCH` được tính lại.
- [ ] Given hồ sơ tồn tại, When `PATCH` bất kỳ trường nào, Then `GET` sau đó trả giá trị mới.
- [ ] `name`/`breed` toàn khoảng trắng bị từ chối; `description` 2000 ký tự được nhận, 2001 bị từ chối.
- [ ] Thiếu `Idempotency-Key` ở `POST` → `400`; gửi lại cùng key không tạo bản ghi thứ hai.
- [ ] RLS bật trên `pets`; role `app_rw` không đọc được dòng của user khác kể cả khi quên `WHERE owner_id`.
- [ ] `GET/PATCH /pets/{petId}` có trong IDOR suite và Pass; `openapi.yaml` khớp code.
- [ ] Log không chứa `description` (redact `*.description`).

## Kiểm thử

- **Unit** (`domain/pet.test.ts`): tên 0/1/50/51 ký tự, tên "   ", tên có emoji 50 code point; `sex` sai giá trị; `birthDate` = hôm nay (nhận), hôm nay + 1 (từ chối), `2026-02-30` (từ chối); description 2000/2001.
- **Unit use case** với `FakeClock`: user `Asia/Ho_Chi_Minh`, now = `2026-10-22T17:30:00Z` (00:30 ngày 23/10 giờ VN) → `birthDate 2026-10-23` hợp lệ; cùng thời điểm với user `UTC` → `FUTURE_DATE`.
- **Integration** (Testcontainers): tạo 10 → con thứ 11 `409`; `Promise.all` 20 lần `POST` khác key → đúng 10 dòng; `PATCH` đổi ngày sinh `2019-03-25` với today `2026-10-22` → "7 năm 6 tháng"; truy vấn trực tiếp bằng `app_rw` không `set_config` → 0 dòng.
- **IDOR** (S1-08): user B gọi `GET`/`PATCH /pets/{petIdCủaA}` → `404`, dữ liệu A không đổi; `petId` không phải UUID → `404`.
- **Contract:** `openapi.yaml` diff sạch trong CI.
