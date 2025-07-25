// components/game/RandomSongGame.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { sendGameMessage, sendKeywordConfirm, disconnectGameSocket } from "@/lib/gameSocket";
import { PREDEFINED_TAGS } from "@/lib/tags";
import GameResultModal from "@/components/game/GameResultModal";
import { Card } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// 훅들 import
import { useGameConnection } from "@/hooks/useGameConnection";
import { useGameState } from "@/hooks/useGameState";

// 컴포넌트들 import
import { WaitingRoom } from "@/components/RandomSongGame/RandomSongWaitingRoom"
import { PlayingScreen } from "@/components/RandomSongGame/RandomSongPlayingScreen";
import { ConnectionModal } from "@/components/RandomSongGame/ConnectionModal";

interface RandomSongGameProps {
  user: any;
  room: any;
  players: any[];
  onBack: () => void;
  onGameEnd: (results: any[]) => void;
  onGameStart?: () => void;
  isAISongGame?: boolean;
  onPlayersUpdate?: (players: any[]) => void;
}

const RandomSongGame = ({
  user,
  room,
  players,
  onBack,
  onGameEnd,
  isAISongGame,
  onGameStart,
  onPlayersUpdate,
}: RandomSongGameProps) => {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // 상태 관리
  const {
    gameSession,
    setGameSession,
    loading,
    setLoading,
    phase,
    setPhase,
    countdown,
    roundTimer,
    setRoundTimer,
    chatMessages,
    setChatMessages,
    showAnswerModal,
    setShowAnswerModal,
    answerModalData,
    setAnswerModalData,
    showGameEndModal,
    setShowGameEndModal,
    showNoAnswerModal,
    setShowNoAnswerModal,
    noAnswerModalContent,
    showRoundNotification,
    showHintAnimation,
    setShowHintAnimation,
    winnerAnimatedScore,
    setWinnerAnimatedScore,
    progress,
    setProgress,
    selectedTagIds,
    setSelectedTagIds,
    isKeywordConfirmed,
    setIsKeywordConfirmed,
    roundTimerIntervalRef,
    currentRoundRef,
    maxRoundRef,
    gameHandlers,
    resetGameState
  } = useGameState();

  // 추가 상태들
  const [hasUserInteractedForAudio, setHasUserInteractedForAudio] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveModalMessage, setLeaveModalMessage] = useState('');
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [playersState, setPlayersState] = useState(players);
  const isBlockingRef = useRef(true);
  const [showReconnectSuccess, setShowReconnectSuccess] = useState<string | null>(null);
  const isHost = user.id === room.hostId;
  

  // 게임 연결 관리
  const {
    socketConnected,
    showConnectionModal,
    isReconnecting,
    handleManualReconnect,
    handleLeaveToLobby,
  } = useGameConnection({
    roomId: room.roomId,
    phase,
    ...gameHandlers,
    onReconnectSuccess: () => {
      console.log("🎉 onReconnectSuccess 콜백 호출됨!");
      // 재연결 성공 시 메시지 표시
      setShowReconnectSuccess("🔄 재연결 완료!");
      console.log("✅ showReconnectSuccess 상태 설정됨:", "재연결 성공 메시지");
      setTimeout(() => {
        setShowReconnectSuccess(null);
        console.log("⏰ showReconnectSuccess 상태 초기화됨");
      }, 4000);
    },
    onMessage: (msg: any) => {
      
      if (msg.type === "PLAYER_UPDATE") {
        onPlayersUpdate?.(msg.players);
        console.log("Player update received:", msg.players);
      } else if (
        msg.messageType === "TALK" ||
        msg.messageType === "ENTER" ||
        msg.messageType === "LEAVE"
      ) {
        setChatMessages((prev) => [...prev, msg]);
      }
    },
  });

  // Players 상태 동기화
  useEffect(() => {
    setPlayersState(players);
  }, [players]);

  // 키보드 입력 시 채팅창 자동 포커스
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 게임 중이고, 입력창이 포커스 안 되어 있을 때
      if (phase === "playing") {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        
        // 특수키가 아닌 일반 문자 입력시
        if (!isInputFocused && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          const chatInput = document.querySelector('input[placeholder*="메시지"], input[placeholder*="채팅"], textarea') as HTMLInputElement | HTMLTextAreaElement;
          if (chatInput) {
            chatInput.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [phase]);

  // 게임 플레이 화면에서 채팅창 포커스
  useEffect(() => {
    if (phase === "playing") {
      setTimeout(() => {
        const chatInput = document.querySelector('input[placeholder*="메시지"], input[placeholder*="채팅"], textarea') as HTMLInputElement | HTMLTextAreaElement;
        if (chatInput) {
          chatInput.focus();
        }
      }, 100);
    }
  }, [phase]);

  // 뒤로가기/새로고침 차단
  useEffect(() => {
    if (phase === 'playing' || phase === 'countdown') {
      isBlockingRef.current = true;
      
      const handlePopState = (e: PopStateEvent) => {
        if (!isBlockingRef.current) return;
        
        setTimeout(() => {
          window.history.pushState(null, '', window.location.href);
        }, 0);
        
        setShowLeaveConfirmModal(true);
      };

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (!isBlockingRef.current) return;
        
        e.preventDefault();
        e.returnValue = '게임이 진행 중입니다. 정말로 나가시겠습니까?';
        return '게임이 진행 중입니다. 정말로 나가시겠습니까?';
      };

      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        isBlockingRef.current = false;
      };
    } else {
      isBlockingRef.current = false;
    }
  }, [phase]);

  // 오디오 재생 관리
  useEffect(() => {
    if (
      phase === "playing" &&
      gameSession?.currentSong?.audioUrl &&
      audioRef.current
    ) {
      audioRef.current.src = gameSession.currentSong.audioUrl;
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => {
          setHasUserInteractedForAudio(true);
        })
        .catch((e) => {
          if (e.name === "NotAllowedError") {
            setHasUserInteractedForAudio(false);
          }
        });
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [phase, gameSession?.currentSong?.audioUrl]);

  // 힌트 애니메이션 타이밍
  useEffect(() => {
    if (
      phase !== "playing" ||
      !gameSession?.serverStartTime ||
      !gameSession?.currentSong ||
      showAnswerModal
    ) return;

    const elapsed = Date.now() - gameSession.serverStartTime;
    const timeLeft = Math.max(0, 30 - Math.floor(elapsed / 1000));

    if (timeLeft === 20 && !showHintAnimation) {
      setShowHintAnimation(`🎤 가수: ${gameSession.currentSong.artist}`);
      setTimeout(() => setShowHintAnimation(null), 2000);
    }

    if (timeLeft === 10 && !showHintAnimation) {
      setShowHintAnimation(`💡 제목 힌트: ${gameSession.currentSong.hint}`);
      setTimeout(() => setShowHintAnimation(null), 2000);
    }
  }, [phase, roundTimer, gameSession?.serverStartTime, gameSession?.currentSong, showHintAnimation]);

  // 효과음 재생
  useEffect(() => {
    if (phase === "countdown" && countdown > 0) {
      const countdownSound = new Audio("/audio/countdown_ssg.mp3");
      countdownSound.volume = 0.6;
      countdownSound.play().catch(console.error);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "final") {
      const finalSound = new Audio("/audio/final.wav");
      finalSound.volume = 0.7;
      finalSound.play().catch(console.error);
    }
  }, [phase]);

  useEffect(() => {
    if (showAnswerModal) {
      const correctSound = new Audio("/audio/ai.wav");
      correctSound.volume = 0.5;
      correctSound.play().catch(console.error);
    }
  }, [showAnswerModal]);

  useEffect(() => {
    if (showNoAnswerModal) {
      const failSound = new Audio("/audio/fail.mp3");
      failSound.volume = 0.5;
      failSound.play().catch(console.error);
    }
  }, [showNoAnswerModal]);

  // 입장 효과음
  useEffect(() => {
    const audio = new Audio("/audio/entersound.wav");
    audio.play().catch(console.error);
  }, []);

  // 정답자 점수 애니메이션
  const winner = players.find(p => p.nickname === answerModalData?.winnerNickname);
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

      return () => clearInterval(interval);
    }
  }, [showAnswerModal, winnerScore, winner]);

  // 프로그레스바 애니메이션
  useEffect(() => {
    if (!showNoAnswerModal) return;

    let frameId: number;
    const duration = 2500;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const value = Math.min((elapsed / duration) * 100, 100);
      setProgress(value);

      if (elapsed < duration) {
        frameId = requestAnimationFrame(step);
      }
    };

    setProgress(0);
    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, [showNoAnswerModal]);

  // 핸들러 함수들
  const handleSendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    sendGameMessage(room.roomId, user.id, user.nickname, trimmed);

    if (phase === "playing") {
      try {
        await api.post(`/api/game-session/${room.roomId}/answer`, {
          answer: trimmed,
        });
      } catch (err) {
        console.error("정답 제출 실패:", err);
      }
    }
  };

  const handleStartGame = async () => {
    const keywordNames = selectedTagIds
      .map((id) => PREDEFINED_TAGS.find((tag) => tag.id === id)?.name)
      .filter((name): name is string => !!name);

    try {
      await api.post(`/api/game-session/${room.roomId}/start`, {
        keywords: keywordNames,
      });
      setLoading(false);
    } catch (error) {
      console.error("게임 시작 실패:", error);
    }
  };

  const handleKeywordConfirm = () => {
    sendKeywordConfirm(room.roomId, selectedTagIds);
    setIsKeywordConfirmed(true);
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setHasUserInteractedForAudio(true);
        })
        .catch(console.error);
    }
  };

  const handleLeaveRoom = () => {
    const gameInProgress = phase === 'playing' || phase === 'countdown';
    let confirmMessage = '방을 나가시겠습니까?';
    
    if (gameInProgress) {
      confirmMessage = room.roomType === "QUICK_MATCH" 
        ? '빠른대전을 종료하시겠습니까? 결과가 저장됩니다.'
        : '게임이 진행 중입니다. 나가시면 게임에서 제외됩니다. 계속하시겠습니까?';
    }
    
    setLeaveModalMessage(confirmMessage);
    setShowLeaveModal(true);
  };

  const confirmLeaveRoom = async () => {
    try {
      if (roundTimerIntervalRef.current) {
        clearInterval(roundTimerIntervalRef.current);
      }

      if (room.roomType === "QUICK_MATCH") {
        await api.post("/api/quick-match/end", null, {
          params: { roomCode: room.roomCode },
        });

        const resultRes = await api.get("/api/quick-match/result", {
          params: { roomCode: room.roomCode },
        });

        localStorage.setItem("quickMatchResult", JSON.stringify(resultRes.data));
        router.push("/lobby");
      } else {
        await api.delete(`/api/room/${room.roomId}/leave`);
        router.push("/lobby");
      }
    } catch (error) {
      console.error("방 나가기 실패:", error);
      router.push("/lobby");
    } finally {
      setShowLeaveModal(false);
    }
  };


  const handleConfirmLeave = () => {
    isBlockingRef.current = false;
    setShowLeaveConfirmModal(false);
    
    setTimeout(() => {
      router.push('/lobby');
    }, 100);
  };

  const handleStayInGame = () => {
    setShowLeaveConfirmModal(false);
    
    setTimeout(() => {
      if (isBlockingRef.current) {
        window.history.pushState(null, '', window.location.href);
      }
    }, 100);
  };

  const handleCloseResult = async () => {
    setShowGameEndModal(false);
    try {
      await api.delete(`/api/room/${room.roomId}/leave`);
    } catch (e) {
      // 실패해도 로비로 이동
    }
    window.location.href = "/lobby";
  };

  const playersWithFinalScores = players.map((player) => ({
    ...player,
    score: gameSession?.playerScores?.[player.id] || 0,
  }));

  // 강제 연결 끊기 함수 (테스트용)
  const handleForceDisconnect = useCallback(() => {
    console.log("🧪 LP판 클릭됨 - 연결 끊기 시도");
    
    try {
      disconnectGameSocket();
      console.log("✅ disconnectGameSocket() 호출 완료");
    } catch (error) {
      console.error("❌ disconnectGameSocket() 호출 실패:", error);
    }
  }, []);

  // 로딩 중
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;
  }

  // Phase별 렌더링
  if (phase === "waiting") {
    return (
      <>
        <WaitingRoom
          user={user}
          room={room}
          players={playersState}
          selectedTagIds={selectedTagIds}
          isKeywordConfirmed={isKeywordConfirmed}
          chatMessages={chatMessages}
          onLeaveRoom={handleLeaveRoom}
          onStartGame={handleStartGame}
          onKeywordConfirm={handleKeywordConfirm}
          onTagSelectionChange={(newSelectedIds) => {
            setSelectedTagIds(newSelectedIds);
            setIsKeywordConfirmed(false);
          }}
          onSendMessage={handleSendMessage}
        />
        <LeaveModal 
          show={showLeaveModal}
          message={leaveModalMessage}
          onCancel={() => setShowLeaveModal(false)}
          onConfirm={confirmLeaveRoom}
        />
      </>
    );
  }

  if (phase === "countdown") {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500 p-4">
          <Card className="bg-white/90 backdrop-blur-sm p-6 lg:p-12 text-center max-w-sm lg:max-w-none">
            <div className="text-6xl lg:text-8xl font-bold text-transparent bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text mb-4">
              {countdown}
            </div>
            <div className="text-lg lg:text-2xl font-semibold text-gray-700">
              게임이 곧 시작됩니다!
            </div>
          </Card>
        </div>
        <ConnectionModal
          show={showConnectionModal}
          isReconnecting={isReconnecting}
          onReconnect={handleManualReconnect}
          onLeaveToLobby={handleLeaveToLobby}
        />
        <LeaveConfirmModal
          show={showLeaveConfirmModal}
          onStay={handleStayInGame}
          onLeave={handleConfirmLeave}
        />
      </>
    );
  }

  if (phase === "playing") {
    return (
      <>
        <PlayingScreen
          user={user}
          gameSession={gameSession}
          roundTimer={roundTimer}
          players={playersState}
          chatMessages={chatMessages}
          showRoundNotification={showRoundNotification}
          showHintAnimation={showHintAnimation}
          showReconnectSuccess={showReconnectSuccess}
          hasUserInteractedForAudio={hasUserInteractedForAudio}
          onLeaveRoom={handleLeaveRoom}
          onSendMessage={handleSendMessage}
          onPlayAudio={handlePlayAudio}
          onForceDisconnect={handleForceDisconnect}
          audioRef={audioRef}
        />

        {/* 정답 모달 */}
        <AnswerModal
          show={showAnswerModal}
          data={answerModalData}
          winner={winner}
          animatedScore={winnerAnimatedScore}
        />

        {/* 오답 모달 */}
        <NoAnswerModal
          show={showNoAnswerModal}
          content={noAnswerModalContent}
        />

        <ConnectionModal
          show={showConnectionModal}
          isReconnecting={isReconnecting}
          onReconnect={handleManualReconnect}
          onLeaveToLobby={handleLeaveToLobby}
        />

        <LeaveModal 
          show={showLeaveModal}
          message={leaveModalMessage}
          onCancel={() => setShowLeaveModal(false)}
          onConfirm={confirmLeaveRoom}
        />

        <LeaveConfirmModal
          show={showLeaveConfirmModal}
          onStay={handleStayInGame}
          onLeave={handleConfirmLeave}
        />
      </>
    );
  }

  // Final phase
  return (
    <div className="min-h-screen p-2 md:p-4 bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500">
      <GameResultModal
        isOpen={showGameEndModal}
        players={playersWithFinalScores}
        onClose={handleCloseResult}
        onRestart={resetGameState}
        gameType="random"
        onLeaveRoom={confirmLeaveRoom}
      />
    </div>
  );
};

