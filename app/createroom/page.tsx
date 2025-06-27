'use client';

import { useRouter } from 'next/navigation';
import CreateRoom from '@/components/CreateRoom'; // ❗ 너 구조 기준 정확함

export default function CreateRoomPage() {
  const router = useRouter();

  const handleRoomCreated = (room: any) => {
    // 방 생성 시 로비로 이동
    localStorage.setItem('room', JSON.stringify(room));
    router.push('/lobby');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 via-blue-500 to-cyan-400">
      <CreateRoom
        onBack={() => router.back()}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  );
}
