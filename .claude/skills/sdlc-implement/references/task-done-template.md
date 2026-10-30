# Khung kết quả task (task_done)

## task_done/README.md

```markdown
# Kết quả task

| Task                              | Tên               | Ngày       | Commit                     |
| --------------------------------- | ----------------- | ---------- | -------------------------- |
| [S0-01](S0-01-monorepo.md)        | Khởi tạo monorepo | 2026-10-23 | `abc1234`                  |
| [S0-02](S0-02-dev-environment.md) | Môi trường dev    | 2026-10-23 | (điền khi commit task sau) |
```

Hash commit của task hiện tại chỉ có sau khi commit → điền ở lần cập nhật kế tiếp (hoặc commit amend riêng nếu là task cuối, khi người dùng đồng ý).

## task_done/<ID>-<slug>.md

```markdown
# S1-03 · API đăng ký — Kết quả

| Thuộc tính      | Giá trị                                 |
| --------------- | --------------------------------------- |
| Task            | [S1-03](../tasks/S1-03-register-api.md) |
| Trạng thái      | Xong, test Pass                         |
| Ngày hoàn thành | YYYY-MM-DD                              |
| Commit          | xem [README](README.md)                 |

## Kết quả

- Đã làm gì (theo nhóm: API, dữ liệu, web, worker…), tệp chính.
- Quyết định nhỏ đã chọn và lý do.
- Lỗi đã gặp + nguyên nhân gốc + cách sửa (nếu có).

## Tiêu chí chấp nhận

- [x] … — bằng chứng: `pnpm test register` 12/12 Pass
- [ ] … — chưa kiểm tự động, lý do …

## Khác với file task

- … (hoặc "Không có")
```
