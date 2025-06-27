// hooks/useCreateRoom.ts
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

interface CreateRoomPayload {
  name: string;
  gameMode: string;
  description: string;
  maxPlayers: number;
  isPrivate?: boolean;
  password?: string;
}

export const useCreateRoom = () => {
  const mutation = useMutation({
    mutationFn: async (room: CreateRoomPayload) => {
      const response = await api.post('/api/room', room);
      return response.data;
    },
  });

  return {
    mutate: mutation.mutate,
    isLoading: mutation.isPending,
  };
};