// 서브 모달 컴포넌트들
const LeaveModal = ({ show, message, onCancel, onConfirm }: {
  show: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center">
          <div className="text-2xl mb-4">🚪</div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">방 나가기</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              나가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeaveConfirmModal = ({ show, onStay, onLeave }: {
  show: boolean;
  onStay: () => void;
  onLeave: () => void;
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            게임을 나가시겠습니까?
          </h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            게임이 진행 중입니다.<br/>
            나가시면 게임에서 제외되며 점수가 저장되지 않습니다.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onStay}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              계속 게임하기
            </button>
            <button
              onClick={onLeave}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              나가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnswerModal = ({ show, data, winner, animatedScore }: {
  show: boolean;
  data: any;
  winner: any;
  animatedScore: number;
}) => {
  if (!show || !data) return null;

  return (
    <Dialog open={show} onOpenChange={() => {}}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] text-center mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="text-3xl lg:text-4xl font-bold text-green-600 mb-2">
            🎉 정답입니다!
          </div>
          {winner && (
            <div className="flex flex-col items-center gap-2">
              <Avatar className="w-16 h-16 lg:w-20 lg:h-20">
                <AvatarImage src={winner.avatar} />
                <AvatarFallback>{winner.nickname[0]}</AvatarFallback>
              </Avatar>
              <div className="text-lg lg:text-xl font-semibold text-purple-800">
                {winner.nickname} 님이 정답을 맞췄어요!
              </div>
              <div className="flex flex-col items-center gap-2 relative">
                <motion.div
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -40, scale: 1.3 }}
                  transition={{ duration: 2.0, ease: "easeOut" }}
                  className="absolute -top-6 lg:-top-8 ml-[100px] lg:ml-[150px] text-lg lg:text-xl font-bold text-yellow-400 drop-shadow-md z-10"
                >
                  +{data?.scoreGain ?? 0}점!
                </motion.div>
                <div className="text-xl lg:text-2xl font-bold text-blue-700">
                  현재 점수: {animatedScore}점
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 text-base lg:text-lg text-gray-700">
            정답: "{data?.correctTitle}"
          </div>
          <p className="text-xs lg:text-sm text-gray-500 mt-2">
            다음 라운드로 이동 중...
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

const NoAnswerModal = ({ show, content }: {
  show: boolean;
  content: { title: string; subtitle: string };
}) => {
  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={() => {}}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] text-center mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="text-3xl lg:text-4xl mb-2"
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
            }}
          >
            😢
          </motion.div>
          <h2 className="text-lg lg:text-xl font-bold text-red-600">
            정답자가 없습니다!
          </h2>
          <p className="text-sm lg:text-base text-gray-600 mt-2">
            정답: "<span className="text-blue-600 font-semibold">{content.subtitle}</span>"
          </p>
          <div className="mt-6">
            <p className="text-xs lg:text-sm text-gray-500 mt-1">
              3초 후 다음 라운드로 이동합니다...
            </p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default RandomSongGame;