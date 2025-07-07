'use client';

import RandomSongGame from '@/components/RandomSongGame';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ApiResponse, User, Room } from '@/types/api';

export default function AISongGamePage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get<ApiResponse<User>>('/api/user/me');
        setUser(userRes.data.data);

        const roomRes = await api.get<ApiResponse<Room>>(`/api/room/${params.roomId}`);
        setRoom(roomRes.data.data);
        setPlayers(roomRes.data.data.players);
      } catch (err) {
        setError("게임 데이터를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.roomId]);

  const onBack = () => {
    router.push('/lobby');
  };

  // 게임 시작 시 aisonggame/FlatLyricsGame으로 이동
  const onGameStart = () => {
    router.push(`/room/${params.roomId}/aisonggame/FlatLyricsGame`);
  };

  const onGameEnd = (results: any[]) => {
    // 예시: 게임 종료 시 로비로 이동
    router.push('/lobby');
  };

  if (loading) return <div>게임 데이터를 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;
  if (!user || !room) return <div>필요한 게임 정보가 부족합니다.</div>;

  return (
    <RandomSongGame
      user={user}
      room={room}
      players={players}
      onBack={onBack}
      onGameEnd={onGameEnd}
      isAISongGame={true}
      onGameStart={onGameStart}
    />
  );
}