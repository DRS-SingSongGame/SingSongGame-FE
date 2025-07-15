"use client";

import { useQuickMatch } from "@/hooks/useQuickMatch";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuickMatchPopupProps } from "@/types/quickmatch";
import { Users, Zap, X } from "lucide-react";

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

  const handleClose = () => {
    if (isInQueue) {
      leaveQueue();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>
            <span className="text-center text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent flex items-center justify-center">
              <Zap className="inline w-6 h-6 mr-2 text-yellow-500" />
              빠른 대전
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-center">
          {!isInQueue ? (
            <Button
              onClick={joinQueue}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-full shadow-lg"
            >
              <Users className="w-4 h-4 mr-2" />
              대기열 참가
            </Button>
          ) : (
            <>
              <div className="text-2xl font-bold text-purple-600">
                대기 중...
              </div>

              <div className="text-sm text-gray-600">
                {formatTime(queueTime)} / 예상 {formatTime(estimatedWaitTime)}
              </div>

              <Button
                onClick={leaveQueue}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50 text-xs px-3 py-1 mt-2"
              >
                <X className="w-3 h-3 mr-1" />
                대기열 취소
              </Button>
            </>
          )}

          <div className="bg-blue-50 p-3 rounded-lg mt-6">
            <h4 className="font-semibold text-blue-800 mb-1 text-sm">
              랜덤 노래 맞추기
            </h4>
            <p className="text-xs text-blue-600">
              • 6명의 플레이어가 함께 참여
              <br />
              • 랜덤한 노래를 듣고 제목 맞추기
              <br />• 가장 빨리 정답을 맞힌 사람이 점수 획득
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickMatchPopup;