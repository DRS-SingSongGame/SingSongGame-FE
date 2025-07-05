import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/Progress';
import { ArrowLeft, Volume2 } from 'lucide-react';

interface GameHeaderProps {
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  isReading: boolean;
  onBack: () => void;
}

const GameHeader = ({ currentRound, totalRounds, timeLeft, isReading, onBack }: GameHeaderProps) => {
  return (
    <div className="mb-6">
      <Button variant="outline" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        로비로 돌아가기
      </Button>
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                🎵 평어 노래 맞추기
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline">
                  라운드 {currentRound}/{totalRounds}
                </Badge>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <span className="text-sm">
                    {isReading ? 'TTS 읽는 중...' : '대기 중'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {timeLeft}초
              </div>
              <Progress 
                value={(timeLeft / 60) * 100} 
                className="w-32 mt-2"
              />
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};

export default GameHeader;
