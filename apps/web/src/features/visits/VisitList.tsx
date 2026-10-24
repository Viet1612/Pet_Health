import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Image as ImageIcon, NotebookPen } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { vi } from '../../i18n/vi';
import { Button, buttonClassName } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { EmptyState } from '../../ui/EmptyState';
import { Skeleton } from '../../ui/Skeleton';
import { dateParts } from './format';
import { visitsQuery, type VisitSummary } from './queries';

const t = vi.visits;

function VisitListItem({ visit, selected }: { visit: VisitSummary; selected: boolean }) {
  const { day, monthYear } = dateParts(visit.visitedOn);
  const title = visit.diagnosis ?? visit.symptoms ?? '';
  const subtitle = visit.diagnosis ? visit.symptoms : null;
  return (
    <Link
      to="/visits/$visitId"
      params={{ visitId: visit.id }}
      aria-current={selected ? 'page' : undefined}
      className={cx(
        'bg-surface hover:bg-surface-2 flex min-h-20 items-center gap-3 rounded-lg border p-3',
        selected ? 'border-primary border-2' : 'border-divider',
      )}
    >
      <span className="bg-primary-soft text-primary-soft-fg flex w-16 shrink-0 flex-col items-center rounded-md py-2">
        <span className="text-h1 leading-none">{day}</span>
        <span className="text-caption">{monthYear}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-body block truncate font-semibold">{title}</span>
        {subtitle && <span className="text-small text-text-muted block truncate">{subtitle}</span>}
      </span>
      {visit.photoCount > 0 && (
        <span
          className="text-small text-text-muted flex items-center gap-1"
          aria-label={t.photoCount(visit.photoCount)}
        >
          <ImageIcon size={16} aria-hidden />
          {visit.photoCount}
        </span>
      )}
      <ChevronRight size={18} aria-hidden className="text-text-muted shrink-0" />
    </Link>
  );
}

/**
 * SCR-11 · danh sách lần khám (10:911): mới nhất trước, cuộn tới cuối tự tải trang kế
 * (IntersectionObserver), nút "Tải thêm" dự phòng cho bàn phím.
 */
export function VisitList({ petId, selectedId }: { petId: string; selectedId?: string }) {
  const query = useInfiniteQuery(visitsQuery(petId));
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        <Skeleton shape="list-item" className="h-20" />
        <Skeleton shape="list-item" className="h-20" />
        <Skeleton shape="list-item" className="h-20" />
      </div>
    );
  }
  const pages = query.data?.pages ?? [];
  const visits = pages.flatMap((p) => p.items);
  const total = pages[0]?.totalCount ?? 0;

  if (visits.length === 0) {
    return (
      <EmptyState
        icon={<NotebookPen size={32} />}
        title={t.emptyTitle}
        action={
          <Link to="/pets/$petId/visits/new" params={{ petId }} className={buttonClassName()}>
            {t.add}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-small text-text-muted">{t.summary(total)}</p>
        <Link to="/pets/$petId/visits/new" params={{ petId }} className={buttonClassName()}>
          {t.add}
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {visits.map((v) => (
          <li key={v.id}>
            <VisitListItem visit={v} selected={v.id === selectedId} />
          </li>
        ))}
      </ul>
      {isFetchingNextPage && (
        <div aria-busy="true" className="flex flex-col gap-2">
          <Skeleton shape="list-item" className="h-20" />
          <Skeleton shape="list-item" className="h-20" />
        </div>
      )}
      <div ref={sentinel} />
      {hasNextPage && !isFetchingNextPage && (
        <Button variant="secondary" onClick={() => void fetchNextPage()}>
          {t.loadMore}
        </Button>
      )}
    </div>
  );
}
