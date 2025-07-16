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

  useEffect(() => {
    if (!room?.roomId) return;

    const fetchPlayers = async () => {
      try {
        const roomRes = await api.get<ApiResponse<Room>>(`/api/room/${room.roomId}`);
        const currentPlayers = roomRes.data.data.players;
        
        // 플레이어 목록이 변경된 경우에만 업데이트
        if (JSON.stringify(currentPlayers) !== JSON.stringify(players)) {
          console.log("🔄 플레이어 목록 업데이트:", currentPlayers);
          setPlayers(currentPlayers);
        }
      } catch (err) {
        console.error("플레이어 목록 동기화 실패:", err);
      }
    };

    // 5초마다 플레이어 목록 동기화
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, [room?.roomId, players]);

  const handlePlayersUpdate = (updatedPlayers: any[]) => {
    console.log("🔄 WebSocket으로부터 플레이어 업데이트:", updatedPlayers);
    setPlayers(updatedPlayers);
  };


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
      onPlayersUpdate={handlePlayersUpdate}
    />
  );
}