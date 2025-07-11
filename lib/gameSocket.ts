import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useGameStore } from "@/stores/useGameStore";
let stompClient: Client | null = null;
interface GameSocketCallbacks {
  onConnect: (frame: any) => void;
  onError: (error: any) => void;
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
  const socket = new SockJS("/api/ws/chat");
  stompClient = new Client({
    webSocketFactory: () => socket as any,
    connectHeaders: {}, // { Authorization: ... }
    onConnect: (frame) => {
      console.log("Connected: " + frame);
      callbacks.onConnect(frame);
      const prefix = isAiGame ? "ai-room" : "room";
      // Subscribe to game-related topics
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
    // 필요시 onDisconnect, onWebSocketClose 등도 추가 가능
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