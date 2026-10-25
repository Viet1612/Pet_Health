import { lazy, Suspense } from 'react';

import { Skeleton } from '../../ui/Skeleton';
import type { ChartData } from './chart-data';

// uPlot chỉ nằm trong chunk này, không vào JS ban đầu (size-limit < 250 KB).
const WeightChartImpl = lazy(() => import('./WeightChartImpl'));

/** CMP-22 biểu đồ cân nặng; skeleton kích thước cố định khi đang tải (tránh CLS). */
export function WeightChart(props: {
  data: ChartData;
  target: number | null;
  caption: string;
  compact?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true">
          <Skeleton
            shape="chart"
            className={props.compact ? 'h-[140px]' : 'h-[260px] md:h-[340px]'}
          />
        </div>
      }
    >
      <WeightChartImpl {...props} />
    </Suspense>
  );
}
