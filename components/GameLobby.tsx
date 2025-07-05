'use client';

import useRooms from '@/hooks/useRoom'; 
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Search, RefreshCw, LogOut, Settings, Zap, Play, X } from 'lucide-react';
import { useJoinRoom } from '@/hooks/useJoinRoom';
import ChatBox from '@/components/chat/ChatBox';
import { connectLobbySocket, disconnectLobbySocket, sendLobbyMessage } from '@/lib/lobbySocket';

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

const GameLobby = ({ user, onCreateRoom, onJoinRoom, onLogout }: GameLobbyProps) => {
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

  useEffect(() => {
    connectLobbySocket(user.id, user.nickname, (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });
    return () => {
      disconnectLobbySocket(user.id);
    };
  }, [user.id, user.nickname]);

  const handleSendMessage = (message: string) => {
    sendLobbyMessage(user.id, user.nickname, message);
  };

  const { rooms, loading, refetch } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  return (
    <div className="min-h-screen py-4 px-4 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 overflow-y-auto">
      <div className="max-w-screen-2xl mx-auto grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-3">
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-xl font-semibold">게임 방 검색</CardTitle>
              <div className="flex gap-2 mt-2">
                <Input placeholder="방 제목이나 게임 모드로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Button variant="outline" size="icon"><Search className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
                <Button size="sm" onClick={onCreateRoom} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">방 만들기</Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[430px]">
                {loading ? (
                  <div className="text-center text-sm text-gray-500">방 목록 불러오는 중...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredRooms.map((room) => (
                      <Dialog key={room.roomId} open={selectedRoom?.roomId === room.roomId && isDialogOpen} onOpenChange={(open) => { setSelectedRoom(open ? room : null); setIsDialogOpen(open); }}>
                        <DialogTrigger asChild>
                          <Card className="cursor-pointer h-[130px]">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-base truncate whitespace-nowrap overflow-hidden max-w-[50%]">{room.roomName}</h3>
                                <div className="flex items-center gap-2">
                                  {room.isPrivate && <Badge variant="secondary">🔒</Badge>}
                                  <Badge className={getGameModeColor(room.roomType)}>{getGameModeLabel(room.roomType)}</Badge>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-sm text-gray-500 mb-1">
                                <span>{1} / {room.maxPlayer}</span>
                                <span>방장: {room.hostName}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>방 정보</DialogTitle>
                            <DialogClose asChild>
                              <Button variant="ghost" className="absolute right-2 top-2"><X className="w-4 h-4" /></Button>
                            </DialogClose>
                          </DialogHeader>
                          <div className="flex flex-col gap-2">
                            <p><strong>방 이름:</strong> {room.roomName}</p>
                            <p><strong>게임 종류:</strong> {getGameModeLabel(room.roomType)}</p>
                            <Button
                              disabled={joining}
                              onClick={() => {
                                joinRoom(
                                  {
                                    roomId: room.roomId,
                                    password: room.isPrivate ? prompt('비밀번호를 입력하세요') ?? undefined : undefined
                                  },
                                  {
                                    onSuccess: () => { onJoinRoom(room); },
                                    onError: (error) => {
                                      alert('방 참여 실패');
                                      console.error(error);
                                    }
                                  }
                                );
                              }}
                              className="w-full text-lg py-2 bg-gradient-to-r from-green-400 to-green-600 text-white mt-2 disabled:opacity-50"
                            >
                              {joining ? '참여 중...' : '참여하기'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-white/90 backdrop-blur-sm h-[240px]">
            <CardHeader><CardTitle className="text-lg">내 정보</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16 ring-4 ring-pink-500">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">{user.nickname[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{user.nickname}</h3>
                  <p className="text-gray-600 text-sm">레벨 1 • 새내기 🎵</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1"><Settings className="w-4 h-4 mr-2" /> 설정</Button>
                <Button variant="outline" size="sm" onClick={onLogout}><LogOut className="w-4 h-4 mr-2" /> 로그아웃</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between bg-gradient-to-r from-purple-500/90 via-pink-500/90 to-orange-500/90 backdrop-blur-sm border-0 text-white h-[300px]">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-300" /> ⚡ 빠른 대전
              </CardTitle>
              <CardDescription className="text-purple-100">즉시 매칭으로 빠르게 게임을 시작하세요!</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <Button
                size="lg"
                onClick={handleQuickMatch}
                className="w-full h-20 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xl"
              >
                <Play className="w-5 h-5 mr-2" /> 빠른 대전 시작
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <ChatBox user={user} messages={chatMessages} onSend={handleSendMessage} autoScrollToBottom={true} chatType="lobby" />
      </div>
    </div>
  );
};

export default GameLobby;
