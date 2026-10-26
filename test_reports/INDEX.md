# Danh mục test case — Pet Health

> **Môi trường đích:** https://pet.vietdeptrai.io.vn/ · **API:** `https://pet.vietdeptrai.io.vn/api/v1`
> **Tổng số:** 393 test case · **Đã chạy:** 1 · **Có bằng chứng:** 1 · **Trạng thái mặc định:** `Not Run` · **Withdrawn:** 2
> **Quy ước:** mỗi case có thư mục riêng `test_reports/<ID>/`; artifact nằm trong `screenshots/`, `video/`, `logs/`, report tại `report.md`.
> **Hướng dẫn chạy:** [`RUNBOOK.md`](RUNBOOK.md) · **Tổng quan:** [`README.md`](README.md)

## Tổng hợp theo nhóm

| Nhóm                         | Số case | Đã chạy | Có report | Ghi chú               |
| ---------------------------- | ------: | ------: | --------: | --------------------- |
| AUTH — Tài khoản và xác thực |      21 |       0 |         0 | Chưa chạy trên ENV-05 |
| PET — Hồ sơ thú cưng         |      10 |       0 |         0 | Chưa chạy trên ENV-05 |
| WGT — Cân nặng               |      12 |       0 |         0 | Chưa chạy trên ENV-05 |
| VIS — Sổ y tế                |      10 |       0 |         0 | Chưa chạy trên ENV-05 |
| MS — Mốc y tế                |      16 |       0 |         0 | Chưa chạy trên ENV-05 |
| NTF — Nhắc nhở trong app     |      13 |       0 |         0 | Chưa chạy trên ENV-05 |
| RT — Việc chăm sóc hằng ngày |       9 |       0 |         0 | Chưa chạy trên ENV-05 |
| DSH — Dashboard              |       8 |       0 |         0 | Chưa chạy trên ENV-05 |
| GEN — Hành vi toàn hệ thống  |      15 |       0 |         0 | Chưa chạy trên ENV-05 |
| ANL — Analytics              |       8 |       0 |         0 | Chưa chạy trên ENV-05 |
| SOC — Bản tin ảnh thú cưng   |      46 |       0 |         0 | Chưa chạy trên ENV-05 |
| DB — Tích hợp DB/RLS/media   |      23 |       0 |         0 | Chưa chạy trên ENV-05 |
| CON — Hợp đồng               |      10 |       0 |         0 | Chưa chạy trên ENV-05 |
| API — Xuyên suốt             |      16 |       0 |         0 | Chưa chạy trên ENV-05 |
| E2E — Hệ thống               |      26 |       0 |         0 | Chưa chạy trên ENV-05 |
| UAT — Chấp nhận theo story   |      50 |       0 |         0 | Chưa chạy trên ENV-05 |
| REG — Hồi quy                |      12 |       0 |         0 | Chưa chạy trên ENV-05 |
| PERF — Hiệu năng             |      12 |       0 |         0 | Chưa chạy trên ENV-05 |
| SEC — Bảo mật                |      22 |       0 |         0 | Chưa chạy trên ENV-05 |
| ACC — Accessibility          |      12 |       1 |         1 | 1 case đã có verdict  |
| UI — UI/UX                   |      14 |       0 |         0 | Chưa chạy trên ENV-05 |
| REL — Độ tin cậy             |       8 |       0 |         0 | Chưa chạy trên ENV-05 |
| OPS — Vận hành               |      10 |       0 |         0 | Chưa chạy trên ENV-05 |
| MNT — Bảo trì                |      10 |       0 |         0 | Chưa chạy trên ENV-05 |
| **Tổng**                     | **393** |   **1** |     **1** | —                     |

## Danh sách chi tiết

### AUTH — Tài khoản và xác thực (21)

| ID                                            | Tên                                                                                                          | Cấp      | Ưu tiên | Truy vết                 | Trạng thái | Hồ sơ                                       | Report |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------- | ------------------------ | ---------- | ------------------------------------------- | ------ |
| [TC-AUTH-001](TC-AUTH-001/test-case.md)       | POST /auth/register với email có khoảng trắng + chữ hoa, mật khẩu 8 ký tự, nickname, ngày sinh hợp lệ        | API, UI  | P0      | FR-AUTH-001, 017, 018    | Not Run    | [test-case.md](TC-AUTH-001/test-case.md)    | —      |
| [TC-AUTH-002](TC-AUTH-002/test-case.md)       | Lấy link trong Mailpit                                                                                       | API, IT  | P1      | FR-AUTH-002, 004         | Not Run    | [test-case.md](TC-AUTH-002/test-case.md)    | —      |
| [TC-AUTH-003](TC-AUTH-003/test-case.md)       | Gửi lại xác minh 5 lần trong 1 giờ                                                                           | API      | P1      | FR-AUTH-003              | Not Run    | [test-case.md](TC-AUTH-003/test-case.md)    | —      |
| [TC-AUTH-004](TC-AUTH-004/test-case.md)       | Token hết hạn (T0+24h+1m)                                                                                    | API, UI  | P1      | FR-AUTH-004              | Not Run    | [test-case.md](TC-AUTH-004/test-case.md)    | —      |
| [TC-AUTH-005](TC-AUTH-005/test-case.md)       | Đăng nhập đúng                                                                                               | API, UI  | P0      | FR-AUTH-005              | Not Run    | [test-case.md](TC-AUTH-005/test-case.md)    | —      |
| [TC-AUTH-006](TC-AUTH-006/test-case.md)       | Sai 5 lần trong 15 phút                                                                                      | API      | P0      | FR-AUTH-006              | Not Run    | [test-case.md](TC-AUTH-006/test-case.md)    | —      |
| [TC-AUTH-007](TC-AUTH-007/test-case.md)       | Đăng nhập, lấy cookie                                                                                        | API, UI  | P0      | FR-AUTH-007              | Not Run    | [test-case.md](TC-AUTH-007/test-case.md)    | —      |
| [TC-AUTH-008](TC-AUTH-008/test-case.md)       | Quên mật khẩu với email tồn tại                                                                              | API, UI  | P1      | FR-AUTH-008              | Not Run    | [test-case.md](TC-AUTH-008/test-case.md)    | —      |
| [TC-AUTH-009](TC-AUTH-009/test-case.md)       | Đăng nhập 3 phiên                                                                                            | API      | P1      | FR-AUTH-009              | Not Run    | [test-case.md](TC-AUTH-009/test-case.md)    | —      |
| [TC-AUTH-010](TC-AUTH-010/test-case.md)       | Đổi mật khẩu với mật khẩu hiện tại đúng                                                                      | API, UI  | P1      | FR-AUTH-010              | Not Run    | [test-case.md](TC-AUTH-010/test-case.md)    | —      |
| [TC-AUTH-011](TC-AUTH-011/test-case.md)       | PATCH /me hoặc /me/locale đổi múi giờ sang America/New_York                                                  | API, E2E | P0      | FR-AUTH-011              | Not Run    | [test-case.md](TC-AUTH-011/test-case.md)    | —      |
| [TC-AUTH-012](TC-AUTH-012/test-case.md)       | Đăng nhập                                                                                                    | API      | P0      | FR-AUTH-012              | Not Run    | [test-case.md](TC-AUTH-012/test-case.md)    | —      |
| [TC-AUTH-013](TC-AUTH-013/test-case.md)       | B dùng ID của A cho mọi endpoint có {id}/{petId}                                                             | API, SEC | P0      | FR-AUTH-013, NFR-SEC-004 | Not Run    | [test-case.md](TC-AUTH-013/test-case.md)    | —      |
| [TC-AUTH-014](TC-AUTH-014/test-case.md)       | Mở /settings khi chưa đăng nhập                                                                              | E2E      | P0      | FR-AUTH-014              | Not Run    | [test-case.md](TC-AUTH-014/test-case.md)    | —      |
| [TC-AUTH-015](TC-AUTH-015/test-case.md)       | POST /me/email với mật khẩu đúng + email mới                                                                 | API, IT  | P1      | FR-AUTH-015              | Not Run    | [test-case.md](TC-AUTH-015/test-case.md)    | —      |
| [TC-AUTH-016](TC-AUTH-016/test-case.md)       | DELETE /me với mật khẩu đúng                                                                                 | API, E2E | P2      | FR-AUTH-016              | Not Run    | [test-case.md](TC-AUTH-016/test-case.md)    | —      |
| [TC-AUTH-017](TC-AUTH-017/test-case.md)       | Đăng ký nickname 1 và 50 ký tự                                                                               | API, UI  | P1      | FR-AUTH-017              | Not Run    | [test-case.md](TC-AUTH-017/test-case.md)    | —      |
| [TC-AUTH-018](TC-AUTH-018/test-case.md)       | Nhập mật khẩu và nhập lại khác                                                                               | UI       | P1      | FR-AUTH-018              | Not Run    | [test-case.md](TC-AUTH-018/test-case.md)    | —      |
| [TC-AUTH-001-N1](TC-AUTH-001-N1/test-case.md) | Đăng ký với email sai định dạng, email trùng (khác hoa thường), mật khẩu 7/129, nickname rỗng/51, ngày sinh… | API      | P0      | FR-AUTH-001, 017         | Not Run    | [test-case.md](TC-AUTH-001-N1/test-case.md) | —      |
| [TC-AUTH-006-N1](TC-AUTH-006-N1/test-case.md) | 6 request sai đồng thời từ 2 thiết bị                                                                        | API      | P0      | FR-AUTH-006              | Not Run    | [test-case.md](TC-AUTH-006-N1/test-case.md) | —      |
| [TC-AUTH-013-N1](TC-AUTH-013-N1/test-case.md) | B gọi ID của A với ID sai định dạng, ID đã xóa, ID của chính B                                               | API      | P0      | FR-AUTH-013              | Not Run    | [test-case.md](TC-AUTH-013-N1/test-case.md) | —      |

### PET — Hồ sơ thú cưng (10)

| ID                                          | Tên                                                                                          | Cấp      | Ưu tiên | Truy vết                | Trạng thái | Hồ sơ                                      | Report |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- | ------- | ----------------------- | ---------- | ------------------------------------------ | ------ |
| [TC-PET-001](TC-PET-001/test-case.md)       | Tạo bé với đủ 4 trường                                                                       | API, UI  | P0      | FR-PET-001              | Not Run    | [test-case.md](TC-PET-001/test-case.md)    | —      |
| [TC-PET-002](TC-PET-002/test-case.md)       | Tạo 10 bé                                                                                    | API, UI  | P0      | FR-PET-002              | Not Run    | [test-case.md](TC-PET-002/test-case.md)    | —      |
| [TC-PET-003](TC-PET-003/test-case.md)       | Kiểm 4 ca SRS §2.10.1: 2019-03-15→2026-10-22; 2019-03-25→2026-10-22; 2026-05-01→2026-10-22;… | UT, API  | P1      | FR-PET-003              | Not Run    | [test-case.md](TC-PET-003/test-case.md)    | —      |
| [TC-PET-004](TC-PET-004/test-case.md)       | Lưu đặc điểm 0, 2.000 ký tự                                                                  | API, UI  | P1      | FR-PET-004              | Not Run    | [test-case.md](TC-PET-004/test-case.md)    | —      |
| [TC-PET-005](TC-PET-005/test-case.md)       | Upload JPG/PNG/HEIC hợp lệ                                                                   | API, IT  | P1      | FR-PET-005, NFR-SEC-011 | Not Run    | [test-case.md](TC-PET-005/test-case.md)    | —      |
| [TC-PET-006](TC-PET-006/test-case.md)       | Sửa từng trường                                                                              | API, UI  | P0      | FR-PET-006              | Not Run    | [test-case.md](TC-PET-006/test-case.md)    | —      |
| [TC-PET-007](TC-PET-007/test-case.md)       | Chọn bé ở Dashboard                                                                          | E2E, UI  | P0      | FR-PET-007              | Not Run    | [test-case.md](TC-PET-007/test-case.md)    | —      |
| [TC-PET-008](TC-PET-008/test-case.md)       | Xóa với tên sai                                                                              | API, E2E | P1      | FR-PET-008              | Not Run    | [test-case.md](TC-PET-008/test-case.md)    | —      |
| [TC-PET-001-B1](TC-PET-001-B1/test-case.md) | Tên 1 và 50 ký tự; giống 1 và 50; tên 51; giống 51                                           | API      | P0      | FR-PET-001              | Not Run    | [test-case.md](TC-PET-001-B1/test-case.md) | —      |
| [TC-PET-002-N1](TC-PET-002-N1/test-case.md) | Tạo bé khi đã có 10, đồng thời 5 request                                                     | API      | P0      | FR-PET-002              | Not Run    | [test-case.md](TC-PET-002-N1/test-case.md) | —      |

### WGT — Cân nặng (12)

| ID                                          | Tên                                              | Cấp     | Ưu tiên | Truy vết   | Trạng thái | Hồ sơ                                      | Report |
| ------------------------------------------- | ------------------------------------------------ | ------- | ------- | ---------- | ---------- | ------------------------------------------ | ------ |
| [TC-WGT-001](TC-WGT-001/test-case.md)       | Thêm 9,2 với ngày mặc định                       | API, UI | P0      | FR-WGT-001 | Not Run    | [test-case.md](TC-WGT-001/test-case.md)    | —      |
| [TC-WGT-002](TC-WGT-002/test-case.md)       | Thêm 2 số đo cùng ngày                           | API     | P0      | FR-WGT-002 | Not Run    | [test-case.md](TC-WGT-002/test-case.md)    | —      |
| [TC-WGT-003](TC-WGT-003/test-case.md)       | Tạo số đo ngày 01, 03, 03 (khác giờ)             | API, UI | P0      | FR-WGT-003 | Not Run    | [test-case.md](TC-WGT-003/test-case.md)    | —      |
| [TC-WGT-004](TC-WGT-004/test-case.md)       | 0 điểm                                           | UI, E2E | P0      | FR-WGT-004 | Not Run    | [test-case.md](TC-WGT-004/test-case.md)    | —      |
| [TC-WGT-005](TC-WGT-005/test-case.md)       | Đặt mục tiêu 9                                   | API, UI | P0      | FR-WGT-005 | Not Run    | [test-case.md](TC-WGT-005/test-case.md)    | —      |
| [TC-WGT-006](TC-WGT-006/test-case.md)       | Có mục tiêu, kiểm biểu đồ                        | UI      | P0      | FR-WGT-006 | Not Run    | [test-case.md](TC-WGT-006/test-case.md)    | —      |
| [TC-WGT-007](TC-WGT-007/test-case.md)       | Rê/chạm điểm có mục tiêu; điểm không có mục tiêu | UI      | P0      | FR-WGT-007 | Not Run    | [test-case.md](TC-WGT-007/test-case.md)    | —      |
| [TC-WGT-008](TC-WGT-008/test-case.md)       | 0 số đo; 1 số đo                                 | UI      | P0      | FR-WGT-008 | Not Run    | [test-case.md](TC-WGT-008/test-case.md)    | —      |
| [TC-WGT-009](TC-WGT-009/test-case.md)       | Có ≥2 số đo; chỉ 1 số đo                         | UI      | P1      | FR-WGT-009 | Not Run    | [test-case.md](TC-WGT-009/test-case.md)    | —      |
| [TC-WGT-010](TC-WGT-010/test-case.md)       | Sửa số đo                                        | API, UI | P1      | FR-WGT-010 | Not Run    | [test-case.md](TC-WGT-010/test-case.md)    | —      |
| [TC-WGT-001-B1](TC-WGT-001-B1/test-case.md) | 0,0; 0,1; 150,0; 150,1; 9,25; 9,2; 9.2; 9,; ,2   | API     | P0      | FR-WGT-001 | Not Run    | [test-case.md](TC-WGT-001-B1/test-case.md) | —      |
| [TC-WGT-005-B1](TC-WGT-005-B1/test-case.md) | Mục tiêu 0,1; 150; 150,1; 9,25                   | API     | P0      | FR-WGT-005 | Not Run    | [test-case.md](TC-WGT-005-B1/test-case.md) | —      |

