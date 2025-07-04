import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Trophy, Medal, Award } from 'lucide-react';

interface Player {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
}

interface GameScoreboardProps {
  players: Player[];
}

const GameScoreboard = ({ players }: GameScoreboardProps) => {
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 1: return <Trophy className="w-5 h-5 text-gray-400" />;
      case 2: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <Award className="w-5 h-5 text-gray-500" />;
    }
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <Card className="bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>🏆 점수판</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                index === 1 ? 'bg-gray-50 border border-gray-200' :
                index === 2 ? 'bg-amber-50 border border-amber-200' :
                'bg-white border'
              }`}
            >
              <div className="flex items-center gap-2">
                {getRankIcon(index)}
                <span className="font-bold">{index + 1}</span>
              </div>
              <Avatar className="w-8 h-8">
                <AvatarImage src={player.avatar} />
                <AvatarFallback>{player.nickname[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold">{player.nickname}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{player.score}점</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GameScoreboard;
