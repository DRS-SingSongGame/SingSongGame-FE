// lib/lobbySocket.ts
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let client: Client | null = null;
let subscription: StompSubscription | null = null;

export function connectLobbySocket(
  userId: string,
  nickname: string,
  onMessage: (msg: any) => void
) {
  if (client && client.connected && subscription) {
    console.warn('[lobbySocket] Already connected and subscribed.');
    return;
  }

  if (!client) {
    client = new Client({
      brokerURL: undefined,
      webSocketFactory: () => new SockJS('/api/ws/chat'),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('[lobbySocket] Connected to lobby socket');

        if (!subscription) {
          subscription = client!.subscribe('/topic/lobby', (message: IMessage) => {
            const body = JSON.parse(message.body);
            console.log('[lobbySocket] Received message:', body);

            onMessage({
              id: Date.now(),
              type: body.type,
              roomId: body.roomId,
              senderId: body.senderId,
              senderName: body.senderName,
              message: body.message,
              timestamp: body.timestamp,
              time: new Date(body.timestamp).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
              })
            });
          });
        }

        // 로비 입장
        fetch('/api/lobby/enter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, nickname })
        });

        // 로비 유저 메시지 전송
        sendLobbyUserMessage();
      },
      onStompError: (frame) => {
        console.error('[lobbySocket] STOMP error:', frame);
      }
    });

    client.activate();
  }
}

export function disconnectLobbySocket(userId: string) {
  if (client && client.active) {
    fetch('/api/lobby/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }

    client.deactivate();
    client = null;
  }
}

export function sendLobbyMessage(userId: string, nickname: string, message: string) {
  if (!client || !client.connected) return;

  const body = {
    type: 'TALK',
    roomId: 'lobby',
    senderId: userId,
    senderName: nickname,
    message: message,
    timestamp: new Date().toISOString()
  };

  client.publish({
    destination: '/api/lobby/chat',
    body: JSON.stringify(body)
  });
}

export const sendLobbyUserMessage = () => {
  if (client && client.connected) {
    console.log(":수신_봉투: 로비 유저 테스트 메시지 전송");
    client.publish({
      destination: `/api/lobby/user`,
      body: JSON.stringify({}),
    });
  } else {
    console.warn("STOMP client not connected, cannot send lobby user message.");
  }
};