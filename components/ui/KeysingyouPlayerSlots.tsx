import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { Mic, MicOff } from "lucide-react";
import { Socket } from "socket.io-client";

interface User {
  id: string;
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
  vertical?: boolean;
  slotHeight?: number; // 추가
}

export default function KeysingyouPlayerSlots({
  users,
  maxPlayer,
  vertical = false,
  slotHeight = 110, // 기본값 110
}: PlayerSlotsProps) {
  // 6개 슬롯 고정
  const totalSlots = 6;
  // 실제 유저/비어있음 슬롯 배열
  const filledSlots = [
    ...users,
    ...Array.from({ length: maxPlayer - users.length }).map((_, idx) => ({
      id: `empty-${idx}`,
      nickname: "비어있음",
      avatar: "",
      sid: "",
      isHost: false,
      ready: false,
      mic: false,
    }) as User),
  ];

  return (
    <div className={vertical ? "flex flex-col gap-4 h-full pt-2" : "grid grid-cols-2 gap-4 h-full pt-2"}>
      {Array.from({ length: totalSlots }).map((_, idx) => {
        if (idx < maxPlayer) {
          // 유효 슬롯: 유저 or 비어있음
          const user = filledSlots[idx];
          return (
            <div
              key={user.id}
              className={`flex items-center gap-4 border p-4 rounded-lg bg-white/80 w-full`} // h-[110px] 제거
              style={{ height: slotHeight }}
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
                  {user.nickname !== "비어있음" && (
                    user.mic ? <Mic className="text-green-500" /> : <MicOff className="text-red-500" />
                  )}
                </div>
                <div
                  className={
                    "text-sm " +
                    (user.nickname === "비어있음"
                      ? "text-gray-500"
                      : user.isHost
                      ? "text-gray-500"
                      : user.ready
                      ? "text-green-600 font-bold"
                      : "text-gray-500")
                  }
                >
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
          );
        } else {
          // 비활성화(대각선 한 줄) 슬롯
          return (
            <div
              key={`disabled-${idx}`}
              className={`flex items-center gap-4 border p-4 rounded-lg w-full bg-gray-200 relative overflow-hidden`} // h-[110px] 제거
              style={{ height: slotHeight }}
            >
              <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-400 text-base">
                -
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-400 text-lg">비활성화</h4>
                </div>
                <div className="text-sm text-gray-400">슬롯 비활성화</div>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
}
