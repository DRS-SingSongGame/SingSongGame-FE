import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import api from "@/lib/api";

interface Player {
  id: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
}

interface PlayerSlotsProps {
  roomId: string;
  maxPlayer: number;
}

const PlayerSlots = ({ roomId, maxPlayer }: PlayerSlotsProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isUnmounted = false;
    const fetchPlayers = async () => {
      try {
        const response = await api.get<{ data: any }>(`/api/room/${roomId}`);
        if (!isUnmounted) setPlayers(response.data.data.players || []);
      } catch (e) {
        if (!isUnmounted) setPlayers([]);
      }
      if (!isUnmounted) {
        timerRef.current = setTimeout(fetchPlayers, 2000);
      }
    };
    fetchPlayers();
    return () => {
      isUnmounted = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [roomId]);

  return (
    <div className="grid grid-cols-2 gap-4 h-full pt-5">
      {[...players, ...Array.from({ length: maxPlayer - players.length }).map((_, idx) => ({
        id: `empty-${idx}`,
        nickname: '비어있음',
        avatar: '',
        isHost: false,
        isReady: false
      }))].slice(0, maxPlayer).map((player) => (
        <div key={player.id} className="flex items-center gap-4 border p-4 rounded-lg bg-white/80 h-[110px]">
          {player.avatar ? (
            <Avatar className="w-16 h-16">
              <AvatarImage src={player.avatar} />
              <AvatarFallback>{player.nickname[0]}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-base">빈</div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-purple-700 text-lg">{player.nickname}</h4>
              {player.isHost && <span>👑</span>}
            </div>
            <div className="text-sm text-gray-500">
              {player.nickname === '비어있음' ? '' : player.isHost ? '방장' : player.isReady ? '준비 완료' : '대기 중'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlayerSlots; 