import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Trophy, Medal, Award, Star, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Player {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
}

interface GameScoreboardProps {
  players: Player[];
}

const MAX_PLAYERS = 6;

const GameScoreboard = ({ players }: GameScoreboardProps) => {
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1: return <Trophy className="w-5 h-5 text-gray-400" />;
      case 2: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <Award className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return 'bg-gray-100 border-2 border-gray-300 shadow-lg';
      case 1: return 'bg-gray-100 border-2 border-gray-300 shadow-md';
      case 2: return 'bg-gray-100 border-2 border-gray-300 shadow-md';
      default: return 'bg-white border border-gray-200';
    }
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  // 빈자리까지 포함한 6개 슬롯 만들기
  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => sortedPlayers[i] || null);

  return (
    <Card className="pipe-metal-card rounded-2xl w-full max-w-xs lg:max-w-sm xl:max-w-md 2xl:max-w-lg min-h-[500px] flex flex-col justify-start">

      <CardContent className="p-4">
        <div className="space-y-2 flex flex-col justify-start min-h-[380px]">
          <AnimatePresence>
            {slots.map((player, index) =>
              player ? (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                    getRankStyle(index)
                  }`}
                >
                  <motion.div 
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {getRankIcon(index)}
                                      <span className={`font-bold text-lg text-gray-600`}>
                      {index + 1}
                    </span>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Avatar className="w-10 h-10 border-2 border-white shadow-md">
                      <AvatarImage src={player.avatar} />
                      <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold">
                        {player.nickname[0]}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                                      <div className={`font-semibold text-sm truncate text-gray-700`}>
                      {player.nickname}
                    </div>
                    {index === 0 && (
                      <motion.div
                        className="text-xs text-yellow-600 font-medium"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        🥇 1등!
                      </motion.div>
                    )}
                  </div>
                  <motion.div 
                    className="text-right"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                                      <div className={`font-bold text-xl text-gray-600`}>
                      {player.score}점
                    </div>
                    {player.score > 0 && (
                      <motion.div
                        className="text-xs text-green-600 font-medium"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Zap className="w-3 h-3 inline mr-1" />
                        +{player.score}
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              ) : (
                <div
                  key={`empty-${index}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-r from-gray-100 to-gray-200 opacity-70 min-h-[56px]"
                >
                  <Award className="w-6 h-6 text-gray-300" />
                  <Avatar className="w-10 h-10 border-2 border-gray-200 bg-gray-100">
                    <AvatarFallback className="text-gray-400 font-bold">?</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-400 text-sm truncate">빈자리</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-300 text-xl">-</div>
                  </div>
                </div>
              )
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameScoreboard;
