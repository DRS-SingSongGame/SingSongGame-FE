'use client';

import { useRouter } from 'next/navigation';
import CreateRoom from '@/components/CreateRoom';

export default function CreateRoomPage() {
  const router = useRouter();

  const handleRoomCreated = (room: any) => {
    localStorage.setItem('room', JSON.stringify(room)); // 이걸로 GameRoom에서 꺼내쓰기
    router.push('/gameroom'); // GameRoom 페이지로 이동
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100"
>
      <CreateRoom
        onBack={() => router.back()}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  );
}

