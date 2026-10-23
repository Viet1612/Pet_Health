import { AlertTriangle, SearchX } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { vi } from '../i18n/vi';
import { Button } from './Button';

export type ErrorStateProps =
  | { kind: 'not-found'; action?: ReactNode }
  | { kind: 'server'; refCode?: string; onRetry?: () => void };

/** CMP-24: lỗi trong vùng nội dung; AppShell vẫn dùng được. Có `h1` để focus khi đổi route. */
export function ErrorState(props: ErrorStateProps) {
  const [copied, setCopied] = useState(false);
  const notFound = props.kind === 'not-found';

  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div
        aria-hidden
        className="bg-danger-bg text-danger flex size-16 items-center justify-center rounded-full"
      >
        {notFound ? <SearchX size={32} /> : <AlertTriangle size={32} />}
      </div>
      <h1 tabIndex={-1} className="text-h1 outline-none">
        {notFound ? vi.error.notFoundTitle : vi.error.serverTitle}
      </h1>
      <p className="text-body text-text-muted max-w-md">
        {notFound ? vi.error.notFoundDescription : vi.error.serverDescription}
      </p>

      {props.kind === 'server' && props.refCode && (
        <div className="flex items-center gap-2">
          <span className="text-small text-text-muted">{vi.error.refLabel}:</span>
          <code className="bg-surface-2 text-body rounded-sm px-2 py-1 font-semibold select-all">
            {props.refCode}
          </code>
          {/* Clipboard API chỉ có ở HTTPS/localhost; mở dev bằng IP LAN thì chọn mã để chép tay. */}
          {window.isSecureContext && (
            <Button
              variant="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(props.refCode ?? '').then(() => {
                  setCopied(true);
                });
              }}
            >
              {copied ? vi.error.copied : vi.error.copy}
            </Button>
          )}
        </div>
      )}

      <div className="mt-2">
        {props.kind === 'server'
          ? props.onRetry && <Button onClick={props.onRetry}>{vi.error.retry}</Button>
          : props.action}
      </div>
    </div>
  );
}
