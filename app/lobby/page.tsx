'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GameLobby from '@/components/GameLobby';

export default function LobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/login'); // 로그인 안 했으면 로그인 페이지로
    }
  }, []);

  if (!user) return null; // 초기 렌더 방지

  return (
    <GameLobby
      user={user}
      onCreateRoom={() => router.push('/createroom')}
      onJoinRoom={(room) => router.push(`/game-room?id=${room.id}`)}
      onLogout={() => {
        localStorage.removeItem('user');
        router.push('/login');
      }}
    />
  );
}
