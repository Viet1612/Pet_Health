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

export type Person =
  paths['/search/profiles']['get']['responses'][200]['content']['application/json']['items'][number];

export const PEOPLE_KEY = ['social', 'people'] as const;
export const FEED_KEY = ['social', 'feed'] as const;

export const searchQuery = (q: string) =>
  queryOptions({
    queryKey: [...PEOPLE_KEY, 'search', q.trim().toLowerCase()],
    queryFn: async (): Promise<Person[]> =>
      unwrap(await api.GET('/search/profiles', { params: { query: { q } } })).items,
    staleTime: 30_000,
  });

/** Người theo dõi / đang theo dõi của một hồ sơ, 30 người/trang. */
export const followListQuery = (username: string, side: 'followers' | 'following') =>
  infiniteQueryOptions({
    queryKey: [...PEOPLE_KEY, side, username.toLowerCase()],
    queryFn: async ({ pageParam }) => {
      const params = { path: { username }, query: pageParam ? { cursor: pageParam } : {} };
      return unwrap(
        side === 'followers'
          ? await api.GET('/profiles/{username}/followers', { params })
          : await api.GET('/profiles/{username}/following', { params }),
      );
    },
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });

/**
 * Theo dõi / bỏ theo dõi (F-07): cập nhật lạc quan hồ sơ đang xem (nút + số người theo dõi), lỗi
 * thì hoàn lại. Xong thì làm mới danh sách người, bản tin.
 */
export function useFollow(username: string) {
  const queryClient = useQueryClient();
  const profileKey = profileQuery(username).queryKey;
  return useMutation({
    mutationFn: async (follow: boolean) => {
      const params = { params: { path: { username } } };
      return unwrap(
        follow
          ? await api.PUT('/follows/{username}', params)
          : await api.DELETE('/follows/{username}', params),
      );
    },
    onMutate: async (follow) => {
      await queryClient.cancelQueries({ queryKey: profileKey });
      const previous = queryClient.getQueryData<Profile>(profileKey);
      if (previous && previous.followedByMe !== follow) {
        queryClient.setQueryData<Profile>(profileKey, {
          ...previous,
          followedByMe: follow,
          followerCount: previous.followerCount + (follow ? 1 : -1),
        });
      }
      return { previous };
    },
    onError: (_err, _follow, context) => {
      if (context?.previous) queryClient.setQueryData(profileKey, context.previous);
    },
    onSuccess: (state) => {
      const current = queryClient.getQueryData<Profile>(profileKey);
      if (current) {
        queryClient.setQueryData<Profile>(profileKey, {
          ...current,
          followedByMe: state.following,
          followerCount: state.followerCount,
        });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PEOPLE_KEY });
      void queryClient.invalidateQueries({ queryKey: FEED_KEY });
      void queryClient.invalidateQueries({ queryKey: MY_PROFILE_KEY });
    },
  });
}

/**
 * Bản tin: 10 bài/trang. Không dùng `maxPages`: chỉ phân trang một chiều nên bỏ trang đầu sẽ mất
 * bài khi cuộn ngược lên.
 */
export const feedQuery = infiniteQueryOptions({
  queryKey: FEED_KEY,
  queryFn: async ({ pageParam }) =>
    unwrap(await api.GET('/feed', { params: { query: pageParam ? { cursor: pageParam } : {} } })),
  initialPageParam: '',
  getNextPageParam: (last) => last.nextCursor ?? undefined,
  staleTime: 30_000,
});

export async function feedNewCount(since: string): Promise<number> {
  return unwrap(await api.GET('/feed/new-count', { params: { query: { since } } })).count;
}
