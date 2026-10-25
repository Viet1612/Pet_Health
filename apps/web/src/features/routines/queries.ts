import { idempotencyHeaders, type paths } from '@ph/api-client';
import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';

import { api, unwrap } from '../../api/client';

export type RoutineChecklist =
  paths['/pets/{petId}/routines']['get']['responses'][200]['content']['application/json'];
export type Routine = RoutineChecklist['items'][number];

export const routinesKey = (petId: string) => ['routines', petId] as const;

export const routinesQuery = (petId: string) =>
  queryOptions({
    queryKey: routinesKey(petId),
    queryFn: async (): Promise<RoutineChecklist> =>
      unwrap(await api.GET('/pets/{petId}/routines', { params: { path: { petId } } })),
    staleTime: 0,
  });

/** Thứ tự hiển thị, khớp server: chưa xong trước, rồi theo giờ. */
export const sortRoutines = <T extends Pick<Routine, 'done' | 'timeOfDay'>>(items: T[]): T[] =>
  [...items].sort(
    (a, b) => Number(a.done) - Number(b.done) || a.timeOfDay.localeCompare(b.timeOfDay),
  );

/** Có danh sách việc: checklist của SCR-16 và phần `routines` của Dashboard (S5-03). */
interface HasRoutines {
  items: Routine[];
  doneCount: number;
}

/** Đảo `done` của một việc trong một danh sách; `null` nếu danh sách không chứa việc đó. */
export function applyToggle<T extends HasRoutines>(data: T, id: string, done: boolean): T | null {
  if (!data.items.some((i) => i.id === id)) return null;
  const items = data.items.map((i) => (i.id === id ? { ...i, done } : i));
  return { ...data, items, doneCount: items.filter((i) => i.done).length };
}

/** Phần checklist trong dữ liệu Dashboard (nếu có). */
const dashboardRoutines = (data: unknown): HasRoutines | null => {
  const r = (data as { routines?: HasRoutines } | undefined)?.routines;
  return r && Array.isArray(r.items) ? r : null;
};

/** Mọi cache có thể chứa việc: SCR-16 và các biến thể Dashboard. */
function routineCaches(queryClient: QueryClient, petId: string | undefined): QueryKey[] {
  const keys: QueryKey[] = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['dashboard'] })
    .map((q) => q.queryKey);
  if (petId) keys.push(routinesKey(petId));
  return keys;
}

function setToggle(queryClient: QueryClient, key: QueryKey, id: string, done: boolean) {
  queryClient.setQueryData(key, (old: unknown) => {
    if (!old || typeof old !== 'object') return old;
    if (key[0] === 'dashboard') {
      const r = dashboardRoutines(old);
      const next = r && applyToggle(r, id, done);
      return next ? { ...old, routines: next } : old;
    }
    return applyToggle(old as RoutineChecklist, id, done) ?? old;
  });
}

export function refreshRoutines(queryClient: QueryClient, petId: string | undefined) {
  return Promise.all([
    petId ? queryClient.invalidateQueries({ queryKey: routinesKey(petId) }) : undefined,
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
}

/**
 * FLW-05: chạm là đổi ngay (lạc quan), lỗi thì khôi phục. Mỗi việc một `scope` nên các lần chạm
 * liên tiếp gửi tuần tự, lệnh cuối quyết định. `petId` bỏ trống khi gọi từ Dashboard.
 */
export function useToggleRoutine(id: string, petId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: { id: `routine-${id}` },
    mutationFn: async (done: boolean) =>
      unwrap(
        await api.PUT('/routines/{id}/completion', { params: { path: { id } }, body: { done } }),
      ),
    onMutate: async (done) => {
      const keys = routineCaches(queryClient, petId);
      await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const snapshot = keys.map((key) => [key, queryClient.getQueryData(key)] as const);
      for (const key of keys) setToggle(queryClient, key, id, done);
      return { snapshot };
    },
    onError: (_err, _done, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => refreshRoutines(queryClient, petId),
  });
}

export interface RoutineInput {
  name: string;
  timeOfDay: string;
}

export function useCreateRoutine(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, key }: { input: RoutineInput; key: string }) =>
      unwrap(
        await api.POST('/pets/{petId}/routines', {
          params: { path: { petId } },
          body: input,
          headers: idempotencyHeaders(key),
        }),
      ),
    onSettled: () => refreshRoutines(queryClient, petId),
  });
}

export function useUpdateRoutine(petId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<RoutineInput>) =>
      unwrap(await api.PATCH('/routines/{id}', { params: { path: { id } }, body: patch })),
    onSuccess: () => refreshRoutines(queryClient, petId),
  });
}

export function useDeleteRoutine(petId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.DELETE('/routines/{id}', { params: { path: { id } } });
    },
    onSuccess: () => refreshRoutines(queryClient, petId),
  });
}
