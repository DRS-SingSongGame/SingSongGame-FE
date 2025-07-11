import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { ApiResponse } from '@/types/api';

export interface CreateRoomPayload {
  name: string;
  roomType: 'KEY_SING_YOU' | 'RANDOM_SONG' | 'PLAIN_SONG';
  isPrivate: boolean;
  roomPassword: number;
  maxPlayer: number;
  maxRound: number;
  hostId: number;
}

export interface CreateRoomResponse {
  roomId: string;
  name: string;
  roomType: string;
  isPrivate: boolean;
  maxPlayer: number;
  maxRound: number;
  hostId: number;
}

export const useCreateRoom = () => {
  const mutation = useMutation({
    mutationFn: async (room: CreateRoomPayload) => {
      const response = await api.post(`/api/room`, room);
      return response.data;
    },
  });

  return {
    mutate: mutation.mutate,
    isLoading: mutation.isPending,
  };
};
