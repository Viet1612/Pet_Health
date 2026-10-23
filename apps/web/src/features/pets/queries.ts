import { idempotencyHeaders, type paths } from '@ph/api-client';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { api, unwrap } from '../../api/client';

export type Pet = paths['/pets/{petId}']['get']['responses'][200]['content']['application/json'];
export type PetSex = Pet['sex'];

export interface PetValues {
  name: string;
  breed: string;
  sex: PetSex;
  birthDate: string;
  description: string | null;
}

export const PETS_KEY = ['pets'] as const;
export const PET_LIMIT = 10;

/** Danh sách thú cưng (cũ nhất trước). Loader luôn lấy mới (FR-GEN-008). */
export const petsQuery = queryOptions({
  queryKey: PETS_KEY,
  queryFn: async (): Promise<Pet[]> => unwrap(await api.GET('/pets')).items,
  staleTime: 0,
});

export const petQuery = (petId: string) =>
  queryOptions({
    queryKey: [...PETS_KEY, petId],
    queryFn: async (): Promise<Pet> =>
      unwrap(await api.GET('/pets/{petId}', { params: { path: { petId } } })),
    staleTime: 0,
  });

export function useCreatePet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ values, key }: { values: PetValues; key: string }) =>
      unwrap(await api.POST('/pets', { body: values, headers: idempotencyHeaders(key) })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PETS_KEY }),
  });
}

export function useUpdatePet(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<PetValues>) =>
      unwrap(await api.PATCH('/pets/{petId}', { params: { path: { petId } }, body: values })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PETS_KEY }),
  });
}

export function useDeletePet(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (confirmName: string) => {
      await api.DELETE('/pets/{petId}', { params: { path: { petId } }, body: { confirmName } });
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: [...PETS_KEY, petId], exact: true });
      await queryClient.invalidateQueries({ queryKey: PETS_KEY });
    },
  });
}

export function useRemoveAvatar(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.DELETE('/pets/{petId}/avatar', { params: { path: { petId } } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PETS_KEY }),
  });
}
