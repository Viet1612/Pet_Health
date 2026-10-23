// Phần vẽ biểu đồ (CMP-22) bằng uPlot, chỉ tải khi cần (React.lazy trong WeightChart.tsx).
import 'uplot/dist/uPlot.min.css';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import uPlot from 'uplot';

import { vi } from '../../i18n/vi';
import { monthSplits, yRange, type ChartData } from './chart-data';
import { formatDate, formatKg, formatSignedTenths } from './format';

const DAY = 86_400;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export interface WeightChartImplProps {
  data: ChartData;
  /** Mục tiêu (kg, số) hoặc null. */
  target: number | null;
  caption: string;
}

export default function WeightChartImpl({ data, target, caption }: WeightChartImplProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const { points } = data;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const primary = cssVar('--primary');
    const muted = cssVar('--text-muted');
    const divider = cssVar('--divider');
    const heightFor = () => (window.innerWidth >= 768 ? 320 : 240);

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const series: uPlot.Series[] = [
      {},
      {
        label: vi.weights.tableWeight,
        stroke: primary,
        width: 2,
        points: { show: true, size: 8, fill: primary, stroke: primary },
      },
    ];
    const plotData: uPlot.AlignedData = [xs, ys];
    if (target !== null) {
      series.push({ stroke: muted, width: 1.5, dash: [6, 4], points: { show: false } });
      plotData.push(xs.map(() => target));
    }
    const [yMin, yMax] = yRange(ys, target);

    const plot = new uPlot(
      {
        width: box.clientWidth,
        height: heightFor(),
        legend: { show: false },
        cursor: { drag: { x: false, y: false }, points: { size: 10 } },
        scales: {
          x: { time: true, range: [data.start - 3 * DAY, data.end + 3 * DAY] },
          y: { range: [yMin, yMax] },
        },
        axes: [
          {
            stroke: muted,
            grid: { stroke: divider },
            ticks: { show: false },
            splits: () => monthSplits(data.start, data.end),
            values: (_u, splits) =>
              splits.map((s) => `T${String(new Date(s * 1000).getUTCMonth() + 1)}`),
          },
          {
            stroke: muted,
            grid: { stroke: divider },
            ticks: { show: false },
            size: 44,
            values: (_u, splits) => splits.map((s) => s.toFixed(1).replace('.', ',')),
          },
        ],
        series,
        hooks: {
          setCursor: [
            (u) => {
              setActive(u.cursor.idx ?? null);
            },
          ],
        },
      },
      plotData,
      box,
    );
    plotRef.current = plot;

    const observer = new ResizeObserver(() => {
      plot.setSize({ width: box.clientWidth, height: heightFor() });
    });
    observer.observe(box);
    return () => {
      observer.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
  }, [points, target, data.start, data.end]);

  /** ←/→ trên figure đang focus: di chuyển tooltip giữa các điểm. */
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const plot = plotRef.current;
    if (!plot || points.length === 0) return;
    const current = active ?? (e.key === 'ArrowLeft' ? points.length : -1);
    const next = Math.min(
      points.length - 1,
      Math.max(0, current + (e.key === 'ArrowLeft' ? -1 : 1)),
    );
    const p = points[next];
    if (!p) return;
    plot.setCursor({ left: plot.valToPos(p.x, 'x'), top: plot.valToPos(p.y, 'y') });
    setActive(next);
  };

  const vsTarget = (y: number) =>
    target === null ? null : formatSignedTenths(Math.round(y * 10) - Math.round(target * 10));
  const activePoint = active === null ? undefined : points[active];

  return (
    <figure
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={() => {
        setActive(null);
      }}
      className="focus-visible:outline-focus relative m-0 rounded-md"
    >
      <figcaption className="sr-only">{caption}</figcaption>
      <p aria-live="polite" className="text-small text-text-muted min-h-5">
        {activePoint &&
          vi.weights.tooltip(
            formatDate(activePoint.measuredOn),
            formatKg(activePoint.weightKg),
            vsTarget(activePoint.y),
          )}
      </p>
      <div ref={boxRef} aria-hidden className="w-full" />
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{vi.weights.tableDate}</th>
            <th scope="col">{vi.weights.tableWeight}</th>
            {target !== null && <th scope="col">{vi.weights.tableVsTarget}</th>}
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.x}>
              <td>{formatDate(p.measuredOn)}</td>
              <td>{formatKg(p.weightKg)}</td>
              {target !== null && <td>{vsTarget(p.y)} kg</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
