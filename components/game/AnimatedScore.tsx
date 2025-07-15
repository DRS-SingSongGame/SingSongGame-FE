import { useEffect, useState } from "react";
import { useMotionValue, animate } from "framer-motion";

interface AnimatedScoreProps {
  from?: number; // 시작값
  score: number; // 최종값
  className?: string;
  unit?: string;
}

export default function AnimatedScore({ from, score, className = '', unit = '' }: AnimatedScoreProps) {
  const motionValue = useMotionValue(from ?? score);
  const [displayScore, setDisplayScore] = useState(from ?? score);

  useEffect(() => {
    const controls = animate(motionValue, score, {
      duration: 1.5, // 더 느리게
      onUpdate: (latest) => setDisplayScore(Math.round(latest)),
    });
    return controls.stop;
  }, [score, from]);

  return <span className={className}>{displayScore}{unit}</span>;
} 