### VIS — Sổ y tế (10)

| ID                                          | Tên                                               | Cấp      | Ưu tiên | Truy vết   | Trạng thái | Hồ sơ                                      | Report |
| ------------------------------------------- | ------------------------------------------------- | -------- | ------- | ---------- | ---------- | ------------------------------------------ | ------ |
| [TC-VIS-001](TC-VIS-001/test-case.md)       | Tạo bản ghi chỉ triệu chứng                       | API, UI  | P0      | FR-VIS-001 | Not Run    | [test-case.md](TC-VIS-001/test-case.md)    | —      |
| [TC-VIS-002](TC-VIS-002/test-case.md)       | Tạo 25 bản ghi, nhiều ngày; mở danh sách          | API, UI  | P0      | FR-VIS-002 | Not Run    | [test-case.md](TC-VIS-002/test-case.md)    | —      |
| [TC-VIS-003](TC-VIS-003/test-case.md)       | Sửa từng trường; sửa vi phạm quy tắc              | API, UI  | P0      | FR-VIS-003 | Not Run    | [test-case.md](TC-VIS-003/test-case.md)    | —      |
| [TC-VIS-004](TC-VIS-004/test-case.md)       | Xóa không xác nhận                                | API, E2E | P0      | FR-VIS-004 | Not Run    | [test-case.md](TC-VIS-004/test-case.md)    | —      |
| [TC-VIS-005](TC-VIS-005/test-case.md)       | Đính 5 ảnh JPG/PNG/HEIC                           | API, IT  | P1      | FR-VIS-005 | Not Run    | [test-case.md](TC-VIS-005/test-case.md)    | —      |
| [TC-VIS-006](TC-VIS-006/test-case.md)       | Upload 3 ảnh, 1 ảnh lỗi                           | API, UI  | P1      | FR-VIS-006 | Not Run    | [test-case.md](TC-VIS-006/test-case.md)    | —      |
| [TC-VIS-007](TC-VIS-007/test-case.md)       | Xóa 1 ảnh trong bản ghi                           | API, UI  | P1      | FR-VIS-007 | Not Run    | [test-case.md](TC-VIS-007/test-case.md)    | —      |
| [TC-VIS-008](TC-VIS-008/test-case.md)       | Mở bản ghi có ảnh, chạm ảnh                       | UI       | P1      | FR-VIS-008 | Not Run    | [test-case.md](TC-VIS-008/test-case.md)    | —      |
| [TC-VIS-001-N1](TC-VIS-001-N1/test-case.md) | Chỉ khoảng trắng ở cả hai; 2.001 ký tự; ngày 2099 | API      | P0      | FR-VIS-001 | Not Run    | [test-case.md](TC-VIS-001-N1/test-case.md) | —      |
| [TC-VIS-005-B1](TC-VIS-005-B1/test-case.md) | 0 ảnh; 5 ảnh; 6 ảnh; ảnh 5 MB; 6 MB               | API      | P1      | FR-VIS-005 | Not Run    | [test-case.md](TC-VIS-005-B1/test-case.md) | —      |

### MS — Mốc y tế (16)

| ID                                        | Tên                                                                           | Cấp      | Ưu tiên | Truy vết                    | Trạng thái | Hồ sơ                                     | Report |
| ----------------------------------------- | ----------------------------------------------------------------------------- | -------- | ------- | --------------------------- | ---------- | ----------------------------------------- | ------ |
| [TC-MS-001](TC-MS-001/test-case.md)       | Tạo VACCINE hạn T0+30, ghi chú, không chu kỳ                                  | API, UI  | P0      | FR-MS-001                   | Not Run    | [test-case.md](TC-MS-001/test-case.md)    | —      |
| [TC-MS-002](TC-MS-002/test-case.md)       | Tạo mốc tại T0 với hạn T0+30; đọc DB                                          | API, IT  | P0      | FR-MS-002                   | Not Run    | [test-case.md](TC-MS-002/test-case.md)    | —      |
| [TC-MS-003](TC-MS-003/test-case.md)       | Đánh dấu DONE, không nhập ngày                                                | API, UI  | P0      | FR-MS-003                   | Not Run    | [test-case.md](TC-MS-003/test-case.md)    | —      |
| [TC-MS-004](TC-MS-004/test-case.md)       | Tạo mốc có thông báo chưa xem                                                 | API, IT  | P0      | FR-MS-004                   | Not Run    | [test-case.md](TC-MS-004/test-case.md)    | —      |
| [TC-MS-005](TC-MS-005/test-case.md)       | DONE, trong 10 giây bấm Hoàn tác                                              | API, E2E | P0      | FR-MS-005                   | Not Run    | [test-case.md](TC-MS-005/test-case.md)    | —      |
| [TC-MS-006](TC-MS-006/test-case.md)       | Sửa hạn của mốc PENDING                                                       | API, UI  | P0      | FR-MS-006                   | Not Run    | [test-case.md](TC-MS-006/test-case.md)    | —      |
| [TC-MS-007](TC-MS-007/test-case.md)       | Hủy mốc PENDING không xác nhận                                                | API, UI  | P0      | FR-MS-007                   | Not Run    | [test-case.md](TC-MS-007/test-case.md)    | —      |
| [TC-MS-008](TC-MS-008/test-case.md)       | VACCINE DONE ngày 2026-11-14                                                  | API, IT  | P0      | FR-MS-008, BRU-011          | Not Run    | [test-case.md](TC-MS-008/test-case.md)    | —      |
| [TC-MS-009](TC-MS-009/test-case.md)       | FLEA chu kỳ 3 DONE ngày 2026-11-14                                            | API, IT  | P1      | FR-MS-009, BRU-012          | Not Run    | [test-case.md](TC-MS-009/test-case.md)    | —      |
| [TC-MS-010](TC-MS-010/test-case.md)       | PATCH /milestones/{id} gửi type khác                                          | API      | P0      | FR-MS-010, SD-004           | Not Run    | [test-case.md](TC-MS-010/test-case.md)    | —      |
| [TC-MS-011](TC-MS-011/test-case.md)       | Gửi complete 2 lần liên tiếp                                                  | API, IT  | P0      | FR-MS-011                   | Not Run    | [test-case.md](TC-MS-011/test-case.md)    | —      |
| [TC-MS-012](TC-MS-012/test-case.md)       | Tạo mốc sắp tới, quá hạn, đã thực hiện, đã hủy; mở danh sách                  | API, UI  | P0      | FR-MS-012                   | Not Run    | [test-case.md](TC-MS-012/test-case.md)    | —      |
| [TC-MS-013](TC-MS-013/test-case.md)       | Kiểm màu + nhãn của quá hạn, ≤7 ngày, >7 ngày, đã thực hiện                   | UI       | P1      | FR-MS-013                   | Not Run    | [test-case.md](TC-MS-013/test-case.md)    | —      |
| [TC-MS-001-N1](TC-MS-001-N1/test-case.md) | Tạo VACCINE với chu kỳ 1; FLEA chu kỳ 0/61; ghi chú 501; loại sai             | API      | P0      | FR-MS-001                   | Not Run    | [test-case.md](TC-MS-001-N1/test-case.md) | —      |
| [TC-MS-006-N1](TC-MS-006-N1/test-case.md) | Sửa hạn mốc DONE; sửa loại; sửa mốc của B                                     | API      | P0      | FR-MS-006, 010              | Not Run    | [test-case.md](TC-MS-006-N1/test-case.md) | —      |
| [TC-MS-008-B1](TC-MS-008-B1/test-case.md) | Bảng cộng tháng: 2026-11-14 +12; 2028-02-29 +12; 2026-11-14 +3; 2026-01-31 +1 | UT       | P0      | FR-MS-008, 009, BRU-011/012 | Not Run    | [test-case.md](TC-MS-008-B1/test-case.md) | —      |

### NTF — Nhắc nhở trong app (13)

| ID                                          | Tên                                                                                                         | Cấp          | Ưu tiên | Truy vết               | Trạng thái | Hồ sơ                                      | Report |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------ | ------- | ---------------------- | ---------- | ------------------------------------------ | ------ |
| [TC-NTF-001](TC-NTF-001/test-case.md)       | Chạy bảng 9 ca SRS §2.6.1: hạn 15/11, đặt hạn 01/11; mở app 07/11, 08/11, 11/11, 14/11; đặt hạn 11/11; hạn… | UT, API, E2E | P0      | FR-NTF-001, 003, 004   | Not Run    | [test-case.md](TC-NTF-001/test-case.md)    | —      |
| [TC-NTF-002](TC-NTF-002/test-case.md)       | Mốc PENDING hạn T0−1; mở app T0                                                                             | API, E2E     | P1      | FR-NTF-002             | Not Run    | [test-case.md](TC-NTF-002/test-case.md)    | —      |
| [TC-NTF-003](TC-NTF-003/test-case.md)       | Tạo mốc hôm nay hạn T0+7                                                                                    | API          | P0      | FR-NTF-003             | Not Run    | [test-case.md](TC-NTF-003/test-case.md)    | —      |
| [TC-NTF-004](TC-NTF-004/test-case.md)       | Không mở app từ T0−7 đến T0−1                                                                               | API, IT      | P0      | FR-NTF-004             | Not Run    | [test-case.md](TC-NTF-004/test-case.md)    | —      |
| [TC-NTF-005](TC-NTF-005/test-case.md)       | Tải lại 5 lần                                                                                               | API, IT      | P0      | FR-NTF-005, G-15       | Not Run    | [test-case.md](TC-NTF-005/test-case.md)    | —      |
| [TC-NTF-006](TC-NTF-006/test-case.md)       | DONE, CANCELLED, đổi hạn, xóa bé; kiểm thông báo                                                            | API, IT      | P0      | FR-NTF-006             | Not Run    | [test-case.md](TC-NTF-006/test-case.md)    | —      |
| [TC-NTF-007](TC-NTF-007/test-case.md)       | Mở banner/mục Thông báo; chạm một nhắc                                                                      | UI           | P0      | FR-NTF-007             | Not Run    | [test-case.md](TC-NTF-007/test-case.md)    | —      |
| [TC-NTF-008](TC-NTF-008/test-case.md)       | 0 chưa xem                                                                                                  | API, UI      | P0      | FR-NTF-008, SD-014     | Not Run    | [test-case.md](TC-NTF-008/test-case.md)    | —      |
| [TC-NTF-009](TC-NTF-009/test-case.md)       | Có 3 nhắc: OVERDUE, D1, D7; mở Dashboard                                                                    | E2E          | P0      | FR-NTF-009             | Not Run    | [test-case.md](TC-NTF-009/test-case.md)    | —      |
| [TC-NTF-010](TC-NTF-010/test-case.md)       | Đánh dấu đã xem trên A                                                                                      | API, E2E     | P0      | FR-NTF-010, DC-003     | Not Run    | [test-case.md](TC-NTF-010/test-case.md)    | —      |
| [TC-NTF-011](TC-NTF-011/test-case.md)       | Tạo thông báo appear_on 91 ngày trước; chạy maintenance.daily                                               | IT, OPS      | P1      | FR-NTF-011, SD-013     | Not Run    | [test-case.md](TC-NTF-011/test-case.md)    | —      |
| [TC-NTF-001-B1](TC-NTF-001-B1/test-case.md) | Biên 00:00: hạn T0+7, mở app T0+7 00:00:00 và 23:59:59; múi giờ America/New_York                            | UT           | P0      | FR-NTF-001, FR-GEN-001 | Not Run    | [test-case.md](TC-NTF-001-B1/test-case.md) | —      |
| [TC-NTF-005-N1](TC-NTF-005-N1/test-case.md) | 2 request song song cùng mốc/mức/hạn                                                                        | API          | P0      | FR-NTF-005             | Not Run    | [test-case.md](TC-NTF-005-N1/test-case.md) | —      |

### RT — Việc chăm sóc hằng ngày (9)

