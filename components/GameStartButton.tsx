import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Play } from 'lucide-react';
import api from '@/lib/api';

interface GameStartButtonProps {
  roomId: string;
  user: any;
  room: any;
  onGameStart: () => void;
}

interface Player {
  id: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  ready?: boolean | null;
}

const GameStartButton = ({ roomId, user, room, onGameStart }: GameStartButtonProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 2초마다 플레이어 목록 새로고침
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await api.get<{ data: any }>(`/api/room/${roomId}`);
        const roomData = response.data.data;
        setPlayers(roomData.players || []);
      } catch (error) {
        console.error('플레이어 목록 불러오기 실패:', error);
      }
    };

    // 초기 로딩
    fetchPlayers();

    // 2초마다 새로고침
    timerRef.current = setInterval(fetchPlayers, 2000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [roomId]);

  // 게임 시작 조건 계산
  const isHost = user.id === room.hostId;
  const nonHostPlayers = players.filter(p => p.id !== room.hostId);
  const allNonHostReady = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.ready === true);
  const canStartGame = (room.maxPlayer === 1 && players.length === 1 && isHost) || (isHost && allNonHostReady);

  const handleGameStart = async () => {
    if (!canStartGame) return;
    
    setLoading(true);
    try {
      // 게임 시작 API 호출 (필요한 경우)
      // await api.post(`/api/room/${roomId}/start`);
      
      // 게임 시작 콜백 호출
      onGameStart();
    } catch (error) {
      console.error('게임 시작 실패:', error);
      alert('게임 시작에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isHost) {
    return null; // 방장이 아니면 버튼을 표시하지 않음
  }

  return (
    <div className="space-y-2">
      <Button
        disabled={!canStartGame || loading}
        className={`w-full h-[50px] text-lg ${
          canStartGame 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
        }`}
        onClick={handleGameStart}
      >
        <Play className="w-4 h-4 mr-2" /> 
        {loading ? '게임 시작 중...' : canStartGame ? '게임 시작' : '모든 플레이어 준비 대기 중'}
      </Button>
      
      {!canStartGame && (
        <div className="text-xs text-gray-500 text-center">
          {nonHostPlayers.length === 0 
            ? '다른 플레이어가 입장하기를 기다리는 중...'
            : `${nonHostPlayers.filter(p => p.ready).length}/${nonHostPlayers.length}명 준비 완료`
          }
        </div>
      )}
      
      {/* 디버그 정보 (개발 중에만 표시) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 text-center">
          <div>총 플레이어: {players.length}/{room.maxPlayer}</div>
          <div>준비 완료: {players.filter(p => p.ready).length}명</div>
          <div>시작 가능: {canStartGame ? '예' : '아니오'}</div>
        </div>
      )}
    </div>
  );
};

export default GameStartButton; 