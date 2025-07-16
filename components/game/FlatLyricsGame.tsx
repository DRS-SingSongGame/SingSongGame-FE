"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GameHeader from "./GameHeader";
import GameChat from "./GameChat";
import GameScoreboard from "./GameScoreboard";
import GameInfo from "./GameInfo";
import GameResultModal from "./GameResultModal";
import { connectGameSocket, disconnectGameSocket } from "@/lib/gameSocket";
import { sendGameMessage } from "@/lib/gameSocket";
import { Sparkles, Music, Mic, Trophy, Star, Zap, Bot, Rocket, Target, Crown } from "lucide-react";
import api from "@/lib/api";

interface FlatLyricsGameProps {
  user: any;
  room: any;
  players: any[];
  onBack: () => void;
  onGameEnd: (results: any[]) => void;
}

interface Song {
  id: number;
  title: string;
  artist: string;
  hint?: string;
}

interface GameState {
  currentRound: number;
  maxRound: number;
  timeLeft: number;
  isReading: boolean;
  currentSong: Song | null;
  scores: { [playerId: string]: number };
  correctAnswer: string | null;
  correctArtist: string | null;
  roundWinner: string | null;
  showCorrectAnswer: boolean;
  showParticles: boolean;
  audioLevel: number;
  robotSpeaking: boolean;
  scoreAnimations: { id: string; score: number; x: number; y: number }[];
}

interface ChatMessage {
  id: number;
  playerId: string;
  playerName: string;
  message: string;
  time: string;
  isCorrect?: boolean;
  isSystem?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const FlatLyricsGame = ({ user, room, players, onBack, onGameEnd }: FlatLyricsGameProps) => {
  const [gameState, setGameState] = useState<GameState>({
    currentRound: 0,
    maxRound: 0,
    timeLeft: 60,
    isReading: false,
    currentSong: null,
    scores: {},
    correctAnswer: null,
    correctArtist: null,
    roundWinner: null,
    showCorrectAnswer: false,
    showParticles: false,
    audioLevel: 0,
    robotSpeaking: false,
    scoreAnimations: [],
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [robotMessages, setRobotMessages] = useState<string[]>([]);
  const [showRobot, setShowRobot] = useState(false);
  const [showHintAnimation, setShowHintAnimation] = useState<string | null>(null);
  // 힌트 고정 상태
  const [fixedHint, setFixedHint] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 로봇 메시지 생성
  const generateRobotMessage = () => {
    const messages = [
      "안녕하세요! 저는 AI 노래 로봇입니다! 🤖",
      "노래를 부를 준비가 되었어요! 🎵",
      "가사를 잘 들어보세요! 🎤",
      "정답을 맞춰보세요! 🎯",
      "훌륭해요! 정답입니다! 🎉",
      "다음 라운드로 넘어갑니다! 🚀",
      "점수가 올라가고 있어요! ⬆️",
      "정말 잘하시네요! 👏",
      "노래를 더 부를까요? 🎶",
      "힌트를 잘 활용하세요! 💡"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // 점수 애니메이션 추가
  const addScoreAnimation = (playerId: string, score: number, x: number, y: number) => {
    const newAnimation = {
      id: `${playerId}-${Date.now()}`,
      score,
      x,
      y
    };
    setGameState(prev => ({
      ...prev,
      scoreAnimations: [...prev.scoreAnimations, newAnimation]
    }));

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        scoreAnimations: prev.scoreAnimations.filter(anim => anim.id !== newAnimation.id)
      }));
    }, 2000);
  };

  // 오디오 시각화 효과 제거