| ID                                        | Tên                                                      | Cấp      | Ưu tiên | Truy vết          | Trạng thái | Hồ sơ                                     | Report |
| ----------------------------------------- | -------------------------------------------------------- | -------- | ------- | ----------------- | ---------- | ----------------------------------------- | ------ |
| [TC-RT-001](TC-RT-001/test-case.md)       | Tạo việc tên 1/100 ký tự, giờ 00:00, 23:59               | API, UI  | P1      | FR-RT-001         | Not Run    | [test-case.md](TC-RT-001/test-case.md)    | —      |
| [TC-RT-002](TC-RT-002/test-case.md)       | Tạo 4 việc giờ 07:00, 18:00, 07:30; đánh dấu 1 việc xong | API, UI  | P1      | FR-RT-002         | Not Run    | [test-case.md](TC-RT-002/test-case.md)    | —      |
| [TC-RT-003](TC-RT-003/test-case.md)       | Chạm việc                                                | E2E      | P1      | FR-RT-003         | Not Run    | [test-case.md](TC-RT-003/test-case.md)    | —      |
| [TC-RT-004](TC-RT-004/test-case.md)       | Đánh dấu xong hôm nay                                    | API, IT  | P1      | FR-RT-004         | Not Run    | [test-case.md](TC-RT-004/test-case.md)    | —      |
| [TC-RT-005](TC-RT-005/test-case.md)       | Đánh dấu xong 3 ngày, xóa việc; kiểm bảng completion     | IT       | P1      | FR-RT-005, SD-008 | Not Run    | [test-case.md](TC-RT-005/test-case.md)    | —      |
| [TC-RT-006](TC-RT-006/test-case.md)       | Sửa tên/giờ; mở checklist hôm nay                        | API, UI  | P1      | FR-RT-006         | Not Run    | [test-case.md](TC-RT-006/test-case.md)    | —      |
| [TC-RT-007](TC-RT-007/test-case.md)       | Xóa việc không xác nhận                                  | API, E2E | P1      | FR-RT-007         | Not Run    | [test-case.md](TC-RT-007/test-case.md)    | —      |
| [TC-RT-001-B1](TC-RT-001-B1/test-case.md) | 20/21 việc; giờ 00:00, 23:59, 7:00, 24:00                | API      | P1      | FR-RT-001         | Not Run    | [test-case.md](TC-RT-001-B1/test-case.md) | —      |
| [TC-RT-003-N1](TC-RT-003-N1/test-case.md) | Double click liên tiếp                                   | E2E      | P1      | FR-RT-003         | Not Run    | [test-case.md](TC-RT-003-N1/test-case.md) | —      |

### DSH — Dashboard (8)

| ID                                          | Tên                                                          | Cấp      | Ưu tiên | Truy vết        | Trạng thái | Hồ sơ                                      | Report |
| ------------------------------------------- | ------------------------------------------------------------ | -------- | ------- | --------------- | ---------- | ------------------------------------------ | ------ |
| [TC-DSH-001](TC-DSH-001/test-case.md)       | Đăng nhập thành công                                         | E2E      | P0      | FR-DSH-001      | Not Run    | [test-case.md](TC-DSH-001/test-case.md)    | —      |
| [TC-DSH-002](TC-DSH-002/test-case.md)       | Mở Dashboard có dữ liệu                                      | E2E, API | P0      | FR-DSH-002      | Not Run    | [test-case.md](TC-DSH-002/test-case.md)    | —      |
| [TC-DSH-003](TC-DSH-003/test-case.md)       | Tạo 7 mốc PENDING: 3 quá hạn, 2 trong 30 ngày, 2 sau 30 ngày | API, UI  | P1      | FR-DSH-003      | Not Run    | [test-case.md](TC-DSH-003/test-case.md)    | —      |
| [TC-DSH-004](TC-DSH-004/test-case.md)       | Kiểm 360/390/767/768/1279/1280/1366 px                       | UI       | P0      | FR-DSH-004      | Not Run    | [test-case.md](TC-DSH-004/test-case.md)    | —      |
| [TC-DSH-005](TC-DSH-005/test-case.md)       | Chọn "Tất cả", từng bé                                       | API, UI  | P1      | FR-DSH-005      | Not Run    | [test-case.md](TC-DSH-005/test-case.md)    | —      |
| [TC-DSH-006](TC-DSH-006/test-case.md)       | Tài khoản chưa có bé                                         | E2E      | P0      | FR-DSH-006      | Not Run    | [test-case.md](TC-DSH-006/test-case.md)    | —      |
| [TC-DSH-007](TC-DSH-007/test-case.md)       | Tài khoản chưa xác minh email                                | E2E      | P1      | FR-DSH-007      | Not Run    | [test-case.md](TC-DSH-007/test-case.md)    | —      |
| [TC-DSH-002-N1](TC-DSH-002-N1/test-case.md) | Dashboard khi 0 bé, 0 mốc, 0 cân nặng                        | API      | P0      | FR-DSH-002, 006 | Not Run    | [test-case.md](TC-DSH-002-N1/test-case.md) | —      |

### GEN — Hành vi toàn hệ thống (15)

| ID                                          | Tên                                                | Cấp     | Ưu tiên | Truy vết                | Trạng thái | Hồ sơ                                      | Report |
| ------------------------------------------- | -------------------------------------------------- | ------- | ------- | ----------------------- | ---------- | ------------------------------------------ | ------ |
| [TC-GEN-001](TC-GEN-001/test-case.md)       | Tạo dữ liệu ở Asia/Ho_Chi_Minh và America/New_York | UT, IT  | P0      | FR-GEN-001              | Not Run    | [test-case.md](TC-GEN-001/test-case.md)    | —      |
| [TC-GEN-002](TC-GEN-002/test-case.md)       | Kiểm ngày và số trên 5 màn                         | UI      | P0      | FR-GEN-002, NFR-USA-007 | Not Run    | [test-case.md](TC-GEN-002/test-case.md)    | —      |
| [TC-GEN-003](TC-GEN-003/test-case.md)       | Ngắt mạng khi đang nhập form                       | E2E     | P0      | FR-GEN-003              | Not Run    | [test-case.md](TC-GEN-003/test-case.md)    | —      |
| [TC-GEN-004](TC-GEN-004/test-case.md)       | Giả lập API chậm >10 giây khi lưu                  | E2E     | P0      | FR-GEN-004              | Not Run    | [test-case.md](TC-GEN-004/test-case.md)    | —      |
| [TC-GEN-005](TC-GEN-005/test-case.md)       | POST với Idempotency-Key                           | API, IT | P0      | FR-GEN-005              | Not Run    | [test-case.md](TC-GEN-005/test-case.md)    | —      |
| [TC-GEN-006](TC-GEN-006/test-case.md)       | Nhập form, để session hết hạn                      | E2E     | P1      | FR-GEN-006              | Not Run    | [test-case.md](TC-GEN-006/test-case.md)    | —      |
| [TC-GEN-007](TC-GEN-007/test-case.md)       | Hai thiết bị sửa cùng bản ghi; lưu lần lượt        | API     | P0      | FR-GEN-007              | Not Run    | [test-case.md](TC-GEN-007/test-case.md)    | —      |
| [TC-GEN-008](TC-GEN-008/test-case.md)       | Mở màn, sửa ở tab khác                             | E2E     | P0      | FR-GEN-008              | Not Run    | [test-case.md](TC-GEN-008/test-case.md)    | —      |
| [TC-GEN-009](TC-GEN-009/test-case.md)       | Lưu thành công; đánh dấu mốc DONE                  | UI      | P0      | FR-GEN-009              | Not Run    | [test-case.md](TC-GEN-009/test-case.md)    | —      |
| [TC-GEN-010](TC-GEN-010/test-case.md)       | Mở từng dialog xóa; nhập sai trường                | UI      | P0      | FR-GEN-010              | Not Run    | [test-case.md](TC-GEN-010/test-case.md)    | —      |
| [TC-GEN-011](TC-GEN-011/test-case.md)       | Giả lập 500 từ API                                 | E2E     | P0      | FR-GEN-011              | Not Run    | [test-case.md](TC-GEN-011/test-case.md)    | —      |
| [TC-GEN-012](TC-GEN-012/test-case.md)       | Mở từng màn không có dữ liệu                       | UI      | P0      | FR-GEN-012              | Not Run    | [test-case.md](TC-GEN-012/test-case.md)    | —      |
| [TC-GEN-013](TC-GEN-013/test-case.md)       | Chọn ảnh 4 MB                                      | UI, E2E | P1      | FR-GEN-013              | Not Run    | [test-case.md](TC-GEN-013/test-case.md)    | —      |
| [TC-GEN-005-N1](TC-GEN-005-N1/test-case.md) | Cùng key nhưng payload khác; key sai định dạng     | API     | P0      | FR-GEN-005              | Not Run    | [test-case.md](TC-GEN-005-N1/test-case.md) | —      |
| [TC-GEN-003-N1](TC-GEN-003-N1/test-case.md) | Mất mạng khi đang gửi request                      | E2E     | P0      | FR-GEN-003, 004         | Not Run    | [test-case.md](TC-GEN-003-N1/test-case.md) | —      |

### ANL — Analytics (8)

| ID                                          | Tên                                                                                                            | Cấp     | Ưu tiên | Truy vết        | Trạng thái | Hồ sơ                                      | Report |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------- | ------- | --------------- | ---------- | ------------------------------------------ | ------ |
| [TC-ANL-001](TC-ANL-001/test-case.md)       | Thực hiện các hành động: đăng ký, tạo bé, thêm cân nặng, tạo mốc, mở app, tim, bình luận, theo dõi, chặn, xem… | API, DB | P1      | FR-ANL-001      | Not Run    | [test-case.md](TC-ANL-001/test-case.md)    | —      |
| [TC-ANL-002](TC-ANL-002/test-case.md)       | Kiểm 1 event bất kỳ                                                                                            | API, DB | P1      | FR-ANL-002      | Not Run    | [test-case.md](TC-ANL-002/test-case.md)    | —      |
| [TC-ANL-003](TC-ANL-003/test-case.md)       | Gửi event chứa email/tên bé/triệu chứng/chẩn đoán/đơn thuốc/ghi chú                                            | API, DB | P0      | FR-ANL-003      | Not Run    | [test-case.md](TC-ANL-003/test-case.md)    | —      |
| [TC-ANL-004](TC-ANL-004/test-case.md)       | Tạo thông báo, tạo mốc AUTO                                                                                    | IT      | P1      | FR-ANL-004      | Not Run    | [test-case.md](TC-ANL-004/test-case.md)    | —      |
| [TC-ANL-005](TC-ANL-005/test-case.md)       | Làm hỏng endpoint analytics (500/timeout)                                                                      | E2E     | P0      | FR-ANL-005      | Not Run    | [test-case.md](TC-ANL-005/test-case.md)    | —      |
| [TC-ANL-006](TC-ANL-006/test-case.md)       | Tạo hồ sơ, đăng bài, tim, bình luận, theo dõi, chặn, xem feed                                                  | API, DB | P1      | FR-ANL-006      | Not Run    | [test-case.md](TC-ANL-006/test-case.md)    | —      |
| [TC-ANL-001-N1](TC-ANL-001-N1/test-case.md) | Gửi 21 event; payload 16 KB+1; event sai schema                                                                | API     | P1      | FR-ANL-001, 002 | Not Run    | [test-case.md](TC-ANL-001-N1/test-case.md) | —      |
| [TC-ANL-003-N1](TC-ANL-003-N1/test-case.md) | Gửi event với props chứa khóa lạ                                                                               | API, DB | P0      | FR-ANL-003      | Not Run    | [test-case.md](TC-ANL-003-N1/test-case.md) | —      |

### SOC — Bản tin ảnh thú cưng (46)

