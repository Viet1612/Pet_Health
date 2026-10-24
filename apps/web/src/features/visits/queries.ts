import { idempotencyHeaders, type paths } from '@ph/api-client';
import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { api, unwrap } from '../../api/client';

type ListResponse =
  paths['/pets/{petId}/visits']['get']['responses'][200]['content']['application/json'];
export type VisitSummary = ListResponse['items'][number];
export type Visit = paths['/visits/{id}']['get']['responses'][200]['content']['application/json'];
export type VisitPhoto = Visit['photos'][number];

export interface VisitValues {
  visitedOn: string;
  symptoms: string | null;
  diagnosis: string | null;
  prescription: string | null;
}

export const VISIT_PAGE_SIZE = 20;
export const visitsKey = (petId: string) => ['visits', petId] as const;
export const visitKey = (visitId: string) => ['visit', visitId] as const;

/** Danh sách lần khám, mới nhất trước, tải thêm theo con trỏ (FR-VIS-002). */
export const visitsQuery = (petId: string) =>
  infiniteQueryOptions({
    queryKey: visitsKey(petId),
    queryFn: async ({ pageParam }): Promise<ListResponse> =>
      unwrap(
        await api.GET('/pets/{petId}/visits', {
          params: {
            path: { petId },
            query: { limit: VISIT_PAGE_SIZE, ...(pageParam ? { cursor: pageParam } : {}) },
          },
        }),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  });

export const visitQuery = (visitId: string) =>
  queryOptions({
    queryKey: visitKey(visitId),
    queryFn: async (): Promise<Visit> =>
      unwrap(await api.GET('/visits/{id}', { params: { path: { id: visitId } } })),
    staleTime: 0,
  });

/** Làm mới danh sách của thú cưng và chi tiết lần khám sau mọi thay đổi. */
export function refreshVisit(queryClient: QueryClient, petId: string, visitId?: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: visitsKey(petId) }),
    visitId ? queryClient.invalidateQueries({ queryKey: visitKey(visitId) }) : undefined,
  ]);
}

export function useCreateVisit(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ values, key }: { values: VisitValues; key: string }) =>
      unwrap(
        await api.POST('/pets/{petId}/visits', {
          params: { path: { petId } },
          body: values,
          headers: idempotencyHeaders(key),
        }),
      ),
    onSuccess: (visit) => refreshVisit(queryClient, petId, visit.id),
  });
}

export function useUpdateVisit(petId: string, visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: VisitValues) =>
      unwrap(await api.PATCH('/visits/{id}', { params: { path: { id: visitId } }, body: values })),
    onSuccess: () => refreshVisit(queryClient, petId, visitId),
  });
}

export function useDeleteVisit(petId: string, visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.DELETE('/visits/{id}', { params: { path: { id: visitId } } });
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: visitKey(visitId), exact: true });
      await queryClient.invalidateQueries({ queryKey: visitsKey(petId) });
    },
  });
}

export function useDeletePhoto(petId: string, visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: string) => {
      await api.DELETE('/photos/{id}', { params: { path: { id: photoId } } });
    },
    onSuccess: () => refreshVisit(queryClient, petId, visitId),
  });
}
