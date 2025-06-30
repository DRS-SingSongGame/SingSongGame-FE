'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crown, Play, CheckCircle, Circle, LogOut } from 'lucide-react';

interface GameRoomProps {
  user: any;
  room: any;
}

const GameRoom = ({ user, room }: GameRoomProps) => {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: '시스템', message: `${user.nickname}님이 입장하셨습니다.`, time: '10:35', isSystem: true }
  ]);

  const [players] = useState([
    {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      isHost: true,
      isReady: false
    },
    {
      id: '2',
      nickname: '음악왕',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=musicking',
      isHost: false,
      isReady: true
    },
    {
      id: '3',
      nickname: '노래좋아',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=songlover',
      isHost: false,
      isReady: true
    }
  ]);

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        user: user.nickname,
        message: chatMessage.trim(),
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        isSystem: false
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatMessage('');
    }
  };

  const handleReadyToggle = () => {
    setIsReady(!isReady);
  };

  const handleLeaveRoom = () => {
    router.push('/lobby');
  };

  const allPlayersReady = players.filter(p => !p.isHost).every(p => p.isReady);
  const currentUser = players.find(p => p.id === user.id);
  const isHost = currentUser?.isHost;

  const getGameModeColor = (mode: string) => {
    switch (mode) {
      case '키싱유': return 'bg-gradient-to-r from-pink-500 to-purple-500';
      case '랜덤 노래 맞추기': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case '평어 노래 맞추기': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case '놀라운 토요일': return 'bg-gradient-to-r from-orange-500 to-yellow-500';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="min-h-[100vh] h-[800px] p-4 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <div className="max-w-screen-xl mx-auto space-y-4 h-full">
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-pink-700">{room.name}</CardTitle>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-4 gap-4 h-[calc(100%-100px)]">
          <div className="col-span-3 h-full flex flex-col gap-4">
            <Card className="bg-white/90 backdrop-blur-sm flex-1">
              <CardContent className="grid grid-cols-2 gap-4 h-full pt-5">
                {[...players, ...Array.from({ length: 6 - players.length }).map((_, idx) => ({
                  id: `empty-${idx}`, nickname: '비어있음', avatar: '', isHost: false, isReady: false
                }))].slice(0, 6).map((player) => (
                  <div key={player.id} className="flex items-center gap-4 border p-4 rounded-lg bg-white/80 h-[110px]">
                    {player.avatar ? (
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={player.avatar} />
                        <AvatarFallback>{player.nickname[0]}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-base">빈</div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-purple-700 text-lg">{player.nickname}</h4>
                        {player.isHost && <Crown className="w-5 h-5 text-yellow-500" />}
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.nickname === '비어있음' ? '' : player.isHost ? '방장' : player.isReady ? '준비 완료' : '대기 중'}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="text-pink-700">채팅</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex gap-2 text-sm ${msg.isSystem ? 'text-gray-500 italic' : ''}`}>
                        <span className="font-semibold text-purple-700">{msg.user}:</span>
                        <span>{msg.message}</span>
                        <span className="text-xs text-gray-400 ml-auto">{msg.time}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2 pt-2 mt-2">
                  <Input
                    placeholder="메시지를 입력하세요..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">전송</Button>
                </div>
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
                    <Badge className={getGameModeColor(room.gameMode)}>{room.gameMode}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">설명:</span>{' '}
                    <span>{room.description || '설명이 없습니다.'}</span>
                  </div>
                  <div>
                    <span className="font-medium">인원:</span>{' '}
                    <span>{players.length} / {room.maxPlayers}</span>
                  </div>
                </CardContent>
              </div>

              <div className="flex flex-col gap-2 p-4">
                {isHost ? (
                  <Button
                    disabled={!allPlayersReady}
                    className="bg-green-600 hover:bg-green-700 text-white w-full h-[50px] text-lg"
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