| ID                                          | Tên                                                                                                          | Cấp      | Ưu tiên | Truy vết           | Trạng thái | Hồ sơ                                      | Report |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------- | ------------------ | ---------- | ------------------------------------------ | ------ |
| [TC-SOC-001](TC-SOC-001/test-case.md)       | Tài khoản chưa có hồ sơ mở /feed                                                                             | API, E2E | P1      | FR-SOC-001         | Not Run    | [test-case.md](TC-SOC-001/test-case.md)    | —      |
| [TC-SOC-002](TC-SOC-002/test-case.md)       | Username Hoa.Ly_01                                                                                           | API, UI  | P1      | FR-SOC-002         | Not Run    | [test-case.md](TC-SOC-002/test-case.md)    | —      |
| [TC-SOC-003](TC-SOC-003/test-case.md)       | Sửa tên/giới thiệu/avatar                                                                                    | API, UI  | P1      | FR-SOC-003, SD-020 | Not Run    | [test-case.md](TC-SOC-003/test-case.md)    | —      |
| [TC-SOC-004](TC-SOC-004/test-case.md)       | B mở /u/A                                                                                                    | API, E2E | P1      | FR-SOC-004, SD-016 | Not Run    | [test-case.md](TC-SOC-004/test-case.md)    | —      |
| [TC-SOC-005](TC-SOC-005/test-case.md)       | Đặt avatar JPG/PNG/HEIC/GPS                                                                                  | API, IT  | P1      | FR-SOC-005         | Not Run    | [test-case.md](TC-SOC-005/test-case.md)    | —      |
| [TC-SOC-006](TC-SOC-006/test-case.md)       | Tạo bài 1 ảnh, không chú thích, không gắn bé                                                                 | API, UI  | P1      | FR-SOC-006         | Not Run    | [test-case.md](TC-SOC-006/test-case.md)    | —      |
| [TC-SOC-007](TC-SOC-007/test-case.md)       | Tạo draft, upload ảnh vị trí 0, 1                                                                            | API, E2E | P1      | FR-SOC-007         | Not Run    | [test-case.md](TC-SOC-007/test-case.md)    | —      |
| [TC-SOC-008](TC-SOC-008/test-case.md)       | Đăng 5 ảnh, gắn bé của mình                                                                                  | API      | P1      | FR-SOC-008, SD-018 | Not Run    | [test-case.md](TC-SOC-008/test-case.md)    | —      |
| [TC-SOC-009](TC-SOC-009/test-case.md)       | Upload ảnh lớn; kiểm file/URL                                                                                | API, IT  | P1      | FR-SOC-009         | Not Run    | [test-case.md](TC-SOC-009/test-case.md)    | —      |
| [TC-SOC-010](TC-SOC-010/test-case.md)       | Sửa chú thích                                                                                                | API, E2E | P1      | FR-SOC-010         | Not Run    | [test-case.md](TC-SOC-010/test-case.md)    | —      |
| [TC-SOC-011](TC-SOC-011/test-case.md)       | Xóa bài không xác nhận                                                                                       | API, E2E | P1      | FR-SOC-011         | Not Run    | [test-case.md](TC-SOC-011/test-case.md)    | —      |
| [TC-SOC-012](TC-SOC-012/test-case.md)       | Mở bài có 2 ảnh, gắn 2 bé, chú thích có @username                                                            | UI, API  | P1      | FR-SOC-012, SD-016 | Not Run    | [test-case.md](TC-SOC-012/test-case.md)    | —      |
| [TC-SOC-013](TC-SOC-013/test-case.md)       | Mở /p/{id} có 3 ảnh                                                                                          | E2E      | P1      | FR-SOC-013         | Not Run    | [test-case.md](TC-SOC-013/test-case.md)    | —      |
| [TC-SOC-014](TC-SOC-014/test-case.md)       | B theo dõi A                                                                                                 | API, E2E | P1      | FR-SOC-014         | Not Run    | [test-case.md](TC-SOC-014/test-case.md)    | —      |
| [TC-SOC-015](TC-SOC-015/test-case.md)       | 35 người theo dõi; mở danh sách                                                                              | API, UI  | P1      | FR-SOC-015         | Not Run    | [test-case.md](TC-SOC-015/test-case.md)    | —      |
| [TC-SOC-016](TC-SOC-016/test-case.md)       | 20 bài, có bài 3 ảnh; cuộn tới cuối                                                                          | API, UI  | P1      | FR-SOC-016         | Not Run    | [test-case.md](TC-SOC-016/test-case.md)    | —      |
| [TC-SOC-017](TC-SOC-017/test-case.md)       | Tìm "ho" (không dấu) với "Hồ"                                                                                | API, UI  | P1      | FR-SOC-017         | Not Run    | [test-case.md](TC-SOC-017/test-case.md)    | —      |
| [TC-SOC-018](TC-SOC-018/test-case.md)       | A theo dõi B, C; B đăng bài mới khi A đang cuộn                                                              | API, IT  | P1      | FR-SOC-018         | Not Run    | [test-case.md](TC-SOC-018/test-case.md)    | —      |
| [TC-SOC-019](TC-SOC-019/test-case.md)       | Cuộn gần cuối                                                                                                | E2E      | P1      | FR-SOC-019         | Not Run    | [test-case.md](TC-SOC-019/test-case.md)    | —      |
| [TC-SOC-020](TC-SOC-020/test-case.md)       | Mở feed có bài đủ thành phần                                                                                 | UI       | P1      | FR-SOC-020         | Not Run    | [test-case.md](TC-SOC-020/test-case.md)    | —      |
| [TC-SOC-021](TC-SOC-021/test-case.md)       | Feed rỗng                                                                                                    | E2E      | P1      | FR-SOC-021         | Not Run    | [test-case.md](TC-SOC-021/test-case.md)    | —      |
| [TC-SOC-022](TC-SOC-022/test-case.md)       | Tim bài                                                                                                      | API, E2E | P1      | FR-SOC-022         | Not Run    | [test-case.md](TC-SOC-022/test-case.md)    | —      |
| [TC-SOC-023](TC-SOC-023/test-case.md)       | Nhấn đúp ảnh                                                                                                 | E2E      | P1      | FR-SOC-023         | Not Run    | [test-case.md](TC-SOC-023/test-case.md)    | —      |
| [TC-SOC-024](TC-SOC-024/test-case.md)       | Bài có 120 người thích; mở danh sách                                                                         | API, UI  | P1      | FR-SOC-024         | Not Run    | [test-case.md](TC-SOC-024/test-case.md)    | —      |
| [TC-SOC-025](TC-SOC-025/test-case.md)       | Bình luận 1 ký tự, 500 ký tự                                                                                 | API      | P1      | FR-SOC-025         | Not Run    | [test-case.md](TC-SOC-025/test-case.md)    | —      |
| [TC-SOC-026](TC-SOC-026/test-case.md)       | Gửi bằng Enter; Shift+Enter                                                                                  | UI, E2E  | P1      | FR-SOC-026         | Not Run    | [test-case.md](TC-SOC-026/test-case.md)    | —      |
| [TC-SOC-027](TC-SOC-027/test-case.md)       | Tác giả xóa bình luận                                                                                        | API, E2E | P1      | FR-SOC-027         | Not Run    | [test-case.md](TC-SOC-027/test-case.md)    | —      |
| [TC-SOC-028](TC-SOC-028/test-case.md)       | B tim bài A 2 lần, bỏ tim rồi tim lại                                                                        | API, IT  | P1      | FR-SOC-028         | Not Run    | [test-case.md](TC-SOC-028/test-case.md)    | —      |
| [TC-SOC-029](TC-SOC-029/test-case.md)       | 2 người tim cùng bài chưa đọc                                                                                | API, UI  | P1      | FR-SOC-029         | Not Run    | [test-case.md](TC-SOC-029/test-case.md)    | —      |
| [TC-SOC-030](TC-SOC-030/test-case.md)       | Mở tab Hoạt động; chạm dòng tim/bình luận/theo dõi                                                           | E2E      | P1      | FR-SOC-030         | Not Run    | [test-case.md](TC-SOC-030/test-case.md)    | —      |
| [TC-SOC-031](TC-SOC-031/test-case.md)       | 2 nhắc lịch + 3 hoạt động chưa xem                                                                           | E2E, API | P1      | FR-SOC-031         | Not Run    | [test-case.md](TC-SOC-031/test-case.md)    | —      |
| [TC-SOC-032](TC-SOC-032/test-case.md)       | Tạo thông báo hoạt động 91 ngày; chạy job                                                                    | IT, OPS  | P1      | FR-SOC-032, SD-021 | Not Run    | [test-case.md](TC-SOC-032/test-case.md)    | —      |
| [TC-SOC-033](TC-SOC-033/test-case.md)       | A chặn B; B tim/bình luận/theo dõi A                                                                         | API, IT  | P1      | FR-SOC-033         | Not Run    | [test-case.md](TC-SOC-033/test-case.md)    | —      |
| [TC-SOC-034](TC-SOC-034/test-case.md)       | Chặn từ menu hồ sơ/bài/bình luận, có xác nhận                                                                | API, E2E | P1      | FR-SOC-034         | Not Run    | [test-case.md](TC-SOC-034/test-case.md)    | —      |
| [TC-SOC-035](TC-SOC-035/test-case.md)       | A chặn B; kiểm DB                                                                                            | API, IT  | P1      | FR-SOC-035         | Not Run    | [test-case.md](TC-SOC-035/test-case.md)    | —      |
| [TC-SOC-036](TC-SOC-036/test-case.md)       | A chặn B                                                                                                     | API, E2E | P1      | FR-SOC-036         | Not Run    | [test-case.md](TC-SOC-036/test-case.md)    | —      |
| [TC-SOC-037](TC-SOC-037/test-case.md)       | Bỏ chặn trên hồ sơ                                                                                           | API, E2E | P1      | FR-SOC-037         | Not Run    | [test-case.md](TC-SOC-037/test-case.md)    | —      |
| [TC-SOC-038](TC-SOC-038/test-case.md)       | Vượt từng ngưỡng: bài 30/ngày, bình luận 30/10 phút, tim 300/giờ, follow 200/ngày, chặn 50/ngày, tìm 60/phút | API, UI  | P1      | FR-SOC-038         | Not Run    | [test-case.md](TC-SOC-038/test-case.md)    | —      |
| [TC-SOC-039](TC-SOC-039/test-case.md)       | Tài khoản <24 giờ: đăng bài 11, bình luận 11/10 phút                                                         | API      | P1      | FR-SOC-039         | Not Run    | [test-case.md](TC-SOC-039/test-case.md)    | —      |
| [TC-SOC-040](TC-SOC-040/test-case.md)       | Tìm endpoint/UI báo cáo, ẩn bài, kiểm duyệt; kiểm OpenAPI                                                    | API, UI  | P1      | FR-SOC-040, SD-017 | Not Run    | [test-case.md](TC-SOC-040/test-case.md)    | —      |
| [TC-SOC-002-N1](TC-SOC-002-N1/test-case.md) | Username 2/3/30/31 ký tự; a.b, a..b, .a, a., a_b, a-b, chữ hoa                                               | API      | P1      | FR-SOC-002         | Not Run    | [test-case.md](TC-SOC-002-N1/test-case.md) | —      |
| [TC-SOC-006-B1](TC-SOC-006-B1/test-case.md) | 0/1/5/6 ảnh; 0/2.200/2.201 chú thích; 0/5/6 bé                                                               | API      | P1      | FR-SOC-006         | Not Run    | [test-case.md](TC-SOC-006-B1/test-case.md) | —      |
| [TC-SOC-007-N1](TC-SOC-007-N1/test-case.md) | 2 ảnh cùng vị trí; xóa ảnh khi còn 1; draft của B                                                            | API      | P1      | FR-SOC-007         | Not Run    | [test-case.md](TC-SOC-007-N1/test-case.md) | —      |
| [TC-SOC-017-N1](TC-SOC-017-N1/test-case.md) | Tìm email qa.a@...; tìm chuỗi 31 ký tự; tìm khi bị chặn                                                      | API      | P1      | FR-SOC-017         | Not Run    | [test-case.md](TC-SOC-017-N1/test-case.md) | —      |
| [TC-SOC-025-B1](TC-SOC-025-B1/test-case.md) | 1/500/501 ký tự; toàn khoảng trắng; Unicode NFC/NFD                                                          | API      | P1      | FR-SOC-025         | Not Run    | [test-case.md](TC-SOC-025-B1/test-case.md) | —      |
| [TC-SOC-036-N1](TC-SOC-036-N1/test-case.md) | A chặn B, B đang mở feed cũ; B refresh; B dùng deep link                                                     | E2E      | P1      | FR-SOC-036         | Not Run    | [test-case.md](TC-SOC-036-N1/test-case.md) | —      |

### DB — Tích hợp DB/RLS/media (23)

| ID                          | Tên                                                                                                            | Cấp | Ưu tiên | Truy vết                            | Trạng thái | Hồ sơ                              | Report |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- | --- | ------- | ----------------------------------- | ---------- | ---------------------------------- | ------ |
| [DB-01](DB-01/test-case.md) | Tạo DB rỗng                                                                                                    | IT  | P0      | NFR-MNT-006, SAD §2.9               | Not Run    | [test-case.md](DB-01/test-case.md) | —      |
| [DB-02](DB-02/test-case.md) | Kết nối bằng app_rw, app_worker, ph_owner                                                                      | IT  | P0      | NFR-SEC-004, SAD §2.3               | Not Run    | [test-case.md](DB-02/test-case.md) | —      |
| [DB-03](DB-03/test-case.md) | A tạo pets, weight_entries, visits, visit_photos, milestones, notifications, routine_tasks/completions; B đọc… | IT  | P0      | FR-AUTH-013, NFR-SEC-004            | Not Run    | [test-case.md](DB-03/test-case.md) | —      |
| [DB-04](DB-04/test-case.md) | Kiểm relrowsecurity + relforcerowsecurity trên 8 bảng social                                                   | IT  | P0      | FR-SOC-004, 036, NFR-SEC-013        | Not Run    | [test-case.md](DB-04/test-case.md) | —      |
| [DB-05](DB-05/test-case.md) | Insert email A@X.com rồi a@x.com                                                                               | IT  | P0      | FR-AUTH-001, FR-SOC-001, 002        | Not Run    | [test-case.md](DB-05/test-case.md) | —      |
| [DB-06](DB-06/test-case.md) | Insert token đã dùng, đã hết hạn                                                                               | IT  | P1      | FR-AUTH-002, 008, 012               | Not Run    | [test-case.md](DB-06/test-case.md) | —      |
| [DB-07](DB-07/test-case.md) | Tạo 10 pets                                                                                                    | IT  | P1      | FR-PET-002, 008                     | Not Run    | [test-case.md](DB-07/test-case.md) | —      |
| [DB-08](DB-08/test-case.md) | Insert weight_entries 0; 0,1; 150; 150,1; 9,25; 2 dòng cùng ngày                                               | IT  | P1      | FR-WGT-001, 002                     | Not Run    | [test-case.md](DB-08/test-case.md) | —      |
| [DB-09](DB-09/test-case.md) | Insert visit với symptoms null + diagnosis null; chỉ khoảng trắng; một trong hai có giá trị                    | IT  | P1      | FR-VIS-001                          | Not Run    | [test-case.md](DB-09/test-case.md) | —      |
| [DB-10](DB-10/test-case.md) | Insert 5 visit_photos                                                                                          | IT  | P1      | FR-VIS-005                          | Not Run    | [test-case.md](DB-10/test-case.md) | —      |
| [DB-11](DB-11/test-case.md) | Insert milestone status ngoài enum                                                                             | IT  | P1      | FR-MS-008, 010, 011                 | Not Run    | [test-case.md](DB-11/test-case.md) | —      |
| [DB-12](DB-12/test-case.md) | Insert 2 notification cùng (milestone, level, due_on)                                                          | IT  | P1      | FR-NTF-005, 006, NFR-REL-003        | Not Run    | [test-case.md](DB-12/test-case.md) | —      |
| [DB-13](DB-13/test-case.md) | 20 routine_tasks cho 1 pet                                                                                     | IT  | P1      | FR-RT-001, 004, 005                 | Not Run    | [test-case.md](DB-13/test-case.md) | —      |
| [DB-14](DB-14/test-case.md) | 2 request cùng Idempotency-Key + cùng user                                                                     | IT  | P1      | FR-GEN-005                          | Not Run    | [test-case.md](DB-14/test-case.md) | —      |
| [DB-15](DB-15/test-case.md) | 5 request trong cửa sổ                                                                                         | IT  | P1      | NFR-SEC-005, FR-SOC-038             | Not Run    | [test-case.md](DB-15/test-case.md) | —      |
| [DB-16](DB-16/test-case.md) | analytics_ensure_partitions(2)                                                                                 | IT  | P1      | FR-ANL-001, 004, NFR-MNT-006        | Not Run    | [test-case.md](DB-16/test-case.md) | —      |
| [DB-17](DB-17/test-case.md) | Post status ngoài enum                                                                                         | IT  | P1      | FR-SOC-006, 007                     | Not Run    | [test-case.md](DB-17/test-case.md) | —      |
| [DB-18](DB-18/test-case.md) | B follow A 2 lần                                                                                               | IT  | P1      | FR-SOC-014, 022, 028                | Not Run    | [test-case.md](DB-18/test-case.md) | —      |
| [DB-19](DB-19/test-case.md) | A chặn B                                                                                                       | IT  | P1      | FR-SOC-034, 035                     | Not Run    | [test-case.md](DB-19/test-case.md) | —      |
| [DB-20](DB-20/test-case.md) | 3 like chưa đọc của 3 người                                                                                    | IT  | P1      | FR-SOC-028, 029                     | Not Run    | [test-case.md](DB-20/test-case.md) | —      |
| [DB-21](DB-21/test-case.md) | Complete milestone trong transaction (milestone + notification + mốc AUTO)                                     | IT  | P0      | FR-MS-008, 011, SAD §2.2.2          | Not Run    | [test-case.md](DB-21/test-case.md) | —      |
| [DB-22](DB-22/test-case.md) | Upload JPG/PNG/HEIC/GPS                                                                                        | IT  | P1      | FR-PET-005, FR-SOC-009, NFR-SEC-011 | Not Run    | [test-case.md](DB-22/test-case.md) | —      |
| [DB-23](DB-23/test-case.md) | Chạy migration khi có dữ liệu (10.000 weight, 50.000 milestone); đo thời gian và lock                          | IT  | P1      | NFR-MNT-006, RSK-T13                | Not Run    | [test-case.md](DB-23/test-case.md) | —      |

