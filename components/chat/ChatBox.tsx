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
}

const ChatBox = ({ user, messages, onSend, autoScrollToBottom }: ChatBoxProps) => {
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
      <CardHeader>
        <CardTitle>로비 채팅</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] mb-2 pr-2">
          <div ref={scrollRef} className="space-y-2 max-h-[200px] overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className={`text-sm ${msg.senderName === user.nickname ? 'text-right' : 'text-left'}`}>
                <div className="font-semibold">
                  {msg.senderName} <span className="text-gray-400 text-xs">{msg.time}</span>
                </div>
                <div className="bg-gray-100 inline-block rounded px-2 py-1">{msg.message}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
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
      </CardContent>
    </Card>
  );
};

export default ChatBox;
