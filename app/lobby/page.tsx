'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GameLobby from '@/components/GameLobby';

export default function LobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch(`/api/user/me`, {
          method: 'GET',
          credentials: 'include', // ✅ 쿠키를 반드시 같이 보냄
        });
  
        const result = await res.json();
  
        if (result?.data) {
          setUser(result.data); // 서버에서 받은 유저 정보로 상태 갱신
          localStorage.setItem('user', JSON.stringify(result.data)); // localStorage도 동기화
        } else {
          throw new Error();
        }
      } catch {
        // 토큰 없음, 만료, 인증 실패 등 → 로그인 페이지로 이동
        router.push('/login');
      }
    };
  
    checkLogin();
  }, []);
  

  if (!user) return null; // 초기 렌더 방지

  return (
    <GameLobby
      user={user}
      onCreateRoom={() => router.push('/createroom')}
      onJoinRoom={(room) => router.push(`/room/${room.roomId}`)}
      onLogout={async () => {
        await fetch(`/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
        localStorage.removeItem("user");
        router.push("/login");
      }}
    />
  );
}