### CON — Hợp đồng (10)

| ID                            | Tên                                                                                   | Cấp      | Ưu tiên | Truy vết                    | Trạng thái | Hồ sơ                               | Report |
| ----------------------------- | ------------------------------------------------------------------------------------- | -------- | ------- | --------------------------- | ---------- | ----------------------------------- | ------ |
| [CON-01](CON-01/test-case.md) | Chạy pnpm openapi:gen hai lần trên cùng commit; git diff openapi.yaml                 | Contract | P0      | NFR-MNT-001, G-17           | Not Run    | [test-case.md](CON-01/test-case.md) | —      |
| [CON-02](CON-02/test-case.md) | Sinh packages/api-client từ openapi.yaml; pnpm -r typecheck                           | Contract | P1      | NFR-MNT-001, 004            | Not Run    | [test-case.md](CON-02/test-case.md) | —      |
| [CON-03](CON-03/test-case.md) | oasdiff breaking base openapi.yaml                                                    | Contract | P0      | NFR-MNT-004, G-17           | Not Run    | [test-case.md](CON-03/test-case.md) | —      |
| [CON-04](CON-04/test-case.md) | Kiểm mỗi operation có operationId, request/response schema, mã lỗi                    | Contract | P1      | NFR-MNT-001                 | Not Run    | [test-case.md](CON-04/test-case.md) | —      |
| [CON-05](CON-05/test-case.md) | Sinh danh sách mã lỗi từ OpenAPI, đối chiếu bảng mã lỗi SRS/PRD                       | Contract | P1      | NFR-MNT-001, FR-GEN-011     | Not Run    | [test-case.md](CON-05/test-case.md) | —      |
| [CON-06](CON-06/test-case.md) | Kiểm các POST tạo mới có header Idempotency-Key bắt buộc                              | Contract | P1      | FR-GEN-005                  | Not Run    | [test-case.md](CON-06/test-case.md) | —      |
| [CON-07](CON-07/test-case.md) | Kiểm tham số/response phân trang của feed, visits, notifications, followers, comments | Contract | P1      | FR-VIS-002, FR-SOC-016, 018 | Not Run    | [test-case.md](CON-07/test-case.md) | —      |
| [CON-08](CON-08/test-case.md) | Kiểm security scheme, cookie, CSRF header trong OpenAPI                               | Contract | P1      | NFR-SEC-002                 | Not Run    | [test-case.md](CON-08/test-case.md) | —      |
| [CON-09](CON-09/test-case.md) | Chạy Schemathesis trên staging (S7)                                                   | Contract | P1      | NFR-MNT-004                 | Not Run    | [test-case.md](CON-09/test-case.md) | —      |
| [CON-10](CON-10/test-case.md) | Kiểm schema upload (multipart/PUT), giới hạn dung lượng, URL ký                       | Contract | P1      | FR-GEN-013, FR-SOC-009      | Not Run    | [test-case.md](CON-10/test-case.md) | —      |

### API — Xuyên suốt (16)

| ID                            | Tên                                                                                  | Cấp | Ưu tiên | Truy vết                 | Trạng thái | Hồ sơ                               | Report |
| ----------------------------- | ------------------------------------------------------------------------------------ | --- | ------- | ------------------------ | ---------- | ----------------------------------- | ------ |
| [API-01](API-01/test-case.md) | Gọi 10 loại lỗi khác nhau (400/401/403/404/409/413/415/422/429/500)                  | API | P0      | FR-GEN-011, NFR-SEC-008  | Not Run    | [test-case.md](API-01/test-case.md) | —      |
| [API-02](API-02/test-case.md) | B gọi tài nguyên A; B gọi tài nguyên không tồn tại; B gọi tài nguyên công khai của A | API | P0      | FR-AUTH-013, NFR-SEC-004 | Not Run    | [test-case.md](API-02/test-case.md) | —      |
| [API-03](API-03/test-case.md) | Gọi mọi route không kèm cookie (trừ allowlist công khai)                             | API | P0      | NFR-SEC-002, SAD §2.5    | Not Run    | [test-case.md](API-03/test-case.md) | —      |
| [API-04](API-04/test-case.md) | POST/PATCH/DELETE không có CSRF token; có token sai; có token đúng                   | API | P0      | NFR-SEC-002              | Not Run    | [test-case.md](API-04/test-case.md) | —      |
| [API-05](API-05/test-case.md) | Vượt ngưỡng rate limit từng nhóm (login, register, analytics, social, search)        | API | P0      | NFR-SEC-005, FR-SOC-038  | Not Run    | [test-case.md](API-05/test-case.md) | —      |
| [API-06](API-06/test-case.md) | Replay Idempotency-Key cùng payload; khác payload; sau 24 giờ; thiếu key             | API | P0      | FR-GEN-005               | Not Run    | [test-case.md](API-06/test-case.md) | —      |
| [API-07](API-07/test-case.md) | Cursor rỗng, cursor sai, cursor hết, limit 0/1/giới hạn/giới hạn+1                   | API | P1      | FR-SOC-018, NFR-MNT-001  | Not Run    | [test-case.md](API-07/test-case.md) | —      |
| [API-08](API-08/test-case.md) | Gửi payload thiếu trường, sai kiểu, sai enum, quá dài, toàn khoảng trắng             | API | P1      | FR-GEN-010, NFR-USA-007  | Not Run    | [test-case.md](API-08/test-case.md) | —      |
| [API-09](API-09/test-case.md) | Body 64 KB+1; body không phải JSON; Content-Type sai                                 | API | P1      | NFR-SEC-006              | Not Run    | [test-case.md](API-09/test-case.md) | —      |
| [API-10](API-10/test-case.md) | Giữ kết nối chậm >10 giây; client abort giữa request ghi                             | API | P1      | FR-GEN-004, NFR-REL-001  | Not Run    | [test-case.md](API-10/test-case.md) | —      |
| [API-11](API-11/test-case.md) | Gửi Accept-Language: en, vi; gửi múi giờ; gửi locale không hỗ trợ                    | API | P1      | NFR-USA-007, FR-AUTH-011 | Not Run    | [test-case.md](API-11/test-case.md) | —      |
| [API-12](API-12/test-case.md) | Kiểm header X-Request-Id / mã ref trong lỗi 5xx                                      | API | P1      | FR-GEN-011               | Not Run    | [test-case.md](API-12/test-case.md) | —      |
| [API-13](API-13/test-case.md) | Hai client PATCH cùng bản ghi gần như đồng thời                                      | API | P1      | FR-GEN-007               | Not Run    | [test-case.md](API-13/test-case.md) | —      |
| [API-14](API-14/test-case.md) | Upload thiếu multipart, sai field, file rỗng, file 0 byte, file quá lớn              | API | P1      | FR-GEN-013, FR-SOC-009   | Not Run    | [test-case.md](API-14/test-case.md) | —      |
| [API-15](API-15/test-case.md) | GET URL ký: đúng, sửa path, sửa chữ ký, hết hạn, dùng lại sau khi xóa                | API | P0      | NFR-SEC-007, G-11        | Not Run    | [test-case.md](API-15/test-case.md) | —      |
| [API-16](API-16/test-case.md) | Gọi method không hỗ trợ; path không tồn tại; path có // hoặc encoded                 | API | P1      | FR-GEN-011               | Not Run    | [test-case.md](API-16/test-case.md) | —      |

### E2E — Hệ thống (26)

| ID                            | Tên                                                                                                         | Cấp | Ưu tiên | Truy vết                     | Trạng thái | Hồ sơ                               | Report |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- | --- | ------- | ---------------------------- | ---------- | ----------------------------------- | ------ |
| [E2E-01](E2E-01/test-case.md) | Đăng ký → mở mail → xác minh → tạo bé → tạo mốc hạn T0+30 → FakeClock T0+23 → nhắc D7 xuất hiện ở banner +… | E2E | P0      | G-3, G-18, FR-MS-003, 008    | Not Run    | [test-case.md](E2E-01/test-case.md) | —      |
| [E2E-02](E2E-02/test-case.md) | Đăng nhập, reload, đăng xuất, back, mở URL bảo vệ                                                           | E2E | P0      | FR-AUTH-005, 007, 014        | Not Run    | [test-case.md](E2E-02/test-case.md) | —      |
| [E2E-03](E2E-03/test-case.md) | Quên mật khẩu → mail → đặt lại → đăng nhập mật khẩu mới → thử link lần 2                                    | E2E | P0      | FR-AUTH-008, 009             | Not Run    | [test-case.md](E2E-03/test-case.md) | —      |
| [E2E-04](E2E-04/test-case.md) | Đổi email: nhập mật khẩu + email mới → xác minh → kiểm email cũ                                             | E2E | P0      | FR-AUTH-015                  | Not Run    | [test-case.md](E2E-04/test-case.md) | —      |
| [E2E-05](E2E-05/test-case.md) | Xóa tài khoản: xác nhận mật khẩu → kiểm đăng nhập + dữ liệu social/sức khỏe                                 | E2E | P0      | FR-AUTH-016, US-005          | Not Run    | [test-case.md](E2E-05/test-case.md) | —      |
| [E2E-06](E2E-06/test-case.md) | Tạo 1 bé → sửa → thêm 9 bé → nút bị khóa → xóa bằng tên sai/đúng                                            | E2E | P1      | FR-PET-001, 002, 006, 008    | Not Run    | [test-case.md](E2E-06/test-case.md) | —      |
| [E2E-07](E2E-07/test-case.md) | Upload avatar JPG và HEIC có GPS; xóa avatar                                                                | E2E | P1      | FR-PET-005, NFR-SEC-011      | Not Run    | [test-case.md](E2E-07/test-case.md) | —      |
| [E2E-08](E2E-08/test-case.md) | Thêm 4 số đo (có 9.2 và 9,2) → sửa → xóa → đặt mục tiêu → kiểm biểu đồ/tooltip                              | E2E | P1      | FR-WGT-001→010               | Not Run    | [test-case.md](E2E-08/test-case.md) | —      |
| [E2E-09](E2E-09/test-case.md) | Tạo khám có 5 ảnh → mở lightbox → xóa 1 ảnh → xóa bản ghi                                                   | E2E | P1      | FR-VIS-001→008               | Not Run    | [test-case.md](E2E-09/test-case.md) | —      |
| [E2E-10](E2E-10/test-case.md) | Tạo 3 loại mốc → sửa hạn → hủy → kiểm 4 nhóm                                                                | E2E | P1      | FR-MS-001, 006, 007, 012     | Not Run    | [test-case.md](E2E-10/test-case.md) | —      |
| [E2E-11](E2E-11/test-case.md) | Đánh dấu mốc DONE → toast Hoàn tác → bấm trong 10 giây → DONE lại → chờ 11 giây → hoàn tác                  | E2E | P1      | FR-MS-003, 005, 008          | Not Run    | [test-case.md](E2E-11/test-case.md) | —      |
| [E2E-12](E2E-12/test-case.md) | Có 3 nhắc → mở chuông → đọc 1 → đọc tất cả → đổi tab 60 giây → quay lại                                     | E2E | P1      | FR-NTF-008, 010, FR-SOC-031  | Not Run    | [test-case.md](E2E-12/test-case.md) | —      |
| [E2E-13](E2E-13/test-case.md) | 4 việc → chạm 1 việc → giả lập lỗi mạng → FakeClock qua 00:00                                               | E2E | P1      | FR-RT-002→005                | Not Run    | [test-case.md](E2E-13/test-case.md) | —      |
| [E2E-14](E2E-14/test-case.md) | Dashboard: có dữ liệu, "Tất cả"/từng bé, chưa xác minh, chưa có bé                                          | E2E | P0      | FR-DSH-001→007               | Not Run    | [test-case.md](E2E-14/test-case.md) | —      |
| [E2E-15](E2E-15/test-case.md) | Điều hướng phone 390×844 và tablet 834×1112: nav dưới/trái, mở từng màn                                     | E2E | P1      | FR-DSH-004, NFR-USA-001      | Not Run    | [test-case.md](E2E-15/test-case.md) | —      |
| [E2E-16](E2E-16/test-case.md) | Đổi múi giờ VN → New York; qua 00:00; kiểm D7/D1/quá hạn                                                    | E2E | P0      | FR-AUTH-011, FR-GEN-001, G-5 | Not Run    | [test-case.md](E2E-16/test-case.md) | —      |
| [E2E-17](E2E-17/test-case.md) | Offline khi nhập form; API chậm >10 giây; API 500; hết phiên giữa form                                      | E2E | P0      | FR-GEN-003→006, 011          | Not Run    | [test-case.md](E2E-17/test-case.md) | —      |
| [E2E-18](E2E-18/test-case.md) | Tạo hồ sơ → đổi username → đổi lại sau 3 ngày → sau 14 ngày; B mở hồ sơ                                     | E2E | P1      | FR-SOC-001→005               | Not Run    | [test-case.md](E2E-18/test-case.md) | —      |
| [E2E-19](E2E-19/test-case.md) | Soạn bài 3 ảnh + 2 bé + chú thích → xóa 1 ảnh → đăng → kiểm feed                                            | E2E | P1      | FR-SOC-006→013               | Not Run    | [test-case.md](E2E-19/test-case.md) | —      |
| [E2E-20](E2E-20/test-case.md) | Feed 25 bài → cuộn tải tiếp → kéo làm mới → có bài mới sau 60 giây                                          | E2E | P1      | FR-SOC-016→021               | Not Run    | [test-case.md](E2E-20/test-case.md) | —      |
| [E2E-21](E2E-21/test-case.md) | B tim → bỏ tim → nhấn đúp ảnh → bình luận → xóa bình luận                                                   | E2E | P1      | FR-SOC-022→027               | Not Run    | [test-case.md](E2E-21/test-case.md) | —      |
| [E2E-22](E2E-22/test-case.md) | B tìm "ho" → theo dõi A → xem danh sách → bỏ theo dõi                                                       | E2E | P1      | FR-SOC-014, 015, 017         | Not Run    | [test-case.md](E2E-22/test-case.md) | —      |
| [E2E-23](E2E-23/test-case.md) | 2 người tim + 1 bình luận + 1 theo dõi A → A mở tab Hoạt động → chạm từng dòng                              | E2E | P1      | FR-SOC-028→033               | Not Run    | [test-case.md](E2E-23/test-case.md) | —      |
| [E2E-24](E2E-24/test-case.md) | A chặn B từ bài → B mở hồ sơ/feed/tìm → A mở "Đã chặn" → bỏ chặn                                            | E2E | P0      | FR-SOC-034→037               | Not Run    | [test-case.md](E2E-24/test-case.md) | —      |
| [E2E-25](E2E-25/test-case.md) | Chuyển ngôn ngữ vi→en→vi trên 6 màn chính; kiểm ngày/số/lỗi                                                 | E2E | P1      | NFR-USA-007, FR-GEN-002      | Not Run    | [test-case.md](E2E-25/test-case.md) | —      |
| [E2E-26](E2E-26/test-case.md) | Tablet: mở bài 3 ảnh, dùng phím ←/→, mở lightbox, đóng bằng Esc                                             | E2E | P1      | FR-SOC-013, NFR-USA-002      | Not Run    | [test-case.md](E2E-26/test-case.md) | —      |

