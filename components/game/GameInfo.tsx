import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface GameInfoProps {
  isReading: boolean;
  correctAnswer: string | null;
  correctArtist: string | null;
  totalRounds: number;
}

const GameInfo = ({ isReading, correctAnswer, correctArtist, totalRounds }: GameInfoProps) => {
  return (
    <Card className="bg-white/90 backdrop-blur-sm mt-4">
      <CardHeader>
        <CardTitle>📋 게임 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="font-semibold text-gray-700">현재 상태</h4>
          <p className="text-sm text-gray-600">
            {isReading ? '🎵 TTS 읽는 중' : '⏸️ 대기 중'}
          </p>
        </div>
        {correctAnswer && correctArtist && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <h4 className="font-semibold text-green-700">정답 공개</h4>
            <p className="text-sm text-green-600">
              "{correctAnswer}" - {correctArtist}
            </p>
          </div>
        )}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• TTS가 가사를 읽어주는 동안 정답을 입력하세요</p>
          <p>• 빠르게 맞출수록 높은 점수를 획득합니다</p>
          <p>• 총 {totalRounds}라운드 진행됩니다</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameInfo;
