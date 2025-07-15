// lib/lobbySocket.ts
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let client: Client | null = null;
let subscription: StompSubscription | null = null;

let latestOnlineUsers: any[] = [];

function getAccessTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === 'access_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}


export function connectLobbySocket(
  userId: string,
  nickname: string,
  onMessage: (msg: any) => void,
  onUserListUpdate: (users: any[]) => void
) {
  if (client && client.connected && subscription) {
    console.warn('[lobbySocket] Already connected and subscribed.');
    return;
  }

  if (!client) {
    client = new Client({
      brokerURL: undefined,
      webSocketFactory: () => new SockJS(`/api/ws/chat?userId=${userId}&nickname=${nickname}`),
      reconnectDelay: 5000,
      connectHeaders: {
        // 👇 사용자 정보 직접 넘김 (토큰 대신)
        userId: String(userId), 
        nickname
      },
      onConnect: () => {
        console.log('[lobbySocket] Connected to lobby socket');

        console.log('[lobbySocket] connectHeaders 확인:', {
          userId: String(userId),
          nickname,
          typeofUserId: typeof userId
        });

        if (!subscription) {
          subscription = client!.subscribe('/topic/lobby', (message: IMessage) => {
            const body = JSON.parse(message.body);
            console.log('[lobbySocket] Received message:', body);

            if (body.type === 'USER_LIST_UPDATE') {
              try {
                const users = JSON.parse(body.message);
                latestOnlineUsers = users;
                onUserListUpdate(users); // ✅ 유저 리스트 콜백
              } catch (err) {
                console.error('[lobbySocket] USER_LIST_UPDATE JSON parse error', err);
              }
              return;
            }
      

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
              }),
              tier: body.tier 
            });
          });
        }

        client!.subscribe(`/user/queue/match`, (message: IMessage) => {
          const body = JSON.parse(message.body);
          console.log('[lobbySocket] MATCH_FOUND 메시지 수신:', body);
        
          if (body.type === 'MATCH_FOUND') {
            onMessage({
              type: body.type,
              data: body.data
            });
          }
        });

        // 로비 입장
        fetch('/api/lobby/enter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, nickname })
        });
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