  // 파티클 효과
  useEffect(() => {
    if (!gameState.showParticles) return;

    const interval = setInterval(() => {
      setParticles(prev => {
        const newParticles = prev
          .map(p => ({ ...p, life: p.life - 1, x: p.x + p.vx, y: p.y + p.vy }))
          .filter(p => p.life > 0);

        if (Math.random() < 0.5) {
          newParticles.push({
            id: Date.now() + Math.random(),
            x: Math.random() * window.innerWidth,
            y: window.innerHeight,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 4 - 2,
            life: 80,
            color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'][Math.floor(Math.random() * 7)]
          });
        }

        return newParticles;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [gameState.showParticles]);

  // 로봇 메시지 효과
  useEffect(() => {
    if (gameState.robotSpeaking) {
      const message = generateRobotMessage();
      setRobotMessages(prev => [...prev, message]);
      
      setTimeout(() => {
        setGameState(prev => ({ ...prev, robotSpeaking: false }));
      }, 3000);
    }
  }, [gameState.robotSpeaking]);

  // 승리 효과
  const triggerVictoryEffect = () => {
    setGameState(prev => ({ ...prev, showParticles: true, robotSpeaking: true }));
    setShowRobot(true);

    setTimeout(() => {
      setGameState(prev => ({ ...prev, showParticles: false }));
      setShowRobot(false);
    }, 4000);
  };

  // 힌트 애니메이션 타이밍 제어 (라운드 시작 시)
  useEffect(() => {
    if (gameState.currentSong !== null && gameState.isReading) {
      if (gameState.currentSong.hint) {
        setTimeout(() => {
          setShowHintAnimation(`💡 힌트: ${gameState.currentSong!.hint}`);
          setTimeout(() => {
            setShowHintAnimation(null);
            setFixedHint(`💡 힌트: ${gameState.currentSong!.hint}`);
          }, 2000); // 2초 후 사라짐 + 고정
        }, 10000); // 라운드 시작 10초 후 힌트 표시
      }
    } else {
      setShowHintAnimation(null);
      setFixedHint(null);
    }
  }, [gameState.currentSong?.id, gameState.isReading]);

  useEffect(() => {
    if (!room || !room.roomId) return;
  
    // 1. 초기 점수 설정
    const initialScores = players.reduce((acc, player) => {
      acc[player.id] = 0;
      return acc;
    }, {} as { [key: string]: number });
    setGameState((prev) => ({ ...prev, scores: initialScores }));
  
    // 2. 게임 시작 POST 요청
   
  }, [room?.roomId]);

  useEffect(() => {
    if (!gameState.isReading || gameState.timeLeft <= 0) return;
  
    const interval = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        timeLeft: prev.timeLeft - 1,
      }));
    }, 1000);
  
    return () => clearInterval(interval);
  }, [gameState.isReading, gameState.timeLeft]);

  const handleRoundStart = (payload: any) => {
    console.log("payload 데이터", payload)
    const song = payload.song;
    console.log(song)
    const roundNumber = song.round;
    const playbackStartTime = payload.playbackStartTime;
  
    setGameState((prev) => ({
      ...prev,
      currentRound: roundNumber,
      maxRound: song.maxRound,
      currentSong: song,
      timeLeft: 60,
      correctAnswer: null,
      correctArtist: null,
      roundWinner: null,
      isReading: true,
      showCorrectAnswer: false,
      robotSpeaking: true,
    }));

    setShowRobot(true);
  

  
    // 🔁 기존 setAudio() 대신 ref 사용
    const newAudio = new Audio(`/api/song/tts?songId=${song.id}`);
    audioRef.current = newAudio;
  
    newAudio.oncanplaythrough = () => {
      
      const delay = playbackStartTime - Date.now();
      console.log('playbackStartTime:', playbackStartTime);
      console.log('현재 시간:', Date.now());
      console.log('계산된 delay:', delay);
      
      if (delay > 0) {
        console.log(`⏱️ ${delay}ms 후 오디오 재생`);
        setTimeout(() => {
          newAudio.play().then(() => console.log("✅ 오디오 재생 시작됨"));
        }, delay);
      } else {
        newAudio.play().then(() => console.log("✅ 오디오 재생 시작됨"));
      }
    };
  
    newAudio.onended = () => {
      console.log("🎵 오디오 재생 종료됨");
      setGameState((prev) => ({ ...prev, isReading: false }));
      setShowRobot(false);
      if (user.id === room.hostId) {
        notifyTtsFinished(room.roomId);
      }
    };
  };

  const notifyTtsFinished = (roomId : Number) => {
  fetch(`/api/ai-game/${room.roomId}/tts-finished`, {
    method: "POST",
  })
    .then(() => console.log("✅ TTS 종료 알림 전송됨"))
    .catch((err) => console.error("❌ TTS 종료 알림 실패", err));
};

