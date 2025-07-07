import { io, Socket } from "socket.io-client";

let webSocket: Socket | null = null;

export const getSocket = () => {
  if (!webSocket) {
    webSocket = io("http://localhost:8000");
  }
  return webSocket;
};

export const disconnectSocket = () => {
  webSocket?.disconnect();
  webSocket = null;
};
