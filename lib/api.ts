// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://singsonggame.store', // 백엔드 주소
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청, 응답 인터셉터도 여기서 추가 가능 (토큰 등)
export default api;