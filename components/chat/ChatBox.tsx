'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';

export interface ChatBoxRef {
  focusInput: () => void;
}

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
  chatType?: "lobby" | "room" | "game" | "simple";
  hideInput?: boolean;
  compact?: boolean;
  className?: string;
}

const ChatBox = forwardRef<ChatBoxRef, ChatBoxProps>(({ 
  user, 
  messages, 
  onSend, 
  autoScrollToBottom, 
  hideInput, 
  chatType = "lobby", 
  compact = false,
  className = ""
}, ref) => {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ref 메서드 노출
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus();
    }
  }));

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

  if (compact) {
    // Card 없이 컴팩트 버전 - 모바일 최적화
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 overflow-y-auto mb-2 lg:mb-3 min-h-0">
          <div 
            ref={scrollRef} 
            className="space-y-1 lg:space-y-2 h-full overflow-y-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {messages.map((msg) => (
              <div key={msg.id} className="mb-1 lg:mb-2">
                <div className="text-xs lg:text-sm">
                  <span className="text-purple-600 font-medium">
                    {(msg.type === 'ENTER' || msg.type === 'LEAVE') ? '시스템' : msg.senderName}:
                  </span>{' '}
                  <span className="text-gray-700">{msg.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {!hideInput && (
          <div className="flex gap-1 lg:gap-2 shrink-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm border border-gray-300 rounded-lg lg:rounded-xl"
            />
            <Button 
              onClick={handleSend} 
              className="px-2 lg:px-3 py-1.5 lg:py-2 bg-purple-500 text-white text-xs lg:text-sm rounded-lg lg:rounded-xl shrink-0"
            >
              전송
            </Button>
          </div>
        )}
      </div>
    );
  }
  

  if (chatType === "simple") {
    return (
      <div className="w-70 h-[750px] bg-white/90 backdrop-blur-sm rounded-lg p-4 flex flex-col">
        <div className="mb-3">
        </div>
        <div className="flex-1 overflow-y-auto mb-3 scrollbar-hide" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className="mb-2">
              <div className="text-base text-gray-800 break-words">
                <span className="text-sm font-bold text-purple-600 mr-2">
                  {(msg.type === 'ENTER' || msg.type === 'LEAVE') ? '시스템' : msg.senderName}:
                </span>
                <span className="text-base text-gray-700">
                  {msg.message}
                </span>
              </div>
            </div>
          ))}
        </div>
        {!hideInput && (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black-500"
            />
            <button
              onClick={handleSend}
              className="px-3 py-2 bg-purple-500 text-white text-sm rounded-xl hover:bg-purple-600"
            >
              전송
            </button>
          </div>
        )}
      </div>
    );
  }

  // 일반 Card 버전 - 게임에서 사용하는 버전도 모바일 최적화
  if (chatType === "room") {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 overflow-y-auto mb-2 lg:mb-3 min-h-0">
          <div 
            ref={scrollRef} 
            className="space-y-1 lg:space-y-2 h-full overflow-y-auto scrollbar-hide pr-1 lg:pr-2"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start w-full text-xs lg:text-lg gap-1 lg:gap-2"
              >
                <span className="font-semibold text-purple-600 text-xs lg:text-lg shrink-0"> 
                  {(msg.type === 'ENTER' || msg.type === 'LEAVE') ? '시스템' : msg.senderName}:
                </span>
                <span className="whitespace-pre-line break-all flex-1 text-xs lg:text-lg leading-tight lg:leading-normal">
                  {msg.message}
                </span>
                <span className="text-gray-400 text-xs whitespace-nowrap shrink-0 hidden lg:block">
                  {msg.time}
                </span>
              </div>
            ))}
          </div>
        </div>
        {!hideInput && (
          <div className="flex gap-1 lg:gap-2 shrink-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="메시지를 입력하세요..."
              className="text-xs lg:text-lg px-2 lg:px-3 py-1.5 lg:py-2"
            />
            <Button 
              onClick={handleSend} 
              className="text-xs lg:text-lg px-3 lg:px-6 py-1.5 lg:py-2 shrink-0"
            >
              전송
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 기존 Card 버전 (로비, 게임 등) - 데스크톱 UI 유지하면서 모바일 최적화
  return (
    <Card className="bg-white/90 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-2 lg:pb-6 shrink-0">
        <div className="text-lg lg:text-3xl font-extrabold text-black text-left">
          {chatType === "game" ? "게임 채팅" : "로비 채팅"}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 pt-0">
        <ScrollArea className="flex-1 mb-2 lg:mb-2 min-h-0">
          <div 
            ref={scrollRef} 
            className="space-y-1 lg:space-y-2 overflow-y-auto scrollbar-hide pr-2"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start w-full text-xs lg:text-lg gap-1 lg:gap-2"
              >
                <span className="font-semibold text-purple-600 text-xs lg:text-lg shrink-0"> 
                  {(msg.type === 'ENTER' || msg.type === 'LEAVE') ? '시스템' : msg.senderName}:
                </span>
                <span className="whitespace-pre-line break-all flex-1 text-xs lg:text-lg leading-tight lg:leading-normal">
                  {msg.message}
                </span>
                <span className="text-gray-400 text-xs whitespace-nowrap shrink-0 hidden lg:block">
                  {msg.time}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
        {!hideInput && (
          <div className="flex gap-1 lg:gap-2 shrink-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="메시지를 입력하세요..."
              className="text-xs lg:text-lg px-2 lg:px-3 py-1.5 lg:py-2"
            />
            <Button 
              onClick={handleSend} 
              className="text-xs lg:text-lg px-3 lg:px-6 py-1.5 lg:py-2 shrink-0"
            >
              전송
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ChatBox.displayName = 'ChatBox';

export default ChatBox;