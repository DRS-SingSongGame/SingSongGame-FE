// components/game/WaitingRoom.tsx
import { Button } from "@/components/ui/Button";
import KeywordSelector from "@/components/KeywordSelector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Play, Users } from "lucide-react";
import { PREDEFINED_TAGS } from "@/lib/tags";
import KeywordDisplay from "@/components/KeywordDisplay";
import ChatBox, { ChatMessage } from "@/components/chat/ChatBox";

interface WaitingRoomProps {
  user: any;
  room: any;
  players: any[];
  selectedTagIds: number[];
  isKeywordConfirmed: boolean;
  chatMessages: ChatMessage[];
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onKeywordConfirm: () => void;
  onTagSelectionChange: (newSelectedIds: number[]) => void;
  onSendMessage: (message: string) => void;
}

export const WaitingRoom = ({
  user,
  room,
  players,
  selectedTagIds,
  isKeywordConfirmed,
  chatMessages,
  onLeaveRoom,
  onStartGame,
  onKeywordConfirm,
  onTagSelectionChange,
  onSendMessage
}: WaitingRoomProps) => {
  const isQuickMatch = room?.roomType === "QUICK_MATCH";
  const isHost = user.id === room.hostId;

  return (
    <div className="min-h-screen p-2 md:p-4 bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          
          {/* 메인 컨텐츠 */}
          <div className="flex-1">
            <Card className="bg-white/90 backdrop-blur-sm rounded-2xl">
              <CardHeader className="text-center relative p-4 lg:p-6">
                {/* 빠른대전이 아닐 때만 뒤로가기 버튼 표시 */}
                {!isQuickMatch && (
                  <Button
                    variant="outline"
                    onClick={onLeaveRoom}
                    className="absolute left-2 lg:left-0 top-2 lg:top-0 bg-white/90 backdrop-blur-sm text-sm lg:text-base px-2 lg:px-4 py-1 lg:py-2"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    뒤로가기
                  </Button>
                )}

                <CardTitle className="text-xl lg:text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mt-8 lg:mt-0">
                  🎵 랜덤 노래 맞추기
                </CardTitle>
                <CardDescription className="text-base lg:text-lg">
                  노래를 듣고 제목을 가장 빨리 맞춰보세요!
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6">
                {/* 플레이어 목록 */}
                <PlayerGrid players={players} />

                {/* 게임 시작 영역 */}
                <GameStartSection 
                  isQuickMatch={isQuickMatch}
                  isHost={isHost}
                  isKeywordConfirmed={isKeywordConfirmed}
                  selectedTagIds={selectedTagIds}
                  onStartGame={onStartGame}
                />

                {/* 키워드 선택 UI */}
                <KeywordSection
                  isHost={isHost}
                  isQuickMatch={isQuickMatch}
                  selectedTagIds={selectedTagIds}
                  isKeywordConfirmed={isKeywordConfirmed}
                  onTagSelectionChange={onTagSelectionChange}
                  onKeywordConfirm={onKeywordConfirm}
                />
              </CardContent>
            </Card>
          </div>

          {/* 데스크톱 채팅 영역 */}
          {!isQuickMatch && (
            <div className="hidden lg:flex w-80 h-[817px] bg-white/90 backdrop-blur-sm rounded-lg p-4 flex-col">
              <div className="mb-3">
                <h3 className="text-purple-600 text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  대기실 채팅
                </h3>
              </div>
              <div className="flex-1">
                <ChatBox
                  user={user}
                  messages={chatMessages}
                  onSend={onSendMessage}
                  autoScrollToBottom={true}
                  chatType="simple"
                  compact={false}
                />
              </div>
            </div>
          )}
        </div>

        {/* 모바일 채팅 영역 */}
        {!isQuickMatch && (
          <div className="block lg:hidden mt-4">
            <Card className="bg-white/90 backdrop-blur-sm rounded-xl">
              <CardHeader className="pb-2">
                <h3 className="text-purple-600 text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  채팅
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[200px]">
                  <ChatBox
                    user={user}
                    messages={chatMessages}
                    onSend={onSendMessage}
                    autoScrollToBottom={true}
                    chatType="room"
                    compact={true}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// 플레이어 그리드 서브컴포넌트
const PlayerGrid = ({ players }: { players: any[] }) => (
  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
    {Array.from({ length: 6 }, (_, index) => {
      const player = players[index];
      return (
        <div
          key={player ? player.id : `empty-${index}`}
          className="text-center p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-blue-50 border border-blue-200"
        >
          {player ? (
            <>
              <Avatar className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-2">
                <AvatarImage src={player.avatar} />
                <AvatarFallback className="text-xs lg:text-base">
                  {player.nickname[0]}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-sm lg:text-base truncate">
                {player.nickname}
              </h3>
              <Badge className="mt-1 bg-blue-500 text-xs">준비 완료</Badge>
            </>
          ) : (
            <>
              <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-2 bg-gray-200 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-400 text-sm lg:text-base">빈 자리</h3>
              <Badge className="mt-1 bg-gray-400 text-xs">대기 중</Badge>
            </>
          )}
        </div>
      );
    })}
  </div>
);

// 게임 시작 섹션 서브컴포넌트
const GameStartSection = ({ 
  isQuickMatch, 
  isHost, 
  isKeywordConfirmed, 
  selectedTagIds, 
  onStartGame 
}: {
  isQuickMatch: boolean;
  isHost: boolean;
  isKeywordConfirmed: boolean;
  selectedTagIds: number[];
  onStartGame: () => void;
}) => {
  if (isQuickMatch) {
    return (
      <div className="text-center py-6 lg:py-8">
        <p className="text-base lg:text-lg font-semibold text-gray-700">
          ⏳ 곧 빠른대전이 시작됩니다...
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      {isHost ? (
        <>
          {isKeywordConfirmed && selectedTagIds.length > 0 ? (
            <Button
              onClick={onStartGame}
              size="lg"
              className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 text-white font-bold text-base lg:text-xl px-6 lg:px-12 py-4 lg:py-6 w-full lg:w-auto"
            >
              <Play className="w-4 h-4 lg:w-6 lg:h-6 mr-2 lg:mr-3" />
              랜덤 노래 맞추기 시작!
            </Button>
          ) : (
            <div className="py-6 lg:py-8">
              <div className="bg-gray-100 text-gray-500 px-6 lg:px-12 py-4 lg:py-6 rounded-xl lg:rounded-2xl text-base lg:text-xl font-bold cursor-not-allowed">
                <Play className="w-4 h-4 lg:w-6 lg:h-6 mr-2 lg:mr-3 inline" />
                랜덤 노래 맞추기 시작!
              </div>
              <div className="mt-3 text-yellow-600 font-semibold text-sm lg:text-base">
                ⚠️ 키워드를 선택하고 확정해주세요
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-base lg:text-lg font-semibold text-gray-700 py-6 lg:py-8">
          ⏳ 방장이 게임을 시작할 때까지 기다려주세요...
        </p>
      )}
    </div>
  );
};

// 키워드 섹션 서브컴포넌트
const KeywordSection = ({
  isHost,
  isQuickMatch,
  selectedTagIds,
  isKeywordConfirmed,
  onTagSelectionChange,
  onKeywordConfirm
}: {
  isHost: boolean;
  isQuickMatch: boolean;
  selectedTagIds: number[];
  isKeywordConfirmed: boolean;
  onTagSelectionChange: (newSelectedIds: number[]) => void;
  onKeywordConfirm: () => void;
}) => {
  if (isQuickMatch) return null;

  return (
    <>
      {isHost ? (
        <div className="w-full mt-4 lg:mt-6">
          <Card className="bg-white/90 backdrop-blur-sm p-3 lg:p-4 rounded-xl lg:rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base lg:text-lg font-semibold text-gray-800">
                🎯 키워드 최대 3개를 선택하세요
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
              <KeywordSelector
                tags={PREDEFINED_TAGS}
                selected={selectedTagIds}
                onChange={(newSelectedIds) => {
                  onTagSelectionChange(newSelectedIds);
                }}
              />
              <div className="flex justify-end mt-3 lg:mt-4">
                <Button
                  onClick={onKeywordConfirm}
                  disabled={selectedTagIds.length === 0 || isKeywordConfirmed}
                  className={`px-4 lg:px-6 py-2 font-semibold rounded-full shadow-md text-sm lg:text-base ${
                    isKeywordConfirmed
                      ? "bg-green-600 text-white cursor-default"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  {isKeywordConfirmed ? "✅ 키워드 확정 완료" : "키워드 확정"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="w-full mt-4 lg:mt-6">
          <KeywordDisplay />
        </div>
      )}
    </>
  );
};