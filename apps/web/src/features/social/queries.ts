import { ApiError, type paths } from '@ph/api-client';
import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

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

export type Post =
  paths['/posts/{id}']['get']['responses'][200]['content']['application/json']['post'];
export type GridItem =
  paths['/profiles/{username}/posts']['get']['responses'][200]['content']['application/json']['items'][number];

export const POST_KEY = ['social', 'post'] as const;
export const GRID_KEY = ['social', 'grid'] as const;

export const postQuery = (id: string) =>
  queryOptions({
    queryKey: [...POST_KEY, id],
    queryFn: async (): Promise<Post> =>
      unwrap(await api.GET('/posts/{id}', { params: { path: { id } } })).post,
    staleTime: 30_000,
  });

/** Lưới hồ sơ: 18 bài/trang, cuộn tới cuối tải trang kế. */
export const profilePostsQuery = (username: string) =>
  infiniteQueryOptions({
    queryKey: [...GRID_KEY, username.toLowerCase()],
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET('/profiles/{username}/posts', {
          params: {
            path: { username },
            query: pageParam ? { cursor: pageParam } : {},
          },
        }),
      ),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });

export function useUpdatePost(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { caption: string | null; petIds: string[] }) =>
      unwrap(await api.PATCH('/posts/{id}', { params: { path: { id } }, body })).post,
    onSuccess: (post) => {
      queryClient.setQueryData([...POST_KEY, id], post);
    },
  });
}

export function useDeletePost(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.DELETE('/posts/{id}', { params: { path: { id } } });
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [...POST_KEY, id] });
      void queryClient.invalidateQueries({ queryKey: GRID_KEY });
      void queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}
