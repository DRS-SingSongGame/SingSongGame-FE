// hooks/useJoinRoom.ts
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

interface JoinRoomPayload {
  roomId: number;
  password?: string;
}

export const useJoinRoom = () => {
  const mutation = useMutation({
    mutationFn: async ({ roomId, password }: JoinRoomPayload) => {
      const response = await api.post(`${process.env.NEXT_PUBLIC_API_URL}/room/${roomId}/join`, { password });
      return response.data;
    },
  });

  return {
    mutate: mutation.mutate,
    isLoading: mutation.isPending, 
  };
};
