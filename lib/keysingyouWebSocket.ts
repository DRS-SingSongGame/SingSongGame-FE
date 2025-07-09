import { io, Socket } from "socket.io-client";

let webSocket: Socket | null = null;

export const getSocket = () => {
  if (!webSocket) {
    webSocket = io("wss://singsonggame.store", {
      path: `/fast/socket.io`,
      transports: ["websocket"],
    });
    // webSocket = io("http://localhost:8000", {
    //   path: `/fast/socket.io`,
    //   transports: ["websocket"],
    // });
  }
  return webSocket;
};

export const disconnectSocket = () => {
  webSocket?.disconnect();
  webSocket = null;
};
