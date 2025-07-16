import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, Mic, Music, Trophy, Star } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface ChatMessage {
  id: number;
  playerId: string;
  playerName: string;
  message: string;
  time: string;
  isCorrect?: boolean;
  isSystem?: boolean;
}

interface GameChatProps {
  messages: ChatMessage[];
  chatInput: string;
  isReading: boolean;
  onChatInputChange: (value: string) => void;
  onChatSubmit: () => void;
}

const GameChat = ({ 
  messages, 
  chatInput, 
  isReading, 
  onChatInputChange, 
  onChatSubmit 
}: GameChatProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 올 때마다 스크롤을 맨 아래로
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="pipe-metal-card rounded-2xl ">
      <CardHeader
        className="bg-gray-50 border-none rounded-none"
        style={{ border: 'none', boxShadow: 'none', outline: 'none' }}
      >
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-700">
           채팅 & 정답 입력
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <ScrollArea className="h-80 scrollbar-hide" ref={scrollRef}>
          <div className="space-y-3">
            <AnimatePresence>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  className={`flex gap-2 text-base text-white`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-white">
                      {msg.playerName}:
                    </span>
                    <span className="text-white ml-1">
                      {msg.message}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
        
        <motion.div 
          className="flex gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex-1 relative">
            <Input
              placeholder={isReading ? "노래 제목을 입력하세요..." : "대기 중..."}
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onChatSubmit()}
              disabled={!isReading}
              className={`pr-12 transition-all duration-300 text-gray-800 placeholder-gray-500 rounded-xl ${
                isReading 
                  ? 'border-gray-300 focus:border-gray-500 focus:ring-gray-200' 
                  : 'border-gray-300 bg-gray-50'
              }`}
            />

          </div>
          <Button 
            onClick={() => {
              console.log("[버튼 클릭됨] 전송 버튼 눌림");
              onChatSubmit();
            }}
            disabled={!isReading}
            className={`px-6 transition-all duration-300 rounded-xl ${
              isReading 
                ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            전송
          </Button>
        </motion.div>
        
        <AnimatePresence>
          {!isReading && (
            <motion.div 
              className="text-center text-gray-500 text-sm bg-gray-50 p-3 rounded-2xl border border-gray-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-center gap-2">
                <Music className="w-4 h-4" />
                AI가 노래를 부를 때만 정답을 입력할 수 있습니다
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default GameChat;
