import React from "react";

const micCount = 60; // 오른쪽 위→왼쪽 아래
const leftMicCount = 48; // 왼쪽 위→왼쪽 아래

function getRandom(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function FloatingMicBackground() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: "linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)", // 더 파란 바탕
      }}
      aria-hidden
    >
      {/* 오른쪽 위 → 왼쪽 아래 */}
      {Array.from({ length: micCount }).map((_, i) => {
        const startX = getRandom(60, 100); // 오른쪽
        const startY = getRandom(0, 40);   // 위쪽
        const endX = getRandom(-10, 40);   // 왼쪽
        const endY = getRandom(60, 110);   // 아래쪽
        const size = getRandom(24, 48);
        const duration = getRandom(12, 28);
        const delay = getRandom(0, 10);
        const rotate = getRandom(-20, 20);
        const opacity = getRandom(0.32, 0.5);
        const blue = ["#60a5fa", "#3b82f6", "#2563eb", "#38bdf8", "#a5b4fc"][Math.floor(Math.random()*5)];

        return (
          <svg
            key={"r-"+i}
            width={size}
            height={size}
            style={{
              position: "absolute",
              left: `${startX}%`,
              top: `${startY}%`,
              opacity,
              animation: `floatMicR${i} ${duration}s linear ${delay}s infinite`,
              transform: `rotate(${rotate}deg)`
            }}
            fill="none"
            stroke={blue}
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="8" y1="22" x2="16" y2="22"/>
            <style>{`
              @keyframes floatMicR${i} {
                0% { left: ${startX}%; top: ${startY}%; opacity: ${opacity}; }
                100% { left: ${endX}%; top: ${endY}%; opacity: ${opacity}; }
              }
            `}</style>
          </svg>
        );
      })}
      {/* 왼쪽 위 → 왼쪽 아래 */}
      {Array.from({ length: leftMicCount }).map((_, i) => {
        const startX = getRandom(-10, 20); // 왼쪽
        const startY = getRandom(0, 40);   // 위쪽
        const endX = getRandom(-10, 20);   // 왼쪽
        const endY = getRandom(60, 110);   // 아래쪽
        const size = getRandom(24, 48);
        const duration = getRandom(14, 32);
        const delay = getRandom(0, 12);
        const rotate = getRandom(-20, 20);
        const opacity = getRandom(0.08, 0.18);
        const blue = ["#60a5fa", "#3b82f6", "#2563eb", "#38bdf8", "#a5b4fc"][Math.floor(Math.random()*5)];

        return (
          <svg
            key={"l-"+i}
            width={size}
            height={size}
            style={{
              position: "absolute",
              left: `${startX}%`,
              top: `${startY}%`,
              opacity,
              animation: `floatMicL${i} ${duration}s linear ${delay}s infinite`,
              transform: `rotate(${rotate}deg)`
            }}
            fill="none"
            stroke={blue}
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="8" y1="22" x2="16" y2="22"/>
            <style>{`
              @keyframes floatMicL${i} {
                0% { left: ${startX}%; top: ${startY}%; opacity: ${opacity}; }
                100% { left: ${endX}%; top: ${endY}%; opacity: ${opacity}; }
              }
            `}</style>
          </svg>
        );
      })}
    </div>
  );
} 