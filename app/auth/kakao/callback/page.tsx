'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginWithKakao } from '@/lib/auth';

export default function KakaoCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKakaoCallback = async () => {
      try {
        // URL에서 authorization code 추출
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          throw new Error('카카오 로그인이 취소되었습니다.');
        }

        if (!code) {
          throw new Error('인증 코드를 받지 못했습니다.');
        }

        setStatus('loading');

        // 서버에 authorization code 전송하고 JWT 토큰 받기
        const result = await loginWithKakao(code);

        if (result.token) {
          setStatus('success');
          
          // 로그인 성공 - 로비로 이동
          setTimeout(() => {
            router.push('/lobby');
          }, 1500);
        } else {
          throw new Error('토큰을 받지 못했습니다.');
        }

      } catch (error) {
        console.error('카카오 로그인 처리 에러:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '로그인 처리 중 오류가 발생했습니다.');
        
        // 3초 후 로그인 페이지로 리다이렉트
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleKakaoCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">로그인 처리 중...</h2>
            <p className="text-gray-600">카카오 로그인을 처리하고 있습니다.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">로그인 성공!</h2>
            <p className="text-gray-600">로비로 이동합니다...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">로그인 실패</h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <p className="text-sm text-gray-500">잠시 후 로그인 페이지로 이동합니다...</p>
          </div>
        )}
      </div>
    </div>
  );
}
