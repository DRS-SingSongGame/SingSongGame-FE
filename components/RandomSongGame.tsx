import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import KeywordSelector from "@/components/KeywordSelector";
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
import {
  connectGameSocket,
  disconnectGameSocket,
  sendGameMessage,
  sendKeywordConfirm,
} from "@/lib/gameSocket";
import ChatBox, { ChatMessage, ChatBoxRef } from "./chat/ChatBox";
import axios from "axios";
import { PREDEFINED_TAGS } from "@/lib/tags";
import KeywordDisplay from "@/components/KeywordDisplay";
import GameResultModal from "@/components/game/GameResultModal";

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

interface GameSessionType {
  currentRound: number;
  maxRound: number;
  currentSong?: {
    artist: string;
    title: string;
    hint: string;
    audioUrl: string;
  };
  roundDuration: number;
  playerScores: Record<string, number>;
  winner?: string;
  serverStartTime: number;
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
  onPlayersUpdate,
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
    scoreGain: number;
  } | null>(null);
  const currentRoundRef = useRef<number>(0);
  const maxRoundRef = useRef<number>(0);
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
  const isHost = user.id === room.hostId;

  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [showRoundNotification, setShowRoundNotification] = useState(false);
  const [showHintAnimation, setShowHintAnimation] = useState<string | null>(
    null
  );
  const [isKeywordConfirmed, setIsKeywordConfirmed] = useState(false);
  const chatBoxRef = useRef<ChatBoxRef>(null);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveModalMessage, setLeaveModalMessage] = useState('');

  useEffect(() => {
    if (phase === "playing") {
      setTimeout(() => {
        chatBoxRef.current?.focusInput();
      }, 100);
    }
  }, [phase]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 게임 중이고, 입력창이 포커스 안 되어 있을 때
      if (phase === "playing" && document.activeElement !== inputRef.current) {
        // 특수키가 아닌 일반 문자 입력시
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          inputRef.current?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [phase]);

  // 정답자가 없는 경우 프로그레스바 애니메이션 //

  useEffect(() => {
    if (phase === "countdown" && countdown > 0) {
      const countdownSound = new Audio("/audio/countdown_ssg.mp3");
      countdownSound.volume = 0.6; // 적절한 볼륨
      countdownSound.play().catch((error) => {
        console.error("카운트다운 효과음 재생 실패:", error);
      });
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "final") {
      const countdownSound = new Audio("/audio/final.wav");
      countdownSound.volume = 0.7; // 적절한 볼륨
      countdownSound.play().catch((error) => {
        console.error("카운트다운 효과음 재생 실패:", error);
      });
    }
  }, [phase]);

  useEffect(() => {
    if (!showNoAnswerModal) return;

    let frameId: number;
    const duration = 2500; // 3초
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

    // 강제 초기화 후 시작
    setProgress(0);
    frameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frameId);
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
        console.log("Game WebSocket Message:", msg);
        // 플레이어 목록 업데이트
        if (msg.type === "PLAYER_UPDATE") {
          // 플레이어 정보 업데이트 로직이 필요하다면 여기에 추가
          onPlayersUpdate?.(msg.players); // ✅ 부모에게 알림
          console.log("Player update received:", msg.players);
        }
        // 채팅 메시지 (게임 내 채팅)
        else if (
          msg.messageType === "TALK" ||
          msg.messageType === "ENTER" ||
          msg.messageType === "LEAVE"
        ) {
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

        setShowRoundNotification(true);
        setTimeout(() => setShowRoundNotification(false), 2000);

        currentRoundRef.current = response.round;
        maxRoundRef.current = response.maxRound;

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
          serverStartTime: response.serverStartTime, // Set client-side start time for timer
          roundDuration: 30, // Assuming 30 seconds as per backend InGameService
          playerScores: response.playerScores || prev?.playerScores,
          maxRound: response.maxRound || prev?.maxRound,
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
        setTimeout(() => {
          chatBoxRef.current?.focusInput();
        }, 200);
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
          correctTitle: response.correctTitle,
        }));

        // Show answer modal
        setAnswerModalData({
          winnerNickname: response.winnerNickname,
          correctAnswer: response.correctAnswer,
          correctTitle: response.correctTitle,
          scoreGain: response.scoreGain ?? 0,
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
        if (roundTimerIntervalRef.current) {
          clearInterval(roundTimerIntervalRef.current);
        }

        if (response.finalResults) {
          const finalScores: { [key: string]: number } = {}; // 타입 명시
          response.finalResults.forEach((result: any) => {
            // result 타입 명시
            finalScores[result.userId] = result.score;
          });

          setGameSession((prev) => {
            if (!prev) return prev; // null 체크 추가
            return {
              ...prev, // 기존 모든 속성 유지
              playerScores: finalScores, // playerScores만 업데이트
            };
          });
        }
        // if (onGameEnd && response.finalResults) {
        //   onGameEnd(response.finalResults);
        // }

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
  }, [room.roomId]); // Add onGameEnd to dependency array

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

  // players 상태를 내부에서 관리
  const [playersState, setPlayersState] = useState(players);
  useEffect(() => {
    setPlayersState(players);
  }, [players]);

  const playersWithFinalScores = players.map((player) => ({
    ...player,
    score: gameSession?.playerScores?.[player.id] || 0, // gameSession에서 직접
  }));

  const handleCloseResult = async () => {
    setShowGameEndModal(false);
    try {
      await api.delete(`/api/room/${room.roomId}/leave`);
    } catch (e) {
      // 실패해도 그냥 로비로 이동
    }
    window.location.href = "/lobby";
  };

  const handleRestart = () => {
    setPhase("waiting");
    setGameSession(null);
    setWinnerAnimatedScore(0);
    setAnswerModalData(null);
    setChatMessages([]);
    setGameEndResults([]);
    setShowGameEndModal(false);
  };

  // 대기실에서만 2초마다 플레이어 목록 새로고침
  // useEffect(() => {
  //   if (phase !== "waiting") return;
  //   const fetchPlayers = async () => {
  //     try {
  //       const res = await api.get(`/api/room/${room.roomId}`);
  //       setPlayersState((res.data as any).data.players);
  //     } catch (e) {}
  //   };
  //   const interval = setInterval(fetchPlayers, 2000);
  //   return () => clearInterval(interval);
  // }, [phase, room.roomId]);

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
        if (err && typeof err === "object" && "response" in err) {
          const axiosError = err as any;
          console.error(
            "❌ 정답 제출 실패:",
            axiosError.response?.data || axiosError.message
          );
        } else if (err instanceof Error) {
          console.error("❌ 정답 제출 실패:", err.message);
        } else {
          console.error("❌ 알 수 없는 에러", err);
        }
      }
    }
  };

  const handleLeaveRoom = async () => {
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
      console.log("🔁 나가기 시도, 현재 room:", room);

      if (roundTimerIntervalRef.current) {
        clearInterval(roundTimerIntervalRef.current);
      }
      if (nextRoundIntervalRef.current) {
        clearInterval(nextRoundIntervalRef.current);
      }

      if (room.roomType === "QUICK_MATCH") {
        const res = await api.post("/api/quick-match/end", null, {
          params: {
            roomCode: room.roomCode,
          },
        });
        const data = (res.data as any).data;

        const resultRes = await api.get("/api/quick-match/result", {
          params: {
            roomCode: room.roomCode,
          },
        });

        const resultData = (resultRes as any).data;
        localStorage.setItem("quickMatchResult", JSON.stringify(resultData));
        console.log("📦 빠른대전 결과 저장:", resultData);

        disconnectGameSocket();
        
        setTimeout(() => {
          router.push("/lobby");
        }, 100);
      } else {
        console.log("🚪 일반 방 나가기 호출 시작");

        await api.delete(`/api/room/${room.roomId}/leave`);

        disconnectGameSocket();

        router.push("/lobby");
      }
    } catch (error) {
      console.error("❌ 방 나가기 실패:", error);
      disconnectGameSocket();
      router.push("/lobby");
    } finally {
      // 모달 닫기 (성공하든 실패하든)
      setShowLeaveModal(false);
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
    console.log("🎯 gameSession 데이터:", gameSession);
    console.log("🎯 선택된 태그 IDs:", selectedTagIds);
    // id → name 매핑
    const keywordNames = selectedTagIds
      .map((id) => PREDEFINED_TAGS.find((tag) => tag.id === id)?.name)
      .filter((name): name is string => !!name); // string[] 보장
    console.log("🎯 전송할 키워드:", keywordNames);
    try {
      await api.post(`/api/game-session/${room.roomId}/start`, {
        keywords: keywordNames,
      });
      console.log("Game start API call successful.");
      setLoading(false);
    } catch (error) {
      console.error("Failed to start game:", error);
      // TODO: 에러 처리 (토스트 등)
    }
  };

  const handleKeywordConfirm = () => {
    sendKeywordConfirm(room.roomId, selectedTagIds);
    setIsKeywordConfirmed(true); // 키워드 확정 상태로 변경
  };

  const getCurrentHints = () => {
    const serverStartTime = gameSession?.serverStartTime;
    if (!serverStartTime || !gameSession?.currentSong) {
      return [];
    }

    const elapsed = Date.now() - serverStartTime;
    const timeLeft = Math.max(0, 30 - Math.floor(elapsed / 1000));

    const hints = [];

    // 중앙 팝업이 끝난 후에만 상단에 표시 (2초 딜레이 추가)
    if (timeLeft <= 18) {
      // 20초 - 2초(팝업 시간)
      hints.push(`🎤 가수: ${gameSession.currentSong.artist}`);
    }

    if (timeLeft <= 8) {
      // 10초 - 2초(팝업 시간)
      hints.push(`💡 제목 힌트: ${gameSession.currentSong.hint}`);
    }

    return hints;
  };

  // getCurrentHints()가 변할 때마다 체크
  useEffect(() => {
    if (
      phase !== "playing" ||
      !gameSession?.serverStartTime ||
      !gameSession?.currentSong ||
      showAnswerModal
    )
      return;

    const elapsed = Date.now() - gameSession.serverStartTime;
    const timeLeft = Math.max(0, 30 - Math.floor(elapsed / 1000));

    // 정확히 20초일 때 가수 힌트 팝업
    if (timeLeft === 20 && !showHintAnimation) {
      setShowHintAnimation(` 가수: ${gameSession.currentSong.artist}`);
      setTimeout(() => setShowHintAnimation(null), 2000);
    }

    // 정확히 10초일 때 제목 힌트 팝업
    if (timeLeft === 10 && !showHintAnimation) {
      setShowHintAnimation(` 제목 힌트: ${gameSession.currentSong.hint}`);
      setTimeout(() => setShowHintAnimation(null), 2000);
    }
  }, [
    phase,
    roundTimer,
    gameSession?.serverStartTime,
    gameSession?.currentSong,
    showHintAnimation,
  ]);

  // getCurrentHints()가 변할 때마다 체크
  useEffect(() => {
    if (
      phase !== "playing" ||
      !gameSession?.serverStartTime ||
      !gameSession?.currentSong ||
      showAnswerModal
    )
      return;

    const elapsed = Date.now() - gameSession.serverStartTime;
    const timeLeft = Math.max(0, 30 - Math.floor(elapsed / 1000));

    // 정확히 20초일 때 가수 힌트 팝업
    if (timeLeft === 20 && !showHintAnimation) {
      setShowHintAnimation(` 가수: ${gameSession.currentSong.artist}`);
      setTimeout(() => setShowHintAnimation(null), 2000);
    }

    // 정확히 10초일 때 제목 힌트 팝업
    if (timeLeft === 10 && !showHintAnimation) {
      setShowHintAnimation(` 제목 힌트: ${gameSession.currentSong.hint}`);
      setTimeout(() => setShowHintAnimation(null), 2000);
    }
  }, [
    phase,
    roundTimer,
    gameSession?.serverStartTime,
    gameSession?.currentSong,
    showHintAnimation,
  ]);

  useEffect(() => {
    const audio = new Audio("/audio/entersound.wav");
    audio.play();
  }, []);

  useEffect(() => {
    if (showAnswerModal) {
      const correctSound = new Audio("/audio/ai.wav");
      correctSound.volume = 0.5; // 음원보다 살짝 작게
      correctSound.play().catch(console.error);
    }
  }, [showAnswerModal]);

  useEffect(() => {
    if (showNoAnswerModal) {
      const failSound = new Audio("/audio/fail.mp3");
      failSound.volume = 0.5; // 적절한 볼륨으로 설정
      failSound.play().catch((error) => {
        console.error("효과음 재생 실패:", error);
      });
    }
  }, [showNoAnswerModal]);

  const renderLeaveModal = () => (
    showLeaveModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
          <div className="text-center">
            <div className="text-2xl mb-4">🚪</div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              방 나가기
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {leaveModalMessage}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmLeaveRoom}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  if (loading) return <div>로딩 중...</div>;

  // phase별 화면
  // 1. waiting 단계 - 모바일 반응형
  if (phase === "waiting") {
    const isQuickMatch = room?.roomType === "QUICK_MATCH";

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
                      onClick={handleLeaveRoom}
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
                  {/* 플레이어 목록 - 모바일: 2x3, 데스크톱: 3x2 */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                    {Array.from({ length: 6 }, (_, index) => {
                      const player = playersState[index];
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


                  {/* 안내 메시지 or 게임 시작/키워드 UI */}

                  {isQuickMatch ? (
                    <div className="text-center py-6 lg:py-8">
                      <p className="text-base lg:text-lg font-semibold text-gray-700">
                        ⏳ 곧 빠른대전이 시작됩니다...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center">
                        {isHost ? (
                          <>
                            {isKeywordConfirmed && selectedTagIds.length > 0 ? (
                              <Button
                                onClick={handleStartGame}
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

                      {/* 키워드 선택 UI */}
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
                                  setSelectedTagIds(newSelectedIds);
                                  setIsKeywordConfirmed(false);
                                }}
                              />
                              <div className="flex justify-end mt-3 lg:mt-4">
                                <Button
                                  onClick={handleKeywordConfirm}
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
                  )}
                </CardContent>
              </Card>
            </div>
  
            {/* 데스크톱 채팅 영역 */}
            {!isQuickMatch && (
              <div className="hidden lg:flex w-80 h-[817px] bg-white/90 backdrop-blur-sm rounded-lg p-4 rounded-lg flex-col">
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
                    onSend={handleSendMessage}
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
                      onSend={handleSendMessage}
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
        {renderLeaveModal()}
      </div>
    );
    
    
  }
  
  // 2. countdown 단계
  if (phase === "countdown") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500 p-4">
        <Card className="bg-white/90 backdrop-blur-sm p-6 lg:p-12 text-center max-w-sm lg:max-w-none">
          <div className="text-6xl lg:text-8xl font-bold text-transparent bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text mb-4">
            {countdown}
          </div>
          <div className="text-lg lg:text-2xl font-semibold text-gray-700">
            게임이 곧 시작됩니다!
          </div>
        </Card>
        {renderLeaveModal()}
      </div>
    );
  }

  if (phase === "playing") {
    return (
      <div className="min-h-screen p-2 md:p-4 bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500">
        {/* 라운드 알림 */}
        {showRoundNotification && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}

              className="text-xl lg:text-4xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 px-4 lg:px-8 py-2 lg:py-4 rounded-xl lg:rounded-2xl shadow-2xl"

            >
              Round {gameSession?.currentRound} 시작!
            </motion.div>
          </div>
        )}
        
        {/* 힌트 애니메이션 */}
        {showHintAnimation && (
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
              {showHintAnimation}
            </motion.div>
          </div>
        )}
        
        <div className="max-w-6xl mx-auto">
          {/* 뒤로가기 버튼 */}
          <Button
            variant="outline"
            onClick={handleLeaveRoom}
            className="mb-2 lg:mb-4 bg-white/90 backdrop-blur-sm text-sm lg:text-base px-3 lg:px-4 py-1.5 lg:py-2"
          >
            <ArrowLeft className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            나가기
          </Button>

  
          {/* 게임 헤더 - 모바일에서 컴팩트하게 */}
          <Card className="bg-white/90 backdrop-blur-sm mb-3 lg:mb-6">
            <CardHeader className="p-3 lg:p-6">
              <div className="flex flex-col gap-2 lg:gap-4 lg:flex-row lg:justify-between lg:items-center">
                
                {/* 상단 라인: 라운드 정보 + 타이머 */}
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
                  
                  {/* 타이머 - 모바일에서 작게 */}
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
                </div>
  

                {/* 힌트 + LP판 영역 - 데스크톱에서 나란히 배치 */}
                <div className="w-full lg:flex lg:items-center lg:justify-between lg:gap-8">
                  {/* 힌트 영역 */}
                  <div className="flex-1">
                    {getCurrentHints().length === 0 ? (
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
                        {getCurrentHints().map((hint, index) => (
                          <motion.span
                            key={`${index}-${Math.floor((Date.now() - (gameSession?.serverStartTime || 0)) / 10000)}`}
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

                  {/* LP판 애니메이션 - 데스크톱에서만 표시 */}
                  <div className="hidden lg:flex items-center justify-center lg:w-28">
                    <div className="relative">
                      {/* LP판 */}
                      <div 
                        className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 via-gray-900 to-black shadow-2xl relative overflow-hidden animate-spin"
                        style={{ 
                          animationDuration: '3s',
                          animationTimingFunction: 'linear',
                          animationIterationCount: 'infinite'
                        }}
                      >
                        {/* LP판 중앙 홀 */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-red-500 shadow-inner"></div>
                        </div>
                        {/* LP판 홈 (선들) */}
                        <div className="absolute inset-2 rounded-full border border-gray-600 opacity-30"></div>
                        <div className="absolute inset-4 rounded-full border border-gray-600 opacity-20"></div>
                        <div className="absolute inset-6 rounded-full border border-gray-600 opacity-10"></div>
                        {/* 회전을 더 잘 보이게 하는 마크 */}
                        <div className="absolute top-2 left-1/2 w-1 h-4 bg-white opacity-50 transform -translate-x-1/2"></div>
                      </div>
                      
                      {/* 턴테이블 톤암 */}
                      <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                        <div className="w-8 h-1 bg-gray-400 rounded-full shadow-sm transform rotate-12 origin-left"></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full absolute -right-1 top-1/2 transform -translate-y-1/2"></div>
                      </div>
                    </div>
                  </div>
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

          
          {/* 메인 게임 영역 */}
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
            
            {/* 채팅 영역 - 모바일에서 첫 번째, 더 높게 */}
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
                      onSend={handleSendMessage} 
                      autoScrollToBottom={true} 
                      chatType="room"
                      className="h-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
  
            {/* 점수판 - 모바일에서 두 번째, 컴팩트하게 */}
            <div className="lg:order-1">
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardHeader className="p-3 lg:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm lg:text-lg">
                    <Users className="w-4 h-4 lg:w-5 lg:h-5" />
                    점수 현황
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 lg:p-6 pt-0">
                  <div className="space-y-2">
                    {playersState
                      .map((player) => ({
                        ...player,
                        score: gameSession?.playerScores?.[player.id] || 0,
                      }))
                      .sort((a, b) => b.score - a.score)
                      .map((player, index) => (
                        <div
                          key={player.id}
                          className={`flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg transition-all duration-500 ${
                            player.nickname === gameSession?.winner
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
            </div>
          </div>
  
          {/* 오디오 재생 버튼 */}
          {!hasUserInteractedForAudio && (
            <div className="text-center mt-3 lg:mt-4">
              <Button
                onClick={handlePlayAudio}
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
          )}
  
          <audio ref={audioRef} />
        </div>


        {/* 정답 모달 */}
      {showAnswerModal && answerModalData && (
        <Dialog open={showAnswerModal} onOpenChange={setShowAnswerModal}>
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
                      key="score-change"
                      initial={{ opacity: 1, y: 0, scale: 1 }}
                      animate={{ opacity: 0, y: -40, scale: 1.3 }}
                      transition={{ duration: 2.0, ease: "easeOut" }}
                      className="absolute -top-6 lg:-top-8 ml-[100px] lg:ml-[150px] text-lg lg:text-xl font-bold text-yellow-400 drop-shadow-md z-10"
                    >
                      +{answerModalData?.scoreGain ?? 0}점!
                    </motion.div>
                    <div className="text-xl lg:text-2xl font-bold text-blue-700">
                      현재 점수:{" "}
                      <motion.span
                        key={winnerAnimatedScore}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        className="inline-block"
                      >
                        {winnerAnimatedScore}점
                      </motion.span>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-4 text-base lg:text-lg text-gray-700">
                정답: "{answerModalData?.correctTitle}"
              </div>
              <p className="text-xs lg:text-sm text-gray-500 mt-2">
                다음 라운드로 이동 중...
              </p>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
        {/* 나가기 확인 모달 */}
          {showLeaveModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
                <div className="text-center">
                  <div className="text-2xl mb-4">🚪</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    방 나가기
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {leaveModalMessage}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLeaveModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={confirmLeaveRoom}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      나가기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* 오답 모달 */}
      {showNoAnswerModal && (
        <Dialog
          open={showNoAnswerModal}
          onOpenChange={handleCloseNoAnswerModal}
        >
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
                정답: "
                <span className="text-blue-600 font-semibold">
                  {noAnswerModalContent.subtitle}
                </span>
                "
              </p>
              <div className="mt-6">
                <p className="text-xs lg:text-sm text-gray-500 mt-1">
                  3초 후 다음 라운드로 이동합니다...
                </p>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
      {renderLeaveModal()}
    </div>
  );
}



return (
  <div className="min-h-screen p-2 md:p-4 bg-gradient-to-br from-cyan-400 via-blue-500 via-purple-500 to-pink-500">
    <GameResultModal
      isOpen={showGameEndModal}
      players={playersWithFinalScores}
      onClose={handleCloseResult}
      onRestart={handleRestart}
      gameType="random"
      onLeaveRoom={confirmLeaveRoom}
    />
  </div>
  
  );

  return null;
};

export default RandomSongGame;
