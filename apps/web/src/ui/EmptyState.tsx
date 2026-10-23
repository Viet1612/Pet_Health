import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** CMP-25: trạng thái rỗng có một hành động chính (UXD-008). */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      {icon && (
        <div
          aria-hidden
          className="bg-primary-soft text-primary-soft-fg flex size-16 items-center justify-center rounded-full"
        >
          {icon}
        </div>
      )}
      <h2 className="text-h2">{title}</h2>
      {description && <p className="text-body text-text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