### UAT — Chấp nhận theo story (50)

| ID                              | Tên                        | Cấp | Ưu tiên | Truy vết                                                  | Trạng thái | Hồ sơ                                | Report |
| ------------------------------- | -------------------------- | --- | ------- | --------------------------------------------------------- | ---------- | ------------------------------------ | ------ |
| [UAT-001](UAT-001/test-case.md) | Đăng ký                    | UAT | P0      | US-001 Đăng ký · TC-AUTH-001, 002, 017; E2E-01            | Not Run    | [test-case.md](UAT-001/test-case.md) | —      |
| [UAT-002](UAT-002/test-case.md) | Xác minh email             | UAT | P1      | US-002 Xác minh email · TC-AUTH-002, 003, 004; TC-DSH-007 | Not Run    | [test-case.md](UAT-002/test-case.md) | —      |
| [UAT-003](UAT-003/test-case.md) | Đăng nhập/xuất             | UAT | P0      | US-003 Đăng nhập/xuất · TC-AUTH-005, 006, 007, 014        | Not Run    | [test-case.md](UAT-003/test-case.md) | —      |
| [UAT-004](UAT-004/test-case.md) | Đặt lại mật khẩu           | UAT | P1      | US-004 Đặt lại mật khẩu · TC-AUTH-008, 009                | Not Run    | [test-case.md](UAT-004/test-case.md) | —      |
| [UAT-005](UAT-005/test-case.md) | Xóa tài khoản              | UAT | P2      | US-005 Xóa tài khoản · TC-AUTH-016; E2E-05                | Not Run    | [test-case.md](UAT-005/test-case.md) | —      |
| [UAT-006](UAT-006/test-case.md) | Phân quyền dữ liệu         | UAT | P0      | US-006 Phân quyền dữ liệu · TC-AUTH-013; DB-03; SEC-01    | Not Run    | [test-case.md](UAT-006/test-case.md) | —      |
| [UAT-007](UAT-007/test-case.md) | Nhất quán đa thiết bị      | UAT | P0      | US-007 Nhất quán đa thiết bị · TC-GEN-007, 008            | Not Run    | [test-case.md](UAT-007/test-case.md) | —      |
| [UAT-008](UAT-008/test-case.md) | Đổi email                  | UAT | P1      | US-008 Đổi email · TC-AUTH-015; E2E-04                    | Not Run    | [test-case.md](UAT-008/test-case.md) | —      |
| [UAT-010](UAT-010/test-case.md) | Tạo hồ sơ                  | UAT | P0      | US-010 Tạo hồ sơ · TC-PET-001-B1                          | Not Run    | [test-case.md](UAT-010/test-case.md) | —      |
| [UAT-011](UAT-011/test-case.md) | Tự tính tuổi               | UAT | P1      | US-011 Tự tính tuổi · TC-PET-003                          | Not Run    | [test-case.md](UAT-011/test-case.md) | —      |
| [UAT-012](UAT-012/test-case.md) | Đặc điểm + ảnh             | UAT | P1      | US-012 Đặc điểm + ảnh · TC-PET-004, 005; DB-22            | Not Run    | [test-case.md](UAT-012/test-case.md) | —      |
| [UAT-013](UAT-013/test-case.md) | Sửa hồ sơ                  | UAT | P0      | US-013 Sửa hồ sơ · TC-PET-006                             | Not Run    | [test-case.md](UAT-013/test-case.md) | —      |
| [UAT-014](UAT-014/test-case.md) | Xóa hồ sơ                  | UAT | P1      | US-014 Xóa hồ sơ · TC-PET-008                             | Not Run    | [test-case.md](UAT-014/test-case.md) | —      |
| [UAT-015](UAT-015/test-case.md) | Quản lý tối đa 10          | UAT | P0      | US-015 Quản lý tối đa 10 · TC-PET-002-N1, 007             | Not Run    | [test-case.md](UAT-015/test-case.md) | —      |
| [UAT-020](UAT-020/test-case.md) | Ghi số đo                  | UAT | P0      | US-020 Ghi số đo · TC-WGT-001-B1, 002                     | Not Run    | [test-case.md](UAT-020/test-case.md) | —      |
| [UAT-021](UAT-021/test-case.md) | Mục tiêu                   | UAT | P0      | US-021 Mục tiêu · TC-WGT-005-B1                           | Not Run    | [test-case.md](UAT-021/test-case.md) | —      |
| [UAT-022](UAT-022/test-case.md) | Biểu đồ                    | UAT | P0      | US-022 Biểu đồ · TC-WGT-003, 004, 006→009                 | Not Run    | [test-case.md](UAT-022/test-case.md) | —      |
| [UAT-023](UAT-023/test-case.md) | Sửa/xóa số đo              | UAT | P1      | US-023 Sửa/xóa số đo · TC-WGT-010                         | Not Run    | [test-case.md](UAT-023/test-case.md) | —      |
| [UAT-030](UAT-030/test-case.md) | Tạo bản ghi khám           | UAT | P0      | US-030 Tạo bản ghi khám · TC-VIS-001-N1                   | Not Run    | [test-case.md](UAT-030/test-case.md) | —      |
| [UAT-031](UAT-031/test-case.md) | Danh sách lịch sử          | UAT | P0      | US-031 Danh sách lịch sử · TC-VIS-002                     | Not Run    | [test-case.md](UAT-031/test-case.md) | —      |
| [UAT-032](UAT-032/test-case.md) | Sửa/xóa bản ghi            | UAT | P0      | US-032 Sửa/xóa bản ghi · TC-VIS-003, 004                  | Not Run    | [test-case.md](UAT-032/test-case.md) | —      |
| [UAT-033](UAT-033/test-case.md) | Ảnh đơn thuốc/XNT          | UAT | P1      | US-033 Ảnh đơn thuốc/XNT · TC-VIS-005-B1, 006, 008        | Not Run    | [test-case.md](UAT-033/test-case.md) | —      |
| [UAT-034](UAT-034/test-case.md) | Xóa ảnh                    | UAT | P1      | US-034 Xóa ảnh · TC-VIS-007                               | Not Run    | [test-case.md](UAT-034/test-case.md) | —      |
| [UAT-040](UAT-040/test-case.md) | Tạo mốc                    | UAT | P0      | US-040 Tạo mốc · TC-MS-001-N1, 002                        | Not Run    | [test-case.md](UAT-040/test-case.md) | —      |
| [UAT-041](UAT-041/test-case.md) | Nhắc D7/D1                 | UAT | P0      | US-041 Nhắc D7/D1 · TC-NTF-001, 003→005, 007              | Not Run    | [test-case.md](UAT-041/test-case.md) | —      |
| [UAT-042](UAT-042/test-case.md) | Đánh dấu thực hiện         | UAT | P0      | US-042 Đánh dấu thực hiện · TC-MS-003→005; NTF-006        | Not Run    | [test-case.md](UAT-042/test-case.md) | —      |
| [UAT-043](UAT-043/test-case.md) | Tự tạo mốc năm sau         | UAT | P0      | US-043 Tự tạo mốc năm sau · TC-MS-008-B1, 011             | Not Run    | [test-case.md](UAT-043/test-case.md) | —      |
| [UAT-044](UAT-044/test-case.md) | Chu kỳ lặp                 | UAT | P1      | US-044 Chu kỳ lặp · TC-MS-001, 009, 011                   | Not Run    | [test-case.md](UAT-044/test-case.md) | —      |
| [UAT-046](UAT-046/test-case.md) | Sửa/hủy mốc                | UAT | P0      | US-046 Sửa/hủy mốc · TC-MS-006-N1, 007; NTF-006           | Not Run    | [test-case.md](UAT-046/test-case.md) | —      |
| [UAT-047](UAT-047/test-case.md) | Mốc sắp tới/quá hạn        | UAT | P1      | US-047 Mốc sắp tới/quá hạn · TC-DSH-003; MS-012           | Not Run    | [test-case.md](UAT-047/test-case.md) | —      |
| [UAT-048](UAT-048/test-case.md) | Nhắc quá hạn               | UAT | P1      | US-048 Nhắc quá hạn · TC-NTF-002                          | Not Run    | [test-case.md](UAT-048/test-case.md) | —      |
| [UAT-049](UAT-049/test-case.md) | Mục Thông báo              | UAT | P0      | US-049 Mục Thông báo · TC-NTF-008, 010, 011               | Not Run    | [test-case.md](UAT-049/test-case.md) | —      |
| [UAT-050](UAT-050/test-case.md) | Tạo việc                   | UAT | P1      | US-050 Tạo việc · TC-RT-001-B1                            | Not Run    | [test-case.md](UAT-050/test-case.md) | —      |
| [UAT-051](UAT-051/test-case.md) | Checklist hôm nay          | UAT | P1      | US-051 Checklist hôm nay · TC-RT-002; DSH-001, 002        | Not Run    | [test-case.md](UAT-051/test-case.md) | —      |
| [UAT-052](UAT-052/test-case.md) | Chạm đảo trạng thái        | UAT | P1      | US-052 Chạm đảo trạng thái · TC-RT-003-N1                 | Not Run    | [test-case.md](UAT-052/test-case.md) | —      |
| [UAT-053](UAT-053/test-case.md) | Lưu theo ngày              | UAT | P1      | US-053 Lưu theo ngày · TC-RT-004, 005                     | Not Run    | [test-case.md](UAT-053/test-case.md) | —      |
| [UAT-045](UAT-045/test-case.md) | Sửa/xóa việc               | UAT | P1      | US-045 Sửa/xóa việc · TC-RT-006, 007                      | Not Run    | [test-case.md](UAT-045/test-case.md) | —      |
| [UAT-060](UAT-060/test-case.md) | Tổng quan                  | UAT | P0      | US-060 Tổng quan · TC-DSH-001, 002, 004, 006              | Not Run    | [test-case.md](UAT-060/test-case.md) | —      |
| [UAT-061](UAT-061/test-case.md) | Lọc theo bé                | UAT | P1      | US-061 Lọc theo bé · TC-DSH-005                           | Not Run    | [test-case.md](UAT-061/test-case.md) | —      |
| [UAT-062](UAT-062/test-case.md) | Banner nhắc                | UAT | P0      | US-062 Banner nhắc · TC-NTF-009, 010; DSH-002             | Not Run    | [test-case.md](UAT-062/test-case.md) | —      |
| [UAT-070](UAT-070/test-case.md) | Hồ sơ công khai            | UAT | P1      | US-070 Hồ sơ công khai · TC-SOC-001→005                   | Not Run    | [test-case.md](UAT-070/test-case.md) | —      |
| [UAT-071](UAT-071/test-case.md) | Đăng bài nhiều ảnh         | UAT | P1      | US-071 Đăng bài nhiều ảnh · TC-SOC-006-B1, 007→009        | Not Run    | [test-case.md](UAT-071/test-case.md) | —      |
| [UAT-072](UAT-072/test-case.md) | Hồ sơ dạng lưới + chi tiết | UAT | P1      | US-072 Hồ sơ dạng lưới + chi tiết · TC-SOC-012, 013, 016  | Not Run    | [test-case.md](UAT-072/test-case.md) | —      |
| [UAT-073](UAT-073/test-case.md) | Sửa/xóa bài                | UAT | P1      | US-073 Sửa/xóa bài · TC-SOC-010, 011                      | Not Run    | [test-case.md](UAT-073/test-case.md) | —      |
| [UAT-074](UAT-074/test-case.md) | Theo dõi + tìm             | UAT | P1      | US-074 Theo dõi + tìm · TC-SOC-014, 015, 017              | Not Run    | [test-case.md](UAT-074/test-case.md) | —      |
| [UAT-075](UAT-075/test-case.md) | Bản tin                    | UAT | P1      | US-075 Bản tin · TC-SOC-018→021                           | Not Run    | [test-case.md](UAT-075/test-case.md) | —      |
| [UAT-076](UAT-076/test-case.md) | Thả tim                    | UAT | P1      | US-076 Thả tim · TC-SOC-022→024                           | Not Run    | [test-case.md](UAT-076/test-case.md) | —      |
| [UAT-077](UAT-077/test-case.md) | Bình luận                  | UAT | P1      | US-077 Bình luận · TC-SOC-025-B1, 026, 027                | Not Run    | [test-case.md](UAT-077/test-case.md) | —      |
| [UAT-078](UAT-078/test-case.md) | Thông báo hoạt động        | UAT | P1      | US-078 Thông báo hoạt động · TC-SOC-028→033               | Not Run    | [test-case.md](UAT-078/test-case.md) | —      |
| [UAT-079](UAT-079/test-case.md) | Chặn người dùng            | UAT | P1      | US-079 Chặn người dùng · TC-SOC-034→037                   | Not Run    | [test-case.md](UAT-079/test-case.md) | —      |

### REG — Hồi quy (12)

