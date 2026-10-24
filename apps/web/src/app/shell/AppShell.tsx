import { Outlet } from '@tanstack/react-router';

import { usePhotoUploadBridge } from '../../features/photos';
import { Navigation } from './Navigation';
import { TopBar } from './TopBar';

/** Khung sau đăng nhập (UI Blueprint §3.1.4): TopBar + BottomNav/SideRail + nội dung. */
export function AppShell() {
  // Ảnh lần khám tải nền xong → làm mới dữ liệu (FLW-07).
  usePhotoUploadBridge();
  return (
    <div className="min-h-dvh">
      <TopBar />
      <Navigation />
      <main
        id="main"
        className="mx-auto w-full max-w-[1280px] px-4 pt-4 pb-[calc(64px+env(safe-area-inset-bottom)+24px)] md:pr-6 md:pb-8 md:pl-28"
      >
        <Outlet />
      </main>
    </div>
  );
}
