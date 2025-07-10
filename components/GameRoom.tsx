import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Play, CheckCircle, Circle, LogOut } from 'lucide-react';
import { connectGameSocket, disconnectGameSocket } from '@/lib/gameSocket';
import { CardContent } from './ui/Card';
import { CardTitle } from './ui/Card';
import { CardHeader } from './ui/Card';
import { Card } from './ui/Card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import ChatBox from '@/components/chat/ChatBox';
import api from '@/lib/api';
import RandomSongGame from './RandomSongGame';
import { Button } from './ui/Button';
import { Badge } from './ui/badge';
import { sendGameMessage } from '@/lib/gameSocket';
import PlayerSlots from '@/components/PlayerSlots';
interface GameRoomProps {
  user: any;
  room: any;
  onBack: () => void;
}
interface Player {
  id: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
}
interface ChatMessage {
  id: number;
  type: 'TALK' | 'ENTER' | 'LEAVE';
  roomId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  time: string;
}
const GameRoom = ({ user, room, onBack }: GameRoomProps) => {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState(room.gameStatus || 'WAITING'); // 방 정보에서 게임 상태 가져오기
  // 게임 모드 라벨 및 색상 함수 (기존과 동일)
  const getGameModeColor = (mode: string) => {
    switch (mode) {
      case 'KEY_SING_YOU': return 'bg-gradient-to-r from-pink-500 to-purple-500';
      case 'RANDOM_SONG': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'PLAIN_SONG': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case '놀라운 토요일': return 'bg-gradient-to-r from-orange-500 to-yellow-500';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500';
    }
  };
  const getGameModeLabel = (mode: string) => {
    switch (mode) {
      case 'KEY_SING_YOU': return '키싱유';
      case 'RANDOM_SONG': return '랜덤 노래 맞추기';
      case 'PLAIN_SONG': return '평어 노래 맞추기';
      default: return '알 수 없음';
    }
  };
  useEffect(() => {
    const audio = new Audio('/audio/entersound.wav');
    audio.play();
  }, []);
  useEffect(() => {
    // 초기 방 정보 및 플레이어 목록 로딩
    const fetchRoomDetails = async () => {
      try {
        const response = await api.get<{ data: any }>(`/api/room/${room.roomId}`);
        const fetchedRoom = response.data.data; // API 응답 구조에 따라 조정
        setGameStatus(fetchedRoom.gameStatus); // 게임 상태 업데이트
        // 플레이어 목록 초기화 (API 응답에 플레이어 정보가 포함되어 있다고 가정)
        // TODO: 백엔드 API 응답에 플레이어 목록이 포함되어 있지 않다면 별도 API 호출 필요
        // 현재는 room.players가 없으므로 임시로 빈 배열로 초기화
        setPlayers(fetchedRoom.players || []);
      } catch (error) {
        console.error('방 정보 불러오기 실패:', error);
        // 에러 처리 (예: 로비로 돌아가기)
        router.push('/lobby');
      }
    };
    fetchRoomDetails();
    // WebSocket 연결
    connectGameSocket(room.roomId, {
      onConnect: (frame) => {
        console.log('Game WebSocket Connected:', frame);
      },
      onError: (error) => {
        console.error('Game WebSocket Error:', error);
      },
      onMessage: (msg) => {
        // 게임 관련 메시지 처리 (예: 플레이어 목록 업데이트, 게임 상태 변경 등)
        console.log('Game WebSocket Message:', msg);
        // 플레이어 목록 업데이트
        if (msg.type === 'PLAYER_UPDATE') {
          setPlayers(msg.players);
        }
        // 게임 상태 업데이트
        else if (msg.type === 'GAME_STATUS_UPDATE') {
          setGameStatus(msg.status);
        }
        // 채팅 메시지 (방 채팅)
        else if (msg.messageType === 'TALK' || msg.messageType === 'ENTER' || msg.messageType === 'LEAVE') {
          setChatMessages((prev) => [...prev, msg]);
        }
      },
      onGameStartCountdown: (response) => {
        console.log('Game Start Countdown:', response);
        setGameStatus('COUNTDOWN'); // 게임 상태를 COUNTDOWN으로 변경
        // TODO: 카운트다운 UI 표시 로직 추가
      },
      onRoundStart: (response) => {
        console.log('Round Start:', response);
        setGameStatus('IN_PROGRESS'); // 게임 상태를 IN_PROGRESS로 변경
        // TODO: RandomSongGame 컴포넌트에 라운드 정보 전달
      },
      onAnswerCorrect: (response) => {
        console.log('Answer Correct:', response);
        // TODO: 정답 모달 표시 로직 추가
      },
      onGameEnd: (response) => {
        console.log('Game End:', response);
        setGameStatus('ENDED'); // 게임 상태를 ENDED로 변경
        // TODO: 게임 종료 결과 표시 로직 추가
      },
    });
    return () => {
      disconnectGameSocket();
    };
  }, [room.roomId, router]);
  const handleSendMessage = (message: string) => {
    console.log('[상위 컴포넌트] 보내는 메시지:', message);
    if (message.trim()) {
      sendGameMessage(room.roomId, user.id, user.nickname, message.trim());
    }
  };
  const handleReadyToggle = () => {
    setIsReady(!isReady);
    // TODO: 백엔드에 준비 상태 전송 (WebSocket 또는 HTTP)
  };

  const handleLeaveRoom = async () => {
    // TODO: 백엔드에 방 나가기 요청 (HTTP)
    
    //router.push('/lobby');

    try {
      await api.delete(`/api/room/${room.roomId}/leave`);
      router.push('/lobby');
    } catch (error) {
      alert('방 나가기에 실패했습니다.');
      router.push('/lobby');
    }

  };
  const isHost = user.id === room.hostId; // 방장 여부 확인
  const allPlayersReady = players.filter(p => !p.isHost).every(p => p.isReady); // 방장 제외 모든 플레이어 준비 완료
  // 최대 인원이 1명인 방에서 방장 혼자 있으면 true
  const canStartGame = (room.maxPlayer === 1 && players.length === 1 && isHost) || allPlayersReady;
  const handleGameStart = () => {
    if (!room || !room.roomType) return;
    let path = "";
    switch (room.roomType) {
      case "RANDOM_SONG":
        path = `/room/${room.roomId}/randomsonggame`;
        break;
      case "KEY_SING_YOU":
        path = `/room/${room.roomId}/keysingyou`;
        break;
      case "PLAIN_SONG":
        path = `/room/${room.roomId}/FlatLyricsGame`;
        break;
      default:
        alert("알 수 없는 게임 타입입니다.");
        return;
    }
    router.push(path);
  };
  // 게임 상태에 따른 조건부 렌더링
  if (gameStatus === 'IN_PROGRESS') {
    return <RandomSongGame user={user} room={room} players={players} onBack={handleLeaveRoom} onGameEnd={() => {}} />;
  }
  return (
    <div className="min-h-[100vh] h-[800px] p-4 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <div className="max-w-screen-xl mx-auto space-y-4 h-full">
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-pink-700">{room.roomName}</CardTitle>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-4 gap-4 h-[calc(100%-100px)]">
          <div className="col-span-3 h-full flex flex-col gap-4">
            <Card className="bg-white/90 backdrop-blur-sm flex-1">
              <CardContent>
                <PlayerSlots roomId={room.roomId} maxPlayer={room.maxPlayer} />
              </CardContent>
            </Card>
            <Card className="bg-white/90 backdrop-blur-sm flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="text-pink-700">채팅</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ChatBox user={user} messages={chatMessages} onSend={handleSendMessage} autoScrollToBottom={true} chatType="room" />
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col h-full">
            <Card className="bg-white/90 backdrop-blur-sm flex flex-col justify-between h-full">
              <div>
                <CardHeader>
                  <CardTitle className="text-pink-700">방 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 flex-1">
                  <div>
                    <span className="font-medium">게임 모드:</span>{' '}
                    <Badge className={getGameModeColor(room.roomType)}>{getGameModeLabel(room.roomType)}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">방장:</span>{' '}
                    <span>{room.hostName}</span>
                  </div>
                  <div>
                    <span className="font-medium">인원:</span>{' '}
                    <span>{players.length} / {room.maxPlayer}</span>
                  </div>
                </CardContent>
              </div>
              <div className="flex flex-col gap-2 p-4">
                {isHost ? (
                  <Button
                    disabled={!canStartGame}
                    className="bg-green-600 hover:bg-green-700 text-white w-full h-[50px] text-lg"
                    onClick={handleGameStart}
                  >
                    <Play className="w-4 h-4 mr-2" /> 게임 시작
                  </Button>
                ) : (
                  <Button
                    onClick={handleReadyToggle}
                    className={`w-full h-[50px] text-lg ${isReady ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'}`}
                  >
                    {isReady ? <><CheckCircle className="w-4 h-4 mr-2" /> 준비 완료</> : <><Circle className="w-4 h-4 mr-2" /> 준비하기</>}
                  </Button>
                )}
                <Button className="w-full h-[50px] bg-red-500 hover:bg-red-600 text-white text-lg" onClick={handleLeaveRoom}>
                  <LogOut className="w-4 h-4 mr-2" /> 나가기
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
export default GameRoom;