| ID                            | Tên                                                                 | Cấp | Ưu tiên | Truy vết          | Trạng thái | Hồ sơ                               | Report |
| ----------------------------- | ------------------------------------------------------------------- | --- | ------- | ----------------- | ---------- | ----------------------------------- | ------ |
| [REG-01](REG-01/test-case.md) | Đăng ký → xác minh → đăng nhập → tạo bé → tạo mốc → DONE → mốc AUTO | R1  | P0      | G-3, E2E-01       | Not Run    | [test-case.md](REG-01/test-case.md) | —      |
| [REG-02](REG-02/test-case.md) | Dashboard 3 panel + banner + checklist việc                         | R1  | P0      | FR-DSH-001→007    | Not Run    | [test-case.md](REG-02/test-case.md) | —      |
| [REG-03](REG-03/test-case.md) | IDOR smoke 20 endpoint đại diện                                     | R1  | P0      | G-9, NFR-SEC-004  | Not Run    | [test-case.md](REG-03/test-case.md) | —      |
| [REG-04](REG-04/test-case.md) | Toàn bộ unit + integration                                          | R2  | P1      | NFR-MNT-003       | Not Run    | [test-case.md](REG-04/test-case.md) | —      |
| [REG-05](REG-05/test-case.md) | AUTH + PET + WGT                                                    | R2  | P1      | FR-AUTH/PET/WGT   | Not Run    | [test-case.md](REG-05/test-case.md) | —      |
| [REG-06](REG-06/test-case.md) | VIS + MS + NTF + RT                                                 | R2  | P1      | FR-VIS/MS/NTF/RT  | Not Run    | [test-case.md](REG-06/test-case.md) | —      |
| [REG-07](REG-07/test-case.md) | SOC hồ sơ/bài/feed                                                  | R2  | P0      | FG-1, FG-2        | Not Run    | [test-case.md](REG-07/test-case.md) | —      |
| [REG-08](REG-08/test-case.md) | SOC tim/bình luận/thông báo/chặn                                    | R2  | P0      | FG-2              | Not Run    | [test-case.md](REG-08/test-case.md) | —      |
| [REG-09](REG-09/test-case.md) | UI 25 màn + i18n + empty/error                                      | R2  | P1      | NFR-USA-007       | Not Run    | [test-case.md](REG-09/test-case.md) | —      |
| [REG-10](REG-10/test-case.md) | Ma trận hồi quy đầy đủ 141 FR                                       | R3  | P1      | §14.2             | Not Run    | [test-case.md](REG-10/test-case.md) | —      |
| [REG-11](REG-11/test-case.md) | Accessibility + UI/UX toàn bộ                                       | R3  | P1      | FG-3, NFR-USA-002 | Not Run    | [test-case.md](REG-11/test-case.md) | —      |
| [REG-12](REG-12/test-case.md) | Contract + size + security tĩnh                                     | R3  | P1      | G-8, G-12, G-17   | Not Run    | [test-case.md](REG-12/test-case.md) | —      |

### PERF — Hiệu năng (12)

| ID                              | Tên                                                                                     | Cấp  | Ưu tiên | Truy vết                  | Trạng thái | Hồ sơ                                | Report |
| ------------------------------- | --------------------------------------------------------------------------------------- | ---- | ------- | ------------------------- | ---------- | ------------------------------------ | ------ |
| [PERF-01](PERF-01/test-case.md) | Lighthouse mobile cho Dashboard (dev, build production)                                 | PERF | P1      | NFR-PERF-001, G-6         | Not Run    | [test-case.md](PERF-01/test-case.md) | —      |
| [PERF-02](PERF-02/test-case.md) | Lighthouse cho 5 màn chính (login, pets, weights, feed, post detail)                    | PERF | P1      | NFR-PERF-001              | Not Run    | [test-case.md](PERF-02/test-case.md) | —      |
| [PERF-03](PERF-03/test-case.md) | k6 đọc: GET /dashboard, /pets, /pets/{id}/weights, /feed, /notifications                | PERF | P1      | NFR-PERF-002, G-7         | Not Run    | [test-case.md](PERF-03/test-case.md) | —      |
| [PERF-04](PERF-04/test-case.md) | k6 ghi: tạo cân nặng, khám, mốc, việc, bài, bình luận                                   | PERF | P1      | NFR-PERF-002              | Not Run    | [test-case.md](PERF-04/test-case.md) | —      |
| [PERF-05](PERF-05/test-case.md) | Đo bundle sau build: JS/CSS ban đầu                                                     | PERF | P1      | NFR-PERF-003, G-8         | Not Run    | [test-case.md](PERF-05/test-case.md) | —      |
| [PERF-06](PERF-06/test-case.md) | Gửi email xác minh + reset; đo thời gian tới Mailpit                                    | PERF | P1      | NFR-PERF-004              | Not Run    | [test-case.md](PERF-06/test-case.md) | —      |
| [PERF-07](PERF-07/test-case.md) | Tài khoản có 10 bé, 100 mốc PENDING; mở Dashboard; đo phần tạo thông báo                | PERF | P1      | NFR-PERF-005              | Not Run    | [test-case.md](PERF-07/test-case.md) | —      |
| [PERF-08](PERF-08/test-case.md) | Seed SD-011; chạy lại PERF-03/04                                                        | PERF | P1      | NFR-PERF-006              | Not Run    | [test-case.md](PERF-08/test-case.md) | —      |
| [PERF-09](PERF-09/test-case.md) | Upload ảnh 5 MB trên mạng 10 Mbps                                                       | PERF | P1      | NFR-PERF-007              | Not Run    | [test-case.md](PERF-09/test-case.md) | —      |
| [PERF-10](PERF-10/test-case.md) | EXPLAIN (ANALYZE) cho 10 query nóng (dashboard, feed cursor, notification sync, search) | PERF | P1      | NFR-PERF-002, 006         | Not Run    | [test-case.md](PERF-10/test-case.md) | —      |
| [PERF-11](PERF-11/test-case.md) | Tải đồng thời 50 request/s trong 10 phút (không phải stress)                            | PERF | P1      | NFR-PERF-002, NFR-REL-001 | Not Run    | [test-case.md](PERF-11/test-case.md) | —      |
| [PERF-12](PERF-12/test-case.md) | Đo cold start API/worker và thời gian migration                                         | PERF | P1      | NFR-REL-001               | Not Run    | [test-case.md](PERF-12/test-case.md) | —      |

### SEC — Bảo mật (22)

| ID                            | Tên                                                                                                          | Cấp         | Ưu tiên | Truy vết                     | Trạng thái | Hồ sơ                               | Report |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------- | ------- | ---------------------------- | ---------- | ----------------------------------- | ------ |
| [SEC-01](SEC-01/test-case.md) | Chạy toàn bộ idor.int.test.ts: A có đủ dữ liệu sức khỏe + social; B gọi mọi route có {id}/{username}/{petId} | SEC, IT     | P0      | NFR-SEC-004, G-9, FG-1       | Not Run    | [test-case.md](SEC-01/test-case.md) | —      |
| [SEC-02](SEC-02/test-case.md) | Meta-test RLS: kiểm relrowsecurity + policy trên mọi bảng; thử SET ROLE app_rw đọc chéo                      | SEC, IT     | P0      | NFR-SEC-004, 013             | Not Run    | [test-case.md](SEC-02/test-case.md) | —      |
| [SEC-03](SEC-03/test-case.md) | Quét mọi response đọc của Bản tin + hồ sơ: tìm email, birth, weight, symptom, diagnosis, medication, note,…  | SEC, API    | P0      | NFR-SEC-013, SD-016          | Not Run    | [test-case.md](SEC-03/test-case.md) | —      |
| [SEC-04](SEC-04/test-case.md) | Đăng nhập/đăng ký/quên mật khẩu với email tồn tại và không tồn tại                                           | SEC, API    | P1      | FR-AUTH-005, NFR-SEC-004     | Not Run    | [test-case.md](SEC-04/test-case.md) | —      |
| [SEC-05](SEC-05/test-case.md) | Sai mật khẩu 5 lần; thử đúng; chờ 15 phút; thử từ IP khác                                                    | SEC, API    | P0      | FR-AUTH-006, NFR-SEC-005     | Not Run    | [test-case.md](SEC-05/test-case.md) | —      |
| [SEC-06](SEC-06/test-case.md) | Vượt ngưỡng đăng ký 10/giờ/IP, quên mật khẩu 5/giờ/email, gửi lại xác minh                                   | SEC, API    | P0      | NFR-SEC-005, FR-AUTH-003     | Not Run    | [test-case.md](SEC-06/test-case.md) | —      |
| [SEC-07](SEC-07/test-case.md) | Kiểm Set-Cookie khi đăng nhập; kiểm cookie trên HTTP (dev) và mô phỏng HTTPS                                 | SEC, API    | P0      | NFR-SEC-002, G-10            | Not Run    | [test-case.md](SEC-07/test-case.md) | —      |
| [SEC-08](SEC-08/test-case.md) | Gửi POST/PATCH/DELETE không CSRF, sai CSRF, CSRF của phiên khác, đúng CSRF                                   | SEC, API    | P0      | NFR-SEC-002                  | Not Run    | [test-case.md](SEC-08/test-case.md) | —      |
| [SEC-09](SEC-09/test-case.md) | Session fixation: lấy cookie trước login, login, dùng cookie cũ; logout rồi dùng lại                         | SEC, API    | P0      | FR-AUTH-007, NFR-SEC-002     | Not Run    | [test-case.md](SEC-09/test-case.md) | —      |
| [SEC-10](SEC-10/test-case.md) | Kiểm hash mật khẩu trong DB; quét log khi đăng nhập/đổi mật khẩu/lỗi                                         | SEC, UT     | P1      | NFR-SEC-001, 009             | Not Run    | [test-case.md](SEC-10/test-case.md) | —      |
| [SEC-11](SEC-11/test-case.md) | gitleaks + quét bundle client tìm DATABASE_URL, MEDIA_SIGNING_KEY, ANALYTICS_HMAC_KEY, SMTP pass             | SEC, CI     | P1      | NFR-SEC-010                  | Not Run    | [test-case.md](SEC-11/test-case.md) | —      |
| [SEC-12](SEC-12/test-case.md) | Sửa path/chữ ký/hạn của URL ảnh; dùng URL của A cho B; dùng lại sau khi xóa                                  | SEC, API    | P0      | NFR-SEC-006, G-11            | Not Run    | [test-case.md](SEC-12/test-case.md) | —      |
| [SEC-13](SEC-13/test-case.md) | Upload file .jpg chứa PHP/HTML/SVG, file nén bomb, file 0 byte, MIME sai                                     | SEC, API    | P1      | NFR-SEC-007                  | Not Run    | [test-case.md](SEC-13/test-case.md) | —      |
| [SEC-14](SEC-14/test-case.md) | Chèn <script>, "><img onerror>, javascript: vào nickname, caption, comment, tên bé, bio                      | SEC, E2E    | P0      | NFR-SEC-007                  | Not Run    | [test-case.md](SEC-14/test-case.md) | —      |
| [SEC-15](SEC-15/test-case.md) | SQL injection vào q, cursor, sort, username; thử ' OR 1=1--, ;DROP                                           | SEC, API    | P1      | NFR-SEC-007                  | Not Run    | [test-case.md](SEC-15/test-case.md) | —      |
| [SEC-16](SEC-16/test-case.md) | pnpm audit --prod, OSV-Scanner, kiểm pin GitHub Actions SHA                                                  | SEC, CI     | P0      | NFR-SEC-008, G-12            | Not Run    | [test-case.md](SEC-16/test-case.md) | —      |
| [SEC-17](SEC-17/test-case.md) | Kiểm header: CSP, X-Content-Type-Options, Referrer-Policy, X-Frame-Options/frame-ancestors, HSTS             | SEC, API    | P1      | NFR-SEC-003, 007, G-10       | Not Run    | [test-case.md](SEC-17/test-case.md) | —      |
| [SEC-18](SEC-18/test-case.md) | Ảnh JPEG có GPS/EXIF; HEIC có metadata; thumbnail                                                            | SEC, IT     | P1      | NFR-SEC-011, SD-007          | Not Run    | [test-case.md](SEC-18/test-case.md) | —      |
| [SEC-19](SEC-19/test-case.md) | ?next=https://evil.example, //evil, /\evil, javascript:                                                      | SEC, E2E    | P0      | FR-AUTH-014                  | Not Run    | [test-case.md](SEC-19/test-case.md) | —      |
| [SEC-20](SEC-20/test-case.md) | Rà soát pháp lý: dữ liệu cá nhân, đồng thuận, lưu trữ, xóa, chia sẻ ảnh công khai                            | SEC, Review | P1      | NFR-SEC-012                  | Not Run    | [test-case.md](SEC-20/test-case.md) | —      |
| [SEC-21](SEC-21/test-case.md) | Gửi event analytics chứa PII/nội dung; quét bảng analytics_events + view funnel                              | SEC, DB     | P1      | NFR-SEC-013, FG-5            | Not Run    | [test-case.md](SEC-21/test-case.md) | —      |
| [SEC-22](SEC-22/test-case.md) | Kết hợp chặn + rate limit: B bị A chặn vẫn tim/bình luận/theo dõi; B vượt ngưỡng                             | SEC, API    | P1      | NFR-SEC-014, FR-SOC-033, 038 | Not Run    | [test-case.md](SEC-22/test-case.md) | —      |

### ACC — Accessibility (12)

