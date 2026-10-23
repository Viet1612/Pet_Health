# S7-06 · Phát hành production và smoke test

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S7 · T15–16 |
| Story | — |
| Yêu cầu | G-1→G-18 (G-13, G-16 Withdrawn) |
| Phụ thuộc | [S7-02](S7-02-cloudflare-email.md), [S7-03](S7-03-performance-test.md), [S7-04](S7-04-security-test.md), [S7-05](S7-05-contract-device-test.md) |
| Ước lượng | 0,5 ngày |
| Màn hình Figma | — |

## Mục tiêu

Rà đủ launch gate, deploy SHA đã kiểm thử lên `app.pethealth.example`, smoke test luồng cốt lõi bằng tài khoản thật, xác nhận email tới hộp thư chính, và sẵn sàng quay lại bản trước nếu cần. Đạt M6.

## Phạm vi

**Trong phạm vi:** checklist G-1→G-18, `ops/deploy.sh prod <sha>`, smoke test, kiểm email, quy trình rollback, ghi nhận phát hành.

**Ngoài phạm vi:** sửa lỗi phát hiện trong smoke test (quay lại task gốc, deploy SHA mới). Sao lưu (SAD §4.2.4) → sau Giai đoạn 1, bắt buộc trước khi mở cho người dùng ngoài.

## Chi tiết kỹ thuật

**1. Checklist launch gate** — lưu ở `docs/implement/results/S7-06/launch-checklist.md`, mỗi dòng có bằng chứng (liên kết CI run, báo cáo, ảnh chụp).

| Gate | Nội dung | Bằng chứng | Trạng thái |
|---|---|---|---|
| G-1 | 100% story P0 đạt AC | Ma trận AC → test, CI run trên `<sha>` | ☐ |
| G-2 | Coverage logic nghiệp vụ ≥ 90%, toàn hệ thống ≥ 70% | Báo cáo coverage CI | ☐ |
| G-3 | E2E đăng ký → mốc → nhắc → đánh dấu → mốc kế tiếp | E2E Playwright sau deploy staging | ☐ |
| G-4 | Thiết bị: 0 Critical/High mở | `S7-05/bugs.md` | ☐ |
| G-5 | Đổi múi giờ, qua 00:00 | S7-05 T1–T7 + kiểm thủ công | ☐ |
| G-6 | LCP < 2,5 s, INP < 200 ms, CLS < 0,1 | Báo cáo Lighthouse S7-03 | ☐ |
| G-7 | Đọc p95 < 500 ms, ghi p95 < 800 ms | k6 `steady.js` S7-03 | ☐ |
| G-8 | Bundle < 250 KB gzip | size-limit trên `<sha>` | ☐ |
| G-9 | IDOR 100% Pass | S7-04 | ☐ |
| G-10 | HTTPS, Argon2id, cookie an toàn | S7-02, S7-04 | ☐ |
| G-11 | Ảnh riêng tư, URL ký ≤ 15 phút | S7-04 bảng ảnh 8/8 | ☐ |
| G-12 | 0 lỗ hổng High/Critical | ZAP, `pnpm audit`, OSV, gitleaks (S7-04) | ☐ |
| G-13 | Sao lưu | — | **Withdrawn** (DEC-020) |
| G-14 | Email không vào spam Gmail/Outlook | S7-02 12/12 + mục 4 bên dưới | ☐ |
| G-15 | Nhắc idempotent | Test song song S4-06; S7-03 chạy lại không trùng | ☐ |
| G-16 | Cảnh báo job nhắc | — | **Withdrawn** (DEC-017) |
| G-17 | OpenAPI khớp 100% | Schemathesis S7-05 | ☐ |
| G-18 | E2E chỉ qua API | E2E API của S4-06 | ☐ |

Mọi gate còn hiệu lực phải ☑ trên **cùng một SHA** trước khi sang bước 2.

**2. Deploy**

```bash
ssh <máy chủ>
cd /opt/pethealth                    # git checkout trên máy chủ (S2-06)
sudo ./ops/deploy.sh prod <sha>      # pull → migrate → up worker api caddy → chờ /readyz
cat /srv/pethealth/prod/.last-good    # phải bằng <sha> sau khi thành công
sudo ./ops/status.sh                  # mọi container healthy, 0 job lỗi
```

Nếu `app.pethealth.example` đang sau Cloudflare Access (S7-01), gỡ Access application của hostname này ngay sau khi deploy thành công, rồi kiểm lại `curl -sI https://app.pethealth.example/` trả `200` kèm HSTS và CSP.

**3. Smoke test luồng cốt lõi trên production** — tài khoản thật của Việt, trên iPhone (Safari) qua 4G:

