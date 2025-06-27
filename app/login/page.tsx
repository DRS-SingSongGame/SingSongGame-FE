'use client';

import { useRouter } from 'next/navigation';
import LoginPage from '@/components/LoginPage';

const Login = () => {
  const router = useRouter();

  const handleLogin = (userData: any) => {
    // 사용자 데이터를 localStorage에 저장 (실제 앱에서는 더 안전한 방법 사용)
    localStorage.setItem('user', JSON.stringify(userData));
    router.push('/lobby');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 via-blue-500 to-cyan-400">
      <LoginPage onLogin={handleLogin} />
    </div>
  );
};

export default Login;
