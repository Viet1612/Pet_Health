import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

import {
  getUploads,
  setPhotoChangedHandler,
  subscribeUploads,
  type UploadItem,
} from './upload-store';

/** Các ảnh đang tải/lỗi của một lần khám (cập nhật theo kho tải ảnh). */
export function useVisitUploads(visitId: string): UploadItem[] {
  const all = useSyncExternalStore(subscribeUploads, getUploads, getUploads);
  return useMemo(() => all.filter((i) => i.visitId === visitId), [all, visitId]);
}

/** Gắn ở AppShell: ảnh xử lý xong → làm mới chi tiết lần khám và danh sách (đếm ảnh). */
export function usePhotoUploadBridge(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    setPhotoChangedHandler((visitId) => {
      void queryClient.invalidateQueries({ queryKey: ['visit', visitId] });
      void queryClient.invalidateQueries({ queryKey: ['visits'] });
    });
  }, [queryClient]);
}
