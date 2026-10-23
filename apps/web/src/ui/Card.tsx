import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from './cx';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  action?: ReactNode;
}

/** CMP-09: Card / Panel. */
export function Card({ title, action, className, children, ...rest }: CardProps) {
  return (
    <section className={cx('bg-surface shadow-card rounded-lg p-4', className)} {...rest}>
      {(title ?? action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-h2">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
