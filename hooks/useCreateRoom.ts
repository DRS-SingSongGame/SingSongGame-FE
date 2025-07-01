import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export interface CreateRoomPayload {
  name: string;
  roomType: 'KEY_SING_YOU' | 'RANDOM_SONG' | 'PLAIN_SONG';
  isPrivate: boolean;
  roomPassword: number;
  maxPlayer: number;
  hostId: number;
}

export const useCreateRoom = () => {
  const mutation = useMutation({
    mutationFn: async (room: CreateRoomPayload) => {
      const response = await api.post(`${process.env.NEXT_PUBLIC_API_URL}/room`, room);
      return response.data;
    },
  });

  return {
    mutate: mutation.mutate,
    isLoading: mutation.isPending,
  };
};
