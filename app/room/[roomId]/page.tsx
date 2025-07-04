'use client';

import { useEffect, useState } from 'react';
import GameRoom from '@/components/GameRoom';
import { useParams } from 'next/navigation';

export default function GameRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string; // URL 파라미터에서 roomId 가져오기

  const [user, setUser] = useState<any>(null); // 실제 사용자 정보
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser({
        id: parsedUser.id,
        nickname: parsedUser.nickname,
        avatar: parsedUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + parsedUser.nickname // 아바타가 없으면 기본값
      });
    }

    // TODO: 실제 방 정보를 백엔드에서 가져오는 로직 추가
    // 현재는 mockUser와 roomId만 사용한다고 가정합니다.
    setRoom({ roomId: roomId, roomName: `방 ${roomId}`, maxPlayer: 6, hostName: '호스트', roomType: 'RANDOM_SONG' });
  }, [roomId]);

  const handleBack = () => {
    console.log('로비로 이동');
    // TODO: 로비로 이동하는 라우터 로직 추가
  };

  if (!user || !room) return <div>로딩 중...</div>;

  return <GameRoom user={user} room={room} onBack={handleBack} />;
}
