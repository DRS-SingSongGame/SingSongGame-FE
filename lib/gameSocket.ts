import SockJS from "sockjs-client";
import { Client, Stomp } from "@stomp/stompjs";

let stompClient: Client | null = null;

interface GameSocketCallbacks {
  onConnect: (frame: any) => void;
  onError: (error: any) => void;
  onGameStartCountdown: (response: any) => void;
  onRoundStart: (response: any) => void;
  onAnswerCorrect: (response: any) => void;
  onGameEnd: (response: any) => void;
  onMessage?: (msg: any) => void; // Generic message handler
}

export const connectGameSocket = (
  roomId: string,
  callbacks: GameSocketCallbacks
) => {
  const socket = new SockJS("/api/ws/chat");
  stompClient = Stomp.over(socket);

  stompClient.connect(
    {},
    (frame) => {
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
        }
      );

      stompClient?.subscribe(
        `/topic/room/${roomId}/answer-correct`,
        (response) => {
          callbacks.onAnswerCorrect(JSON.parse(response.body)); // Ensure parsing for consistency
        }
      );

      stompClient?.subscribe(`/topic/room/${roomId}/game-end`, (response) => {
        callbacks.onGameEnd(JSON.parse(response.body)); // Ensure parsing for consistency
      });

      // Subscribe to general game messages (e.g., chat, player updates)
      stompClient?.subscribe(`/topic/room/${roomId}/chat`, (response) => {
        if (callbacks.onMessage) {
          callbacks.onMessage(JSON.parse(response.body));
        }
      });
    },
    (error) => {
      console.error("STOMP error", error);
      callbacks.onError(error);
    }
  );
};

export const disconnectGameSocket = () => {
  if (stompClient !== null) {
    stompClient.disconnect();
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
    console.log("📨 보내는 채팅 메시지:", payload);

    stompClient.publish({
      destination: `/api/room/${roomId}/chat`, // ✅ 백엔드에 맞는 경로
      body: JSON.stringify(payload),
    });
  } else {
    console.warn("STOMP client not connected, cannot send message.");
  }
};