| # | Bước | Kỳ vọng |
|---|---|---|
| 1 | Đăng ký bằng email thật | Màn hình nhắc kiểm email |
| 2 | Mở email xác minh, bấm liên kết | Tài khoản đã xác minh, vào Dashboard trống |
| 3 | Tạo thú cưng có ảnh đại diện | Ảnh hiển thị sau ≤ 10 s; URL ảnh có `exp`, `sig` |
| 4 | Tạo mốc VACCINE hạn = hôm nay + 7 | Banner D7 trên Dashboard; chuông có số 1 |
| 5 | Mở mục Thông báo | Thông báo D7 đúng tên thú cưng và ngày hạn |
| 6 | Đánh dấu đã thực hiện hôm nay | Mốc chuyển "đã thực hiện"; banner biến mất |
| 7 | Mở lịch mốc | Mốc VACCINE kế tiếp hạn = hôm nay + 1 năm (theo quy tắc mốc kế tiếp) |
| 8 | Tạo 1 việc hằng ngày, tích | Trạng thái giữ sau khi tải lại |
| 9 | Đăng xuất, đăng nhập lại trên desktop Chrome | Thấy đủ dữ liệu bước 3–8 |

Đạt khi 9/9 bước đúng, DevTools Console không có lỗi CSP, `docker compose -p ph-prod logs --since 30m api worker | grep -c '"level":50'` = `0`.

**4. Email trên production**

Ngoài email xác minh ở bước 2: thực hiện "Quên mật khẩu" cho tài khoản smoke test → email tới hộp thư chính trong ≤ 1 phút, liên kết đặt lại hoạt động, các phiên khác bị đăng xuất. Lặp lại với một địa chỉ Outlook.com. Kiểm `pgboss.job` không có job `email.transactional` ở trạng thái `failed`.

**5. Rollback**

Khi smoke test có lỗi Critical/High hoặc `/readyz` không khỏe:

1. `deploy.sh` tự quay về SHA trong `.last-good` nếu `/readyz` không khỏe sau 60 s.
2. Quay tay: `sudo ./ops/deploy.sh prod <sha-trước>` với SHA của lần phát hành trước, ghi trong `launch-checklist.md` hoặc tag `v*` trước đó (lần phát hành đầu tiên không có bản trước → đặt lại Cloudflare Access cho hostname để tạm đóng app).
3. Migration là expand/contract, bản cũ chạy được trên schema mới; **không** chạy migration down trên production.
4. Ghi sự cố vào `docs/ops/incidents.md`: thời điểm, triệu chứng, SHA, nguyên nhân, thời gian gián đoạn (tính vào SLO 98%, NFR-REL-001).

**6. Ghi nhận phát hành**

Tạo git tag `v1.0.0` trên `<sha>`, đẩy lên GitHub. Ghi vào `launch-checklist.md`: ngày giờ phát hành, SHA, người kiểm (Việt), kết quả smoke test.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] 16 gate còn hiệu lực đều ☑ có bằng chứng trên cùng SHA; G-13, G-16 ghi Withdrawn (G-1→G-18).
- [ ] `deploy.sh prod <sha>` thành công; `.last-good` = `<sha>`; `ops/status.sh` sạch.
- [ ] Smoke test 9/9 bước Pass trên production bằng tài khoản thật (G-3 trên môi trường thật).
- [ ] Email xác minh và đặt lại mật khẩu trên production tới hộp thư chính Gmail và Outlook (G-14).
- [ ] Đã thử rollback một lần trên staging bằng quy trình mục 5 (deploy SHA cũ rồi deploy lại SHA mới) trước khi phát hành.
- [ ] Tag `v1.0.0` có trên GitHub; M6 đạt.

## Kiểm thử

1. Diễn tập rollback trên staging trước: `deploy.sh staging <sha-cũ>` → app chạy, dữ liệu còn → `deploy.sh staging <sha>`.
2. Phát hành và smoke test theo mục 2–4.
3. Theo dõi 24 giờ đầu: chạy `ops/status.sh` sau 1 giờ và sau 24 giờ; `docker compose -p ph-prod logs --since 24h api | grep '"level":50'` không có lỗi mới chưa giải thích.

## Ghi chú

- Sau phát hành, dữ liệu production **chưa được sao lưu** (DEC-020). Trước khi mở cho bất kỳ người dùng nào ngoài Việt: bật container `backup` theo SAD §4.2.4 (`pg_dump` hằng ngày + `rsync --link-dest` thư mục `media/`, giữ 14 bản, chép tuần ra thiết bị ở nơi khác), diễn tập khôi phục 1 lần, khôi phục NFR-REL-002 và G-13; đồng thời xem lại DEC-017 (giám sát) và rà soát pháp lý dữ liệu cá nhân (NFR-SEC-012).
- Tài khoản smoke test giữ lại để dùng cho các lần phát hành sau.
