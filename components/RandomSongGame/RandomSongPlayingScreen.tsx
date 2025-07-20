// components/game/PlayingScreen.tsx
import { useRef } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { ArrowLeft, Play, Music, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ChatBox, { ChatMessage, ChatBoxRef } from "@/components/chat/ChatBox";
import { GameSessionType } from '@/hooks/useGameState';

interface PlayingScreenProps {
  user: any;
  gameSession: GameSessionType | null;
  roundTimer: number;
  players: any[];
  chatMessages: ChatMessage[];
  showRoundNotification: boolean;
  showHintAnimation: string | null;
  showReconnectSuccess: string | null;
  hasUserInteractedForAudio: boolean;
  onLeaveRoom: () => void;
  onSendMessage: (message: string) => void;
  onPlayAudio: () => void;
  onForceDisconnect?: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

export const PlayingScreen = ({
  user,
  gameSession,
  roundTimer,
  players,
  chatMessages,
  showRoundNotification,
  showHintAnimation,
  showReconnectSuccess,
  hasUserInteractedForAudio,
  onLeaveRoom,
  onSendMessage,
  onPlayAudio,
  onForceDisconnect,
  audioRef
}: PlayingScreenProps) => {
  const chatBoxRef = useRef<ChatBoxRef>(null);

  const getCurrentHints = () => {
    const serverStartTime = gameSession?.serverStartTime;
    if (!serverStartTime || !gameSession?.currentSong) {
      return [];
    }

    const elapsed = Date.now() - serverStartTime;
    const timeLeft = Math.max(0, 30 - Math.floor(elapsed / 1000));

    const hints = [];

    if (timeLeft <= 18) {
      hints.push(`🎤 가수: ${gameSession.currentSong.artist}`);
    }

    if (timeLeft <= 8) {
      hints.push(`💡 제목 힌트: ${gameSession.currentSong.hint}`);
    }

    return hints;
  };

  const playersWithScores = players
    .map((player) => ({
      ...player,
      score: gameSession?.playerScores?.[player.id] || 0,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen p-2 md:p-4 bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500">
      {/* 라운드 알림 */}
      <RoundNotification 
        show={showRoundNotification} 
        currentRound={gameSession?.currentRound} 
      />
      
      {/* 힌트 애니메이션 */}
      <HintAnimation hintText={showHintAnimation} />
      
      {/* 재연결 성공 애니메이션 */}
      <ReconnectSuccessAnimation message={showReconnectSuccess} />
      
      <div className="max-w-6xl mx-auto">
        {/* 뒤로가기 버튼 */}
        <Button
          variant="outline"
          onClick={onLeaveRoom}
          className="mb-2 lg:mb-4 bg-white/90 backdrop-blur-sm text-sm lg:text-base px-3 lg:px-4 py-1.5 lg:py-2"
        >
          <ArrowLeft className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
          나가기
        </Button>

        {/* 게임 헤더 */}
        <GameHeader 
          gameSession={gameSession}
          roundTimer={roundTimer}
          hints={getCurrentHints()}
        />

        {/* 메인 게임 영역 */}
        <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
          
          {/* 채팅 영역 */}
          <div className="lg:col-span-2 lg:order-2">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader className="p-3 lg:p-6">
                <CardTitle className="text-pink-700 text-sm lg:text-lg">게임 채팅</CardTitle>
              </CardHeader>
              <CardContent className="p-3 lg:p-6 pt-0">
                <div className="h-48 lg:h-80">
                  <ChatBox 
                    ref={chatBoxRef}
                    user={user} 
                    messages={chatMessages} 
                    onSend={onSendMessage} 
                    autoScrollToBottom={true} 
                    chatType="room"
                    className="h-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 점수판 */}
          <div className="lg:order-1">
            <ScoreBoard 
              players={playersWithScores}
              winner={gameSession?.winner}
            />
          </div>
        </div>

        {/* 오디오 재생 버튼 */}
        {!hasUserInteractedForAudio && (
          <AudioPlayButton onPlayAudio={onPlayAudio} />
        )}

        <audio ref={audioRef} />
      </div>
    </div>
  );
};

// 라운드 알림 서브컴포넌트
const RoundNotification = ({ show, currentRound }: { show: boolean; currentRound?: number }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className="text-xl lg:text-4xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 px-4 lg:px-8 py-2 lg:py-4 rounded-xl lg:rounded-2xl shadow-2xl"
      >
        Round {currentRound} 시작!
      </motion.div>
    </div>
  );
};

// 힌트 애니메이션 서브컴포넌트
const HintAnimation = ({ hintText }: { hintText: string | null }) => {
  if (!hintText) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <motion.div
        initial={{ 
          position: "fixed",
          top: "50%", 
          left: "50%", 
          x: "-50%", 
          y: "-50%",
          scale: 1.5,
          opacity: 1
        }}
        animate={{ 
          top: "140px",
          left: "50%",
          x: "-50%", 
          y: "0%",
          scale: 1,
          opacity: 0.8
        }}
        exit={{ opacity: 0 }}
        transition={{ 
          duration: 1.5, 
          ease: "easeInOut",
          times: [0, 0.7, 1],
          opacity: { duration: 2, times: [0, 0.7, 1] }
        }}
        className="text-sm lg:text-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 px-3 lg:px-6 py-1.5 lg:py-3 rounded-lg lg:rounded-xl shadow-2xl whitespace-nowrap"
      >
        {hintText}
      </motion.div>
    </div>
  );
};

// 게임 헤더 서브컴포넌트
const GameHeader = ({ 
  gameSession, 
  roundTimer, 
  hints 
}: { 
  gameSession: GameSessionType | null; 
  roundTimer: number;
  hints: string[];
}) => (
  <Card className="bg-white/90 backdrop-blur-sm mb-3 lg:mb-6">
    <CardHeader className="p-3 lg:p-6">
      <div className="flex flex-col gap-2 lg:gap-4 lg:flex-row lg:justify-between lg:items-center">
        
        {/* 라운드 정보 + 타이머 */}
        <div className="flex justify-between items-center lg:flex-col lg:items-start lg:justify-start lg:w-120 lg:min-w-[150px]">
          <div>
            <CardTitle className="text-base lg:text-xl font-bold">
              {gameSession?.currentRound === gameSession?.maxRound ? (
                <span className="text-red-500">🎉 마지막 라운드!</span>
              ) : (
                <span className="text-blue-600">
                  Round {gameSession?.currentRound || 1}
                </span>
              )}
            </CardTitle>
            <div className="text-xs text-gray-600 mt-1 lg:hidden">
              {gameSession?.currentRound || 0} / {gameSession?.maxRound || 0}
            </div>
          </div>
          
          {/* 타이머 */}
          <TimerCircle roundTimer={roundTimer} />
        </div>

        {/* 힌트 + LP판 영역 */}
        <div className="w-full lg:flex lg:items-center lg:justify-between lg:gap-8">
          {/* 힌트 영역 */}
          <HintsDisplay hints={hints} />
          
          {/* LP판 애니메이션 - 데스크톱에서만 표시 */}
          <LPRecord />
        </div>
      </div>
      
      {/* 진행률 바 - 데스크톱에서만 표시 */}
      <div className="mt-3 hidden lg:block">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">전체 라운드 진행률</span>
          <span className="text-sm font-bold text-gray-800">
            {gameSession?.currentRound || 0} / {gameSession?.maxRound || 0}
          </span>
        </div>
        <Progress
          value={
            gameSession?.maxRound
              ? (gameSession.currentRound / gameSession.maxRound) * 100
              : 0
          }
        />
      </div>
    </CardHeader>
  </Card>
);

// 타이머 원형 서브컴포넌트
const TimerCircle = ({ roundTimer }: { roundTimer: number }) => (
  <div className="flex flex-col items-center lg:items-start lg:mt-4">
    <div className="relative flex items-center justify-center">
      <svg className="w-12 h-12 lg:w-20 lg:h-20 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="40"
          stroke="rgb(229, 231, 235)"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx="50" cy="50" r="40"
          stroke={roundTimer <= 5 ? "rgb(239, 68, 68)" : roundTimer <= 10 ? "rgb(251, 191, 36)" : "rgb(59, 130, 246)"}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={`${2 * Math.PI * 40}`}
          strokeDashoffset={`${2 * Math.PI * 40 * (1 - roundTimer / 30)}`}
          className="transition-all duration-500"
        />
      </svg>
      <div className={`absolute text-lg lg:text-2xl font-bold ${
        roundTimer <= 5 ? 'text-red-500' : roundTimer <= 10 ? 'text-yellow-600' : 'text-blue-600'
      }`}>
        {roundTimer}
      </div>
    </div>
    <div className="flex items-center gap-1 text-gray-600 text-xs mt-1">
      <Music className="w-3 h-3 animate-pulse" />
      <span className="hidden lg:inline">노래 재생 중</span>
    </div>
  </div>
);

// 힌트 표시 서브컴포넌트
const HintsDisplay = ({ hints }: { hints: string[] }) => (
  <div className="flex-1">
    {hints.length === 0 ? (
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="flex">
          {['힌', '트', ' ', '준', '비', ' ', '중'].map((char, index) => (
            <span
              key={index}
              className="text-gray-600 text-lg inline-block animate-bounce"
              style={{
                animationDelay: `${index * 0.1}s`,
                animationDuration: '1s'
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
        <div className="flex gap-1 ml-2">
          {[0, 0.1, 0.2].map((delay, index) => (
            <div
              key={index}
              className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
              style={{ 
                animationDelay: `${delay}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
    ) : (
      <div className="flex items-center justify-center gap-2 flex-wrap py-2">
        {hints.map((hint, index) => (
          <motion.span
            key={hint}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="text-sm lg:text-lg font-semibold text-gray-700 bg-white/80 backdrop-blur-sm rounded-lg px-3 lg:px-4 py-2 lg:py-3 border border-gray-200"
          >
            {hint}
          </motion.span>
        ))}
      </div>
    )}
  </div>
);

// LP판 애니메이션 서브컴포넌트
const LPRecord = ({ onForceDisconnect }: { onForceDisconnect?: () => void }) => (
    <div className="hidden lg:flex items-center justify-center lg:w-28 relative">
      <div className="relative">
        <div 
          className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 via-gray-900 to-black shadow-2xl relative overflow-hidden animate-spin"
          style={{ 
            animationDuration: '3s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-red-500 shadow-inner"></div>
          </div>
          <div className="absolute inset-2 rounded-full border border-gray-600 opacity-30"></div>
          <div className="absolute inset-4 rounded-full border border-gray-600 opacity-20"></div>
          <div className="absolute inset-6 rounded-full border border-gray-600 opacity-10"></div>
          <div className="absolute top-2 left-1/2 w-1 h-4 bg-white opacity-50 transform -translate-x-1/2"></div>
        </div>
        
        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
          <div className="w-8 h-1 bg-gray-400 rounded-full shadow-sm transform rotate-12 origin-left"></div>
          <div className="w-2 h-2 bg-gray-600 rounded-full absolute -right-1 top-1/2 transform -translate-y-1/2"></div>
        </div>
        
        {/* 완전히 숨겨진 테스트 버튼 - LP판과 겹치게 위치 */}
        <button 
        onClick={(e) => {
          console.log("🎯 LP판 테스트 버튼 클릭됨!");
          e.preventDefault();
          e.stopPropagation();
          
          // onForceDisconnect가 있으면 호출, 없으면 직접 처리
          if (onForceDisconnect) {
            onForceDisconnect();
          } else {
            // 백업: 직접 disconnectGameSocket 호출
            try {
              import('@/lib/gameSocket').then(({ disconnectGameSocket }) => {
                disconnectGameSocket();
                console.log("✅ 백업 방법으로 연결 끊기 완료");
              });
            } catch (error) {
              console.error("❌ 백업 연결 끊기 실패:", error);
            }
          }
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        title=""
        aria-hidden="true"
      />
      </div>
    </div>
  );

// 점수판 서브컴포넌트
const ScoreBoard = ({ players, winner }: { players: any[]; winner?: string }) => (
  <Card className="bg-white/90 backdrop-blur-sm">
    <CardHeader className="p-3 lg:p-6">
      <CardTitle className="flex items-center gap-2 text-sm lg:text-lg">
        <Users className="w-4 h-4 lg:w-5 lg:h-5" />
        점수 현황
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 lg:p-6 pt-0">
      <div className="space-y-2">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg transition-all duration-500 ${
              player.nickname === winner
                ? "bg-gradient-to-r from-yellow-100 via-green-100 to-yellow-100 border-2 border-yellow-400 shadow-lg animate-pulse transform scale-105"
                : "bg-gray-50"
            }`}
          >
            <div className="text-xs lg:text-lg font-bold text-gray-500 w-6">
              #{index + 1}
            </div>
            <Avatar className="w-6 h-6 lg:w-8 lg:h-8">
              <AvatarImage src={player.avatar} />
              <AvatarFallback className="text-xs">{player.nickname[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm lg:text-base truncate">{player.nickname}</div>
            </div>
            <div className="text-right">
              <div className="text-lg lg:text-2xl font-bold text-blue-600">
                {player.score}
              </div>
              <div className="text-xs text-gray-500">점</div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// 오디오 재생 버튼 서브컴포넌트
const AudioPlayButton = ({ onPlayAudio }: { onPlayAudio: () => void }) => (
  <div className="text-center mt-3 lg:mt-4">
    <Button
      onClick={onPlayAudio}
      size="sm"
      className="bg-green-500 hover:bg-green-600 text-white font-bold text-sm lg:text-xl px-4 lg:px-8 py-2 lg:py-4 w-full lg:w-auto"
    >
      <Play className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
      음악 재생
    </Button>
    <p className="text-xs text-gray-600 mt-1 lg:mt-2">
      음악이 자동으로 재생되지 않으면 버튼을 눌러주세요.
    </p>
  </div>
);

// 재연결 성공 애니메이션 컴포넌트
const ReconnectSuccessAnimation = ({ message }: { message: string | null }) => {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <motion.div
        initial={{ 
          position: "fixed",
          top: "50%", 
          left: "50%", 
          x: "-50%", 
          y: "-50%",
          scale: 1.2,
          opacity: 0
        }}
        animate={{ 
          scale: 1,
          opacity: 1
        }}
        exit={{ 
          opacity: 0,
          y: -20
        }}
        transition={{ 
          duration: 0.5, 
          ease: "easeOut"
        }}
        className="text-sm lg:text-xl font-bold text-white bg-gradient-to-r from-green-600 to-blue-600 px-4 lg:px-8 py-2 lg:py-4 rounded-lg lg:rounded-xl shadow-2xl whitespace-pre-line text-center max-w-md border-2 border-green-300"
      >
        {message}
      </motion.div>
    </div>
  );
};