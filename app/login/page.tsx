'use client';

import LoginPage from '@/components/LoginPage';
import { useRouter } from 'next/navigation';

const Login = () => {
  const router = useRouter();

  const handleLogin = (userData: any) => {
    console.log('로그인 성공:', userData);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 via-blue-500 to-cyan-400">
      <LoginPage onLogin={handleLogin} />
    </div>
  );
};

export default Login;
