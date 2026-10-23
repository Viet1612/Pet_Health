import { idempotencyHeaders, type paths } from '@ph/api-client';
import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api, unwrap } from '../../api/client';

export type WeightsView =
  paths['/pets/{petId}/weights']['get']['responses'][200]['content']['application/json'];
export type WeightEntry = WeightsView['items'][number];

export const weightsKey = (petId: string) => ['weights', petId] as const;

/** Toàn bộ số đo của thú cưng (không truyền from/to), mục tiêu, số đo mới nhất. */
export const weightsQuery = (petId: string) =>
  queryOptions({
    queryKey: weightsKey(petId),
    queryFn: async (): Promise<WeightsView> =>
      unwrap(await api.GET('/pets/{petId}/weights', { params: { path: { petId } } })),
    staleTime: 0,
  });

/** Sau mọi thay đổi: làm mới cân nặng của thú cưng và Dashboard (S5). */
function refresh(queryClient: QueryClient, petId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: weightsKey(petId) }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
}

export function useAddWeight(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { weightKg: string; measuredOn: string; key: string }) =>
      unwrap(
        await api.POST('/pets/{petId}/weights', {
          params: { path: { petId } },
          body: { weightKg: input.weightKg, measuredOn: input.measuredOn },
          headers: idempotencyHeaders(input.key),
        }),
      ),
    onSuccess: () => refresh(queryClient, petId),
  });
}

export function useUpdateWeight(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; weightKg: string; measuredOn: string }) =>
      unwrap(
        await api.PATCH('/weights/{id}', {
          params: { path: { id: input.id } },
          body: { weightKg: input.weightKg, measuredOn: input.measuredOn },
        }),
      ),
    onSuccess: () => refresh(queryClient, petId),
  });
}

export function useDeleteWeight(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.DELETE('/weights/{id}', { params: { path: { id } } });
    },
    onSuccess: () => refresh(queryClient, petId),
  });
}

export function useSetWeightTarget(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (weightKg: string | null) => {
      if (weightKg === null) {
        await api.DELETE('/pets/{petId}/weight-target', { params: { path: { petId } } });
      } else {
        await api.PUT('/pets/{petId}/weight-target', {
          params: { path: { petId } },
          body: { weightKg },
        });
      }
    },
    onSuccess: () => refresh(queryClient, petId),
  });
}
