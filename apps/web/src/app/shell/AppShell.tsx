import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

import { SUMMARY_KEY } from '../../features/notifications';

import { usePhotoUploadBridge } from '../../features/photos';
import { CompleteAccountPrompt } from '../../features/social';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { SkipLink } from '../../ui/SkipLink';
import { Navigation } from './Navigation';
import { TopBar } from './TopBar';
import { deviceClass, track } from '../../api/analytics';

/** `app_opened` chỉ ghi một lần mỗi lần tải trang (StrictMode chạy effect 2 lần). */
let appOpened = false;

/** Khung sau đăng nhập (UI Blueprint §3.1.4): TopBar + BottomNav/SideRail + nội dung. */
export function AppShell() {
  // Ảnh lần khám tải nền xong → làm mới dữ liệu (FLW-07).
  usePhotoUploadBridge();
  useEffect(() => {
    if (appOpened) return;
    appOpened = true;
    track('app_opened', {
      device_class: deviceClass(),
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    });
  }, []);
  // Chuông cập nhật mỗi lần đổi route (không polling, DC-003).
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(
    () =>
      router.subscribe('onResolved', () => {
        void queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      }),
    [router, queryClient],
  );
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <TopBar />
      <div className="md:pl-22">
        <OfflineBanner />
      </div>
      <Navigation />
      <main
        id="main"
        className="mx-auto w-full max-w-[1280px] px-4 pt-4 pb-[calc(64px+env(safe-area-inset-bottom)+24px)] md:pr-6 md:pb-8 md:pl-28"
      >
        <Outlet />
      </main>
      <CompleteAccountPrompt />
    </div>
  );
}
