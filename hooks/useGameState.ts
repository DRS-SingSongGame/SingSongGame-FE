// hooks/useGameState.ts
import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/components/chat/ChatBox';

export interface GameSessionType {
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

export type Phase = "waiting" | "countdown" | "playing" | "final";

interface AnswerModalData {
  winnerNickname: string;
  correctAnswer: string;
  correctTitle: string;
  scoreGain: number;
}

interface NoAnswerModalContent {
  title: string;
  subtitle: string;
}

export const useGameState = () => {
  // 게임 기본 상태
  const [gameSession, setGameSession] = useState<GameSessionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("waiting");
  
  // 타이머 관련
  const [countdown, setCountdown] = useState<number>(0);
  const [roundTimer, setRoundTimer] = useState<number>(0);
  const roundTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 채팅
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // 모달 상태들
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [answerModalData, setAnswerModalData] = useState<AnswerModalData | null>(null);
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  const [showNoAnswerModal, setShowNoAnswerModal] = useState(false);
  const [noAnswerModalContent, setNoAnswerModalContent] = useState<NoAnswerModalContent>({
    title: "", 
    subtitle: ""
  });
  
  // 애니메이션 관련
  const [showRoundNotification, setShowRoundNotification] = useState(false);
  const [showHintAnimation, setShowHintAnimation] = useState<string | null>(null);
  const [winnerAnimatedScore, setWinnerAnimatedScore] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // 키워드 관련
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isKeywordConfirmed, setIsKeywordConfirmed] = useState(false);
  
  // Refs
  const currentRoundRef = useRef<number>(0);
  const maxRoundRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("waiting");

  // Phase ref 동기화
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // 타이머 정리
  const clearTimers = () => {
    if (roundTimerIntervalRef.current) {
      clearInterval(roundTimerIntervalRef.current);
      roundTimerIntervalRef.current = null;
    }
  };

  // 게임 상태 초기화
  const resetGameState = () => {
    setPhase("waiting");
    setGameSession(null);
    setWinnerAnimatedScore(0);
    setAnswerModalData(null);
    setChatMessages([]);
    setShowGameEndModal(false);
    clearTimers();
  };

  // 게임 핸들러들
  const gameHandlers = {
    onConnect: (frame: any) => {
      console.log("WebSocket Connected:", frame);
      setLoading(false);
    },
    
    onMessage: (msg: any) => {
      console.log("Game WebSocket Message:", msg);
      if (msg.messageType === "TALK" || msg.messageType === "ENTER" || msg.messageType === "LEAVE") {
        setChatMessages((prev) => [...prev, msg]);
      }
    },
    
    onGameStartCountdown: (response: any) => {
      console.log("Game Start Countdown:", response);
      setPhase("countdown");
      setCountdown(response.countdownSeconds);
      
      let currentCountdown = response.countdownSeconds;
      const interval = setInterval(() => {
        currentCountdown--;
        if (currentCountdown >= 0) {
          setCountdown(currentCountdown);
        } else {
          clearInterval(interval);
        }
      }, 1000);
    },
    
    onRoundStart: (response: any) => {
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
          hint: response.hint,
          title: response.title,
        },
        serverStartTime: response.serverStartTime,
        roundDuration: 30,
        playerScores: response.playerScores || prev?.playerScores,
        maxRound: response.maxRound || prev?.maxRound,
      }));
      
      clearTimers();
      let currentRoundTime = 30;
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
        const chatInput = document.querySelector('input[placeholder*="메시지"], input[placeholder*="채팅"], textarea') as HTMLInputElement | HTMLTextAreaElement;
        if (chatInput) {
          chatInput.focus();
        }
      }, 200);
    },
    
    onAnswerCorrect: (response: any) => {
      console.log("Answer Correct:", response);
      
      setGameSession((prev: any) => ({
        ...prev,
        winner: response.winnerNickname,
        playerScores: response.updatedScores || prev?.playerScores,
        correctTitle: response.correctTitle,
      }));
      
      setAnswerModalData({
        winnerNickname: response.winnerNickname,
        correctAnswer: response.correctAnswer,
        correctTitle: response.correctTitle,
        scoreGain: response.scoreGain ?? 0,
      });
      setShowAnswerModal(true);
      
      setTimeout(() => {
        setShowAnswerModal(false);
        setAnswerModalData(null);
      }, 5000);
    },
    
    onRoundFailed: (data: any) => {
      setNoAnswerModalContent({
        title: "정답자가 없습니다 😢",
        subtitle: `제목: ${data.title}`,
      });
      setShowNoAnswerModal(true);
      
      setTimeout(() => {
        setShowNoAnswerModal(false);
      }, 3000);
    },
    
    onGameEnd: (response: any) => {
      clearTimers();
      
      if (response.finalResults) {
        const finalScores: { [key: string]: number } = {};
        response.finalResults.forEach((result: any) => {
          finalScores[result.userId] = result.score;
        });
        
        setGameSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            playerScores: finalScores,
          };
        });
      }
      
      setPhase("final");
      setShowGameEndModal(true);
    }
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  return {
    // 상태
    gameSession,
    setGameSession,
    loading,
    setLoading,
    phase,
    setPhase,
    countdown,
    setCountdown,
    roundTimer,
    setRoundTimer,
    chatMessages,
    setChatMessages,
    
    // 모달 상태
    showAnswerModal,
    setShowAnswerModal,
    answerModalData,
    setAnswerModalData,
    showGameEndModal,
    setShowGameEndModal,
    showNoAnswerModal,
    setShowNoAnswerModal,
    noAnswerModalContent,
    setNoAnswerModalContent,
    
    // 애니메이션
    showRoundNotification,
    setShowRoundNotification,
    showHintAnimation,
    setShowHintAnimation,
    winnerAnimatedScore,
    setWinnerAnimatedScore,
    progress,
    setProgress,
    
    // 키워드
    selectedTagIds,
    setSelectedTagIds,
    isKeywordConfirmed,
    setIsKeywordConfirmed,
    
    // Refs
    roundTimerIntervalRef,
    currentRoundRef,
    maxRoundRef,
    phaseRef,
    
    // 함수들
    clearTimers,
    resetGameState,
    gameHandlers
  };
};