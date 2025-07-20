// components/game/ConnectionModal.tsx
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectionModalProps {
  show: boolean;
  isReconnecting: boolean;
  onReconnect: () => void;
  onLeaveToLobby: () => void;
}

export const ConnectionModal = ({
  show,
  isReconnecting,
  onReconnect,
  onLeaveToLobby
}: ConnectionModalProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📡</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                서버와의 연결이 끊어졌습니다
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                네트워크 문제로 인해 서버와의 연결이 끊어졌습니다.<br/>
                다시 연결하려면 아래 버튼을 클릭하세요.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onLeaveToLobby}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  로비로 나가기
                </button>
                <button
                  onClick={onReconnect}
                  disabled={isReconnecting}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isReconnecting 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isReconnecting ? '재연결 중...' : '🔄 재연결'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};