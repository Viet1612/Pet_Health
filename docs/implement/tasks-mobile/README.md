# Kế hoạch — App điện thoại bằng Capacitor (Giai đoạn 2)

2026-11-02 · Việt · **Bản nháp, chờ chủ dự án duyệt**

Đóng gói Pet Health thành app iOS/Android bằng **Capacitor** để **dùng và thử trên máy của chủ dự án**, chưa phát hành công khai lên App Store/Google Play. Mục tiêu: giao diện có cảm giác app native và nhắc mốc y tế bằng thông báo trên điện thoại, **không sửa backend**. Phạm vi lấy từ [Phase2-ideas.md](../../requirements/Phase2-ideas.md) §1, đã rút gọn theo yêu cầu 2026-11-02.

Quy ước tên file: `M-<số>-<tên-ngắn>.md`. Ước lượng tính theo ngày công.

## Hướng đi

App là **vỏ native mở thẳng web Pet Health** (`server.url` của Capacitor), không đóng gói bản build web vào app:

- Web chạy **cùng domain** với API như trên trình duyệt → cookie phiên, CSRF theo `Origin`, URL ảnh `/media/...` đều dùng như cũ. **Backend, database, RLS, email: không đổi.**
- Cập nhật giao diện chỉ cần deploy web như bình thường; mở lại app là có bản mới, không phải build lại app.
- Tính năng native (status bar, nút Back, thông báo cục bộ, rung) được thêm vào **code web**, chỉ bật khi chạy trong app (`Capacitor.isNativePlatform()`). Trên trình duyệt, web vẫn chạy y như hiện tại.

Đổi lại:

- App cần có mạng mới mở được. Khi không có mạng sẽ hiện màn lỗi riêng (M-05).
- Không hợp để nộp App Store công khai (Apple hay từ chối app chỉ bọc web, guideline 4.2). Nếu sau này muốn lên store, xem mục [Lên store sau này](#lên-store-sau-này).

## Quyết định thiết kế

| # | Câu hỏi | Chốt | Lý do |
|---|---|---|---|
| M-D1 | Cách nạp giao diện | **`server.url`** trỏ tới web. Cấu hình có 2 môi trường: `prod` → `https://pet.vietdeptrai.io.vn`, `dev` → web dev qua Tailscale (`http://<ip>:5173`, đã có sẵn `EXTRA_ORIGINS`) | Dùng lại nguyên backend và cách đăng nhập bằng cookie |
| M-D2 | Thông báo nhắc mốc | **Thông báo cục bộ** (`@capacitor/local-notifications`). Mỗi khi mở app hoặc sửa mốc, app lấy mốc đang chờ của mọi thú cưng rồi hẹn lại lịch nhắc D7/D1 lúc 08:00 theo giờ máy | Không cần backend, Firebase hay tài khoản Apple trả phí. Nhược điểm: sửa mốc trên máy tính thì lịch trên điện thoại chỉ cập nhật ở lần mở app kế tiếp |
| M-D3 | Nguồn dữ liệu nhắc | `GET /pets` + `GET /pets/{id}/milestones` (nhóm `upcoming`), dùng lại hàm tính mức D7/D1 giống server | Endpoint có sẵn; số thú cưng ít nên gọi theo từng bé vẫn nhẹ |
| M-D4 | Code native nằm ở đâu | Workspace mới `apps/mobile` (`capacitor.config.ts`, `ios/`, `android/`). Phần gọi plugin nằm trong `apps/web/src/native/`, **import động** để không làm tăng bundle web (`size-limit`) | `pnpm dev` và bản web không bị ảnh hưởng |
| M-D5 | Camera | Giữ `<input type="file">` hiện có, chỉ thêm chuỗi xin quyền; thêm `@capacitor/camera` nếu thử trên máy thật thấy lỗi | Không phải viết lại `PhotoPicker`, `ComposerScreen`, `AvatarField` |
| M-D6 | Link trong email (xác minh, đặt lại mật khẩu) | **Mở bằng trình duyệt** như hiện nay; không làm deep link | Universal link trên iOS cần tài khoản Apple trả phí; trình duyệt và app không dùng chung phiên, nhưng các link này không cần phiên |
| M-D7 | Cài lên máy | **Android:** cài APK trực tiếp. **iPhone:** chạy từ Xcode bằng Apple ID miễn phí (phải cài lại sau mỗi 7 ngày), hoặc tài khoản Apple Developer 99 USD/năm nếu muốn dùng TestFlight | Không tốn phí; đủ để tự dùng và thử |

## Bảng task

| Task | Tên | Phụ thuộc | Ước lượng |
|---|---|---|---|
| M-01 | Khung Capacitor `apps/mobile`: config `server.url` theo môi trường (`prod`/`dev`), cho phép http ở dev (Android cleartext, iOS ATS), script `pnpm mobile:android` / `mobile:ios`; thư mục `apps/web/src/native/` + `isNativeApp()` | — | 1 |
| M-02 | Khung giao diện native: safe area phía trên (tai thỏ, status bar), status bar đổi theo theme sáng/tối, icon + splash, nút Back Android đi theo router (ở trang gốc thì thoát app), bàn phím không che form, tắt phóng to bằng hai ngón và hiệu ứng kéo giãn, link ngoài mở trình duyệt | M-01 | 2 |
| M-03 | Cảm giác chạm: rung nhẹ khi đánh dấu hoàn thành mốc/việc chăm sóc, thả tim, kéo để làm mới (`@capacitor/haptics`); rà vùng chạm ≥ 44 px và các màn ở 360 px trên máy thật | M-02 | 1 |
| M-04 | Nhắc mốc bằng thông báo cục bộ: hẹn lại toàn bộ lịch khi mở app, khi quay lại app, sau khi thêm/sửa/hoàn thành/hủy mốc; xin quyền đúng lúc (sau khi tạo mốc đầu tiên); công tắc trong Cài đặt (lưu trên máy); chạm thông báo → mở chi tiết mốc; chuỗi vi/en | M-01 | 2 |
| M-05 | Mất mạng và lỗi tải: màn lỗi riêng khi không kết nối được (`server.errorPath`) có nút "Thử lại", tự tải lại khi có mạng | M-01 | 0,5 |
| M-06 | Ảnh trên máy thật: chuỗi xin quyền camera/thư viện ảnh (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`), thử HEIC, nén ảnh > 5 MB, % tải lên trên iOS và Android; thêm plugin camera nếu cần (M-D5) | M-01 | 1 |
| M-07 | Thử trên máy và hướng dẫn: checklist thủ công (đăng nhập, phiên giữ sau khi tắt app, nhắc D7/D1 bằng cách chỉnh giờ máy, ảnh, Back, dark mode, mất mạng); unit test cho hàm hẹn lịch nhắc; viết `docs/deploy/MOBILE.md` (build và cài lên Android/iPhone) | M-02 → M-06 | 1 |

**Tổng:** 7 task, khoảng **8,5 ngày công** (khoảng 2 tuần).

### Thứ tự làm

1. **M-01**: chạy được app trên Android emulator/iOS simulator, đăng nhập bằng web dev qua Tailscale.
2. **M-02 → M-03**: giao diện có cảm giác app native.
3. **M-04**: thông báo nhắc mốc.
4. **M-05, M-06, M-07**: mất mạng, ảnh, thử trên máy thật, viết hướng dẫn.

## Không đổi

| Thành phần | Ghi chú |
|---|---|
| Toàn bộ `apps/api`, migration, RLS, job worker | Không sửa dòng nào |
| Đăng nhập cookie, CSRF, URL ảnh ký | Chạy như trên trình duyệt vì cùng domain |
| Mẫu email | Link vẫn mở trên trình duyệt |
| Bộ IDOR, E2E Playwright | Không có endpoint mới; E2E vẫn chạy cho bản web |

## Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| iOS xóa cookie phiên của WebView, phải đăng nhập lại thường xuyên | Kiểm ở M-07 (tắt hẳn app, khởi động lại máy). Nếu xảy ra, bật `CapacitorCookies` hoặc chuyển sang hướng token của mục dưới |
| Hẹn lịch nhắc sai hoặc trùng | Mỗi lần hẹn lại thì hủy hết lịch cũ của app; ID thông báo suy ra từ `milestoneId` + mức; unit test với nhiều ngày hạn |
| Plugin native làm hỏng bản web | Import động, chỉ gọi khi `isNativeApp()`; E2E web vẫn phải xanh |
| App Apple ID miễn phí hết hạn sau 7 ngày | Ghi rõ trong `MOBILE.md`; chuyển sang tài khoản trả phí khi cần |

## Lên store sau này

Nếu sau này muốn phát hành công khai, cần làm thêm (đã phân tích ở bản trước của kế hoạch):

- **Đóng gói giao diện trong app** + **đăng nhập bằng token Bearer** + CORS cho origin Capacitor + URL ảnh tuyệt đối (thay đổi backend nhỏ, khoảng 2–3 ngày).
- **Push từ server** (FCM/APNs, bảng thiết bị, job theo múi giờ) nếu cần nhắc ngay cả khi lâu không mở app.
- **Deep link** cho email.
- **Báo cáo bài/bình luận**: Apple bắt buộc với app có nội dung người dùng đăng (guideline 1.2), nên phải đổi lại DEC-025.
- Tài khoản Apple Developer 99 USD/năm, Google Play 25 USD; trang chính sách quyền riêng tư; với Google Play, thử nghiệm kín ≥ 12 người trong ≥ 14 ngày.