| ID                            | Tên                                                                                               | Cấp | Ưu tiên | Truy vết                 | Trạng thái | Hồ sơ                               | Report                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | --- | ------- | ------------------------ | ---------- | ----------------------------------- | ----------------------------- |
| [ACC-01](ACC-01/test-case.md) | axe quét 25 màn ở trạng thái có dữ liệu (phone 390×844 + tablet 834×1112)                         | ACC | P1      | NFR-USA-002, FG-3        | Fail       | [test-case.md](ACC-01/test-case.md) | [report.md](ACC-01/report.md) |
| [ACC-02](ACC-02/test-case.md) | axe quét trạng thái rỗng, lỗi, loading, dialog xác nhận, lightbox, carousel                       | ACC | P1      | NFR-USA-002              | Not Run    | [test-case.md](ACC-02/test-case.md) | —                             |
| [ACC-03](ACC-03/test-case.md) | Điều hướng chỉ bằng Tab/Shift+Tab/Enter/Esc/Arrow qua 6 luồng chính                               | ACC | P1      | NFR-USA-002              | Not Run    | [test-case.md](ACC-03/test-case.md) | —                             |
| [ACC-04](ACC-04/test-case.md) | Mở/đóng dialog xóa, lightbox, bottom sheet; kiểm focus trả về                                     | ACC | P1      | NFR-USA-002              | Not Run    | [test-case.md](ACC-04/test-case.md) | —                             |
| [ACC-05](ACC-05/test-case.md) | NVDA (Windows) + VoiceOver (iOS/iPadOS) đọc 5 luồng: đăng ký, tạo mốc, checklist, feed, bình luận | ACC | P1      | NFR-USA-002              | Not Run    | [test-case.md](ACC-05/test-case.md) | —                             |
| [ACC-06](ACC-06/test-case.md) | Đo tương phản chữ/nền, trạng thái quá hạn/D7/đã xong, nút disable                                 | ACC | P1      | NFR-USA-003              | Not Run    | [test-case.md](ACC-06/test-case.md) | —                             |
| [ACC-07](ACC-07/test-case.md) | Đo vùng chạm của mọi nút/chip/tab/checkbox trên phone                                             | ACC | P1      | NFR-USA-001, FG-3        | Not Run    | [test-case.md](ACC-07/test-case.md) | —                             |
| [ACC-08](ACC-08/test-case.md) | Kiểm form: label, autocomplete, lỗi aria-describedby, aria-invalid, trường bắt buộc               | ACC | P1      | NFR-USA-002              | Not Run    | [test-case.md](ACC-08/test-case.md) | —                             |
| [ACC-09](ACC-09/test-case.md) | Toast, badge, banner nhắc, "Có bài mới", lỗi mạng                                                 | ACC | P1      | NFR-USA-002, FR-SOC-031  | Not Run    | [test-case.md](ACC-09/test-case.md) | —                             |
| [ACC-10](ACC-10/test-case.md) | Bật prefers-reduced-motion; mở carousel, thả tim, toast                                           | ACC | P1      | NFR-USA-002, FR-SOC-023  | Not Run    | [test-case.md](ACC-10/test-case.md) | —                             |
| [ACC-11](ACC-11/test-case.md) | Zoom 200% và viewport 320 px; kiểm 5 màn                                                          | ACC | P1      | NFR-USA-002, NFR-PRT-002 | Not Run    | [test-case.md](ACC-11/test-case.md) | —                             |
| [ACC-12](ACC-12/test-case.md) | Ảnh có alt; biểu đồ cân nặng có bảng dữ liệu thay thế; icon có nhãn                               | ACC | P1      | NFR-USA-002, 003         | Not Run    | [test-case.md](ACC-12/test-case.md) | —                             |

### UI — UI/UX (14)

| ID                          | Tên                                                                                 | Cấp | Ưu tiên | Truy vết                     | Trạng thái | Hồ sơ                              | Report |
| --------------------------- | ----------------------------------------------------------------------------------- | --- | ------- | ---------------------------- | ---------- | ---------------------------------- | ------ |
| [UI-01](UI-01/test-case.md) | Checklist 25 màn: thành phần, thứ tự, nhãn, hành động chính so Blueprint            | UI  | P1      | IF-UI-001→004                | Not Run    | [test-case.md](UI-01/test-case.md) | —      |
| [UI-02](UI-02/test-case.md) | Đo cuộn ngang 7 breakpoint × 10 màn chính, cả dọc/ngang                             | UI  | P1      | NFR-PRT-002                  | Not Run    | [test-case.md](UI-02/test-case.md) | —      |
| [UI-03](UI-03/test-case.md) | Kiểm 4 trạng thái chuẩn (loading, empty, error, có dữ liệu) trên 12 màn             | UI  | P1      | FR-GEN-012, PRD §4.2         | Not Run    | [test-case.md](UI-03/test-case.md) | —      |
| [UI-04](UI-04/test-case.md) | Kiểm pattern responsive: nav dưới (phone), nav trái (tablet), bottom sheet vs modal | UI  | P1      | FR-DSH-004, IF-UI-001        | Not Run    | [test-case.md](UI-04/test-case.md) | —      |
| [UI-05](UI-05/test-case.md) | Kiểm dialog xác nhận xóa (bé, bản ghi, mốc, bài, bình luận, tài khoản)              | UI  | P1      | FR-GEN-010                   | Not Run    | [test-case.md](UI-05/test-case.md) | —      |
| [UI-06](UI-06/test-case.md) | Kiểm toast + hoàn tác + thông báo lỗi trường                                        | UI  | P1      | FR-GEN-009, 010              | Not Run    | [test-case.md](UI-06/test-case.md) | —      |
| [UI-07](UI-07/test-case.md) | Kiểm định dạng ngày dd/MM/yyyy, số 9,2 kg, tuổi, thời gian tương đối                | UI  | P1      | FR-GEN-002, NFR-USA-007      | Not Run    | [test-case.md](UI-07/test-case.md) | —      |
| [UI-08](UI-08/test-case.md) | Chuyển vi/en trên 6 màn; kiểm chuỗi dài/ngắn, tràn, cắt                             | UI  | P1      | NFR-USA-007, FG-4            | Not Run    | [test-case.md](UI-08/test-case.md) | —      |
| [UI-09](UI-09/test-case.md) | Kiểm ảnh: lưới 3 cột, carousel, thumbnail, lightbox, ảnh lỗi, ảnh đang tải          | UI  | P1      | FR-SOC-013, 016, 020         | Not Run    | [test-case.md](UI-09/test-case.md) | —      |
| [UI-10](UI-10/test-case.md) | Kiểm biểu đồ cân nặng: 0/1/nhiều điểm, mục tiêu, tooltip, resize                    | UI  | P1      | FR-WGT-004, 006, 007         | Not Run    | [test-case.md](UI-10/test-case.md) | —      |
| [UI-11](UI-11/test-case.md) | Kiểm màu + nhãn trạng thái mốc, badge, nút disable, lỗi                             | UI  | P1      | FR-MS-013, NFR-USA-003       | Not Run    | [test-case.md](UI-11/test-case.md) | —      |
| [UI-12](UI-12/test-case.md) | So khớp Figma 390 px cho 10 màn P0 (spacing, typography, màu)                       | UI  | P1      | IF-UI-001, NT-05             | Not Run    | [test-case.md](UI-12/test-case.md) | —      |
| [UI-13](UI-13/test-case.md) | Kiểm tương tác cảm ứng: vuốt carousel, kéo làm mới, nhấn đúp, long-press            | UI  | P1      | FR-SOC-019, 023, NFR-PRT-001 | Not Run    | [test-case.md](UI-13/test-case.md) | —      |
| [UI-14](UI-14/test-case.md) | Kiểm Safari/Chrome desktop + emulation; ghi khác biệt                               | UI  | P1      | NFR-PRT-001→005              | Not Run    | [test-case.md](UI-14/test-case.md) | —      |

### REL — Độ tin cậy (8)

| ID                            | Tên                                                                              | Cấp      | Ưu tiên | Truy vết                      | Trạng thái | Hồ sơ                               | Report |
| ----------------------------- | -------------------------------------------------------------------------------- | -------- | ------- | ----------------------------- | ---------- | ----------------------------------- | ------ |
| [REL-01](REL-01/test-case.md) | 10 request song song tạo notification cùng mốc/mức; 10 request complete cùng mốc | REL, API | P0      | NFR-REL-003, G-15, FR-NTF-005 | Not Run    | [test-case.md](REL-01/test-case.md) | —      |
| [REL-02](REL-02/test-case.md) | Restart worker giữa lúc xử lý job; kiểm retry                                    | REL, OPS | P1      | NFR-REL-001                   | Not Run    | [test-case.md](REL-02/test-case.md) | —      |
| [REL-03](REL-03/test-case.md) | Tải lại Dashboard 20 lần liên tiếp; mở 3 thiết bị                                | REL, IT  | P0      | FR-NTF-005, G-15              | Not Run    | [test-case.md](REL-03/test-case.md) | —      |
| [REL-04](REL-04/test-case.md) | Làm 1 bước job lỗi (khóa bảng/tắt quyền) và chạy job                             | REL, OPS | P1      | NFR-REL-003                   | Not Run    | [test-case.md](REL-04/test-case.md) | —      |
| [REL-05](REL-05/test-case.md) | FakeClock +91 ngày; chạy job; kiểm dữ liệu 89/91 ngày                            | REL, IT  | P1      | FR-NTF-011, SD-013, 021       | Not Run    | [test-case.md](REL-05/test-case.md) | —      |
| [REL-06](REL-06/test-case.md) | Đổi múi giờ, DST, qua 00:00; kiểm checklist + nhắc                               | REL      | P1      | FR-GEN-001, FR-RT-004, G-5    | Not Run    | [test-case.md](REL-06/test-case.md) | —      |
| [REL-07](REL-07/test-case.md) | Ngắt DB 10 giây rồi kết nối lại; gửi request                                     | REL, API | P1      | NFR-REL-001                   | Not Run    | [test-case.md](REL-07/test-case.md) | —      |
| [REL-08](REL-08/test-case.md) | SIGTERM khi đang chạy request/job                                                | REL, OPS | P0      | NFR-REL-001                   | Not Run    | [test-case.md](REL-08/test-case.md) | —      |

### OPS — Vận hành (10)

| ID                            | Tên                                                          | Cấp | Ưu tiên | Truy vết           | Trạng thái | Hồ sơ                               | Report |
| ----------------------------- | ------------------------------------------------------------ | --- | ------- | ------------------ | ---------- | ----------------------------------- | ------ |
| [OPS-01](OPS-01/test-case.md) | GET /healthz, GET /readyz khi DB sống/chết, worker sống/chết | OPS | P0      | NFR-REL-001        | Not Run    | [test-case.md](OPS-01/test-case.md) | —      |
| [OPS-02](OPS-02/test-case.md) | Kiểm heartbeat file/cập nhật định kỳ                         | OPS | P0      | NFR-REL-001        | Not Run    | [test-case.md](OPS-02/test-case.md) | —      |
| [OPS-03](OPS-03/test-case.md) | Kiểm lịch maintenance.daily 20:00 UTC (03:00 VN), retry 3    | OPS | P0      | NFR-REL-003, S6-06 | Not Run    | [test-case.md](OPS-03/test-case.md) | —      |
| [OPS-04](OPS-04/test-case.md) | Chạy tay pnpm --filter @ph/api maintenance:run               | OPS | P1      | NFR-REL-003        | Not Run    | [test-case.md](OPS-04/test-case.md) | —      |
| [OPS-05](OPS-05/test-case.md) | Upload bị bỏ dở 25 giờ; file mồ côi 2 ngày; ảnh FAILED       | OPS | P1      | FR-SOC-007, S6-06  | Not Run    | [test-case.md](OPS-05/test-case.md) | —      |
| [OPS-06](OPS-06/test-case.md) | Kiểm dung lượng media/DB sau seed lớn; dọn .data             | OPS | P1      | RSK-20             | Not Run    | [test-case.md](OPS-06/test-case.md) | —      |
| [OPS-07](OPS-07/test-case.md) | Chạy migration trên môi trường có dữ liệu (staging)          | OPS | P1      | NFR-MNT-006        | Not Run    | [test-case.md](OPS-07/test-case.md) | —      |
| [OPS-08](OPS-08/test-case.md) | Backup/restore, RPO/RTO                                      | OPS | P1      | NT-01              | N/A        | [test-case.md](OPS-08/test-case.md) | —      |
| [OPS-09](OPS-09/test-case.md) | Giám sát/cảnh báo, dashboard vận hành                        | OPS | P1      | NT-02              | N/A        | [test-case.md](OPS-09/test-case.md) | —      |
| [OPS-10](OPS-10/test-case.md) | Gửi email qua Gmail/Outlook thật; kiểm spam, SPF/DKIM/DMARC  | OPS | P1      | NFR-PERF-004, G-14 | Not Run    | [test-case.md](OPS-10/test-case.md) | —      |

### MNT — Bảo trì (10)

| ID                            | Tên                                                            | Cấp | Ưu tiên | Truy vết                 | Trạng thái | Hồ sơ                               | Report |
| ----------------------------- | -------------------------------------------------------------- | --- | ------- | ------------------------ | ---------- | ----------------------------------- | ------ |
| [MNT-01](MNT-01/test-case.md) | pnpm format:check, pnpm lint                                   | MNT | P1      | NFR-MNT-002              | Not Run    | [test-case.md](MNT-01/test-case.md) | —      |
| [MNT-02](MNT-02/test-case.md) | pnpm -r typecheck (strict)                                     | MNT | P1      | NFR-MNT-002              | Not Run    | [test-case.md](MNT-02/test-case.md) | —      |
| [MNT-03](MNT-03/test-case.md) | pnpm depcruise apps packages                                   | MNT | P1      | NFR-MNT-002, SAD §2.2    | Not Run    | [test-case.md](MNT-03/test-case.md) | —      |
| [MNT-04](MNT-04/test-case.md) | pnpm test:unit --coverage; đối chiếu ngưỡng                    | MNT | P0      | NFR-MNT-003, G-2         | Not Run    | [test-case.md](MNT-04/test-case.md) | —      |
| [MNT-05](MNT-05/test-case.md) | pnpm openapi:gen + openapi-typescript sinh client              | MNT | P1      | NFR-MNT-001, 004         | Not Run    | [test-case.md](MNT-05/test-case.md) | —      |
| [MNT-06](MNT-06/test-case.md) | CI contract job: diff OpenAPI + oasdiff                        | MNT | P1      | NFR-MNT-004, G-17        | Not Run    | [test-case.md](MNT-06/test-case.md) | —      |
| [MNT-07](MNT-07/test-case.md) | Kiểm seed/fixture: chạy lại 2 lần, DB sạch                     | MNT | P1      | NFR-MNT-005              | Not Run    | [test-case.md](MNT-07/test-case.md) | —      |
| [MNT-08](MNT-08/test-case.md) | Kiểm tài liệu task/evidence: mỗi task có file kết quả + commit | MNT | P1      | NFR-MNT-005              | Not Run    | [test-case.md](MNT-08/test-case.md) | —      |
| [MNT-09](MNT-09/test-case.md) | size-limit sau build                                           | MNT | P1      | NFR-PERF-003, G-8        | Not Run    | [test-case.md](MNT-09/test-case.md) | —      |
| [MNT-10](MNT-10/test-case.md) | Kiểm pin dependency/action SHA, lockfile                       | MNT | P1      | NFR-SEC-008, NFR-MNT-002 | Not Run    | [test-case.md](MNT-10/test-case.md) | —      |

## Cập nhật trạng thái

Sau mỗi lần chạy, cập nhật cột **Report** thành link tới `report.md` trong thư mục case và trạng thái tương ứng. Không đánh dấu Pass nếu thiếu ảnh/video/report.
