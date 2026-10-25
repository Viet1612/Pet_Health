import { ApiError, type paths } from '@ph/api-client';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { api, unwrap } from '../../api/client';
import { SESSION_KEY } from '../session';
import { ME_KEY } from '../settings';

export type MyProfile =
  paths['/me/profile']['get']['responses'][200]['content']['application/json']['profile'];
export type Profile =
  paths['/profiles/{username}']['get']['responses'][200]['content']['application/json']['profile'];

export const MY_PROFILE_KEY = ['social', 'me'] as const;
export const PROFILE_KEY = ['social', 'profile'] as const;

/** Hồ sơ công khai của tôi; `null` khi chưa tạo (404 PROFILE_NOT_SET). */
export const myProfileQuery = queryOptions({
  queryKey: MY_PROFILE_KEY,
  queryFn: async (): Promise<MyProfile | null> => {
    try {
      return unwrap(await api.GET('/me/profile')).profile;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PROFILE_NOT_SET') return null;
      throw error;
    }
  },
  staleTime: 30_000,
});

export const profileQuery = (username: string) =>
  queryOptions({
    queryKey: [...PROFILE_KEY, username.toLowerCase()],
    queryFn: async (): Promise<Profile> =>
      unwrap(await api.GET('/profiles/{username}', { params: { path: { username } } })).profile,
    staleTime: 30_000,
  });

export async function checkUsername(username: string): Promise<{
  valid: boolean;
  available: boolean;
}> {
  return unwrap(await api.GET('/profiles/check', { params: { query: { username } } }));
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { username: string; displayName: string; bio: string | null }) =>
      unwrap(await api.PUT('/me/profile', { body })).profile,
    onSuccess: (profile) => {
      queryClient.setQueryData(MY_PROFILE_KEY, profile);
      void queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

export function useRemoveProfileAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.DELETE('/me/avatar');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social'] }),
  });
}

/** Nickname / ngày sinh (F-02): cập nhật phiên để lời nhắc bổ sung biến mất. */
export function useUpdatePersonal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { nickname?: string; birthDate?: string }) =>
      unwrap(await api.PATCH('/me', { body })).user,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: SESSION_KEY }),
        queryClient.invalidateQueries({ queryKey: ME_KEY }),
      ]);
    },
  });
}
