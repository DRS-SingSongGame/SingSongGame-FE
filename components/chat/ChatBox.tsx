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
    compact? : boolean;
  }

  const ChatBox = ({ user, messages, onSend, autoScrollToBottom, hideInput, chatType = "lobby" , compact = false}: ChatBoxProps) => {
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

    if (compact) {
      // Card 없이 컴팩트 버전
      return (
        <>
          <div className="flex-1 overflow-y-auto mb-3 h-[700px] scrollbar-hide">
            <div ref={scrollRef} className="space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="mb-2">
                  <div className="text-sm">
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
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl"
              />
              <Button onClick={handleSend} className="px-3 py-2 bg-purple-500 text-white text-sm rounded-xl">
                전송
              </Button>
            </div>
          )}
        </>
      );
    }
  

    return (
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <div className="text-3xl font-extrabold text-black mb-4 text-left">{chatType === "room" ? "방 채팅" : chatType === "game" ? "게임 채팅" : "로비 채팅"}</div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] mb-2 pr-2">
            <div ref={scrollRef} className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center w-full text-sm"
                >
                  <span className="font-semibold text-purple-600 mr-1">{(msg.type === 'ENTER' || msg.type === 'LEAVE') ? '시스템' : msg.senderName}:</span>
                  <span className="ml-1 whitespace-pre-line break-all flex-1">{msg.message}</span>
                  <span className="text-gray-400 text-xs ml-2 whitespace-nowrap">{msg.time}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
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
