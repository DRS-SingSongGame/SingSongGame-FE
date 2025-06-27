'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const Home = () => {
  const router = useRouter();

  useEffect(() => {
    // 홈페이지 접근 시 로그인 페이지로 리다이렉트
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center">
      <div className="text-white text-xl">Redirecting to login...</div>
    </div>
  );
};

export default Home;