  const handleAnswerCorrect = (data: any) => {
    const { playerId, playerName, title, artist, score } = data;
    
    console.log('정답 데이터:', data);
    console.log('playerId:', playerId);
    console.log('players:', players);
    console.log('찾은 플레이어:', players.find(p => p.id === playerId));
   
    // ✅ 정답자는 오디오 멈추기
    if (audioRef.current) {
      window.speechSynthesis.cancel();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.src = "";
    }

    if (user.id === room.hostId) {
      notifyTtsFinished(room.roomId);
    }

    // 점수 애니메이션 추가
    addScoreAnimation(playerId, score, Math.random() * window.innerWidth, Math.random() * window.innerHeight);

    // 승리 효과 트리거
    triggerVictoryEffect();

    setGameState((prev) => ({
      ...prev,
      roundWinner: playerId,
      correctAnswer: title,
      correctArtist: artist,
      isReading: false,
      showCorrectAnswer: true,
      scores: {
        ...prev.scores,
        [playerId]: (prev.scores[playerId] || 0) + score,
      },
    }));



    // 정답 사운드 재생
    const aiSound = new Audio('/audio/ai.wav');
    aiSound.volume = 0.5; // 볼륨을 50%로 설정
    aiSound.play().catch(err => console.error('ai.wav 재생 실패:', err));
  };

  const handleGameEnd = (data: any) => {
    setGameOver(true);
    setShowResults(true);
    
    // 게임 결과 사운드 재생
    const aiResultSound = new Audio('/audio/airesult.wav');
    aiResultSound.volume = 0.5; // 볼륨을 50%로 설정
    aiResultSound.play().catch(err => console.error('airesult.wav 재생 실패:', err));
    
    // onGameEnd(data);
  };

  const handleCloseResult = async () => {
    setShowResults(false);
    try {
      await api.delete(`/api/room/${room.roomId}/leave`);
    } catch (e) {
      // 실패해도 그냥 로비로 이동
    }
    window.location.href = '/lobby';
  };



  useEffect(() => {
  
    const initialScores = players.reduce((acc, player) => {
      acc[player.id] = 0;
      return acc;
    }, {} as { [key: string]: number });
  
    setGameState((prev) => ({ ...prev, scores: initialScores }));
  
    const callbacks = {
      onConnect: () => {
        if (user.id === room.hostId) {
          console.log("👑 현재 유저가 방장입니다. 게임 시작 요청을 보냅니다.");
          fetch(`/api/ai-game/${room.roomId}/start`, {
            method: "POST",
          })
            .then((res) => {
              if (!res.ok) throw new Error("게임 시작 실패");
              console.log("✅ 게임 시작 요청 성공");
            })
            .catch((err) => {
              console.error("❌ 게임 시작 실패", err);
            });
        } else {
          console.log("🚫 방장이 아니므로 게임 시작 요청을 보내지 않음");
        }
      },
      onMessage: (data: any) => {
        console.log("[WebSocket 수신]", data);
        const msg: ChatMessage = {
          id: Date.now(),
          playerId: data.senderId,
          playerName: data.senderName,
          message: data.message,
          time: new Date(data.timestamp).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isSystem: false,
        };
        setChatMessages((prev) => [...prev, msg]);
      },
      onRoundStart: handleRoundStart,
      onAnswerCorrect: handleAnswerCorrect,
      onGameEnd: handleGameEnd,
      onError: (err: any) => console.error("소켓 오류", err),
      onGameStartCountdown: (res: any) => console.log("카운트다운 시작", res),
    };
  
    connectGameSocket(room.roomId.toString(), callbacks, true);
  
    return () => {
      console.log("🛑 disconnectGameSocket 호출됨");
      disconnectGameSocket();
    };
  }, [room?.roomId]);

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;

    const trimmedMessage = chatInput.trim();
  
    // 유틸 함수로 전송 처리 위임
    sendGameMessage(
      room.roomId,
      user.id,
      user.nickname,
      chatInput.trim(),
      true
    );

