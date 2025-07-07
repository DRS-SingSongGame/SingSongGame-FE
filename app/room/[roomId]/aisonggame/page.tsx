'use client';

import { useState, useEffect } from 'react';
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
import { connectGameSocket, disconnectGameSocket, sendGameMessage } from '@/lib/gameSocket';
import ChatBox, { ChatMessage } from '@/components/chat/ChatBox';
import { ApiResponse, User, Room } from '@/types/api';

export default function AISongGamePage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

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
    
    try {
      console.log(`/api/game-session/${room.roomId}/start API 호출 시작`);
      const response = await api.post(`/api/game-session/${room.roomId}/start`);
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
      
      // 로컬 채팅 메시지에 즉시 추가
      const newMessage: ChatMessage = {
        id: Date.now(),
        type: 'TALK' as const,
        roomId: room.roomId.toString(),
        senderId: user.id,
        senderName: user.nickname,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setChatMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error("채팅 메시지 전송 실패:", error);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await api.post(`/api/room/${room.roomId}/leave`);
      router.push('/lobby');
    } catch (error) {
      console.error("방 나가기 실패:", error);
      router.push('/lobby');
    }
  };

  if (loading) return <div>게임 데이터를 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;
  if (!user || !room) return <div>필요한 게임 정보가 부족합니다.</div>;

  return (
    <div className="min-h-screen p-4 bg-red-500 flex flex-col">
      <div className="max-w-4xl mx-auto flex-1">
        <Button
          variant="outline"
          onClick={handleLeaveRoom}
          className="mb-4 bg-white/90 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로가기
        </Button>

        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-red-600 flex items-center justify-center gap-3">
              🤖 AI 노래 맞추기
            </CardTitle>
            <CardDescription className="text-lg">
              AI가 부른 노래를 듣고 제목을 맞춰보세요!
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 플레이어 목록 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  className="text-center p-4 rounded-lg bg-red-50 border border-red-200"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <Avatar className="w-16 h-16 mx-auto mb-2">
                    <AvatarImage src={player.avatar} />
                    <AvatarFallback>{player.nickname[0]}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{player.nickname}</h3>
                  <Badge className="mt-1 bg-red-500">
                    점수: {player.score || 0}점
                  </Badge>
                </motion.div>
              ))}
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
                    disabled={gameStarted}
                    size="lg"
                    className="bg-red-500 hover:bg-red-600 text-white font-bold text-xl px-12 py-6"
                  >
                    <Play className="w-6 h-6 mr-3" />
                    {gameStarted ? "게임 시작 중..." : "AI 노래 맞추기 시작!"}
                  </Button>
                </motion.div>
              ) : (
                <div className="text-lg text-gray-700 font-semibold py-8">게임 시작을 기다리는 중...</div>
              )}
              <p className="text-sm text-gray-600 mt-2">
                버튼을 누르면 모든 참가자가 동시에 게임이 시작됩니다
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 채팅 영역 */}
      <div className="max-w-4xl mx-auto w-full mt-6">
        <Card className="bg-white/90 backdrop-blur-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <Users className="w-5 h-5" />
              방 채팅
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <ChatBox
              user={user}
              messages={chatMessages}
              onSend={handleSendMessage}
              autoScrollToBottom={true}
              chatType="room"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}