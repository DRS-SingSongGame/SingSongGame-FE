// hooks/useRooms.ts
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

interface Room {
  roomId: number;
  roomName: string;
  roomType: "KEY_SING_YOU" | "RANDOM_SONG" | "PLAIN_SONG";
  isPrivate: boolean;
  maxPlayer: number;
  gameStatus: string;
  hostName: string;
  maxRound: number;
  players: Array<{ id: number; nickname: string; avatar?: string }>;
}

interface ApiResponse<T> {
  data: T;
  message: string;
  code: string;
}

export default function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // useCallback으로 함수를 메모이제이션하여 참조 동일성 보장
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[useRooms] 방 목록 요청 시작');
      const res = await api.get<ApiResponse<Room[]>>(`/api/room`);
      setRooms(res.data.data);
      console.log('[useRooms] 방 목록 요청 완료:', res.data.data.length, '개');
    } catch (err) {
      console.error('방 목록 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []); // 빈 의존성 배열로 함수가 재생성되지 않도록

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]); // 이제 fetchRooms가 안정적이므로 안전

  return { rooms, loading, refetch: fetchRooms };
}