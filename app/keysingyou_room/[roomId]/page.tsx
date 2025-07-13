"use client";

import { useEffect, useState } from "react";
import KeysingyouGameRoom from "@/components/KeysingyouGameRoom";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [user, setUser] = useState<any>(null); // 사용자 정보
  const [room, setRoom] = useState<any>(null); // 실제 서버에서 받은 room 정보

  useEffect(() => {
    const fetchData = async () => {
      // ✅ 사용자 정보 불러오기
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        console.log(storedUser);
        const parsedUser = JSON.parse(storedUser);
        setUser({
          id: parsedUser.id,
          nickname: parsedUser.nickname,
          avatar:
            parsedUser.profileImage
        });
      }

      // ✅ 방 정보 서버에서 가져오기
      try {
        const res = (await api.get(`/api/room/${roomId}`)) as any;
        const roomData = res.data?.data;
        console.log(roomData);

        if (!roomData) {
          console.warn("❌ 유효하지 않은 방입니다.");
          router.push("/lobby");
          return;
        }
        setRoom(roomData);
      } catch (error) {
        console.error("❌ 방 정보 로딩 실패:", error);
        router.push("/lobby");
      }
    };

    if (roomId) {
      fetchData();
    }
  }, [roomId, router]);

  const handleBack = () => {
    router.push("/lobby");
  };

  if (!user || !room) return <div>로딩 중...</div>;

  return (
    <div className="relative z-10">
      <KeysingyouGameRoom user={user} room={room} onBack={handleBack} />
    </div>
  );
}
