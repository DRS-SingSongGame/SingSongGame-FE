"use client";

import useRooms from "@/hooks/useRoom";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  RefreshCw,
  LogOut,
  Settings,
  VolumeX,
  Volume2,
  HelpCircle,
} from "lucide-react";
import { useJoinRoom } from "@/hooks/useJoinRoom";
import {
  connectLobbySocket,
  disconnectLobbySocket,
  sendLobbyMessage,
} from "@/lib/lobbySocket";
import SettingsModal from "./SettingsModal";
import BGMPlayer from "./BGMPlayer";
import { OnlineUser } from "@/types/online";
import QuickMatchPopup from "./QuickMatchPopup";
import { MatchedRoom } from "@/types/quickmatch";
import { useCreateRoom } from "@/hooks/useCreateRoom";
import { Room } from "@/types/api";
import QuickMatchResultModal from "@/components/ui/quickMatchResultModal";

import api from "@/lib/api";
import ErrorModal from "@/components/ErrorModal";

export interface ChatMessage {
  id: number;
  type: "TALK" | "ENTER" | "LEAVE";
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

type QuickMatchResult = {
  oldMmr: number;
  newMmr: number;
  oldTier: string;
  newTier: string;
  tierStatus: "UP" | "DOWN" | "SAME";
  roomId: string;
};

const getGameModeLabel = (mode: string) => {
  switch (mode) {
    case "KEY_SING_YOU":
      return "키싱유";
    case "RANDOM_SONG":
      return "랜덤 노래 맞추기";
    case "PLAIN_SONG":
      return "평어 노래 맞추기";
    case "QUICK_MATCH":
      return "빠른 대전"
    default:
      return "알 수 없음";
  }
};

const getGamePath = (roomId: string, roomType: string) => {
  switch (roomType) {
    case "RANDOM_SONG":
      return `/room/${roomId}/randomsonggame`;
    case "KEY_SING_YOU":
      return `/keysingyou_room/${roomId}`;
    case "PLAIN_SONG":
      return `/room/${roomId}/aisonggame`;
    default:
      return `/room/${roomId}`;
  }
};

const playButtonSound = () => {
  const audio = new Audio("/audio/buttonclick.wav");
  audio.volume = 0.7;
  audio.play();
};

const GameLobby = ({ user, onCreateRoom, onLogout }: GameLobbyProps) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const router = useRouter();
  const { mutate: joinRoom } = useJoinRoom();
  const { mutate: createRoomForQuickMatch } = useCreateRoom();
  const [searchTerm, setSearchTerm] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: "ENTER",
      roomId: "lobby",
      senderId: "system",
      senderName: "관리자",
      message: "싱송겜 게임 로비에 오신 것을 환영합니다!",
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isQuickMatchOpen, setIsQuickMatchOpen] = useState(false);
  const [settings, setSettings] = useState({
    standardFilter: true,
    bgmVolume: 50,
    effectVolume: 50,
    bgmType: "acoustic",
    autoReady: false,
    shakeEffect: true,
  });
  const [isBgmPlaying, setIsBgmPlaying] = useState(true);
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState({ open: false, message: "" });
  const [showQuickMatchInfo, setShowQuickMatchInfo] = useState(false);

  const handleBgmPlay = () => setIsBgmPlaying(true);
  const handleBgmPause = () => setIsBgmPlaying(false);

  const [myQuickMatchResult, setMyQuickMatchResult] = useState<QuickMatchResult | null>(null);
  const [tier, setTier] = useState<string>("");
  const { rooms, refetch } = useRooms();
  
  useEffect(() => {
    connectLobbySocket(
      user.id,
      user.nickname,
      (msg: any) => {
        if (msg.type === "MATCH_FOUND") {
          const data = msg.data as MatchedRoom;
          handleMatchFound(data);
        } else {
          if (msg.type === "ENTER") {
            if (msg.senderId === String(user.id)) {
              if (msg.tier) {
                setTier(msg.tier);
              }
            }
          }
          setChatMessages((prev) => [...prev, msg]);
        }
      },
      (users: any[]) => {
        setOnlineUsers(users);
      },
      (deletedRoomId: number) => {
        console.log('🗑️ 방이 삭제되었습니다:', deletedRoomId);
        // 지연을 두고 한 번만 refetch
        setTimeout(() => {
          refetch();
        }, 100);
        
      }
    );

    return () => {
      disconnectLobbySocket(user.id);
    };
  }, [user.id, user.nickname, refetch]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleSendMessage = (message: string) => {
    sendLobbyMessage(user.id, user.nickname, message);
  };

  

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  const filteredRooms =
    rooms?.filter(
      (room) =>
        room.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getGameModeLabel(room.roomType).includes(searchTerm)
    ) || [];

  const handleRoomClick = (room: any) => {
    joinRoom(
      {
        roomId: room.roomId,
        password: room.isPrivate
          ? prompt("비밀번호를 입력하세요") ?? undefined
          : undefined,
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
            axiosError.response?.data?.body?.message ||
            "방 참여에 실패했습니다.";
          setError({ open: true, message: msg });
        },
      }
    );
  };

  const handleMatchFound = (room: MatchedRoom) => {
    console.log("Match found:", room);
    setIsQuickMatchOpen(false);
    const gamePath = getGamePath(room.roomId, room.roomType);
    router.push(gamePath);
  };

  const handleSettingsSave = (newSettings: any) => {
    setSettings(newSettings);
    setIsSettingsModalOpen(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBgmPlaying(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const result = localStorage.getItem("quickMatchResult");
    console.log("빠대 결과", result);

    if (result && user?.id) {
      try {
        const parsed = JSON.parse(result);
        console.log("✅ 빠대 파싱된 결과:", parsed);

        if (Array.isArray(parsed.players)) {
          const myResult = parsed.players.find((p: any) => p.userId === user.id);
          if (myResult) {
            setMyQuickMatchResult({ ...myResult, roomId: parsed.roomId });
          }
        } else {
          console.warn("❗ players가 배열이 아님:", parsed.players);
        }
      } catch (e) {
        console.error("빠른대전 결과 파싱 실패:", e);
      }
      localStorage.removeItem("quickMatchResult");
    }
  }, [user?.id]);

  // 티어명-이미지 매핑
  const tierImageMap: Record<string, string> = {
    '새내기': '/rank/t1.png',
    '훈련생': '/rank/t2.png',
    '모험가': '/rank/t3.png',
    '도전자': '/rank/t4.png',
    '에이스': '/rank/t5.png',
    '전설': '/rank/t6.png',
  };
  const tierImg = tierImageMap[tier] || '';

  return (
    <div className="py-2 md:py-4 px-2 md:px-4 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 h-full min-h-0">
      <BGMPlayer bgmVolume={settings.bgmVolume} isPlaying={isBgmPlaying} setIsPlaying={setIsBgmPlaying} />

      {/* 📱 모바일: 내 정보를 맨 위로 (lg에서는 숨김) */}
      <div className="block lg:hidden mb-4">
        <Card className="bg-white/90 backdrop-blur-sm w-full">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center gap-2 group">
                  {/* 티어 이미지 툴팁 */}
                  {tierImg && (
                    <img
                      src={tierImg}
                      alt={tier}
                      className="absolute top-1/2 left-[-60px] -translate-y-1/2 w-16 h-16 object-contain opacity-0 group-hover:opacity-100 transition pointer-events-none z-50"
                      style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.2))" }}
                    />
                  )}
                  <Avatar className="w-12 h-12 ring-2 ring-pink-500">
                    {user.profileImage ? (
                      <AvatarImage src={user.profileImage} alt="프로필 이미지" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm">
                        {user.nickname?.[0] || "?"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-base">{user.nickname}</h3>
                    <div className="flex items-center gap-1">
                      <p className="text-gray-600 text-sm">{tier || "티어 없음"}</p>
                      {tierImg && (
                        <img src={tierImg} alt={tier} className="w-4 h-4 object-contain" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="bg-blue-500 text-white text-xs px-2 py-1"
                >
                  <Settings className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="bg-blue-500 text-white text-xs px-2 py-1"
                >
                  <LogOut className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-x-6 h-full min-h-0">
        
        {/* 메인 컨텐츠 영역 */}
        <div className="col-span-1 lg:col-span-9 h-full min-h-0 flex flex-col">
          <Card className="bg-white/80 backdrop-blur-sm flex-1 min-h-0 h-full w-full p-0 text-base lg:text-xl flex flex-col justify-between">
            
            {/* 검색 및 버튼 영역 */}
            <CardHeader className="pb-1 w-full max-w-full">
              {/* 모바일 레이아웃 */}
              <div className="flex flex-col gap-2 mt-0 px-0 pt-2 w-full max-w-full h-[120px] lg:hidden flex-shrink-0">
                <Input
                  placeholder="방 제목이나 게임 모드로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-base py-3 px-4 w-full"
                />
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetch()}
                    className="glow-hover bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 text-white font-bold shadow-xl border-2 border-blue-300 px-3 py-3 min-w-[44px]"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      playButtonSound();
                      onCreateRoom();
                    }}
                    className="glow-hover bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 text-white font-bold shadow-xl border-2 border-blue-300 text-sm px-3 py-3 flex-1"
                  >
                    방 만들기
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      playButtonSound();
                      setIsQuickMatchOpen(true);
                    }}
                    className="glow-hover bg-gradient-to-br from-red-500 via-red-400 to-red-300 text-white font-bold shadow-xl border-2 border-red-300 text-sm px-3 py-3 flex-1"
                  >
                    빠른 대전
                  </Button>
                  <button
                    className="p-2 bg-transparent hover:bg-gray-100 rounded flex items-center justify-center min-w-[44px]"
                    onClick={() => setShowQuickMatchInfo(true)}
                    aria-label="빠른대전 설명 보기"
                  >
                    <HelpCircle className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>

              {/* 데스크톱 레이아웃 (기존 그대로) */}
              <div className="hidden lg:flex lg:gap-3 mt-0 px-0 pt-2 w-full max-w-full min-h-[100px]">
                <Input
                  placeholder="방 제목이나 게임 모드로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xl py-6 px-8 w-full max-w-full"
                />
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
                  onClick={() => {
                    playButtonSound();
                    onCreateRoom();
                  }}
                  className="glow-hover bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 text-white font-bold shadow-xl border-2 border-blue-300 text-xl px-10 py-6 w-full max-w-[180px]"
                >
                  방 만들기
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    playButtonSound();
                    setIsQuickMatchOpen(true);
                  }}
                  className="glow-hover bg-gradient-to-br from-red-500 via-red-400 to-red-300 text-white font-bold shadow-xl border-2 border-red-300 text-xl px-10 py-6 w-full max-w-[180px]"
                >
                  빠른 대전
                </Button>
                <button
                  className="ml-1 p-0 bg-transparent hover:bg-transparent flex items-center justify-center"
                  onClick={() => setShowQuickMatchInfo(true)}
                  aria-label="빠른대전 설명 보기"
                  style={{ height: '32px', width: '32px' }}
                >
                  <HelpCircle className="w-6 h-6 text-red-500" />
                </button>
              </div>
            </CardHeader>

            {/* 방 목록 영역 */}
            <CardContent className="px-0 pb-0 w-full max-w-full flex-1 min-h-0 overflow-hidden flex flex-col">
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  backgroundImage: 'url("/singsonglogo.png")',
                  backgroundSize: '400px lg:800px',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.40,
                  zIndex: 1
                }}
              />
                <ScrollArea className="flex-1 w-full max-w-full z-10">
                <div className="px-2 lg:px-6 py-2 overflow-y-auto h-[400px]">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 max-w-5xl mx-auto content-start">
                      {filteredRooms.length === 0 ? (
                        // 방이 없을 때만 중앙 정렬
                        <div className="col-span-full flex flex-col items-center justify-center py-8 min-h-[300px]">
                          <div className="text-3xl mb-3">🎵</div>
                          <p className="text-gray-500 text-sm font-medium text-center">
                            현재 참여 가능한 방이 없습니다
                          </p>
                          <p className="text-gray-400 text-xs mt-1 text-center">
                            새로운 방을 만들어보세요!
                          </p>
                        </div>
                      ) : (
                        // 방이 있을 때는 위쪽부터 정렬
                        filteredRooms.map((room) => (
                          <Card
                            key={room.roomId}
                            className={`relative flex rounded-xl border-2 lg:border-4 overflow-hidden px-3 lg:px-4 py-2 lg:py-3 min-h-[80px] lg:min-h-[100px] w-full max-w-sm lg:max-w-md text-sm lg:text-base shadow-lg transition-shadow 
                              ${room.gameStatus === "IN_PROGRESS" ? "pointer-events-none opacity-60 bg-neutral-900 border-gray-700" : "cursor-pointer glow-hover bg-cyan-100 border-blue-400"}`}
                            onClick={() => {
                              if (room.gameStatus !== "IN_PROGRESS") {
                                playButtonSound();
                                handleRoomClick(room);
                              }
                            }}
                          >
                            <span
                              className={`absolute right-1 lg:right-2 bottom-1 lg:bottom-2 text-[40px] lg:text-[80px] font-extrabold select-none pointer-events-none
                                ${room.gameStatus === "IN_PROGRESS" ? "text-white/20" : "text-gray-300/40"}`}
                              style={{
                                transform: "rotate(-25deg)",
                                lineHeight: 1,
                                userSelect: "none",
                                zIndex: 1,
                                letterSpacing: "1px lg:2px"
                              }}
                            >
                              {room.gameStatus === "IN_PROGRESS" ? "Play" : "Wait"}
                            </span>
                            <div className="flex flex-col items-center justify-center mr-3 lg:mr-4 z-10 min-w-[30px] lg:min-w-[40px]">
                              <span className="text-xl lg:text-3xl font-extrabold text-gray-800">{room.roomId}</span>
                              <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-yellow-300 mt-1"></span>
                            </div>
                            <div className="flex-1 z-10">
                              <div className="flex justify-between items-center">
                                <span
                                  className={`font-bold text-sm lg:text-lg ${room.gameStatus === "IN_PROGRESS" ? "text-black" : "text-gray-900"} truncate`}
                                  style={{ maxWidth: '40%' }}
                                >
                                  {room.roomName}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-700 text-xs lg:text-sm">{room.players.length} / {room.maxPlayer}</span>
                                  {room.isPrivate && (
                                    <span className="inline-block">
                                      <svg width="16" height="16" className="lg:w-5 lg:h-5 text-black" fill="currentColor">
                                        <path d="M10 2a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4zm-2 4a2 2 0 1 1 4 0v2H8V6zm-3 4h10v6H5v-6z" />
                                      </svg>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className={`text-xs lg:text-sm ${room.gameStatus === "IN_PROGRESS" ? "text-black" : "text-gray-700"}`}>
                                {getGameModeLabel(room.roomType)}
                              </div>
                              <div className="flex justify-between items-center">
                                <div className={`text-xs ${room.gameStatus === "IN_PROGRESS" ? "text-black" : "text-gray-500"}`}>
                                  방장: {room.hostName}
                                </div>
                                <div className={`text-xs ${room.gameStatus === "IN_PROGRESS" ? "text-black" : "text-gray-500"}`}>
                                  {room.maxRound || 3}라운드
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>

            {/* 채팅 영역 */}
            <div className="w-full px-3 lg:px-6 pb-3 lg:pb-6 pt-2">
              <div className="bg-transparent rounded-lg p-0 w-full flex flex-col">
                <div className="lobby-chat-messages mb-2 space-y-1 h-[100px] lg:h-[60px] overflow-y-auto">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="flex items-center text-xs">
                      <span className="font-semibold text-purple-600 mr-1">
                        {msg.type === "ENTER" || msg.type === "LEAVE" ? "시스템" : msg.senderName}:
                      </span>
                      <span className="ml-1 flex-1 truncate">{msg.message}</span>
                      <span className="text-gray-400 text-xs ml-2 hidden sm:inline lg:inline">
                        {msg.time}
                      </span>
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
                      if (e.key === "Enter" && !isComposing) {
                        e.preventDefault();
                        if (input.trim()) {
                          setInput("");
                          handleSendMessage(input.trim());
                        }
                      }
                    }}
                    className="flex-1 text-sm lg:text-base px-3 lg:px-4 py-2 lg:py-3 rounded-lg border border-blue-200 shadow-none bg-white/80"
                  />
                  <Button
                    onClick={() => {
                      if (input.trim()) {
                        setInput("");
                        handleSendMessage(input.trim());
                      }
                    }}
                    className="glow-hover bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 text-white font-bold shadow-xl border-2 border-blue-300 text-sm lg:text-lg px-4 lg:px-8 py-2 rounded-lg"
                  >
                    전송
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 사이드바 (데스크톱에서만 표시) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-0 items-stretch mt-0 pt-0 h-full min-h-0">
          <Card className="bg-white/90 backdrop-blur-sm w-full mb-0 mt-0 pt-0 pb-0 h-28">
            <CardHeader className="border-b p-0 pb-0 mt-0 mb-0 pl-6 h-full flex justify-center items-center py-4">
              <CardTitle className="text-2xl font-bold"></CardTitle>
              <div className="flex items-center gap-4 mt-4 justify-start">
                <div className="relative flex items-center gap-2 p-3 rounded-xl bg-white/80 shadow-md hover:bg-blue-50 transition group min-w-[180px] max-w-[320px] ml-[-30px]">
                  {tierImg && (
                    <img
                      src={tierImg}
                      alt={tier}
                      className="absolute top-1/2 left-[-90px] -translate-y-1/2 w-20 h-20 object-contain opacity-0 group-hover:opacity-100 transition pointer-events-none"
                      style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.2))", zIndex: 9999 }}
                    />
                  )}
                  <Avatar className="w-16 h-16 ring-4 ring-pink-500">
                    {user.profileImage ? (
                      <AvatarImage src={user.profileImage} alt="프로필 이미지" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                        {user.nickname?.[0] || "?"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex flex-col">
                    <h3 className="font-semibold text-lg truncate">{user.nickname}</h3>
                    <span className="text-xs text-gray-500 font-semibold mt-1 flex items-center gap-1">
                      {tier || "티어 없음"}
                      {tierImg && (
                        <img src={tierImg} alt={tier} className="w-5 h-5 object-contain inline-block align-middle" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-2">
                  <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="p-1 rounded-full hover:bg-blue-100 transition"
                    aria-label="설정 열기"
                  >
                    <Settings className="w-5 h-5 text-blue-500" />
                  </button>
                  <button
                    onClick={onLogout}
                    className="p-1 rounded-full hover:bg-blue-100 transition"
                    aria-label="로그아웃"
                  >
                    <LogOut className="w-5 h-5 text-blue-500" />
                  </button>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <div className="mt-4" />
          <Card className="bg-white/90 backdrop-blur-sm w-full h-[740px] flex flex-col p-0">
            <div className="p-6 flex-1 flex flex-col">
              <div className="text-xl font-bold mb-2">유저</div>
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
                    <span className="font-medium text-xs text-gray-800">
                      {u.username}
                    </span>
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
      <div className="fixed bottom-2 lg:bottom-4 right-2 lg:right-4 z-40">
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

      <QuickMatchPopup
        user={user}
        isOpen={isQuickMatchOpen}
        onClose={() => setIsQuickMatchOpen(false)}
        onMatchFound={handleMatchFound}
      />

      {myQuickMatchResult && (
        <QuickMatchResultModal
          result={myQuickMatchResult}
          onClose={() => {
            setMyQuickMatchResult(null);
            api
              .delete(`/api/room/${myQuickMatchResult.roomId}/leave`)
              .then(() => {
                router.push("/lobby");
              })
              .catch((err) => console.error("퇴장 실패:", err));
          }}
        />
      )}
      
      {error.open && (
        <ErrorModal
          open={error.open}
          message={error.message}
          onClose={() => setError({ open: false, message: "" })}
        />
      )}

      {/* 빠른대전 설명 모달 */}
      {showQuickMatchInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-xl shadow-2xl p-6 lg:p-8 max-w-sm lg:max-w-md w-full mx-4 text-center">
            <h4 className="font-semibold text-blue-800 mb-3 text-lg">
              랜덤 노래 맞추기
            </h4>
            <p className="text-sm lg:text-base text-blue-600">
              • 6명의 플레이어가 함께 참여<br />
              • 랜덤한 노래를 듣고 제목 맞추기<br />
              • 가장 빨리 정답을 맞힌 사람이 점수 획득
            </p>
            <Button
              onClick={() => setShowQuickMatchInfo(false)}
              className="mt-6 w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              닫기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLobby;