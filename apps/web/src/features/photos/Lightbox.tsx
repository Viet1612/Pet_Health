import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { m } from '../../i18n';

const t = m.photos.lightbox;
const SWIPE_PX = 50;

/**
 * Lightbox (10:1173), tải lazy: nền tối toàn màn hình, ảnh 2048 px, ‹ ›, vuốt, phím ←/→, Esc.
 * Dựng trên `<dialog>` + `showModal()`: bẫy focus và trả focus về thumbnail đã mở.
 */
export default function Lightbox({
  photos,
  startIndex,
  visitDate,
  onClose,
}: {
  photos: { id: string; url: string | null }[];
  startIndex: number;
  visitDate: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(startIndex);
  const dragStart = useRef<number | null>(null);
  const total = photos.length;
  const photo = photos[index];
  const caption = t.caption(index + 1, total, visitDate);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const go = (step: number) => {
    setIndex((i) => (i + step + total) % total);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const dx = e.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
  };

  const nav =
    'absolute top-1/2 -translate-y-1/2 inline-flex size-12 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60';

  return (
    <dialog
      ref={ref}
      aria-label={caption}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={onKeyDown}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between px-4 py-3">
          <span className="text-body">{t.counter(index + 1, total)}</span>
          <button
            type="button"
            aria-label={t.close}
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10"
          >
            <X size={24} aria-hidden />
          </button>
        </header>
        <div
          className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center select-none"
          onPointerDown={(e) => {
            dragStart.current = e.clientX;
          }}
          onPointerUp={onPointerUp}
        >
          {photo?.url && (
            <img
              key={photo.id}
              src={photo.url}
              alt={caption}
              draggable={false}
              className="max-h-full max-w-full object-contain"
            />
          )}
          {total > 1 && (
            <>
              <button
                type="button"
                aria-label={t.prev}
                onClick={() => {
                  go(-1);
                }}
                className={`${nav} left-3`}
              >
                <ChevronLeft size={28} aria-hidden />
              </button>
              <button
                type="button"
                aria-label={t.next}
                onClick={() => {
                  go(1);
                }}
                className={`${nav} right-3`}
              >
                <ChevronRight size={28} aria-hidden />
              </button>
            </>
          )}
        </div>
        <footer className="text-small px-4 py-3 text-center text-white/80">
          <p>{caption}</p>
          <p className="text-caption text-white/60">{t.hint}</p>
        </footer>
      </div>
    </dialog>
  );
}
