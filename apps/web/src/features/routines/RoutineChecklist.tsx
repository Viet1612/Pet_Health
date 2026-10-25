import { ApiError } from '@ph/api-client';
import { useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { ChecklistItem } from '../../ui/ChecklistItem';
import { useToast } from '../../ui/toast';
import { sortRoutines, useToggleRoutine, type Routine } from './queries';

const t = m.routines;
/** Giữ dòng ở chỗ cũ một lúc rồi mới sắp lại, để mắt kịp thấy (FLW-05). */
const HOLD_MS = 300;

function RoutineRow({
  item,
  petId,
  meta,
  onTouched,
}: {
  item: Routine;
  petId: string | undefined;
  meta: string | undefined;
  onTouched: (id: string, previousDone: boolean) => void;
}) {
  const toast = useToast();
  const toggle = useToggleRoutine(item.id, petId);
  const [error, setError] = useState(false);

  const run = (done: boolean) => {
    onTouched(item.id, !done);
    toggle.mutate(done, {
      onError: (err) => {
        setError(true);
        setTimeout(() => {
          setError(false);
        }, HOLD_MS);
        if (err instanceof ApiError && err.status === 404) {
          toast.show({ kind: 'error', message: t.gone });
          return;
        }
        const msg = toUserMessage(err);
        toast.show({
          kind: 'error',
          message: msg.kind === 'server' ? msg.message : t.saveFailed,
          onRetry: () => {
            run(done);
          },
        });
      },
    });
  };

  return (
    <ChecklistItem
      time={item.timeOfDay}
      label={item.name}
      ariaLabel={t.itemLabel(item.timeOfDay, item.name)}
      checked={item.done}
      error={error}
      {...(meta ? { meta } : {})}
      onToggle={() => {
        run(!item.done);
      }}
    />
  );
}

/**
 * Checklist hôm nay (SCR-16, panel Việc hôm nay của Dashboard). Chạm là đổi ngay; việc xong xuống
 * cuối sau 300 ms. `petId` bỏ trống khi dùng ở Dashboard (chỉ sửa cache dashboard).
 */
export function RoutineChecklist({
  items,
  petId,
  metaOf,
}: {
  items: Routine[];
  petId?: string;
  metaOf?: (item: Routine) => string | undefined;
}) {
  // id → trạng thái trước khi chạm; trong lúc giữ chỗ, sắp xếp theo trạng thái cũ.
  const [held, setHeld] = useState<Record<string, boolean>>({});

  const onTouched = (id: string, previousDone: boolean) => {
    setHeld((h) => ({ ...h, [id]: h[id] ?? previousDone }));
    setTimeout(() => {
      setHeld((h) => Object.fromEntries(Object.entries(h).filter(([k]) => k !== id)));
    }, HOLD_MS);
  };

  const order = sortRoutines(items.map((i) => ({ ...i, done: held[i.id] ?? i.done })));
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {order.map(({ id }) => {
        const item = byId.get(id);
        if (!item) return null;
        return (
          <li key={id}>
            <RoutineRow item={item} petId={petId} meta={metaOf?.(item)} onTouched={onTouched} />
          </li>
        );
      })}
    </ul>
  );
}
