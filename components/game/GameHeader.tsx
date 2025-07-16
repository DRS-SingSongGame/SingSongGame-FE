import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/Progress";
import { ArrowLeft, Volume2, Music, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, ReactNode } from "react";

interface GameHeaderProps {
  currentRound: number;
  maxRound: number;
  isReading: boolean;
  onBack: () => void;
  hintText?: string | null;
  children?: ReactNode;
  timeLeft?: number;
}

const GameHeader = ({
  currentRound,
  maxRound,
  isReading,
  onBack,
  children,
  timeLeft
}: GameHeaderProps) => {
  // hintText 관련 UI(힌트 Badge 등)와 showHint 상태, 관련 useEffect, 렌더링 부분을 모두 제거한다. 라운드 Badge도 제거한다.

  return (
    <div className="mb-6">
      <Card className="pipe-metal-card rounded-2xl min-h-[270px]">
        <div className="absolute top-4 left-4 z-10">
          <Button variant="outline" onClick={onBack} className="pipe-metal-btn rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            로비로 돌아가기
          </Button>
          {children}
        </div>
        <CardHeader>
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full flex justify-center"
            >
              <CardTitle className="text-3xl font-bold text-white flex items-center justify-center gap-3 drop-shadow-lg">
              </CardTitle>
              <motion.div
                className="mt-4 flex justify-center items-center w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative">
                  {/* 빛나는 효과 */}
                  {isReading && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.2) 50%, transparent 70%)',
                        filter: 'blur(20px)',
                      }}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                  
                  <motion.img
                    src="/robot.png"
                    alt="AI 로봇"
                    className="relative z-10 rounded-2xl shadow-2xl border-4 border-blue-900 bg-black"
                    style={{ width: 300, height: 169, objectFit: 'cover' }}
                    animate={isReading ? {
                      scale: [1, 1.04, 1],
                      rotate: [0, 2, -2, 0],
                      filter: [
                        "brightness(1)",
                        "brightness(1.15)",
                        "brightness(1)",
                      ],
                      opacity: 1,
                    } : {
                      scale: 0.95,
                      opacity: 0.5,
                      filter: "brightness(1)",
                      rotate: 0,
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  {/* robot 하단에 힌트 들어갈 공간 확보 */}
                  <div className="w-full flex justify-center mt-16 min-h-[4px]">
                    {children}
                  </div>
                  {/* 오른쪽 하단 60초 타이머+게이지바 */}
                  {typeof timeLeft === 'number' && (
                    <div style={{ position: 'absolute', right: 16, bottom: 16, width: 180 }} className="flex flex-col items-end z-20">
                      <div className="text-3xl font-extrabold text-white mb-1 drop-shadow-lg">{timeLeft}초</div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-3 bg-gradient-to-r from-blue-400 to-red-400 transition-all duration-500"
                          style={{ width: `${(timeLeft / 60) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
            {/* 타이머 UI 제거됨 */}
            <div className="flex justify-end w-full mt-1"></div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};

export default GameHeader;
