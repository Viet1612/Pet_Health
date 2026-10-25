import { WifiOff } from 'lucide-react';

import { m } from '../i18n';
import { useOnline } from '../lib/online';

/** CMP-05 SystemBanner biến thể offline (21:2553): vàng, cố định dưới TopBar, `aria-live`. */
export function OfflineBanner() {
  const online = useOnline();
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <div className="bg-warning-bg text-warning sticky top-14 z-20 flex items-start gap-3 px-4 py-2">
          <WifiOff size={20} aria-hidden className="mt-0.5 shrink-0" />
          <p className="text-small">
            <span className="block font-semibold">{m.system.offline}</span>
            {m.system.offlineHint}
          </p>
        </div>
      )}
    </div>
  );
}
