import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Trophy, Medal, Award } from 'lucide-react';

interface Player {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
}

interface GameResultModalProps {
  isOpen: boolean;
  players: Player[];
  onClose: () => void;
}

const GameResultModal = ({ isOpen, players, onClose }: GameResultModalProps) => {
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="text-center text-2xl font-bold">🎉 게임 결과</span>
          </DialogTitle>
          <DialogDescription className="text-center">
            평어 노래 맞추기 게임이 종료되었습니다!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                index === 0 ? 'bg-yellow-50 border-2 border-yellow-300' :
                index === 1 ? 'bg-gray-50 border-2 border-gray-300' :
                index === 2 ? 'bg-amber-50 border-2 border-amber-300' :
                'bg-white border'
              }`}
            >
              <div className="flex items-center gap-2">
                {getRankIcon(index)}
                <span className="font-bold text-lg">{index + 1}</span>
              </div>
              <Avatar>
                <AvatarImage src={player.avatar} />
                <AvatarFallback>{player.nickname[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold">{player.nickname}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl">{player.score}점</div>
              </div>
            </div>
          ))}
        </div>
        <Button 
          onClick={onClose} 
          className="w-full mt-4"
        >
          확인
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default GameResultModal;
