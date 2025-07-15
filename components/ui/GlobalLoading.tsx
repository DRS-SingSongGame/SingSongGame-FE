import React from 'react';

interface GlobalLoadingProps {
  isLoading: boolean;
  message?: string;
}

const GlobalLoading: React.FC<GlobalLoadingProps> = ({ 
  isLoading, 
  message = "로딩 중..." 
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        {/* 이퀄라이저 애니메이션 */}
        <div className="flex items-end justify-center gap-1 mb-6">
          {[...Array(7)].map((_, index) => (
            <div
              key={index}
              className="bg-gradient-to-t from-blue-400 to-blue-600 rounded-t-lg"
              style={{
                width: '6px',
                minHeight: '16px',
                animation: `equalizer 1s ease-in-out infinite`,
                animationDelay: `${index * 0.08}s`,
              }}
            />
          ))}
        </div>

        {/* 로딩 텍스트 */}
        <div className="text-white text-lg font-semibold mb-2">
          {message}
        </div>

        {/* 점 애니메이션 */}
        <div className="flex justify-center space-x-1">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 bg-blue-400 rounded-full"
              style={{
                animation: `dot-pulse 1.5s ease-in-out infinite`,
                animationDelay: `${index * 0.3}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* CSS 애니메이션 정의 */}
      <style jsx>{`
        @keyframes equalizer {
          0%, 100% {
            height: 16px;
          }
          50% {
            height: 48px;
          }
        }

        @keyframes dot-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default GlobalLoading;