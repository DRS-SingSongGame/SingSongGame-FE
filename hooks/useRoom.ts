// hooks/useRooms.ts
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ApiResponse } from '@/types/api';

interface Room {
  id: number;
  name: string;
  gameMode: string;
  description: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
}

export default function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ApiResponse<Room[]>>('/room');  
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
