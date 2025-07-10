import useSWR from 'swr';
import api from '@/lib/api';

export default function useOnlineUsers() {
  const fetcher = (url: string) => api.get(url).then(res => res.data);
  const { data, error, mutate } = useSWR('/api/online-users', fetcher, {
    refreshInterval: 10000, // 10초마다 자동 갱신 (선택)
  });

  return {
    users: (data as any[]) || [],
    loading: !data && !error,
    error,
    refetch: mutate,
  };
}