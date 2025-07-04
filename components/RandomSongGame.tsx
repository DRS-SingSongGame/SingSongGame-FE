import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/Progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Play, Pause, Trophy, Music, Timer, Users } from 'lucide-react';
import { connectGameSocket, disconnectGameSocket } from '@/lib/gameSocket';

interface RandomSongGameProps {
  user: any;
  room: any;
  players: any[];
  onBack: () => void;
  onGameEnd: (results: any[]) => void;
}

type Phase = 'waiting' | 'countdown' | 'playing' | 'final';

const RandomSongGame = ({ user, room, players, onBack, onGameEnd }: RandomSongGameProps) => {
  const [chatMessage, setChatMessage] = useState('');
  const [gameSession, setGameSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('waiting'); // Initial phase is waiting
  const [countdown, setCountdown] = useState<number>(0); // Countdown for game start
  const [roundTimer, setRoundTimer] = useState<number>(0); // Timer for current round
  const audioRef = useRef<HTMLAudioElement>(null);
  const roundTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [nextRoundCountdown, setNextRoundCountdown] = useState<number>(0); // New state for next round countdown
  const nextRoundIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref for next round interval
  const [hasUserInteractedForAudio, setHasUserInteractedForAudio] = useState<boolean>(false); // New state for audio interaction
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [answerModalData, setAnswerModalData] = useState<{ winnerNickname: string; correctAnswer: string } | null>(null);

  useEffect(() => {
    setLoading(true);
      connectGameSocket(room.roomId, {
      onConnect: (frame) => {
        console.log('WebSocket Connected:', frame);
        setLoading(false);
        // Initial game state fetch if needed, or rely purely on WebSocket messages
        // For now, we assume the first state will come via WebSocket
      },
      onError: (error) => {
        console.error('WebSocket Error:', error);
        setLoading(false);
        // Handle error, e.g., show error message to user
      },
      onGameStartCountdown: (response) => {
        console.log('Game Start Countdown:', response);
        setPhase('countdown');
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
        console.log('Round Start:', response);
        setPhase('playing');
        setGameSession((prev: any) => ({
          ...prev,
          currentRound: response.round,
          currentSong: {
            audioUrl: response.audioUrl,
            artist: response.artist,
            hint: response.hint, // Use hint from backend
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
        console.log('Answer Correct:', response);
        // setPhase('answer_revealed'); // New phase for revealing answer
        // Update scores and winner info
        setGameSession((prev: any) => ({
          ...prev,
          winner: response.winnerNickname,
          playerScores: response.updatedScores || prev?.playerScores,
          correctAnswer: response.correctAnswer, // Store correct answer
        }));

        // Show answer modal
        setAnswerModalData({ winnerNickname: response.winnerNickname, correctAnswer: response.correctAnswer });
        setShowAnswerModal(true);

        // Hide modal after 5 seconds (matching backend's ANSWER_REVEAL_DURATION_SECONDS)
        setTimeout(() => {
          setShowAnswerModal(false);
          setAnswerModalData(null);
        }, 5000);

        // Music continues to play
        // Start 10-second countdown for next round (this is now handled by backend)
        // if (nextRoundIntervalRef.current) {
        //   clearInterval(nextRoundIntervalRef.current);
        // }
        // let currentNextRoundCountdown = 10;
        // setNextRoundCountdown(currentNextRoundCountdown);
        // nextRoundIntervalRef.current = setInterval(() => {
        //   currentNextRoundCountdown--;
        //   if (currentNextRoundCountdown >= 0) {
        //     setNextRoundCountdown(currentNextRoundCountdown);
        //   } else {
        //     clearInterval(nextRoundIntervalRef.current!);
        //     // Optionally, transition to a waiting state for the next round to start from backend
        //     // setPhase('waiting_for_next_round'); // Or similar
        //   }
        // }, 1000);
      },
      onGameEnd: (response) => {
        console.log('Game End:', response);
        setPhase('final');
        if (roundTimerIntervalRef.current) {
          clearInterval(roundTimerIntervalRef.current);
        }
        // Call onGameEnd prop to handle navigation/results display
        onGameEnd(response.finalResults || []); // Pass actual results if available from backend
      },
    });

    return () => {
      disconnectGameSocket();
      if (roundTimerIntervalRef.current) {
        clearInterval(roundTimerIntervalRef.current);
      }
      if (nextRoundIntervalRef.current) { // Cleanup for next round interval
        clearInterval(nextRoundIntervalRef.current);
      }
    };
  }, [room.roomId, onGameEnd]); // Add onGameEnd to dependency array

  // Effect to handle audio playback when phase changes to 'playing' or audioUrl changes
  useEffect(() => {
    if (phase === 'playing' && gameSession?.currentSong?.audioUrl && audioRef.current) {
      console.log('Attempting to play audio from useEffect:', gameSession.currentSong.audioUrl);
      audioRef.current.src = gameSession.currentSong.audioUrl;
      audioRef.current.load();
      audioRef.current.play().then(() => {
        console.log('Audio playback started successfully from useEffect.');
        setHasUserInteractedForAudio(true);
      }).catch(e => {
        console.error("Audio play failed from useEffect:", e, "Is user interaction present?", e.name === 'NotAllowedError');
        if (e.name === 'NotAllowedError') {
          setHasUserInteractedForAudio(false);
        }
      });
    } else if (phase === 'answer_revealed' && audioRef.current) {
      // When answer is revealed, ensure audio continues playing
      // No explicit action needed here as it should already be playing
    } else if (audioRef.current) {
      // Pause audio when not in playing or answer_revealed phase
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [phase, gameSession?.currentSong?.audioUrl]);

  // 2. 카운트다운 계산 (백엔드 roundStartTime 기준) - This is now handled by WebSocket callback
  // useEffect(() => {
  //   if (phase === 'countdown' && gameSession?.roundStartTime) {
  //     const interval = setInterval(() => {
  //       const now = Date.now();
  //       const start = new Date(gameSession.roundStartTime).getTime();
  //       const left = Math.max(0, 10 - Math.floor((now - start) / 1000));
  //       setCountdown(left);
  //     }, 200);
  //     return () => clearInterval(interval);
  //   }
  // }, [phase, gameSession?.roundStartTime]);

  // 3. 오디오 자동 재생 - This is now handled by WebSocket callback
  // useEffect(() => {
  //   if (phase === 'playing' && audioRef.current && gameSession?.currentSong?.audioUrl) {
  //     audioRef.current.currentTime = 0;
  //     audioRef.current.play();
  //   }
  // }, [phase, gameSession?.currentSong?.audioUrl]);

  // 4. 정답 제출
  const submitAnswer = async () => {
    if (!chatMessage.trim()) return;
    await api.post(`/api/game-session/${room.roomId}/answer`, {
      // userId: user.id, // Backend uses @LoginUser, so userId is not needed in body
      answer: chatMessage.trim(),
    });
    setChatMessage('');
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        console.log('Manual audio playback started successfully.');
        setHasUserInteractedForAudio(true);
      }).catch(e => {
        console.error("Manual audio play failed:", e);
      });
    }
  };

  const handleStartGame = async () => {
    console.log('Attempting to start game...');
    try {
      // This API call initiates the game on the backend, which then sends WebSocket messages
      await api.post(`/api/game-session/${room.roomId}/start`);
      console.log('Game start API call successful.');
      setLoading(false); // Assuming game start will lead to WebSocket updates
    } catch (error) {
      console.error("Failed to start game:", error);
      // Handle error, e.g., show a toast
    }
  };

  if (loading) return <div>로딩 중...</div>;

  // phase별 화면
  if (phase === 'waiting') {
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" onClick={onBack} className="mb-4 bg-white/90 backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                🎵 랜덤 노래 맞추기
              </CardTitle>
              <CardDescription className="text-lg">
                노래를 듣고 제목을 가장 빨리 맞춰보세요!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {players.map((player) => (
                  <div key={player.id} className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200">
                    <Avatar className="w-16 h-16 mx-auto mb-2">
                      <AvatarImage src={player.avatar} />
                      <AvatarFallback>{player.nickname[0]}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{player.nickname}</h3>
                    <Badge className="mt-1 bg-blue-500">점수: {player.score}점</Badge>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Button 
                  onClick={handleStartGame}
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 text-white font-bold text-xl px-12 py-6"
                >
                  <Play className="w-6 h-6 mr-3" />
                  게임 시작!
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === 'countdown') {
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

  if (phase === 'playing') {
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500">
        <div className="max-w-6xl mx-auto">
          <Button variant="outline" onClick={onBack} className="mb-4 bg-white/90 backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            나가기
          </Button>
          <Card className="bg-white/90 backdrop-blur-sm mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-bold">Round {gameSession?.currentRound} / {gameSession?.totalRounds}</CardTitle>
                  <CardDescription className="text-lg">힌트: <span className="font-bold text-blue-600">{gameSession?.currentSong?.hint}</span></CardDescription>
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
              <Progress value={gameSession?.roundDuration ? ((gameSession.roundDuration - roundTimer) / gameSession.roundDuration * 100) : 0} className="mt-4" />
            </CardHeader>
          </Card>
          {!hasUserInteractedForAudio && (
            <div className="text-center mb-4">
              <Button onClick={handlePlayAudio} size="lg" className="bg-green-500 hover:bg-green-600 text-white font-bold text-xl px-8 py-4">
                <Play className="w-5 h-5 mr-2" />
                음악 재생
              </Button>
              <p className="text-sm text-gray-600 mt-2">음악이 자동으로 재생되지 않으면 버튼을 눌러주세요.</p>
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
                    .map(player => ({ ...player, score: gameSession?.playerScores?.[player.id] || 0 }))
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                    <div key={player.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                      player.nickname === gameSession?.winner ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-50'
                    }`}>
                      <div className="text-lg font-bold text-gray-500">#{index + 1}</div>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={player.avatar} />
                        <AvatarFallback>{player.nickname[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold">{player.nickname}</div>
                      </div>
                      <Badge className="bg-blue-500">점수: {player.score}점</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="lg:col-span-2">
              <Card className="bg-white/90 backdrop-blur-sm h-full">
                <CardHeader>
                  <CardTitle>💬 실시간 채팅</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="정답을 입력하세요..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && submitAnswer()}
                      disabled={phase !== 'playing'}
                    />
                    <Button onClick={submitAnswer} disabled={phase !== 'playing'}>
                      전송
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* Audio element is controlled by ref and WebSocket updates */}
          <audio ref={audioRef} />
        </div>
        {showAnswerModal && answerModalData && (
          <Dialog open={showAnswerModal} onOpenChange={setShowAnswerModal}>
            <DialogContent className="sm:max-w-[425px] text-center" aria-describedby="answer-modal-description">
              <DialogHeader>
                <DialogTitle className="text-3xl font-bold text-green-600">🎉 정답입니다! 🎉</DialogTitle>
                <p id="answer-modal-description" className="text-lg text-gray-700">
                  <span className="font-semibold">{answerModalData.winnerNickname}</span>님이 정답을 맞췄습니다!
                </p>
              </DialogHeader>
              <div className="text-2xl font-bold text-blue-700 mt-4">
                정답: {answerModalData.correctAnswer}
              </div>
              <p className="text-sm text-gray-500 mt-2">다음 라운드로 이동 중...</p>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  if (phase === 'final') {
    // 결과 화면
    const sorted = players
      .map(p => ({ ...p, score: gameSession?.playerScores?.[p.id] || 0 }))
      .sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" onClick={onBack} className="mb-4 bg-white/90 backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            게임방으로 돌아가기
          </Button>
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                🎵 랜덤 노래 맞추기
              </CardTitle>
              <CardDescription className="text-lg">
                최종 결과
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sorted.map((player) => (
                  <div key={player.id} className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200">
                    <Avatar className="w-16 h-16 mx-auto mb-2">
                      <AvatarImage src={player.avatar} />
                      <AvatarFallback>{player.nickname[0]}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{player.nickname}</h3>
                    <Badge className="mt-1 bg-blue-500">점수: {player.score}점</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
};

export default RandomSongGame;
