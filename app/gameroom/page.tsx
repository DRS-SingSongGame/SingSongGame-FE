// app/gameroom/page.tsx
'use client';

import { useEffect, useState } from 'react';
import GameRoom from '@/components/GameRoom';

const mockUser = {
  id: '1',
  nickname: '유저1',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1'
};

export default function GameRoomPage() {
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('room');
    if (stored) setRoom(JSON.parse(stored));
  }, []);

  const handleBack = () => {
    console.log('로비로 이동');
  };

  if (!room) return <div>방 정보 불러오는 중...</div>;

  return <GameRoom user={mockUser} room={room} onBack={handleBack} />;
}
