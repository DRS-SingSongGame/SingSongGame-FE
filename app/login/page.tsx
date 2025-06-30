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
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <LoginPage onLogin={handleLogin} />
    </div>
  );
};

export default Login;
