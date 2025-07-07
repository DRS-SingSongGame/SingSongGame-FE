import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/Progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Play,
  Pause,
  Trophy,
  Music,
  Timer,
  Users,
} from "lucide-react";
import { connectGameSocket, disconnectGameSocket, sendGameMessage } from "@/lib/gameSocket";
import ChatBox, { ChatMessage } from "./chat/ChatBox";
import axios from "axios";

interface RandomSongGameProps {
  user: any;
  room: any;
  players: any[];
  onBack: () => void;
  onGameEnd: (results: any[]) => void;
  onGameStart?: () => void; 
  isAISongGame?: boolean;  
}

interface GameSessionType {
  currentRound: number;
  currentSong?: {
    title: string;
    hint: string;
    audioUrl: string;
  };
  roundDuration: number;
  playerScores: Record<string, number>;
  winner?: string;
}

type Phase = "waiting" | "countdown" | "playing" | "final";

const RandomSongGame = ({
  user,
  room,
  players,
  onBack,
  onGameEnd,
  isAISongGame,
  onGameStart,
}: RandomSongGameProps) => {
  const [chatMessage, setChatMessage] = useState("");
  const [gameSession, setGameSession] = useState<GameSessionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("waiting"); // Initial phase is waiting
  const [countdown, setCountdown] = useState<number>(0); // Countdown for game start
  const [roundTimer, setRoundTimer] = useState<number>(0); // Timer for current round
  const audioRef = useRef<HTMLAudioElement>(null);
  const roundTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [nextRoundCountdown, setNextRoundCountdown] = useState<number>(0); // New state for next round countdown
  const nextRoundIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref for next round interval
  const [hasUserInteractedForAudio, setHasUserInteractedForAudio] =
    useState<boolean>(false); // New state for audio interaction
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [answerModalData, setAnswerModalData] = useState<{
    winnerNickname: string;
    correctAnswer: string;
    correctTitle: string;
  } | null>(null);
  const currentRoundRef = useRef<number>(0);
  const totalRoundsRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("waiting");
  const router = useRouter();
  const [gameEndResults, setGameEndResults] = useState<
  { userId: string; score: number }[]
>([]);
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  const [showNoAnswerModal, setShowNoAnswerModal] = useState(false);
  const [noAnswerModalContent, setNoAnswerModalContent] = useState<{
    title: string;
    subtitle: string;
  }>({ title: "", subtitle: "" });
  const [progress, setProgress] = useState(0);
  const [winnerAnimatedScore, setWinnerAnimatedScore] = useState(0);

  // 정답자가 없는 경우 프로그레스바 애니메이션 //

  const progressStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!showNoAnswerModal) return;
  
    let frameId: number;
    const duration = 3000; // 3초
    progressStartTimeRef.current = null;
    setProgress(0); // 강제 초기화
  
    const step = (timestamp: number) => {
      if (!progressStartTimeRef.current) {
        progressStartTimeRef.current = timestamp;
      }
  
      const elapsed = timestamp - progressStartTimeRef.current;
      const value = Math.min((elapsed / duration) * 100, 100);
      setProgress(value);
  
      if (elapsed < duration) {
        frameId = requestAnimationFrame(step);
      }
    };
  
    frameId = requestAnimationFrame(step);
  
    return () => {
      cancelAnimationFrame(frameId);
      setProgress(0);
    };
  }, [showNoAnswerModal]);
  
  // 정답자가 없는 경우 프로그레스바 애니메이션 //



  const handleCloseNoAnswerModal = () => {
    setShowNoAnswerModal(false);
    setProgress(0);
  };

  const winner = players.find(
    (p) => p.nickname === answerModalData?.winnerNickname
  );
  const winnerScore = gameSession?.playerScores?.[winner?.id] ?? 0;

  useEffect(() => {
  if (showAnswerModal && winnerScore > 0 && winner) {
    const start = winner.score ?? 0;
    const end = winnerScore;

    let current = start;
    const step = Math.ceil((end - start) / 15);
    const interval = setInterval(() => {
      current += step;
      if (current >= end) {
        current = end;
        clearInterval(interval);
      }
      setWinnerAnimatedScore(current);
    }, 30);
  }
}, [showAnswerModal, winnerScore, winner]);

  useEffect(() => {
    setLoading(true);
    connectGameSocket(room.roomId, {
      onConnect: (frame) => {
        console.log("WebSocket Connected:", frame);
        setLoading(false);
        // Initial game state fetch if needed, or rely purely on WebSocket messages
        // For now, we assume the first state will come via WebSocket
      },
      onError: (error) => {
        console.error("WebSocket Error:", error);
        setLoading(false);
        // Handle error, e.g., show error message to user
      },
      onMessage: (msg) => {
        // 게임 관련 메시지 처리 (예: 플레이어 목록 업데이트, 게임 상태 변경 등)
        console.log('Game WebSocket Message:', msg);
        // 플레이어 목록 업데이트
        if (msg.type === 'PLAYER_UPDATE') {
          // 플레이어 정보 업데이트 로직이 필요하다면 여기에 추가
          console.log('Player update received:', msg.players);
        }
        // 채팅 메시지 (게임 내 채팅)
        else if (msg.messageType === 'TALK' || msg.messageType === 'ENTER' || msg.messageType === 'LEAVE') {
          setChatMessages((prev) => [...prev, msg]);
        }
      },
      onGameStartCountdown: (response) => {
        console.log("Game Start Countdown:", response);
        setPhase("countdown");
        setCountdown(response.countdownSeconds);
        // Start a local countdown timer for display
        let currentCountdown = response.countdownSeconds;
        const interval = setInterval(() => {
          currentCountdown--;
          if (currentCountdown >= 0) {
            setCountdown(currentCountdown);
          } else {
            clearInterval(interval);
          }
        }, 1000);
        // return () => clearInterval(interval); // Cleanup on unmount - this return is for the inner interval, not the useEffect
      },
      onRoundStart: (response) => {
        console.log("Round Start:", response);

        currentRoundRef.current = response.round;
        totalRoundsRef.current = response.totalRounds;

        setPhase("playing");
        setGameSession((prev: any) => ({
          ...prev,
          currentRound: response.round,
          currentSong: {
            audioUrl: response.audioUrl,
            artist: response.artist,
            hint: response.hint, // Use hint from backend
            title: response.title,
          },
          roundStartTime: Date.now(), // Set client-side start time for timer
          roundDuration: 30, // Assuming 30 seconds as per backend InGameService
          playerScores: response.playerScores || prev?.playerScores,
          totalRounds: response.totalRounds || prev?.totalRounds,
        }));
        // Start round timer
        if (roundTimerIntervalRef.current) {
          clearInterval(roundTimerIntervalRef.current);
        }
        let currentRoundTime = 30; // Assuming 30 seconds
        setRoundTimer(currentRoundTime);
        roundTimerIntervalRef.current = setInterval(() => {
          currentRoundTime--;
          if (currentRoundTime >= 0) {
            setRoundTimer(currentRoundTime);
          } else {
            clearInterval(roundTimerIntervalRef.current!);
          }
        }, 1000);
      },
      onAnswerCorrect: (response) => {
        console.log("Answer Correct:", response);
        // setPhase('answer_revealed'); // New phase for revealing answer
        // Update scores and winner info
        console.log("🎵 response.correctTitle:", response.correctTitle);

        setGameSession((prev: any) => ({
          ...prev,
          winner: response.winnerNickname,
          playerScores: response.updatedScores || prev?.playerScores,
          correctTitle : response.correctTitle,
        }));

        // Show answer modal
        setAnswerModalData({
          winnerNickname: response.winnerNickname,
          correctAnswer: response.correctAnswer,
          correctTitle: response.correctTitle,
        });
        setShowAnswerModal(true);

        if (response.updatedScores) {
          setGameSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              playerScores: {
                ...prev.playerScores,
                ...response.updatedScores, // 업데이트된 점수 반영
              },
            };
          });
        }

        // Hide modal after 5 seconds (matching backend's ANSWER_REVEAL_DURATION_SECONDS)
        setTimeout(() => {
          setShowAnswerModal(false);
          setAnswerModalData(null);
      
          // ✅ 마지막 라운드인 경우 강제 종료 fallback
          const isLastRound =
            currentRoundRef.current >= totalRoundsRef.current;

          if (isLastRound && phaseRef.current !== "final") {
            console.log("🚨 마지막 라운드 종료 fallback 실행");
            setPhase("final");
            onGameEnd(
              Object.entries(gameSession?.playerScores || {}).map(([id, score]) => ({
                id,
                score,
              }))
            );
          }
      
        }, 5000);
      },
      
      onRoundFailed: (data) => {
        // 예: { title: "아이유 - 너랑 나" }
        setNoAnswerModalContent({
          title: "정답자가 없습니다 😢",
          subtitle: `제목: ${data.title}`,
        });
        setShowNoAnswerModal(true);
      
        setTimeout(() => {
          setShowNoAnswerModal(false);
        }, 3000);
      },

      onGameEnd: (response) => {
        console.log("Game End:", response);
        if (roundTimerIntervalRef.current) {
          clearInterval(roundTimerIntervalRef.current);
        }
        setGameEndResults(response.finalResults || []);
        setPhase("final");
        setShowGameEndModal(true);
      },

    });

    return () => {
      disconnectGameSocket();
      if (roundTimerIntervalRef.current) {
        clearInterval(roundTimerIntervalRef.current);
      }
      if (nextRoundIntervalRef.current) {
        // Cleanup for next round interval
        clearInterval(nextRoundIntervalRef.current);
      }
    };
  }, [room.roomId, onGameEnd]); // Add onGameEnd to dependency array

  // Effect to handle audio playback when phase changes to 'playing' or audioUrl changes
  useEffect(() => {
    if (
      phase === "playing" &&
      gameSession?.currentSong?.audioUrl &&
      audioRef.current
    ) {
      console.log(
        "Attempting to play audio from useEffect:",
        gameSession.currentSong.audioUrl
      );
      audioRef.current.src = gameSession.currentSong.audioUrl;
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => {
          console.log("Audio playback started successfully from useEffect.");
          setHasUserInteractedForAudio(true);
        })
        .catch((e) => {
          console.error(
            "Audio play failed from useEffect:",
            e,
            "Is user interaction present?",
            e.name === "NotAllowedError"
          );
          if (e.name === "NotAllowedError") {
            setHasUserInteractedForAudio(false);
          }
        });
    }
    // When answer is revealed, ensure audio continues playing
    // No explicit action needed here as it should already be playing
    else if (audioRef.current) {
      // Pause audio when not in playing or answer_revealed phase
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [phase, gameSession?.currentSong?.audioUrl]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // 4. 정답 제출
  const handleSendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
  
    console.log("📝 입력된 메시지:", trimmed);
  
    // 1. 채팅 메시지 전송 (웹소켓)
    sendGameMessage(room.roomId, user.id, user.nickname, trimmed);
  
    // 2. 정답 제출 (HTTP API)
    if (phase === "playing") {
      try {
        await api.post(`/api/game-session/${room.roomId}/answer`, {
          answer: trimmed,
        });
        console.log("✅ 정답 제출 성공");
      } catch (err) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as any;
          console.error("❌ 정답 제출 실패:", axiosError.response?.data || axiosError.message);
        } else if (err instanceof Error) {
          console.error("❌ 정답 제출 실패:", err.message);
        } else {
          console.error("❌ 알 수 없는 에러", err);
        }
      }
    }
  };
  
  
  const handleLeaveRoom = async () => {
    // TODO: 백엔드에 방 나가기 요청 (HTTP)

    //router.push('/lobby');

    try {
      await api.delete(`/api/room/${room.roomId}/leave`);
      router.push('/lobby');
    } catch (error) {
      alert('방 나가기에 실패했습니다.');
      router.push('/lobby');
    }

  };
  

  const handlePlayAudio = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          console.log("Manual audio playback started successfully.");
          setHasUserInteractedForAudio(true);
        })
        .catch((e) => {
          console.error("Manual audio play failed:", e);
        });
    }
  };

  const handleStartGame = async () => {
    console.log("Attempting to start game...");
    try {
      // This API call initiates the game on the backend, which then sends WebSocket messages
      await api.post(`/api/game-session/${room.roomId}/start`);
      console.log("Game start API call successful.");
      setLoading(false); // Assuming game start will lead to WebSocket updates
    } catch (error) {
      console.error("Failed to start game:", error);
      // Handle error, e.g., show a toast
    }
  };

  if (loading) return <div>로딩 중...</div>;

  // phase별 화면
  if (phase === "waiting") {
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500 flex flex-col">
        <div className="max-w-4xl mx-auto flex-1">
          <Button
            variant="outline"
            //onClick={onBack}
            onClick={handleLeaveRoom}
            className="mb-4 bg-white/90 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                {isAISongGame ? "🤖 AI 노래 맞추기" : "🎵 랜덤 노래 맞추기"}
              </CardTitle>
              <CardDescription className="text-lg">
                {isAISongGame
                  ? "AI가 부른 노래를 듣고 제목을 맞춰보세요!"
                  : "노래를 듣고 제목을 가장 빨리 맞춰보세요!"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200"
                  >
                    <Avatar className="w-16 h-16 mx-auto mb-2">
                      <AvatarImage src={player.avatar} />
                      <AvatarFallback>{player.nickname[0]}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{player.nickname}</h3>
                    <Badge className="mt-1 bg-blue-500">
                      점수: {player.score}점
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Button
                  onClick={isAISongGame ? onGameStart : handleStartGame}
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 text-white font-bold text-xl px-12 py-6"
                >
                  <Play className="w-6 h-6 mr-3" />
                  {isAISongGame ? "AI 노래 맞추기 시작!" : "게임 시작!"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="max-w-4xl mx-auto w-full mt-6">
          <Card className="bg-white/90 backdrop-blur-sm flex flex-col">
            <CardHeader>
              <CardTitle className="text-pink-700">채팅</CardTitle>
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

  if (phase === "countdown") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500">
        <Card className="bg-white/90 backdrop-blur-sm p-12 text-center">
          <div className="text-8xl font-bold text-transparent bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text mb-4">
            {countdown}
          </div>
          <div className="text-2xl font-semibold text-gray-700">
            게임이 곧 시작됩니다!
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "playing") {
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="outline"
            onClick={onBack}
            className="mb-4 bg-white/90 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            나가기
          </Button>
          <Card className="bg-white/90 backdrop-blur-sm mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-bold">
                    Round {gameSession?.currentRound} / 10
                    
                  </CardTitle>
                  <CardDescription className="text-lg">
                    힌트:{" "}
                    <span className="font-bold text-blue-600">
                      {gameSession?.currentSong?.hint}
                    </span>
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-red-500 flex items-center gap-2">
                    <Timer className="w-8 h-8" />
                    {roundTimer}초
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Music className="w-5 h-5 animate-pulse" />
                    노래 재생 중
                  </div>
                </div>
              </div>
              <Progress
                value={
                  gameSession?.roundDuration
                    ? ((gameSession.roundDuration - roundTimer) /
                        gameSession.roundDuration) *
                      100
                    : 0
                }
                className="mt-4"
              />
            </CardHeader>
          </Card>
          {!hasUserInteractedForAudio && (
            <div className="text-center mb-4">
              <Button
                onClick={handlePlayAudio}
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white font-bold text-xl px-8 py-4"
              >
                <Play className="w-5 h-5 mr-2" />
                음악 재생
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                음악이 자동으로 재생되지 않으면 버튼을 눌러주세요.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  점수 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players
                    .map((player) => ({
                      ...player,
                      score: gameSession?.playerScores?.[player.id] || 0,
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          player.nickname === gameSession?.winner
                            ? "bg-yellow-100 border-2 border-yellow-400"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="text-lg font-bold text-gray-500">
                          #{index + 1}
                        </div>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={player.avatar} />
                          <AvatarFallback>{player.nickname[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-semibold">{player.nickname}</div>
                        </div>
                        <Badge className="bg-blue-500">
                          점수: {player.score}점
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
            <div className="lg:col-span-2">
              <Card className="bg-white/90 backdrop-blur-sm flex-1 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-pink-700">게임 채팅</CardTitle>
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
          {/* Audio element is controlled by ref and WebSocket updates */}
          <audio ref={audioRef} />
        </div>
        {showAnswerModal && answerModalData && (
          <Dialog open={showAnswerModal} onOpenChange={setShowAnswerModal}>
          <DialogContent className="sm:max-w-[425px] text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <div className="text-4xl font-bold text-green-600 mb-2">
                🎉 정답입니다!
              </div>
              {winner && (
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={winner.avatar} />
                    <AvatarFallback>{winner.nickname[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-xl font-semibold text-purple-800">
                    {winner.nickname} 님이 정답을 맞췄어요!
                  </div>
                  <div className="flex flex-col items-center gap-2 relative">
                    <motion.div
                      key="score-change"
                      initial={{ opacity: 1, y: 0, scale: 1 }}
                      animate={{ opacity: 0, y: -40, scale: 1.3 }}
                      transition={{ duration: 2.0, ease: "easeOut" }}
                      className="absolute -top-8 ml-[150px] text-xl font-bold text-yellow-400 drop-shadow-md z-10"
                    >
                      +{winnerScore - (winner.score ?? 0)}점!
                    </motion.div>

                    <motion.div
                      key={winnerAnimatedScore}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="text-2xl font-bold text-blue-700"
                    >
                      현재 점수: {winnerAnimatedScore}점
                    </motion.div>
                  </div>
                </div>
              )}
              <div className="mt-4 text-lg text-gray-700">
                정답: "{answerModalData?.correctTitle}"
              </div>
              <p className="text-sm text-gray-500 mt-2">다음 라운드로 이동 중...</p>
            </motion.div>
          </DialogContent>
        </Dialog>        
        )}
        {showNoAnswerModal && (
      <Dialog open={showNoAnswerModal} onOpenChange={handleCloseNoAnswerModal}>
      <DialogContent className="sm:max-w-[425px] text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-4xl mb-2">😢</div>
          <h2 className="text-xl font-bold text-red-600">정답자가 없습니다!</h2>
          <p className="text-md text-gray-600 mt-2">
            정답: "<span className="text-blue-600 font-semibold">{noAnswerModalContent.subtitle}</span>"
          </p>
    
          {/* ⏳ 3초 Progress Bar */}
          <div className="mt-6">
              <Progress
                value={progress}
                className="h-2 transition-[width] duration-200 ease-out rounded-full"
              />
            <p className="text-sm text-gray-500 mt-1">3초 후 다음 라운드로 이동합니다...</p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
    )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br ...">
      {/* 기존 게임 화면 (waiting / countdown / playing 등) 렌더링 */}
  
      {/* 🎉 게임 종료 모달 */}
      <Dialog open={phase === "final"}>
        <DialogContent className="sm:max-w-[500px] text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-4xl font-bold text-purple-600">🎉 게임 종료 🎉</div>
            <p className="text-gray-600 mt-2">최종 순위를 확인하세요!</p>

            <ul className="mt-6 space-y-3">
              {gameEndResults
                .sort((a, b) => b.score - a.score)
                .map((result, index) => {
                  const player = players.find((p) => p.id === result.userId);
                  if (!player) return null;

                  const isFirst = index === 0;

                  return (
                    <li
                      key={player.id}
                      className={`flex items-center justify-between bg-white border rounded-xl p-3 shadow-sm ${
                        isFirst ? "border-yellow-400 bg-yellow-50" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={player.avatar} />
                          <AvatarFallback>{player.nickname[0]}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <div className="font-semibold text-gray-800">
                            #{index + 1} {player.nickname}
                            {isFirst && <span className="ml-2 text-yellow-500">🥇</span>}
                          </div>
                          {/* 정답 수 등을 표시하고 싶다면 여기에 */}
                        </div>
                      </div>
                      <div className="text-blue-600 font-bold text-lg">
                        {result.score}점
                      </div>
                    </li>
                  );
                })}
            </ul>

            <div className="mt-6 flex gap-3 justify-center">
              <Button onClick={() => router.push("/lobby")}>🏠 로비로</Button>
              <Button variant="secondary" onClick={() => router.push(`/room/${room.roomId}/randomsonggame`)}>
                🔁 다시 하기
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

    </div>
  );
  
  

  return null;
};

export default RandomSongGame;
