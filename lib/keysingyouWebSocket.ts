import { io, Socket } from "socket.io-client";

let webSocket: Socket | null = null;

export const getSocket = () => {
  if (!webSocket) {
    webSocket = io(process.env.NEXT_PUBLIC_FASTAPI_ORIGIN!, {
      path: `/fast/socket.io`,
      transports: ["websocket"],
    });
  }
  return webSocket;
};

export const disconnectSocket = () => {
  webSocket?.disconnect();
  webSocket = null;
};
