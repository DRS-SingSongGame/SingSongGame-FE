// lib/api.ts
import axios from 'axios';

const api = axios.create({
  // baseURL: 'https://singsonggame.store', // 서버 백엔드 주소
  baseURL: 'http://localhost:8080', // 로컬 백엔드 주소
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// 요청, 응답 인터셉터도 여기서 추가 가능 (토큰 등)
export default api;