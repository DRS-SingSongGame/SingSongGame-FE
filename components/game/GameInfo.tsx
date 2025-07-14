import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Music, Mic, Clock, Target, Lightbulb, Play, Pause } from 'lucide-react';

interface GameInfoProps {
  isReading: boolean;
  correctAnswer: string | null;
  correctArtist: string | null;
  totalRounds: number;
}

const GameInfo = ({ isReading, correctAnswer, correctArtist, totalRounds }: GameInfoProps) => {
  return (
    <Card className="pipe-metal-card rounded-2xl">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-purple-700">
          <Info className="w-6 h-6" />
          📋 게임 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200"
        >
          <div className="flex items-center gap-2 mb-2">
            {isReading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Play className="w-5 h-5 text-green-500" />
              </motion.div>
            ) : (
              <Pause className="w-5 h-5 text-gray-500" />
            )}
            <h4 className="font-semibold text-gray-700">현재 상태</h4>
          </div>
          <p className="text-sm text-gray-600 flex items-center gap-2">
            {isReading ? (
              <>
                <Mic className="w-4 h-4 text-purple-500 animate-pulse" />
                🎵 AI가 노래를 부르고 있어요...
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-gray-500" />
                ⏸️ 대기 중
              </>
            )}
          </p>
        </motion.div>

        <AnimatePresence>
          {correctAnswer && correctArtist && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 shadow-md"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-700">정답 공개</h4>
              </div>
              <div className="text-center">
                <motion.div
                  className="text-2xl mb-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  🎵
                </motion.div>
                <p className="text-lg font-bold text-green-700 mb-1">
                  "{correctAnswer}"
                </p>
                <p className="text-sm text-green-600">
                  {correctArtist}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-xs text-gray-600 space-y-3"
        >
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
            <Music className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <p>AI가 가사를 읽어주는 동안 정답을 입력하세요</p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
            <Target className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p>빠르게 맞출수록 높은 점수를 획득합니다</p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200">
            <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p>총 <span className="font-bold text-blue-600">{totalRounds}</span>라운드 진행됩니다</p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
            <Lightbulb className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p>힌트를 잘 활용하면 더 쉽게 맞출 수 있어요!</p>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default GameInfo;
