import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { Mic, MicOff } from "lucide-react";
import { Socket } from "socket.io-client";

interface User {
  id: number;
  avatar: string;
  nickname: string;

  sid: string;
  isHost: boolean;

  ready: boolean;
  mic: boolean;
}

interface PlayerSlotsProps {
  users: User[];
  maxPlayer: number;
}

export default function KeysingyouPlayerSlots({
  users,
  maxPlayer,
}: PlayerSlotsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full pt-5">
      {[
        ...users,
        ...Array.from({ length: maxPlayer - users.length }).map((_, idx) => ({
          id: `empty-${idx}`,
          nickname: "비어있음",
          avatar: "",
          isHost: false,
          ready: false,
        })),
      ]
        .slice(0, maxPlayer)
        .map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-4 border p-4 rounded-lg bg-white/80 h-[110px]"
          >
            {user.avatar ? (
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.nickname[0]}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-base">
                빈
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-purple-700 text-lg">
                  {user.nickname}
                </h4>
                {user.isHost && <span>👑</span>}
              </div>
              <div className="text-sm text-gray-500">
                {user.nickname === "비어있음"
                  ? ""
                  : user.isHost
                  ? "방장"
                  : user.ready
                  ? "준비 완료"
                  : "대기 중"}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
