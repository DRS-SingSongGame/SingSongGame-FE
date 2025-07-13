'use client';

import useRooms from '@/hooks/useRoom';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, RefreshCw, LogOut, Settings, Zap, Play, ArrowLeft, VolumeX, Volume2 } from 'lucide-react';
import { useJoinRoom } from '@/hooks/useJoinRoom';
import ChatBox from '@/components/chat/ChatBox';
import { connectLobbySocket, disconnectLobbySocket, sendLobbyMessage } from '@/lib/lobbySocket';
import SettingsModal from "./SettingsModal";
import BGMPlayer from "./BGMPlayer";
import api from '@/lib/api';
import { OnlineUser } from '@/types/online';
import ErrorModal from "@/components/ErrorModal";


export interface ChatMessage {
  id: number;
  type: 'TALK' | 'ENTER' | 'LEAVE';
  roomId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  time: string;
}

interface GameLobbyProps {
  user: any;
  onCreateRoom: () => void;
  onJoinRoom: (room: any) => void;
  onLogout: () => void;
}

const getGameModeColor = (mode: string) => {
  switch (mode) {
    case 'KEY_SING_YOU': return 'bg-gradient-to-r from-pink-500 to-rose-500';
    case 'RANDOM_SONG': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    case 'PLAIN_SONG': return 'bg-gradient-to-r from-green-500 to-emerald-500';
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

const getGamePath = (roomId: string, roomType: string) => {
  switch (roomType) {
    case 'RANDOM_SONG': return `/room/${roomId}/randomsonggame`;
    case 'KEY_SING_YOU': return `/room/${roomId}/keysingyougame`;
    case 'PLAIN_SONG': return `/room/${roomId}/aisonggame`;
    default: return `/room/${roomId}`;
  }
};

const playButtonSound = () => {
  const audio = new Audio('/audio/buttonclick.wav');
  audio.volume = 0.7;
  audio.play();
};

// RoomPlayerCount 컴포넌트 및 관련 코드 제거

const GameLobby = ({ user, onCreateRoom, onJoinRoom, onLogout }: GameLobbyProps) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const router = useRouter();
  const { mutate: joinRoom, isLoading: joining } = useJoinRoom();
  const [searchTerm, setSearchTerm] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    id: 1,
    type: 'ENTER',
    roomId: 'lobby',
    senderId: 'system',
    senderName: '관리자',
    message: '싱송겜 게임 로비에 오신 것을 환영합니다!',
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState({
    standardFilter: true,
    bgmVolume: 50,
    effectVolume: 50,
    bgmType: "acoustic",
    autoReady: false,
    shakeEffect: true,
  });
  const [isBgmPlaying, setIsBgmPlaying] = useState(true);
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState({ open: false, message: "" });


  const handleBgmPlay = () => setIsBgmPlaying(true);
  const handleBgmPause = () => setIsBgmPlaying(false);

  useEffect(() => {
    connectLobbySocket(user.id, user.nickname, (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    }, (users: any[]) => {
      setOnlineUsers(users);
    });
    return () => {
      disconnectLobbySocket(user.id);
    };
  }, [user.id, user.nickname]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSendMessage = (message: string) => {
    sendLobbyMessage(user.id, user.nickname, message);
  };

  const { rooms, loading, refetch } = useRooms();

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  const filteredRooms = rooms?.filter((room) =>
    room.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getGameModeLabel(room.roomType).includes(searchTerm)
  ) || [];

  const handleQuickMatch = () => console.log('Quick match started');

  const handleRoomClick = (room: any) => {
    joinRoom(
      {
        roomId: room.roomId,
        password: room.isPrivate ? prompt("비밀번호를 입력하세요") ?? undefined : undefined,
      },
      {
        onSuccess: () => {
          const gamePath = getGamePath(room.roomId, room.roomType);
          if (room.roomType === "KEY_SING_YOU") {
            router.push(`/keysingyou_room/${room.roomId}`);
          } else {
            router.push(gamePath);
          }
        },
        onError: (error) => {
          const axiosError = error as any;
          const msg =
            axiosError.response?.data?.body?.message ||  // ✅ 정답
            "방 참여에 실패했습니다.";

          setError({ open: true, message: msg });
        },
      }
    );
  };

  const handleSettingsSave = (newSettings: any) => {
    setSettings(newSettings);
    setIsSettingsModalOpen(false);
  };

  // 로비 진입 시 BGM 자동 재생
  useEffect(() => {
    // 컴포넌트가 마운트되면 즉시 BGM 재생
    const timer = setTimeout(() => {
      setIsBgmPlaying(true);
    }, 100); // 약간의 지연을 두어 컴포넌트가 완전히 마운트된 후 재생

    return () => clearTimeout(timer);
  }, []); // 빈 의존성 배열로 컴포넌트 마운트 시 한 번만 실행

  return (
    <div className="py-4 px-4 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 h-full min-h-0">
      <BGMPlayer bgmVolume={settings.bgmVolume} isPlaying={isBgmPlaying} setIsPlaying={setIsBgmPlaying} />

      <div className="max-w-screen-2xl mx-auto grid grid-cols-12 gap-x-6 h-full min-h-0">
        <div className="col-span-9 h-full min-h-0 flex flex-col">
          <Card className="bg-white/80 backdrop-blur-sm flex-1 min-h-0 h-full w-full p-0 text-xl flex flex-col justify-between">
            <CardHeader className="pb-1 w-full max-w-full">
              <div className="flex gap-3 mt-0 px-0 pt-2 w-full max-w-full min-h-[100px]">
                <Input placeholder="방 제목이나 게임 모드로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="text-xl py-6 px-8 w-full max-w-full" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  className="glow-hover bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 text-white font-bold shadow-xl border-2 border-blue-300 text-xl px-8 py-6 w-full max-w-[48px]"
                >
                  <RefreshCw className="w-6 h-6" />
                </Button>
                <Button
                  size="sm"
                  onClick={onCreateRoom}
                  className="glow-hover bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 text-white font-bold shadow-xl border-2 border-blue-300 text-xl px-10 py-6 w-full max-w-[180px]"
                >
                  방 만들기
                </Button>
                <Button
                  size="sm"
                  onClick={handleQuickMatch}
                  className="glow-hover bg-gradient-to-br from-red-500 via-red-400 to-red-300 text-white font-bold shadow-xl border-2 border-red-300 text-xl px-10 py-6 w-full max-w-[180px]"
                >
                  빠른 대전
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0 w-full max-w-full flex-1 min-h-0">
              <ScrollArea className="h-full w-full max-w-full flex-1 min-h-0">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-3 max-h-[600px] overflow-y-auto">
                  {filteredRooms.map((room) => (
                    <Card
                      key={room.roomId}
                      className={`relative flex rounded-xl border-4 overflow-hidden px-4 py-3 min-h-[100px] w-[96%] text-base mb-2 shadow-lg transition-shadow 
    ${room.gameStatus === "IN_PROGRESS" ? "pointer-events-none opacity-60 bg-neutral-900 border-gray-700" : "cursor-pointer glow-hover bg-cyan-100 border-blue-400"}`}
                      onClick={() => {
                        if (room.gameStatus !== "IN_PROGRESS") {
                          playButtonSound();
                          handleRoomClick(room);
                        }
                      }}
                    >
                      {/* 워터마크 */}
                      <span
                        className={`absolute right-2 bottom-2 text-[80px] font-extrabold select-none pointer-events-none
    ${room.gameStatus === "IN_PROGRESS" ? "text-white/20" : "text-gray-300/40"}`}
                        style={{
                          transform: "rotate(-25deg)",
                          lineHeight: 1,
                          userSelect: "none",
                          zIndex: 1,
                          letterSpacing: "2px"
                        }}
                      >
                        {room.gameStatus === "IN_PROGRESS" ? "Play" : "Wait"}
                      </span>
                      {/* 방 번호/노란점 */}
                      <div className="flex flex-col items-center justify-center mr-4 z-10 min-w-[40px]">
                        <span className="text-3xl font-extrabold text-gray-800">{room.roomId}</span>
                        <span className="w-2 h-2 rounded-full bg-yellow-300 mt-1"></span>
                      </div>
                      {/* 방 정보 */}
                      <div className="flex-1 z-10">
                        <div className="flex justify-between items-center">
                          <span
                            className={`font-bold text-lg ${room.gameStatus === "IN_PROGRESS" ? "text-black" : "text-gray-900"} truncate`}
                            style={{ maxWidth: '40%' }}
                          >
                            {room.roomName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700 text-sm">{room.players.length} / {room.maxPlayer}</span>
                            {room.isPrivate && <span className="inline-block"><svg width="20" height="20" fill="currentColor" className="text-black"><path d="M10 2a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4zm-2 4a2 2 0 1 1 4 0v2H8V6zm-3 4h10v6H5v-6z" /></svg></span>}
                          </div>
                        </div>
                        <div className={`text-sm ${room.gameStatus === "IN_PROGRESS" ? "text-black" : "text-gray-700"}`}>{room.roomType}</div>
                        <div className={`text-xs ${room.gameStatus === "IN_PROGRESS" ? "text-black" : "text-gray-500"}`}>방장: {room.hostName}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            {/* 카드 내부 하단 채팅창 */}
            <div className="w-full px-6 pb-6 pt-2">
              <div className="bg-transparent rounded-lg p-0 w-full flex flex-col">
                <div className="lobby-chat-messages mb-2 space-y-1 h-[60px] overflow-y-auto">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="flex items-center text-xs">
                      <span className="font-semibold text-purple-600 mr-1">
                        {(msg.type === 'ENTER' || msg.type === 'LEAVE') ? '시스템' : msg.senderName}:
                      </span>
                      <span className="ml-1 flex-1">{msg.message}</span>
                      <span className="text-gray-400 text-xs ml-2">{msg.time}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex flex-row gap-2">
                  <Input
                    placeholder="메시지를 입력하세요..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isComposing) {
                        e.preventDefault();
                        if (input.trim()) {
                          setInput('');
                          handleSendMessage(input.trim());
                        }
                      }
                    }}
                    className="flex-1 text-base px-4 py-3 rounded-lg border border-blue-200 shadow-none bg-white/80"
                  />
                  <Button
                    onClick={() => {
                      if (input.trim()) {
                        setInput('');
                        handleSendMessage(input.trim());
                      }
                    }}
                    className="glow-hover bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 text-white font-bold shadow-xl border-2 border-blue-300 text-lg px-8 py-2 rounded-lg"
                  >
                    전송
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
        <div className="col-span-3 flex flex-col gap-0 items-stretch mt-0 pt-0 h-full min-h-0">
          <Card className="bg-white/90 backdrop-blur-sm w-full mb-0 mt-0 pt-0 pb-0">
            <CardHeader className="border-b p-0 pb-0 mt-0 mb-0 pl-6">
              <CardTitle className="text-2xl font-bold">내 정보</CardTitle>
              <div className="flex items-center gap-4 mt-4">
                <Avatar className="w-16 h-16 ring-4 ring-pink-500">
                  {user.profileImage ? (
                    <AvatarImage src={user.profileImage} alt="프로필 이미지" />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                      {user.nickname?.[0] || "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg truncate">{user.nickname}</h3>
                  <p className="text-gray-600 text-sm truncate">레벨 1 • 새내기 🎵</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="glow-hover bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 text-white font-bold shadow-xl border-2 border-blue-300"
                >
                  <Settings className="w-4 h-4 mr-2" /> 설정
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="glow-hover bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 text-white font-bold shadow-xl border-2 border-blue-300"
                >
                  <LogOut className="w-4 h-4 mr-2" /> 로그아웃
                </Button>
              </div>
            </CardHeader>
          </Card>
          <div className="mt-4" />
          <Card className="bg-white/90 backdrop-blur-sm w-full h-[740px] flex flex-col p-0">
            <div className="p-6 flex-1 flex flex-col">
              <div className="text-xl font-bold mb-2">로비 유저</div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {onlineUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200 shadow-sm hover:bg-purple-50 cursor-pointer"
                  >
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={u.imageUrl} />
                      <AvatarFallback>{u.username[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-xs text-gray-800">{u.username}</span>
                    <span className="text-xs text-green-500 ml-auto">
                      {u.location === "ROOM" ? "게임 중" : "로비"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 음악 컨트롤 버튼 */}
      <div className="fixed bottom-4 right-4 z-40">
        {isBgmPlaying ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBgmPause}
            className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100 opacity-30 hover:opacity-100 text-xs px-2 py-1 h-6 shadow-lg"
          >
            <VolumeX className="w-3 h-3 mr-1" /> 끄기
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBgmPlay}
            className="bg-green-50 border-green-200 text-green-600 hover:bg-green-100 opacity-30 hover:opacity-100 text-xs px-2 py-1 h-6 shadow-lg"
          >
            <Volume2 className="w-3 h-3 mr-1" /> 켜기
          </Button>
        )}
      </div>

      {/* 설정 모달 */}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onSave={handleSettingsSave}
          isPlaying={isBgmPlaying}
          onPlay={handleBgmPlay}
          onPause={handleBgmPause}
        />
      )}

      {error.open && (
        <ErrorModal
          open={error.open}
          message={error.message}
          onClose={() => setError({ open: false, message: "" })}
        />
      )}
    </div>
  );

}


export default GameLobby;
