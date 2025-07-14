'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Play,
  Users,
  Brain,
  Music,
} from 'lucide-react';
import { connectGameSocket, disconnectGameSocket, sendGameMessage, sendKeywordConfirm } from '@/lib/gameSocket';
import ChatBox, { ChatMessage } from '@/components/chat/ChatBox';
import { ApiResponse, User, Room } from '@/types/api';
import KeywordSelector from '@/components/KeywordSelector';
import { PREDEFINED_TAGS } from '@/lib/tags';
import KeywordDisplay from '@/components/KeywordDisplay';

export default function AISongGamePage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 채팅 메시지가 업데이트될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get<ApiResponse<User>>('/api/user/me');
        setUser(userRes.data.data);

        const roomRes = await api.get<ApiResponse<Room>>(`/api/room/${params.roomId}`);
        setRoom(roomRes.data.data);
        setPlayers(roomRes.data.data.players);
      } catch (err) {
        setError("게임 데이터를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.roomId]);

  useEffect(() => {
    const audio = new Audio('/audio/entersound.wav');
    audio.play();
  }, []);

  // 플레이어 목록만 2초마다 새로고침
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const roomRes = await api.get<ApiResponse<Room>>(`/api/room/${params.roomId}`);
        setPlayers(roomRes.data.data.players);
      } catch (err) {
        // 무시
      }
    };
    const interval = setInterval(fetchPlayers, 2000);
    return () => clearInterval(interval);
  }, [params.roomId]);

  useEffect(() => {
    if (!room?.roomId) return;

    const callbacks = {
      onConnect: (frame: any) => {
        console.log("AI Song Game WebSocket Connected:", frame);
      },
      onError: (error: any) => {
        console.error("AI Song Game WebSocket Error:", error);
      },
      onMessage: (msg: any) => {
        console.log('AI Song Game WebSocket Message:', msg);
        if (msg.messageType === 'TALK' || msg.messageType === 'ENTER' || msg.messageType === 'LEAVE') {
          setChatMessages((prev) => [...prev, {
            id: Date.now(),
            type: msg.messageType,
            roomId: room.roomId.toString(),
            senderId: msg.senderId,
            senderName: msg.senderName,
            message: msg.message,
            timestamp: new Date().toISOString(),
            playerId: msg.senderId,
            playerName: msg.senderName,
            time: new Date().toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }]);
        }
      },
      onGameStartCountdown: (response: any) => {
        console.log("AI Song Game Start Countdown:", response);
        // 게임 시작 카운트다운 시 FlatLyricsGame으로 이동
        router.push(`/room/${room.roomId}/aisonggame/FlatLyricsGame`);
      },
      onRoundStart: (response: any) => {
        console.log("AI Song Game Round Start:", response);
      },
      onAnswerCorrect: (response: any) => {
        console.log("AI Song Game Answer Correct:", response);
      },
      onRoundFailed: (data: any) => {
        console.log("AI Song Game Round Failed:", data);
      },
      onGameEnd: (response: any) => {
        console.log("AI Song Game End:", response);
      },
    };

    connectGameSocket(room.roomId, callbacks, room.roomType);

    return () => {
      disconnectGameSocket();
    };
  }, [room?.roomId, room?.roomType, router]);

  const handleStartGame = async () => {
    console.log("AI 노래 맞추기 게임 시작...");
    console.log("현재 room:", room);
    console.log("현재 user:", user);
    
    if (!room?.roomId) {
      console.error("room.roomId가 없습니다!");
      return;
    }

    const keywordNames = selectedTagIds
      .map((id) => PREDEFINED_TAGS.find((tag) => tag.id === id)?.name)
      .filter((name): name is string => !!name);

    console.log("변환된 키워드 이름들:", keywordNames);
    
    try {
      console.log(`/api/ai-game/${room.roomId}/start API 호출 시작`);

      const response = await api.post(`/api/ai-game/${room.roomId}/start`, {
        keywords: keywordNames,
      });
      console.log("API 응답:", response);
      console.log("AI 노래 맞추기 게임 시작 API 호출 성공.");
      setGameStarted(true);
    } catch (error: any) {
      console.error("AI 노래 맞추기 게임 시작 실패:", error);
      console.error("에러 상세:", error.response?.data || error.message);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !room?.roomId) return;

    try {
      // 웹소켓을 통해 메시지 전송
      sendGameMessage(room.roomId, user.id, user.nickname, message.trim(), true);
    } catch (error) {
      console.error("채팅 메시지 전송 실패:", error);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await api.delete(`/api/room/${room.roomId}/leave`);
      router.push('/lobby');
    } catch (error) {
      console.error("방 나가기 실패:", error);
      router.push('/lobby');
    }
  };

  const handleKeywordConfirm = () => {
    if (selectedTagIds.length === 0 || !room?.roomId) return;
    sendKeywordConfirm(room.roomId, selectedTagIds);
  };

  if (loading) return <div>게임 데이터를 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;
  if (!user || !room) return <div>필요한 게임 정보가 부족합니다.</div>;

  return (
    <div className="min-h-screen p-4 bg-red-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* 왼쪽 메인 컨텐츠 */}
          <div className="flex-1">
            <Card className="bg-white/90 backdrop-blur-sm rounded-2xl">
              <CardHeader className="text-center relative">
                <Button
                  variant="outline"
                  onClick={handleLeaveRoom}
                  className="absolute left-0 top-0 bg-white/90 backdrop-blur-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  뒤로가기
                </Button>
                <CardTitle className="text-3xl font-bold text-red-600 flex items-center justify-center gap-3">
                  🤖 AI 노래 맞추기
                </CardTitle>
                <CardDescription className="text-lg">
                  AI가 부른 노래를 듣고 제목을 맞춰보세요!
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 플레이어 목록 */}
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 6 }, (_, index) => {
                    const player = players[index];
                    return (
                      <motion.div
                        key={player ? player.id : `empty-${index}`}
                        className="text-center p-4 rounded-2xl bg-red-50 border border-red-200"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                      >
                        {player ? (
                          <>
                            <Avatar className="w-16 h-16 mx-auto mb-2">
                              <AvatarImage src={player.avatar} />
                              <AvatarFallback>{player.nickname[0]}</AvatarFallback>
                            </Avatar>
                            <h3 className="font-semibold">{player.nickname}</h3>
                            <Badge className="mt-1 bg-red-500">
                              점수: {player.score || 0}점
                            </Badge>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 rounded-full flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="font-semibold text-gray-400">빈 자리</h3>
                            <Badge className="mt-1 bg-gray-400">
                              대기 중
                            </Badge>
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* 게임 시작 버튼 */}
                <div className="text-center">
                  {user.id === room.hostId ? (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={handleStartGame}
                        disabled={gameStarted || selectedTagIds.length === 0}
                        size="lg"
                        className="bg-red-500 hover:bg-red-600 text-white font-bold text-xl px-12 py-6 rounded-2xl"
                      >
                        <Play className="w-6 h-6 mr-3" />
                        {gameStarted ? "게임 시작 중..." : "AI 노래 맞추기 시작!"}
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="text-lg text-gray-700 font-semibold py-8">게임 시작을 기다리는 중...</div>
                  )}
                  {selectedTagIds.length === 0 && !gameStarted && (
                    <p className="text-sm text-red-200 mt-2">
                      ⚠️ 키워드를 최소 1개 선택해주세요
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    버튼을 누르면 모든 참가자가 동시에 게임이 시작됩니다
                  </p>
                </div>
              </CardContent>
            </Card>

            {user.id === room.hostId ? (
              // 방장용 키워드 선택 UI
              <div className="w-full mt-6">
                <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl">
                  <CardContent className="space-y-4">
                    <KeywordSelector
                      tags={PREDEFINED_TAGS}
                      selected={selectedTagIds}
                      onChange={setSelectedTagIds}
                    />
                    <div className="mt-4">
                      <div className="text-center text-lg font-semibold text-gray-800 mb-2">
                         최대 3개
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={handleKeywordConfirm}
                          disabled={selectedTagIds.length === 0}
                          className="px-6 py-2 bg-red-600 text-white font-semibold rounded-2xl shadow-md hover:bg-red-700"
                        >
                          키워드 확정
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // 참여자용 키워드 미리보기
              <div className="w-full mt-6">
                <KeywordDisplay />
              </div>
            )}
          </div>

          {/* 오른쪽 채팅 영역 */}
          <div className="w-80 h-[820px] bg-white/90 backdrop-blur-sm rounded-lg p-4 flex flex-col">
            <div className="mb-3">
              <h3 className="text-red-600 text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                채팅
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto mb-3 scrollbar-hide" ref={chatContainerRef}>
              {chatMessages.map((msg) => (
                <div key={msg.id} className="mb-2">
                  <div className="text-sm text-gray-700">
                    <span className="text-xs text-gray-500 font-medium">
                      {msg.senderName}:
                    </span>{' '}
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    if (target.value.trim()) {
                      handleSendMessage(target.value);
                      target.value = '';
                    }
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input.value.trim()) {
                    handleSendMessage(input.value);
                    input.value = '';
                  }
                }}
                className="px-3 py-2 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}