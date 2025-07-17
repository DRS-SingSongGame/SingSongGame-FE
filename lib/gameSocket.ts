import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useGameStore } from "@/stores/useGameStore";
let stompClient: Client | null = null;
interface GameSocketCallbacks {
  onConnect: (frame: any) => void;
  onError: (error: any) => void;
  onDisconnect?: () => void;
  onGameStartCountdown: (response: any) => void;
  onRoundStart: (response: any) => void;
  onAnswerCorrect: (response: any) => void;
  onGameEnd: (response: any) => void;
  onRoundFailed?: (response: any) => void;
  onMessage?: (msg: any) => void; // Generic message handler
}
export const connectGameSocket = (
  roomId: string,
  callbacks: GameSocketCallbacks,
  isAiGame: boolean = false
) => {
  // 기존 연결이 있으면 먼저 정리
  if (stompClient && stompClient.connected) {
    console.log("🔄 기존 연결 정리 중...");
    stompClient.deactivate();
  }

  const socket = new SockJS("/api/ws/chat");

  stompClient = new Client({
    webSocketFactory: () => socket as any,
    connectHeaders: {}, // { Authorization: ... }
  
    onConnect: (frame) => {
      console.log("Connected: " + frame);
      callbacks.onConnect(frame);

      const prefix = isAiGame ? "ai-room" : "room";
      // Subscribe to game-related topics

      console.log(`구독 시작 : ${prefix}/${roomId}`);

      stompClient?.subscribe(`/topic/${prefix}/${roomId}/game-start`, (response) => {
        callbacks.onGameStartCountdown(JSON.parse(response.body));
      });
      stompClient?.subscribe(
        `/topic/${prefix}/${roomId}/round-start`,
        (response) => {
          callbacks.onRoundStart(JSON.parse(response.body));
        });
      stompClient?.subscribe(
        `/topic/${prefix}/${roomId}/answer-correct`,
        (response) => {
          callbacks.onAnswerCorrect(JSON.parse(response.body)); // Ensure parsing for consistency
        }
      );
      stompClient?.subscribe(`/topic/${prefix}/${roomId}/game-end`, (response) => {
        callbacks.onGameEnd(JSON.parse(response.body)); // Ensure parsing for consistency
      });
      stompClient?.subscribe(`/topic/room/${roomId}/round-failed`, (response) => {
        const parsed = JSON.parse(response.body);
        if (callbacks.onRoundFailed) {
          callbacks.onRoundFailed(parsed);
        }
      });
      // Subscribe to general game messages (e.g., chat, player updates)
      stompClient?.subscribe(`/topic/${prefix}/${roomId}/chat`, (response) => {
        try {
          const parsed = JSON.parse(response.body)
          if (callbacks.onMessage) {
            callbacks.onMessage(parsed);
          }
        } catch (e) {
          console.error('[:빨간색_원: JSON 파싱 오류]', e, response.body);
        }
      });
      
      stompClient?.subscribe(`/topic/room/${roomId}/keywords`, (response) => {
        try {
          const keywordIds: number[] = JSON.parse(response.body);
          console.log("🎯 키워드 수신:", keywordIds);
          useGameStore.getState().setSelectedKeywords(keywordIds);
        } catch (e) {
          console.error("❌ 키워드 메시지 파싱 실패", e);
        }
      });
      // stompClient?.subscribe(`/topic/ai-room/${roomId}/game-start`, (response) => {
      //   // router.push(`/room/${roomId}/aisonggame/FlatLyricsGame`); // This line was not in the original file, so it's not added.
      // });
      
    },
    onStompError: (error) => {
      console.error("STOMP error", error);
      callbacks.onError(error);
    },
    onDisconnect: (frame) => {
      console.log("🚨 WebSocket 연결 끊김:", frame);
      callbacks.onDisconnect?.();
    },
    onWebSocketClose: (event) => {
      console.log("🔌 WebSocket 닫힘:", event);
      callbacks.onDisconnect?.();
    },
    onWebSocketError: (event) => {
      console.log("❌ WebSocket 에러:", event);
      callbacks.onDisconnect?.();
    }
  });
  stompClient.activate();
};

export const disconnectGameSocket = () => {
  if (stompClient !== null) {
    stompClient.deactivate();
    stompClient = null;
    console.log("Disconnected");
  }
};

// 소켓 재연결 함수 //
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let reconnectTimer: NodeJS.Timeout | null = null;

export const reconnectGameSocket = (
  roomId: string,
  callbacks: GameSocketCallbacks,
  isAiGame: boolean = false
) => {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error("❌ 최대 재연결 시도 횟수 초과");
    callbacks.onError?.(new Error("재연결 실패"));
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10000); // 지수 백오프

  console.log(`🔄 재연결 시도 ${reconnectAttempts}/${maxReconnectAttempts} (${delay}ms 후)`);

  reconnectTimer = setTimeout(() => {
    connectGameSocket(roomId, {
      ...callbacks,
      onConnect: (frame) => {
        console.log("✅ 재연결 성공!");
        reconnectAttempts = 0; // 재연결 성공 시 카운터 리셋
        callbacks.onConnect(frame);
      },
      onDisconnect: () => {
        console.log("❌ 재연결된 연결이 다시 끊김");
        callbacks.onDisconnect?.();
        // 🚨 여기서 무한 재귀 제거! 대신 일정 시간 후 재시도
        if (reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectGameSocket(roomId, callbacks, isAiGame);
          }, 2000);
        }
      },
      onError: (error) => {
        console.log("❌ 재연결 중 오류:", error);
        callbacks.onError?.(error);
        // 재연결 실패 시에도 재시도
        if (reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectGameSocket(roomId, callbacks, isAiGame);
          }, 2000);
        }
      }
    }, isAiGame);
  }, delay);
};

export const stopReconnecting = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
};

export const isGameSocketConnected = () => {
  return stompClient !== null && stompClient.connected;
};
export const sendGameMessage = (
  roomId: string,
  senderId: string,
  senderName: string,
  message: string,
  isAiGame: boolean = false
) => {
  const prefix = isAiGame ? "ai-room" : "room";
  if (stompClient && stompClient.connected) {
    const payload = { senderId, senderName, message };
    console.log(":수신_봉투: 보내는 채팅 메시지:", payload);
    stompClient.publish({
      destination: `/api/${prefix}/${roomId}/chat`, // :흰색_확인_표시: 백엔드에 맞는 경로
      body: JSON.stringify(payload),
    });
  } else {
    console.warn("STOMP client not connected, cannot send message.");
  }
  
};

export const sendKeywordConfirm = (roomId: string, keywords: number[]) => {
  if (!stompClient || !stompClient.connected) {
    console.warn("❌ stompClient가 연결되지 않았습니다.");
    return;
  }

  console.log("📤 키워드 전송 시도", { roomId, keywords });

  stompClient.publish({
    destination: "/api/keyword/confirm",
    body: JSON.stringify({ roomId, keywords }),
  });
};