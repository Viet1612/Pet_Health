import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev proxy: trình duyệt thấy /api và /media cùng origin như production (Caddy, AD-004).
// Đọc process.env (không dùng tiền tố VITE_) để giá trị không bị nhúng vào bundle.
const apiTarget = process.env.DEV_API_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  server: {
    port: 5173,
    // Nghe mọi địa chỉ để mở được bằng IP LAN (API cần EXTRA_ORIGINS, xem apps/api/.env.example).
    host: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false },
      '/media': { target: apiTarget, changeOrigin: false },
    },
  },
  build: { outDir: 'dist', assetsDir: 'assets' },
});
