import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  return (
    <Card className="bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>💬 채팅 & 정답 입력</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 text-sm p-2 rounded ${
                  msg.isSystem 
                    ? 'bg-blue-50 text-blue-700' 
                    : msg.isCorrect 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-gray-50'
                }`}
              >
                <span className="font-semibold min-w-0 flex-shrink-0">
                  {msg.playerName}:
                </span>
                <span className="flex-1">{msg.message}</span>
                <span className="text-gray-400 text-xs flex-shrink-0">
                  {msg.time}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            placeholder="노래 제목을 입력하세요..."
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onChatSubmit()}
            disabled={!isReading}
          />
          <Button 
            onClick={onChatSubmit}
            disabled={!isReading}
          >
            전송
          </Button>
        </div>
        {!isReading && (
          <div className="text-center text-gray-500 text-sm">
            TTS가 읽을 때만 정답을 입력할 수 있습니다
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GameChat;
