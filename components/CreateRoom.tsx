'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft } from 'lucide-react';
import { useCreateRoom } from '@/hooks/useCreateRoom';
import api from '@/lib/api';

interface CreateRoomProps {
    onBack: () => void;
    onRoomCreated: (room: any) => void;
  }

const CreateRoom = ({ onBack, onRoomCreated }: CreateRoomProps) => {
  const router = useRouter();

  const [roomName, setRoomName] = useState('');
  const [gameMode, setGameMode] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('6');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  const { mutate: createRoom, isLoading } = useCreateRoom();

  const gameModes = [
    { value: '키싱유', label: '키싱유', description: '키워드에 맞는 노래 부르기' },
    { value: '랜덤 노래 맞추기', label: '랜덤 노래 맞추기', description: '노래 듣고 제목 맞추기' },
    { value: '평어 노래 맞추기', label: '평어 노래 맞추기', description: '가사 듣고 노래 맞추기' },
    
  ];

  const handleCreateRoom = () => {
    if (!roomName.trim() || !gameMode || (isPrivate && !password.trim())) return;
  
    const gameModeMap: Record<string, 'KEY_SING_YOU' | 'RANDOM_SONG' | 'PLAIN_SONG'> = {
      '키싱유': 'KEY_SING_YOU',
      '랜덤 노래 맞추기': 'RANDOM_SONG',
      '평어 노래 맞추기': 'PLAIN_SONG',
    };
  
    const newRoom = {
      name: roomName.trim(),
      roomType: gameModeMap[gameMode],
      isPrivate,
      roomPassword: isPrivate ? Number(password) : 0,
      maxPlayer: parseInt(maxPlayers),
      hostId: 2, // TODO: 나중에 user.id로 교체
    };
  
    console.log('Creating room with payload:', newRoom);
    console.log('maxPlayers string:', maxPlayers, 'parsed maxPlayer:', parseInt(maxPlayers));

    createRoom(newRoom, {
      onSuccess: async (data: any) => {
        console.log("✅ 서버 응답:", data);
        const roomId = data?.data?.id;
    
        if (!roomId) {
          console.error("❌ roomId 없음! 응답 확인 필요:", data);
          return;
        }
    
        const user = JSON.parse(localStorage.getItem('user') || '{}');
    
        try {
          await api.post(`/api/room/join/${roomId}`, {
            id: user.id,
            nickname: user.nickname,
            avatar: user.avatar || user.profileImage,
          });
          console.log("✅ 유저 방 참가 완료");
        } catch (err) {
          console.error("❌ 유저 방 참가 실패", err);
          return;
        }
    
        const fullRoom = {
          ...newRoom,
          roomId,
        };
    
        onRoomCreated(fullRoom);
      },
    });
  };
  const selectedGameMode = gameModes.find(mode => mode.value === gameMode);

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                 방 만들기
              </CardTitle>
              <CardDescription>
                새로운 게임방을 만들어 친구들과 함께 즐겨보세요
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="roomName">방 이름 *</Label>
            <Input id="roomName" placeholder="방 이름을 입력하세요" value={roomName} onChange={(e) => setRoomName(e.target.value)} maxLength={30} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gameMode">게임 모드 *</Label>
            <Select value={gameMode} onValueChange={setGameMode}>
              <SelectTrigger>
                <SelectValue placeholder="게임 모드를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {gameModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div>
                      <div className="font-semibold">{mode.label}</div>
                      <div className="text-sm text-gray-500">{mode.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedGameMode && (
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
              <h4 className="font-semibold text-purple-700 mb-2">{selectedGameMode.label}</h4>
              <p className="text-sm text-purple-600">{selectedGameMode.description}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="maxPlayers">최대 인원</Label>
            <Select value={maxPlayers} onValueChange={setMaxPlayers}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6].map((num) => (
                  <SelectItem key={num} value={num.toString()}>{num}명</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label htmlFor="private-room" className="text-sm font-medium">비공개 방</Label>
              <p className="text-sm text-gray-500">비밀번호가 필요한 방으로 설정합니다</p>
            </div>
            <Switch id="private-room" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {isPrivate && (
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="방 비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={20}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack} className="flex-1">취소</Button>
            <Button 
              onClick={handleCreateRoom}
              disabled={!roomName.trim() || !gameMode || (isPrivate && !password.trim()) || isLoading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isLoading ? '생성 중...' : '방 만들기'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateRoom;