  'use client';

  import { useState, useEffect, useRef } from 'react';
  import { Input } from '@/components/ui/Input';
  import { Button } from '@/components/ui/Button';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
  import { ScrollArea } from '@/components/ui/scroll-area';

  export interface ChatMessage {
    id: number;
    type: 'TALK' | 'ENTER' | 'LEAVE';
    roomId: string;
    senderId: string;
    senderName: string;
    message: string;
    timestamp: string;
    time: string;
  }

  interface ChatBoxProps {
    user: any;
    messages: ChatMessage[];
    onSend?: (message: string) => void;
    autoScrollToBottom?: boolean;
    chatType?: "lobby" | "room" | "game";
    hideInput?: boolean;
  }

  const ChatBox = ({ user, messages, onSend, autoScrollToBottom, hideInput, chatType = "lobby" }: ChatBoxProps) => {
    const [input, setInput] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    const messageToSend = input.trim();
    console.log("text", messageToSend)
    if (!messageToSend) return;
    onSend?.(messageToSend);
    setInput('');
  };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !isComposing) {
        e.preventDefault();
        handleSend();
      }
    };

    useEffect(() => {
      if (autoScrollToBottom && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages, autoScrollToBottom]);

    return (
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardContent>
          {/* 스크롤은 이 안쪽 div에만 생기고, 숨겨짐 */}
          <div
            ref={scrollRef}
            className="flex flex-col gap-2 h-[180px] overflow-y-auto scrollbar-hide mb-3 px-1 pt-2"
          >
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-center w-full text-sm">
                <span className="font-semibold text-purple-600 mr-1">{msg.senderName}:</span>
                <span className="ml-1 whitespace-pre-line break-all flex-1">{msg.message}</span>
                <span className="text-gray-400 text-xs ml-2 whitespace-nowrap">{msg.time}</span>
              </div>
            ))}
          </div>


          {/* 입력창 */}
          {!hideInput && (
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="메시지를 입력하세요..."
              />
              <Button onClick={handleSend}>전송</Button>
            </div>
          )}
        </CardContent>
      </Card>

    );
  };

  export default ChatBox;
