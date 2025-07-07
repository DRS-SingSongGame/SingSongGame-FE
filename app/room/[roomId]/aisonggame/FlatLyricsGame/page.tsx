"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FlatLyricsGame } from "@/components/game";

// 더미 데이터 (실제로는 props나 context에서 받아와야 함)
const dummyUser = {
  id: "user1",
  nickname: "플레이어1",
  avatar: "/avatars/default.png",
};

const dummyRoom = {
  id: "room1",
  name: "테스트 방",
  gameMode: "flat-lyrics",
};

const dummyPlayers = [
  {
    id: "user1",
    nickname: "플레이어1",
    avatar: "/avatars/default.png",
  },
  {
    id: "user2",
    nickname: "플레이어2",
    avatar: "/avatars/default.png",
  },
  {
    id: "user3",
    nickname: "플레이어3",
    avatar: "/avatars/default.png",
  },
];

export default function FlatLyricsGamePage({ params }: { params: { roomId: string } }) {
  const router = useRouter();

  const handleBack = () => {
    router.push("/lobby"); // 또는 이전 페이지로
  };

  const handleGameEnd = (results: any[]) => {
    console.log("게임 결과:", results);
    // 결과 처리 로직
  };

  const onGameStart = () => {
    router.push(`/room/${params.roomId}/aisonggame/FlatLyricsGame`);
  };

  return (
    <FlatLyricsGame
      user={dummyUser}
      room={dummyRoom}
      players={dummyPlayers}
      onBack={handleBack}
      onGameEnd={handleGameEnd}
    />
  );
}