    fetch(`/api/ai-game/${room.roomId}/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ answer: trimmedMessage, timeLeft: gameState.timeLeft }),
    }).catch((err) => {
      console.error("❌ 정답 제출 실패:", err);
    })
  
    setChatInput("");
  };

  const playersWithScores = players.map((player) => ({
    ...player,
    score: gameState.scores[player.id] || 0,
  }));

  return (
    <div className="w-full min-h-screen p-4 relative overflow-hidden">
      {/* 라운드 정보 오른쪽 위 (컴포넌트 내부) */}
      <div className="absolute top-8 right-6 z-40 bg-white/80 rounded-xl px-5 py-2 shadow-lg text-lg font-bold text-blue-700 border border-blue-200">
        Round {gameState.currentRound} / {gameState.maxRound}
      </div>

      {/* 파티클 효과 */}
      <AnimatePresence>
        {gameState.showParticles && particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-3 h-3 rounded-full pointer-events-none"
            style={{
              left: particle.x,
              top: particle.y,
              backgroundColor: particle.color,
            }}
            initial={{ opacity: 1, scale: 0 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          />
        ))}
      </AnimatePresence>

      {/* 점수 애니메이션 */}
      <AnimatePresence>
        {gameState.scoreAnimations.map((animation) => (
          <motion.div
            key={animation.id}
            className="absolute pointer-events-none z-50"
            style={{ left: animation.x, top: animation.y }}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -100, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">
              +{animation.score}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 로봇 캐릭터 */}
      {/* 로봇 캐릭터 */}

      {/* 힌트 중앙 팝업 → 로봇 오른쪽으로 이동 후 고정 */}
      <AnimatePresence>
        {showHintAnimation && (
          <motion.div
            key="hint-popup"
            initial={{
              position: "fixed",
              top: "50%",
              left: "50%",
              x: "-50%",
              y: "-50%",
              scale: 1.5,
              opacity: 1,
              zIndex: 100
            }}
            animate={{
              top: 250, // 헤더(로봇) 아래 고정 위치 (px)
              left: '50%',
              x: "-50%",
              y: "0%",
              scale: 1,
              opacity: 0.95
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5,
              ease: "easeInOut",
              times: [0, 0.7, 1],
              opacity: { duration: 2, times: [0, 0.7, 1] }
            }}
            className="max-w-[340px] text-2xl font-extrabold text-white bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 rounded-2xl shadow-2xl whitespace-nowrap pointer-events-none border-4 border-yellow-200"
          >
            {showHintAnimation}
          </motion.div>
        )}
      </AnimatePresence>
      {/* 고정 힌트 박스 (로봇 아래) */}
      {fixedHint && !showHintAnimation && (
        <div
          className="fixed z-30"
          style={{
            top: 250,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="max-w-[340px] text-2xl font-extrabold text-white bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 rounded-2xl shadow-2xl whitespace-nowrap border-4 border-yellow-200">
            {fixedHint}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        <div style={{ position: 'relative' }}>
          <GameHeader
            currentRound={gameState.currentRound}
            maxRound={gameState.maxRound}
            isReading={gameState.isReading}
            onBack={onBack}
          />
          {/* 오른쪽 하단 60초 타이머+게이지바 */}
          <div style={{ position: 'absolute', right: 40, bottom: 24, width: 180, zIndex: 30 }} className="flex flex-col items-end">
            <div className="text-3xl font-extrabold text-white mb-1 drop-shadow-lg">{gameState.timeLeft}초</div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-3 bg-gradient-to-r from-blue-400 to-red-400 transition-all duration-500"
                style={{ width: `${(gameState.timeLeft / 60) * 100}%` }}
              />
            </div>
          </div>
        </div>




        {/* 정답 표시 */}
        <AnimatePresence>
          {gameState.showCorrectAnswer && gameState.correctAnswer && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-green-500 rounded-3xl shadow-2xl border-4 border-yellow-300 p-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">
                    {gameState.correctAnswer}
                  </h2>
                  <p className="text-xl text-white font-semibold mb-4">
                    {gameState.correctArtist}
                  </p>
                  <motion.div
                    className="text-lg text-white font-semibold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    {(() => {
                      const winner = players.find(p => String(p.id) === String(gameState.roundWinner));
                      console.log('정답창 - roundWinner:', gameState.roundWinner);
                      console.log('정답창 - 찾은 플레이어:', winner);
                      console.log('정답창 - 닉네임:', winner?.nickname);
                      console.log('정답창 - 플레이어 ID들:', players.map(p => ({ id: p.id, type: typeof p.id })));
                      return winner?.nickname ? `${winner.nickname}님이 맞췄습니다!` : '정답입니다!';
                    })()}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <GameScoreboard players={playersWithScores} />
          </div>
          <div className="lg:col-span-2">
            <GameChat
              messages={chatMessages}
              chatInput={chatInput}
              isReading={gameState.isReading}
              onChatInputChange={setChatInput}
              onChatSubmit={handleChatSubmit}
            />
          </div>
        </div>
        <GameResultModal
          isOpen={showResults}
          players={playersWithScores}
          onClose={handleCloseResult}
        />
      </div>
    </div>
  );
};

export default FlatLyricsGame;
