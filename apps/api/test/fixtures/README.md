# Ảnh mẫu cho test

- `iphone-sample.heic`: ảnh HEIC mã **HEVC** chụp từ iPhone (không phải AVIF), dùng ở bước kiểm giải mã của
  `infra/Dockerfile` (S0-10) và test pipeline ảnh (S2-02). Khi chưa có tệp này, Docker build in cảnh báo và bỏ
  qua bước kiểm. Nên dùng ảnh nhỏ (< 1 MB), đã xóa vị trí GPS.
