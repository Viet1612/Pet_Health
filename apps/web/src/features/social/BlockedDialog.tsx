import { useQuery } from '@tanstack/react-query';

import { m } from '../../i18n';
import { ErrorState } from '../../ui/ErrorState';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { Skeleton } from '../../ui/Skeleton';
import { UnblockButton } from './BlockControls';
import { blockedQuery } from './queries';
import { UserAvatar } from './UserAvatar';

const t = m.social.block;

/** Cài đặt → Đã chặn (F-12): danh sách người mình đã chặn, nút "Bỏ chặn". */
export function BlockedDialog({ onClose }: { onClose: () => void }) {
  const blocked = useQuery(blockedQuery);
  return (
    <ResponsiveDialog open onClose={onClose} title={t.settingsRow}>
      {blocked.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : blocked.isError ? (
        <ErrorState kind="server" onRetry={() => void blocked.refetch()} />
      ) : blocked.data.length === 0 ? (
        <p className="text-body text-text-muted py-4">{t.settingsEmpty}</p>
      ) : (
        <ul className="divide-divider m-0 flex list-none flex-col divide-y p-0">
          {blocked.data.map((p) => (
            <li key={p.username} className="flex items-center gap-3 py-2">
              <UserAvatar profile={p} size={40} />
              <span className="min-w-0 flex-1">
                <span className="text-body block truncate font-semibold">{p.displayName}</span>
                <span className="text-small text-text-muted block truncate">@{p.username}</span>
              </span>
              <UnblockButton username={p.username} />
            </li>
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
