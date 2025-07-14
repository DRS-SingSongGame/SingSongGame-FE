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
import { useCreateRoom, CreateRoomResponse } from '@/hooks/useCreateRoom';
import { useJoinRoom } from '@/hooks/useJoinRoom';
import GlobalLoading from './ui/GlobalLoading';

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
  const [maxRounds, setMaxRounds] = useState(''); // 기본값을 ''로 변경


  const { mutate: createRoom, isLoading } = useCreateRoom();
  const { mutate: joinRoom, isLoading: isJoining } = useJoinRoom();

  const gameModes = [
    { value: '키싱유', label: '키싱유', description: '키워드에 맞는 노래 부르기' },
    { value: '랜덤 노래 맞추기', label: '랜덤 노래 맞추기', description: '노래 듣고 제목 맞추기' },
    { value: '평어 노래 맞추기', label: '평어 노래 맞추기', description: '가사 듣고 노래 맞추기' },

  ];

  const getGamePath = (roomId: string, roomType: string) => {
    switch (roomType) {
      case 'RANDOM_SONG': return `/room/${roomId}/randomsonggame`;
      case 'KEY_SING_YOU': return `/room/${roomId}/keysingyougame`;
      case 'PLAIN_SONG': return `/room/${roomId}/aisonggame`;
      default: return `/room/${roomId}`;
    }
  };

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
      maxRound: parseInt(maxRounds),
      hostId: 2, // TODO: 나중에 user.id로 교체
    };

    console.log('Creating room with payload:', newRoom);
    console.log('maxPlayers string:', maxPlayers, 'parsed maxPlayer:', parseInt(maxPlayers));

    createRoom(newRoom, {
      onSuccess: (response: any) => {
        // 방 생성 성공 시 바로 게임룸으로 이동
        console.log('방 생성 성공:', response);

        // 응답에서 roomId를 찾아서 이동 (다양한 응답 구조 대응)
        const roomId = response?.data?.roomId || response?.roomId || response?.data?.id || response?.id;
        const roomType = gameModeMap[gameMode];

        if (roomId) {
          // 방 생성 후 자동으로 방에 조인
          joinRoom(
            { roomId: Number(roomId), password: isPrivate ? password : undefined },
            {
              onSuccess: () => {
                console.log('방 조인 성공');
                const gamePath = getGamePath(roomId.toString(), roomType);
                if (gameModeMap[gameMode] == "KEY_SING_YOU") {
                  router.push(`/keysingyou_room/${roomId}`);
                } else {
                  router.push(gamePath);
                }
              },
              onError: (error) => {
                console.error('방 조인 실패:', error);
                alert('방 생성은 성공했지만 방 참여에 실패했습니다.');
                // 조인 실패해도 게임 페이지로 이동 (방장이므로 접근 가능할 것)
                const gamePath = getGamePath(roomId.toString(), roomType);
                if (gameModeMap[gameMode] == "KEY_SING_YOU") {
                  router.push(`/keysingyou_room/${roomId}`);
                } else {
                  router.push(gamePath);
                }
              }
            }
          );
        } else {
          // roomId가 없는 경우 임시로 생성된 방 정보로 이동
          const tempRoomId = Date.now(); // 임시 roomId 생성
          const gamePath = getGamePath(tempRoomId.toString(), roomType);
          if (gameModeMap[gameMode] == "KEY_SING_YOU") {
            router.push(`/keysingyou_room/${roomId}`);
          } else {
            router.push(gamePath);
          }
        }
      },
      onError: (error) => {
        alert('방 생성 실패');
        console.error(error);
      }
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
                    {mode.label}
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
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <SelectItem key={num} value={num.toString()}>{num}명</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxRounds">최대 라운드 수</Label>
            <Select value={maxRounds} onValueChange={setMaxRounds}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="라운드 수 선택" />
              </SelectTrigger>
              <SelectContent>
                {gameMode === '키싱유'
                  ? [1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>{num} 라운드</SelectItem>
                  ))
                  : [2, 5, 10, 20, 30, 50].map((num) => (
                    <SelectItem key={num} value={num.toString()}>{num} 라운드</SelectItem>
                  ))
                }
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
              disabled={!roomName.trim() || !gameMode || !maxRounds || (isPrivate && !password.trim()) || isLoading || isJoining}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              방 만들기
            </Button>
          </div>
        </CardContent>
      </Card>
      <GlobalLoading 
      isLoading={isLoading || isJoining} 
      message={isLoading ? "🏠 방을 생성하는 중..." : "🚪 방에 입장하는 중..."} 
      />
    </div>
  );
};

export default CreateRoom;