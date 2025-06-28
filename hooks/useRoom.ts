// hooks/useRooms.ts
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ApiResponse } from '@/types/api';

interface Room {
    id: number;
    name: string;
    roomType: "KEY_SING_YOU" | "RANDOM_SONG" | "PLAIN_SONG"; 
    isPrivate: boolean;
    roomPassword: number;
    maxPlayer: number;
    hostId: number;
  }

export default function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ApiResponse<Room[]>>('/api/room');  
        setRooms(res.data.data);
      } catch (err) {
        console.error('방 목록 불러오기 실패:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { rooms, loading };
}
