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

const CreateRoom = () => {
  const router = useRouter();

  const [roomName, setRoomName] = useState('');
  const [gameMode, setGameMode] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('6');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  const gameModes = [
    { value: '키싱유', label: '키싱유', description: '키워드에 맞는 노래 부르기' },
    { value: '랜덤 노래 맞추기', label: '랜덤 노래 맞추기', description: '노래 듣고 제목 맞추기' },
    { value: '평어 노래 맞추기', label: '평어 노래 맞추기', description: '가사 듣고 노래 맞추기' },
    { value: '놀라운 토요일', label: '놀라운 토요일', description: '빈칸 가사 맞추기' }
  ];

  const handleCreateRoom = () => {
    if (!roomName.trim() || !gameMode) return;

    const newRoom = {
      id: Math.random().toString(36).substr(2, 9),
      name: roomName.trim(),
      gameMode,
      description: description.trim() || '게임을 즐겨보세요!',
      currentPlayers: 1,
      maxPlayers: parseInt(maxPlayers),
      isPrivate,
      password: isPrivate ? password : ''
    };

    // 여기서 전역 상태 저장 또는 API 호출 가능
    // 지금은 그냥 로비로 이동
    router.push('/lobby');
  };

  const selectedGameMode = gameModes.find(mode => mode.value === gameMode);

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                🎮 방 만들기
              </CardTitle>
              <CardDescription>
                새로운 게임방을 만들어 친구들과 함께 즐겨보세요
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 방 이름 */}
          <div className="space-y-2">
            <Label htmlFor="roomName">방 이름 *</Label>
            <Input
              id="roomName"
              placeholder="방 이름을 입력하세요"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={30}
            />
          </div>

          {/* 게임 모드 */}
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

          {/* 선택된 게임 모드 설명 */}
          {selectedGameMode && (
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
              <h4 className="font-semibold text-purple-700 mb-2">{selectedGameMode.label}</h4>
              <p className="text-sm text-purple-600">{selectedGameMode.description}</p>
            </div>
          )}

          {/* 방 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">방 설명</Label>
            <Textarea
              id="description"
              placeholder="방에 대한 간단한 설명을 입력하세요 (선택사항)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              rows={3}
            />
          </div>

          {/* 최대 인원 */}
          <div className="space-y-2">
            <Label htmlFor="maxPlayers">최대 인원</Label>
            <Select value={maxPlayers} onValueChange={setMaxPlayers}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}명
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 비공개 방 설정 */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label htmlFor="private-room" className="text-sm font-medium">
                비공개 방
              </Label>
              <p className="text-sm text-gray-500">
                비밀번호가 필요한 방으로 설정합니다
              </p>
            </div>
            <Switch
              id="private-room"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          {/* 비밀번호 */}
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

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => router.back()} className="flex-1">
              취소
            </Button>
            <Button 
              onClick={handleCreateRoom}
              disabled={!roomName.trim() || !gameMode || (isPrivate && !password.trim())}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              방 만들기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateRoom;
