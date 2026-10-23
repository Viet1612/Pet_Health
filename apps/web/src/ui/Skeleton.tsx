import { cx } from './cx';

export type SkeletonShape = 'text' | 'card' | 'list-item' | 'chart';

const SHAPES: Record<SkeletonShape, string> = {
  text: 'h-4 w-full rounded-sm',
  card: 'h-32 w-full rounded-lg',
  'list-item': 'h-16 w-full rounded-md',
  chart: 'h-48 w-full rounded-lg',
};

/**
 * CMP-11: khối giữ chỗ kích thước cố định (tránh CLS). Vùng cha đặt `aria-busy="true"`.
 */
export function Skeleton({
  shape = 'text',
  className,
}: {
  shape?: SkeletonShape;
  className?: string;
}) {
  return <div aria-hidden className={cx('bg-surface-2 animate-pulse', SHAPES[shape], className)} />;
}
