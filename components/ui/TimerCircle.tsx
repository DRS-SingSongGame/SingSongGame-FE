import React from 'react';

interface TimerCircleProps {
  timeLeft: number;
  duration: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const TimerCircle: React.FC<TimerCircleProps> = ({
  timeLeft,
  duration,
  size = 80,
  strokeWidth = 4,
  className = ""
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = ((duration - timeLeft) / duration) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="text-red-500 transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{timeLeft}</span>
      </div>
    </div>
  );
};
