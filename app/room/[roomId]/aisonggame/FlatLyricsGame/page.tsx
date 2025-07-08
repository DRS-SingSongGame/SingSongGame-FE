"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FlatLyricsGame } from "@/components/game";
import api from "@/lib/api";
import { ApiResponse, User, Room } from "@/types/api";

export default function FlatLyricsGamePage({ params }: { params: { roomId: string } }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const userRes = await api.get<ApiResponse<User>>('/api/user/me');
        setUser(userRes.data.data);

        const roomRes = await api.get<ApiResponse<Room>>(`/api/room/${params.roomId}`);
        setRoom(roomRes.data.data);
        setPlayers(roomRes.data.data.players);
      } catch (err) {
        console.error("게임 정보 가져오기 실패:", err);
        setError("게임 데이터를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [params.roomId]);

  const handleBack = () => router.push("/lobby");

  const handleGameEnd = (results: any[]) => {
    console.log("게임 결과:", results);
    router.push("/lobby");
  };

  if (loading) return <div>게임 데이터를 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;
  if (!user || !room) return <div>필요한 게임 정보가 부족합니다.</div>;

  return (
    <FlatLyricsGame
      user={user}
      room={ room }
      players={players}
      onBack={handleBack}
      onGameEnd={handleGameEnd}
    />
  );
}
