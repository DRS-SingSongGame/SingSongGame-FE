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
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">🎉 내 빠른 대전 결과</h2>
          <div className="text-center mb-6">
            <p className="text-lg">
              <span className="font-semibold">{result.oldTier}</span> ({result.oldMmr}) → <span className="font-semibold">{result.newTier}</span> ({result.newMmr})
            </p>
            <p className="mt-2">
              <span
                className={`font-bold text-lg ${
                  result.tierStatus === "UP"
                    ? "text-green-600"
                    : result.tierStatus === "DOWN"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {result.tierStatus === "UP"
                  ? "▲ 티어 상승"
                  : result.tierStatus === "DOWN"
                  ? "▼ 티어 하락"
                  : "변동 없음"}
              </span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  };
  
  export default QuickMatchResultModal;