'use client';
import useRooms from '@/hooks/useRoom'; 
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, RefreshCw, Users, LogOut, Settings, Zap, Play } from 'lucide-react';
import { useJoinRoom } from '@/hooks/useJoinRoom';

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
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: '관리자', message: '뮤직 게임 로비에 오신 것을 환영합니다!', time: '10:30' },
    { id: 2, user: '음악왕', message: '누구 게임 하실 분~', time: '10:32' }
  ]);

  const { rooms, loading } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  if (loading) {
    return <div className="text-center mt-10">방 목록 불러오는 중...</div>;
  }

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getGameModeLabel(room.roomType).includes(searchTerm)
  );

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        user: user.nickname,
        message: chatMessage.trim(),
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatMessage('');
    }
  };

  const handleQuickMatch = () => {
    console.log('Quick match started');
  };

  return (
    <div className="min-h-screen py-4 px-4 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 overflow-hidden">
      <div className="max-w-screen-2xl mx-auto grid grid-cols-5 gap-4 h-[92vh]">
        <div className="col-span-3 space-y-4 relative">
          <Card className="bg-white/90 backdrop-blur-sm flex flex-col flex-grow">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-semibold">게임 방 검색</CardTitle>
              <div className="flex gap-2 mt-2">
                <Input placeholder="방 제목이나 게임 모드로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Button variant="outline" size="icon"><Search className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon"><RefreshCw className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {filteredRooms.map((room) => (
                  <Card key={room.id} className={`cursor-pointer ${selectedRoom?.id === room.id ? 'border-pink-500 border-2' : ''}`} onClick={() => setSelectedRoom(room)}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-base">{room.name}</h3>
                        <div className="flex items-center gap-2">
                          {room.isPrivate && <Badge variant="secondary">🔒</Badge>}
                          <Badge className={getGameModeColor(room.roomType)}>{getGameModeLabel(room.roomType)}</Badge>
                        </div>
                      </div>
                      {/* <p className="text-sm text-gray-600">{room.description}</p> */}
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        {/* <Users className="w-4 h-4" /> {room.currentPlayers}/{room.maxPlayers} */}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm h-[300px]">
            <CardHeader><CardTitle className="text-lg"> 로비 채팅</CardTitle></CardHeader>
            <CardContent className="space-y-2 pb-1 h-full flex flex-col justify-between">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-2 text-sm">
                      <span className="font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">{msg.user}:</span>
                      <span>{msg.message}</span>
                      <span className="text-gray-400 text-xs ml-auto">{msg.time}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2 pt-1">
                <Input placeholder="메시지를 입력하세요..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} />
                <Button onClick={handleSendMessage} className="bg-gradient-to-r from-pink-500 to-purple-500">전송</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-4 relative">
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader><CardTitle className="text-lg"> 내 정보</CardTitle></CardHeader>
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

          <Card className="bg-white/90 backdrop-blur-sm flex flex-col h-[400px] justify-between">
            <CardHeader><CardTitle className="text-lg"> 방 정보</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {selectedRoom ? (
                <>
                  <p><strong>방 이름:</strong> {selectedRoom.name}</p>
                  <p><strong>게임 종류:</strong> {getGameModeLabel(selectedRoom.roomType)}</p>
                  {/* <p><strong>게임 설명:</strong> {selectedRoom.description}</p> */}
                </>
              ) : (
                <p className="text-sm text-gray-600">방을 선택하면 상세 정보가 표시됩니다.</p>
              )}
              <div className="mt-auto pt-4">
                <Button onClick={onCreateRoom} className="w-full text-lg py-6 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:from-pink-600 hover:via-purple-600 hover:to-blue-600">방 만들기</Button>
                <Button
                  disabled={!selectedRoom || joining}
                  onClick={() => {
                    joinRoom(
                      {
                        roomId: selectedRoom.id,
                        password: selectedRoom.isPrivate ? prompt('비밀번호를 입력하세요') ?? undefined : undefined
                      },
                      {
                        onSuccess: () => { onJoinRoom(selectedRoom); },
                        onError: (error) => {
                          alert('방 참여 실패');
                          console.error(error);
                        }
                      }
                    );
                  }}
                  className="w-full text-lg py-6 bg-gradient-to-r from-green-400 to-green-600 text-white mt-2 disabled:opacity-50"
                >
                  {joining ? '참여 중...' : '참여하기'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="absolute bottom-0 right-0 w-full">
            <Card className="bg-gradient-to-r from-purple-500/90 via-pink-500/90 to-orange-500/90 backdrop-blur-sm border-0 text-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-300" /> ⚡ 빠른 대전
                </CardTitle>
                <CardDescription className="text-purple-100">즉시 매칭으로 빠르게 게임을 시작하세요!</CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" onClick={handleQuickMatch} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg">
                  <Play className="w-5 h-5 mr-2" /> 빠른 대전 시작
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
