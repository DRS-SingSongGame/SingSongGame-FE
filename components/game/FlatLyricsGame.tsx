"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import GameHeader from "./GameHeader";
import GameChat from "./GameChat";
import GameScoreboard from "./GameScoreboard";
import GameInfo from "./GameInfo";
import GameResultModal from "./GameResultModal";
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
}

interface GameState {
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  isReading: boolean;
  currentSong: Song | null;
  scores: { [playerId: string]: number };
  correctAnswer: string | null;
  correctArtist: string | null; // 가수 이름 상태 추가
  roundWinner: string | null;
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

const FlatLyricsGame = ({
  user,
  room,
  players,
  onBack,
  onGameEnd,
}: FlatLyricsGameProps) => {
  const [gameState, setGameState] = useState<GameState>({
    currentRound: 0, // 라운드 시작 전 상태
    totalRounds: 5,
    timeLeft: 60,
    isReading: false,
    currentSong: null,
    scores: {},
    correctAnswer: null,
    correctArtist: null,
    roundWinner: null,
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      playerId: "system",
      playerName: "시스템",
      message: "평어 노래 맞추기 게임이 시작됩니다!",
      time: "10:00",
      isSystem: true,
    },
  ]);

  const [chatInput, setChatInput] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 1. 게임이 끝났다고 상태를 설정하고
  // 2. 플레이어들의 점수를 정리해서
  // 3. 결과를 부모 컴포넌트(onGameEnd)로 알려주는 함수
  const endGame = useCallback(() => {
    setGameOver(true);
    setShowResults(true);

    const results = players
      .map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        score: gameState.scores[player.id] || 0,
      }))
      .sort((a, b) => b.score - a.score);

    onGameEnd(results);
  }, [players, gameState.scores, onGameEnd]);

  // 게임의 다음 라운드를 시작하고,
  //랜덤노래 정보를 가져오고
  // 상태를 초기화하고
  // 시스템 메시지를 보여주고
  // 3초후 TTS를 재생하는 함수입니다.
  const startNewRound = useCallback(async () => {
    if (gameState.currentRound > gameState.totalRounds) {
      endGame();
      return;
    }

    try {
      const response = await fetch("/api/song/random");
      const song: Song = await response.json();

      console.log("받아온 곡 정보:", song);
      console.log("🔥 startRound() called");

      setGameState((prev) => ({
        ...prev,
        currentSong: song,
        timeLeft: 60,
        correctAnswer: null,
        correctArtist: null,
        roundWinner: null,
        isReading: false,
      }));

      const systemMessage: ChatMessage = {
        id: Date.now(),
        playerId: "system",
        playerName: "시스템",
        message: `라운드 ${gameState.currentRound} 시작! 가사를 들어보세요.`,
        time: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isSystem: true,
      };
      setChatMessages((prev) => [...prev, systemMessage]);

      setTimeout(() => {
        playTTS(song.id);
      }, 3000);
    } catch (error) {
      console.error("Error fetching random song:", error);
      // Handle error appropriately
    }
  }, [endGame, gameState.totalRounds, gameState.currentRound]);

  useEffect(() => {
    // 1. 초기 점수 설정
    const initialScores = players.reduce((acc, player) => {
      acc[player.id] = 0;
      return acc;
    }, {} as { [key: string]: number });

    const welcomeMessage: ChatMessage = {
      id: Date.now(),
      playerId: "system",
      playerName: "시스템",
      message: "🎵 게임을 시작합니다! 곧 첫 번째 가사가 나옵니다.",
      time: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isSystem: true,
    };

    setGameState((prev) => ({ ...prev, scores: initialScores }));
    setChatMessages((prev) => [...prev, welcomeMessage]);

    // 3. 첫 라운드 시작 트리거
    setTimeout(() => {
      setGameState((prev) => ({ ...prev, currentRound: 1 }));
    }, 2000);
  }, []); // 의존성 배열을 비워 한 번만 실행되도록 수정

  // currentRound가 변경될 때마다 새로운 라운드를 시작하는 유일한 통로
  useEffect(() => {
    if (gameState.currentRound > 0 && gameState.currentRound <= gameState.totalRounds) {
      startNewRound();
    }
  }, [gameState.currentRound, startNewRound, gameState.totalRounds]);

  const handleRoundEnd = useCallback((winnerId: string | null, points: number = 0) => {
    stopTTS();

    if (winnerId) {
      setGameState((prev) => ({
        ...prev,
        roundWinner: winnerId,
        correctAnswer: prev.currentSong?.title || "",
        correctArtist: prev.currentSong?.artist || "",
        scores: {
          ...prev.scores,
          [winnerId]: prev.scores[winnerId] + points,
        },
        isReading: false,
      }));

      const winner = players.find((p) => p.id === winnerId);
      const systemMessage: ChatMessage = {
        id: Date.now(),
        playerId: "system",
        playerName: "시스템",
        message: `🎉 ${winner?.nickname}님이 정답을 맞췄습니다! 정답: "${gameState.currentSong?.title}" - ${gameState.currentSong?.artist} (+${points}점)`,
        time: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isSystem: true,
      };
      setChatMessages((prev) => [...prev, systemMessage]);
    } else {
      setGameState((prev) => ({
        ...prev,
        correctAnswer: prev.currentSong?.title || "",
        correctArtist: prev.currentSong?.artist || "",
        isReading: false,
      }));

      const systemMessage: ChatMessage = {
        id: Date.now() + 1,
        playerId: "system",
        playerName: "시스템",
        message: `⏰ 시간 종료! 정답: "${gameState.currentSong?.title}" - ${gameState.currentSong?.artist}`,
        time: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isSystem: true,
      };
      setChatMessages((prev) => [...prev, systemMessage]);
    }

    setTimeout(() => {
      if (gameState.currentRound >= gameState.totalRounds) {
        endGame();
      } else {
        setGameState((prev) => ({ ...prev, currentRound: prev.currentRound + 1 }));
      }
    }, 3000);
  }, [endGame, players, gameState.currentSong, gameState.totalRounds, gameState.currentRound]);

  
  useEffect(() => {
    if (gameState.timeLeft > 0 && gameState.isReading) {
      intervalRef.current = setTimeout(() => {
        setGameState((prev) => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (gameState.timeLeft === 0 && gameState.isReading) {
      handleRoundEnd(null);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [gameState.timeLeft, gameState.isReading, handleRoundEnd]);

  const playTTS = (songId: number) => {
    if (audio) {
      audio.pause();
    }
    const newAudio = new Audio(`/api/song/tts?songId=${songId}`);
    newAudio.oncanplaythrough = () => {
        newAudio.play();
        setGameState((prev) => ({ ...prev, isReading: true }));
    }
    newAudio.onended = () => {
      setGameState((prev) => ({ ...prev, isReading: false }));
      if (!gameState.roundWinner) {
        handleRoundEnd(null);
      }
    };
    setAudio(newAudio);
  };

  const stopTTS = () => {
    if (audio) {
      audio.pause();
      setAudio(null);
    }
    setGameState((prev) => ({ ...prev, isReading: false }));
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim() || !gameState.currentSong || !gameState.isReading)
      return;

    const isCorrect =
      chatInput
        .trim()
        .toLowerCase()
        .includes(gameState.currentSong.title.toLowerCase()) ||
      gameState.currentSong.title
        .toLowerCase()
        .includes(chatInput.trim().toLowerCase());

    const newMessage: ChatMessage = {
      id: Date.now(),
      playerId: user.id,
      playerName: user.nickname,
      message: chatInput.trim(),
      time: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isCorrect,
    };

    setChatMessages((prev) => [...prev, newMessage]);

    if (isCorrect && !gameState.roundWinner) {
      const points = Math.ceil((gameState.timeLeft / 60) * 100);
      handleRoundEnd(user.id, points);
    }

    setChatInput("");
  };

  const playersWithScores = players.map((player) => ({
    ...player,
    score: gameState.scores[player.id] || 0,
  }));

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <GameHeader
          currentRound={gameState.currentRound}
          totalRounds={gameState.totalRounds}
          timeLeft={gameState.timeLeft}
          isReading={gameState.isReading}
          onBack={onBack}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GameChat
              messages={chatMessages}
              chatInput={chatInput}
              isReading={gameState.isReading}
              onChatInputChange={setChatInput}
              onChatSubmit={handleChatSubmit}
            />
          </div>

          <div>
            <GameScoreboard players={playersWithScores} />
            <GameInfo
              isReading={gameState.isReading}
              correctAnswer={gameState.correctAnswer}
              correctArtist={gameState.correctArtist}
              totalRounds={gameState.totalRounds}
            />
          </div>
        </div>

        <GameResultModal
          isOpen={showResults}
          players={playersWithScores}
          onClose={() => setShowResults(false)}
        />
      </div>
    </div>
  );
};

export default FlatLyricsGame;

