import { idempotencyHeaders, type paths } from '@ph/api-client';
import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api, unwrap } from '../../api/client';

export type MilestoneGroups =
  paths['/pets/{petId}/milestones']['get']['responses'][200]['content']['application/json'];
export type Milestone = MilestoneGroups['upcoming'][number];
export type MilestoneType = Milestone['type'];
export type MilestoneDetail =
  paths['/milestones/{id}']['get']['responses'][200]['content']['application/json'];
export type CompleteResult =
  paths['/milestones/{id}/complete']['post']['responses'][200]['content']['application/json'];

export const milestonesKey = (petId: string) => ['milestones', petId] as const;
export const milestoneKey = (id: string) => ['milestone', id] as const;

export const milestonesQuery = (petId: string) =>
  queryOptions({
    queryKey: milestonesKey(petId),
    queryFn: async (): Promise<MilestoneGroups> =>
      unwrap(await api.GET('/pets/{petId}/milestones', { params: { path: { petId } } })),
    staleTime: 0,
  });

export const milestoneQuery = (id: string) =>
  queryOptions({
    queryKey: milestoneKey(id),
    queryFn: async (): Promise<MilestoneDetail> =>
      unwrap(await api.GET('/milestones/{id}', { params: { path: { id } } })),
    staleTime: 0,
  });

/** Sau mọi thay đổi mốc: danh sách, chi tiết, chuông/thông báo và Dashboard (FR-NTF-010). */
export function refreshMilestones(queryClient: QueryClient, petId: string, id?: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: milestonesKey(petId) }),
    id ? queryClient.invalidateQueries({ queryKey: milestoneKey(id) }) : undefined,
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
}

export interface MilestoneInput {
  type: MilestoneType;
  dueOn: string;
  note: string | null;
  cycleMonths: number | null;
}

export function useCreateMilestone(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, key }: { input: MilestoneInput; key: string }) =>
      unwrap(
        await api.POST('/pets/{petId}/milestones', {
          params: { path: { petId } },
          body: input,
          headers: idempotencyHeaders(key),
        }),
      ),
    onSuccess: (m) => refreshMilestones(queryClient, petId, m.id),
  });
}

export function useUpdateMilestone(petId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<MilestoneInput, 'type'>>) =>
      unwrap(await api.PATCH('/milestones/{id}', { params: { path: { id } }, body: patch })),
    onSuccess: () => refreshMilestones(queryClient, petId, id),
  });
}

export function useCancelMilestone(petId: string, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      unwrap(await api.POST('/milestones/{id}/cancel', { params: { path: { id } } })),
    onSuccess: () => refreshMilestones(queryClient, petId, id),
  });
}

export async function completeMilestone(id: string, doneOn: string): Promise<CompleteResult> {
  return unwrap(
    await api.POST('/milestones/{id}/complete', { params: { path: { id } }, body: { doneOn } }),
  );
}

export async function undoCompleteMilestone(id: string): Promise<void> {
  await api.POST('/milestones/{id}/undo-complete', { params: { path: { id } } });
}
