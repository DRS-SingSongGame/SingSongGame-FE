// hooks/useRooms.ts
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Room {
  roomId: number;
  roomName: string;
  roomType: "KEY_SING_YOU" | "RANDOM_SONG" | "PLAIN_SONG";
  isPrivate: boolean;
  maxPlayer: number;
  gameStatus: string;
}

interface ApiResponse<T> {
  data: T;
  message: string;
  code: string;
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
