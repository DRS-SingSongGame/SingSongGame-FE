import AnimatedScore from '../game/AnimatedScore';

interface QuickMatchResultModalProps {
    result: {
      oldMmr: number;
      newMmr: number;
      oldTier: string;
      newTier: string;
      tierStatus: "UP" | "DOWN" | "SAME";
    };
    onClose: () => void;
  }
  
  const QuickMatchResultModal = ({ result, onClose }: QuickMatchResultModalProps) => {
    // 티어명에 따라 이미지 경로 매핑
    const tierImageMap: Record<string, string> = {
      '새내기': '/rank/t1.png',
      '훈련생': '/rank/t2.png',
      '모험가': '/rank/t3.png',
      '도전자': '/rank/t4.png',
      '에이스': '/rank/t5.png',
      '전설': '/rank/t6.png',
    };
    const tierImg = tierImageMap[result.newTier] || '';
    return (
      <div className="fixed inset-0 bg-[#1a2236]/95 flex items-center justify-center z-50">
        <div className="w-96 h-96 rounded-full border-8 border-cyan-400 shadow-2xl flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/60 to-cyan-900/40">
          {tierImg && (
            <img src={tierImg} alt={result.newTier} className="w-48 h-48 object-contain mb-4" />
          )}
          <div className="text-3xl font-bold text-cyan-100">
            <AnimatedScore from={result.oldMmr} score={result.newMmr} />
          </div>
          {/* 점수 변화량 */}
          <div className={
            result.newMmr > result.oldMmr
              ? "text-green-400 text-xl font-bold mt-2"
              : result.newMmr < result.oldMmr
              ? "text-red-400 text-xl font-bold mt-2"
              : "text-gray-300 text-xl font-bold mt-2"
          }>
            {result.newMmr > result.oldMmr && `+${result.newMmr - result.oldMmr}점`}
            {result.newMmr < result.oldMmr && `-${result.oldMmr - result.newMmr}점`}
            {result.newMmr === result.oldMmr && '변동 없음'}
          </div>
          {/* 확인 버튼 */}
          <button
            onClick={onClose}
            className="w-32 bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-3 px-4 rounded-full transition-colors mt-4"
          >
            확인
          </button>
        </div>
      </div>
    );
  };
  
  export default QuickMatchResultModal;