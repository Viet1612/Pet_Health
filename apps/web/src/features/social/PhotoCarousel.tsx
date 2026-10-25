import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';

import { m } from '../../i18n';
import { cx } from '../../ui/cx';
import type { Post } from './queries';

const t = m.social.post;

/**
 * Ảnh của bài (F-06): vuốt ngang (`scroll-snap`), chấm vị trí, nút ←/→ ở ≥ 768 px, phím ←/→.
 * Khung vuông cố định để không giật bố cục; ảnh chưa xử lý xong hiện "Đang xử lý".
 */
export function PhotoCarousel({
  photos,
  onImageError,
}: {
  photos: Post['photos'];
  onImageError?: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const n = photos.length;

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(n - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setIndex(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    }
  };

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={t.photo(index + 1, n)}
    >
      <div
        ref={track}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="bg-surface-2 flex aspect-square snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto"
      >
        {photos.map((p, i) => (
          <div
            key={p.id}
            role="group"
            aria-roledescription="slide"
            aria-label={t.photo(i + 1, n)}
            className="flex size-full shrink-0 snap-center items-center justify-center"
          >
            {p.url ? (
              <img
                src={p.url}
                alt={t.photo(i + 1, n)}
                className="size-full object-contain"
                onError={onImageError}
              />
            ) : (
              <span className="text-text-muted text-small flex flex-col items-center gap-2">
                <Loader2 size={24} aria-hidden className="animate-spin" />
                {t.processing}
              </span>
            )}
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button
            type="button"
            aria-label={t.prev}
            disabled={index === 0}
            onClick={() => {
              go(index - 1);
            }}
            className="bg-surface/90 absolute top-1/2 left-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full shadow disabled:invisible md:inline-flex"
          >
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t.next}
            disabled={index === n - 1}
            onClick={() => {
              go(index + 1);
            }}
            className="bg-surface/90 absolute top-1/2 right-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full shadow disabled:invisible md:inline-flex"
          >
            <ChevronRight size={20} aria-hidden />
          </button>
          <div aria-hidden className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {photos.map((p, i) => (
              <span
                key={p.id}
                className={cx('size-1.5 rounded-full', i === index ? 'bg-white' : 'bg-white/50')}
              />
            ))}
          </div>
          <p aria-live="polite" className="sr-only">
            {t.photo(index + 1, n)}
          </p>
        </>
      )}
    </div>
  );
}
