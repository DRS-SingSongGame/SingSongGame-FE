'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ChatMessage {
  id: number;
  user: string;
  message: string;
  time: string;
}

interface ChatBoxProps {
  user: { nickname: string };
  messages: ChatMessage[];
  onSend: (message: string) => void;
}

const ChatBox = ({ user, messages, onSend }: ChatBoxProps) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">로비 채팅</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-1 h-full flex flex-col justify-between">
        <ScrollArea className="h-[110px]">
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-2 text-sm">
                <span className="font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  {msg.user}:
                </span>
                <span>{msg.message}</span>
                <span className="text-gray-400 text-xs ml-auto">{msg.time}</span>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <Button onClick={handleSend} className="bg-gradient-to-r from-pink-500 to-purple-500">
            전송
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatBox;
