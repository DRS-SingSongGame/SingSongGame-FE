import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
let stompClient: Client | null = null;
interface GameSocketCallbacks {
  onConnect: (frame: any) => void;
  onError: (error: any) => void;
  onGameStartCountdown: (response: any) => void;
  onRoundStart: (response: any) => void;
  onAnswerCorrect: (response: any) => void;
  onGameEnd: (response: any) => void;
  onRoundFailed: (response: any) => void;
  onMessage?: (msg: any) => void; // Generic message handler
}
export const connectGameSocket = (
  roomId: string,
  callbacks: GameSocketCallbacks
) => {
  const socket = new SockJS("/api/ws/chat");
  stompClient = new Client({
    webSocketFactory: () => socket as any,
    connectHeaders: {}, // { Authorization: ... }
    onConnect: (frame) => {
      console.log("Connected: " + frame);
      callbacks.onConnect(frame);
      // Subscribe to game-related topics
      stompClient?.subscribe(`/topic/room/${roomId}/game-start`, (response) => {
        callbacks.onGameStartCountdown(JSON.parse(response.body));
      });
      stompClient?.subscribe(
        `/topic/room/${roomId}/round-start`,
        (response) => {
          callbacks.onRoundStart(JSON.parse(response.body));
        });
      stompClient?.subscribe(
        `/topic/room/${roomId}/answer-correct`,
        (response) => {
          callbacks.onAnswerCorrect(JSON.parse(response.body)); // Ensure parsing for consistency
        });
      stompClient?.subscribe(`/topic/room/${roomId}/round-failed`, (response) => {
        const parsed = JSON.parse(response.body);
        if (callbacks.onRoundFailed) {
          callbacks.onRoundFailed(parsed);
        }
      });
      stompClient?.subscribe(`/topic/room/${roomId}/game-end`, (response) => {
        callbacks.onGameEnd(JSON.parse(response.body)); // Ensure parsing for consistency
      });
      // Subscribe to general game messages (e.g., chat, player updates)
      stompClient?.subscribe(`/topic/room/${roomId}/chat`, (response) => {
        console.log('[:큰_노란색_원: 수신한 WebSocket 메시지]', response.body); // :왼쪽을_가리키는_손_모양: 원본 그대로 확인
        try {
          const parsed = JSON.parse(response.body);
          console.log('[:큰_초록색_원: 파싱된 메시지]', parsed); // :왼쪽을_가리키는_손_모양: 파싱 결과 확인
          if (callbacks.onMessage) {
            callbacks.onMessage(parsed);
          }
        } catch (e) {
          console.error('[:빨간색_원: JSON 파싱 오류]', e, response.body);
        }
      });
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
  message: string
) => {
  if (stompClient && stompClient.connected) {
    const payload = { senderId, senderName, message };
    console.log(":수신_봉투: 보내는 채팅 메시지:", payload);
    stompClient.publish({
      destination: `/api/room/${roomId}/chat`, // :흰색_확인_표시: 백엔드에 맞는 경로
      body: JSON.stringify(payload),
    });
  } else {
    console.warn("STOMP client not connected, cannot send message.");
  }
};