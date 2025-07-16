import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/Progress";
import { ArrowLeft, Volume2, Music, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface GameHeaderProps {
  currentRound: number;
  maxRound: number;
  timeLeft: number;
  isReading: boolean;
  onBack: () => void;
  hintText?: string | null;
}

const GameHeader = ({
  currentRound,
  maxRound,
  timeLeft,
  isReading,
  onBack,
  // hintText 제거
}: GameHeaderProps) => {
  // hintText 관련 UI(힌트 Badge 등)와 showHint 상태, 관련 useEffect, 렌더링 부분을 모두 제거한다. 라운드 Badge도 제거한다.

  return (
    <div className="mb-6">
      <Card className="pipe-metal-card rounded-2xl">
        <div className="absolute top-4 left-4 z-10">
          <Button variant="outline" onClick={onBack} className="pipe-metal-btn rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            로비로 돌아가기
          </Button>
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
                </div>
              </motion.div>
            </motion.div>
            <div className="flex justify-end w-full mt-1">
              <motion.div 
                className="text-right"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <div className="text-3xl font-bold text-white">
                  {timeLeft}초
                </div>
                <Progress 
                  value={(timeLeft / 60) * 100} 
                  className="w-32 mt-2 h-2 bg-gray-200" 
                />
              </motion.div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};

export default GameHeader;
