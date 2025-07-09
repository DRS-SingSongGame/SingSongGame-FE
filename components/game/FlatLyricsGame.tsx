"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import GameHeader from "./GameHeader";
import GameChat from "./GameChat";
import GameScoreboard from "./GameScoreboard";
import GameInfo from "./GameInfo";
import GameResultModal from "./GameResultModal";
import { connectGameSocket, disconnectGameSocket } from "@/lib/gameSocket";
import { sendGameMessage } from "@/lib/gameSocket";

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
  totalRounds: number;
  timeLeft: number;
  isReading: boolean;
  currentSong: Song | null;
  scores: { [playerId: string]: number };
  correctAnswer: string | null;
  correctArtist: string | null;
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

const FlatLyricsGame = ({ user, room, players, onBack, onGameEnd }: FlatLyricsGameProps) => {
  const [gameState, setGameState] = useState<GameState>({
    currentRound: 0,
    totalRounds: 2,
    timeLeft: 60,
    isReading: false,
    currentSong: null,
    scores: {},
    correctAnswer: null,
    correctArtist: null,
    roundWinner: null,
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      currentSong: song,
      timeLeft: 60,
      correctAnswer: null,
      correctArtist: null,
      roundWinner: null,
      isReading: true,
    }));
  
    const systemMessage: ChatMessage = {
      id: Date.now(),
      playerId: "system",
      playerName: "시스템",
      message: `라운드 ${roundNumber} 시작! 가사를 들어보세요.`,
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      isSystem: true,
    };
    setChatMessages((prev) => [...prev, systemMessage]);
  
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

    setGameState((prev) => ({
      ...prev,
      roundWinner: playerId,
      correctAnswer: title,
      correctArtist: artist,
      isReading: false,
      scores: {
        ...prev.scores,
        [playerId]: (prev.scores[playerId] || 0) + score,
      },
    }));

    const systemMessage: ChatMessage = {
      id: Date.now(),
      playerId: "system",
      playerName: "시스템",
      message: `🎉 ${playerName}님 정답! "${title}" - ${artist} (+${score}점)`,
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      isSystem: true,
    };
    setChatMessages((prev) => [...prev, systemMessage]);
  };

  const handleGameEnd = (data: any) => {
    setGameOver(true);
    setShowResults(true);
    // onGameEnd(data);
  };

  const handleCloseResult = () => {
    setShowResults(false);
    onGameEnd(playersWithScores); // ✅ 로비 이동 또는 부모에게 알림
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
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <GameHeader
          currentRound={gameState.currentRound}
          totalRounds={gameState.totalRounds}
          timeLeft={gameState.timeLeft}
          isReading={gameState.isReading}
          onBack={onBack}
          hintText={gameState.currentSong?.hint || "없음"}
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
          onClose={handleCloseResult}
        />
      </div>
    </div>
  );
};

export default FlatLyricsGame;
