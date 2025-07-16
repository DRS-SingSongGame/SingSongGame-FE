import { useState, useCallback } from 'react';
import axios from 'axios';
import { BaseUser, MatchedRoom } from '@/types/quickmatch';

export const useQuickMatch = (
  user: BaseUser,
  onMatchFound: (room: MatchedRoom) => void
) => {
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [estimatedWaitTime] = useState(30); // 필요시 예측 시간 표시용

  const joinQueue = useCallback(async () => {
    try {
      console.log('📡 빠른 대전 참가 요청 전송 중...');
      const res = await axios.post('/api/quick-match/enter', null, {
        params: { userId: user.id }
      });
      console.log('✅ 요청 응답 수신:', res);
  
      setIsInQueue(true);
      setQueueTime(0);
  
      const timer = setInterval(() => {
        setQueueTime((prev) => prev + 1);
      }, 1000);
  
      return () => clearInterval(timer);
    } catch (err) {
      console.error('❌ 빠른 대전 참가 실패', err);
      alert('빠른 대전 참가에 실패했습니다.');
    }
  }, [user]);

  const leaveQueue = useCallback(async () => {
    setIsInQueue(false);
    setQueueTime(0);
    try {
      await axios.post('/api/quick-match/leave', { userId: user.id });
    } catch (err) {
      console.error('❌ 대기열 나가기 실패', err);
    }
  }, [user]);

  return {
    isInQueue,
    queueTime,
    estimatedWaitTime,
    joinQueue,
    leaveQueue,
  };
};