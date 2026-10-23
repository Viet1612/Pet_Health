import { Outlet } from '@tanstack/react-router';

import { Navigation } from './Navigation';
import { TopBar } from './TopBar';

/** Khung sau đăng nhập (UI Blueprint §3.1.4): TopBar + BottomNav/SideRail + nội dung. */
export function AppShell() {
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

/** Khung trang tài khoản (đăng nhập, đăng ký…), không có điều hướng. */
export function AuthLayout() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8"
    >
      <Outlet />
    </main>
  );
}
