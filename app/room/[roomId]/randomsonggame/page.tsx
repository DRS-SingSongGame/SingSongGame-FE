'use client';

import RandomSongGame from '@/components/RandomSongGame';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ApiResponse, User, Room } from '@/types/api';

export default function GamePage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user data
        const userRes = await api.get<ApiResponse<User>>('/api/user/me');
        console.log('User Response:', userRes.data);
        setUser(userRes.data.data);

        const roomRes = await api.get<ApiResponse<Room>>(`/api/room/${params.roomId}`);
        console.log('Room Response:', roomRes.data);
        setRoom(roomRes.data.data);
        setPlayers(roomRes.data.data.players);

        console.log('User State:', userRes.data.data);
        console.log('Room State:', roomRes.data.data);
        console.log('Players State:', roomRes.data.data.players);

      } catch (err) {
        console.error("Failed to fetch game data:", err);
        setError("게임 데이터를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.roomId]);

  const onBack = () => {
    router.push('/lobby'); // Navigate back to lobby
  };

  const onGameEnd = (results: any[]) => {
    // Handle game end, e.g., navigate to a results page or lobby
    console.log("Game ended with results:", results);
    router.push('/lobby'); // Example: navigate to lobby after game ends
  };

  if (loading) {
    return <div>게임 데이터를 불러오는 중...</div>;
  }

  if (error) {
    return <div>오류: {error}</div>;
  }

  if (!user || !room) {
    return <div>필요한 게임 정보가 부족합니다.</div>;
  }

  return (
    <RandomSongGame
      user={user}
      room={room}
      players={players}
      onBack={onBack}
      onGameEnd={onGameEnd}
    />
  );
}