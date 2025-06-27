// hooks/useJoinRoom.ts
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

interface JoinRoomPayload {
  roomId: number;
  password?: string;
}

export const useJoinRoom = () => {
  return useMutation({
    mutationFn: async ({ roomId, password }: JoinRoomPayload) => {
      const response = await api.post(`/api/room/${roomId}/join`, { password });
      return response.data;
    },
  });
};
