"use client";

import { useEffect, useState } from "react";
import { useQuickMatch } from "@/hooks/useQuickMatch";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuickMatchPopupProps } from "@/types/quickmatch";
import { Users, Zap, X, HelpCircle } from "lucide-react";

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const QuickMatchPopup = ({
  user,
  isOpen,
  onClose,
  onMatchFound,
}: QuickMatchPopupProps) => {
  const {
    isInQueue,
    queueTime,
    estimatedWaitTime,
    joinQueue,
    leaveQueue,
  } = useQuickMatch(user, onMatchFound);

  // 대기 시간 1초씩 증가 로직
  const [localQueueTime, setLocalQueueTime] = useState(queueTime);
  useEffect(() => {
    if (isInQueue) {
      setLocalQueueTime(queueTime);
      const timer = setInterval(() => {
        setLocalQueueTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setLocalQueueTime(queueTime);
    }
  }, [isInQueue, queueTime]);

  const [showInfo, setShowInfo] = useState(false);

  const handleClose = () => {
    if (isInQueue) {
      leaveQueue();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-transparent shadow-none border-none flex items-center justify-center">
        <div className="w-[30rem] h-[30rem] rounded-full border-8 border-cyan-400 shadow-2xl flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/60 to-cyan-900/40">
          <div className="flex flex-col items-center">
            {/* 중앙 이미지: sword.png */}
            <img src="/sword.png" alt="sword" className="mb-10 w-44 h-44 object-contain" />
            <div className="text-3xl font-bold text-white drop-shadow-lg mb-6">빠른 대전</div>
            {isInQueue && (
              <>
                <div className="text-xl font-semibold text-cyan-200 mb-2 drop-shadow-lg">
                  {formatTime(localQueueTime)} / 예상 {formatTime(estimatedWaitTime)}
                </div>
                <Button
                  onClick={leaveQueue}
                  variant="outline"
                  size="sm"
                  className="text-black border-red-400 hover:bg-red-900/20 text-xs px-3 py-1 mt-2"
                >
                  <X className="w-3 h-3 mr-1" />
                  대기열 취소
                </Button>
              </>
            )}
            {!isInQueue && (
              <>
                <Button
                  onClick={joinQueue}
                  size="lg"
                  className="glow-hover bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 text-white font-bold shadow-xl border-2 border-blue-300 text-xl px-10 py-6 w-full max-w-[180px] mt-16"
                >
                  대기열 참가
                </Button>
                <button
                  onClick={onClose}
                  className="w-24 h-8 bg-gradient-to-br from-red-500 via-red-400 to-red-300 text-white font-bold shadow-xl border-2 border-red-300 text-base rounded-b-full py-0.5 border-t-0 outline-none focus:outline-none mt-2"
                >
                  취소
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickMatchPopup;