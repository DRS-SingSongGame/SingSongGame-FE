// 카카오 로그인 관련 함수들

// 카카오 로그인 URL로 리다이렉트
export const initiateKakaoLogin = () => {
  const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    console.error('카카오 환경변수가 설정되지 않았습니다.');
    return;
  }

  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  
  // 카카오 로그인 페이지로 리다이렉트
  window.location.href = kakaoAuthUrl;
};



// 서버에 카카오 로그인 정보 전송하고 JWT 토큰 받기
export const loginWithKakao = async (code: string) => {
  try {
    // 서버의 카카오 로그인 API 엔드포인트로 authorization code 전송
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('서버 로그인 실패');
    }

    const data = await response.json();
    
    // 서버에서 받은 JWT 토큰을 localStorage에 저장
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error('카카오 로그인 에러:', error);
    throw error;
  }
};

// JWT 토큰으로 사용자 정보 가져오기
export const getCurrentUser = async () => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    return null;
  }

  try {
    const response = await fetch('/api/user/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // 토큰이 만료되었거나 유효하지 않음
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('사용자 정보 조회 에러:', error);
    return null;
  }
};

// 로그아웃
export const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};
