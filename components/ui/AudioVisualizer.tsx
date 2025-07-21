import React, { useEffect, useRef, useState } from "react";
import { getSharedAudioCtx } from "@/lib/sharedAudioCtx";

interface Props {
  audioRef: React.RefObject<HTMLAudioElement>;
}

const AudioVisualizer: React.FC<Props> = ({ audioRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode>();
  const analyserRef = useRef<AnalyserNode>();
  const rafRef = useRef<number>();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audioEl = audioRef.current;
    const canvas = canvasRef.current;
    if (!audioEl || !canvas) return;

    const audioCtx = getSharedAudioCtx();
    audioCtx.resume();

    // Analyser 설정
    if (!analyserRef.current) {
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
    }
    const analyser = analyserRef.current!;

    // MediaElementSource 연결 (한 번만)
    if (!sourceRef.current) {
      try {
        sourceRef.current = audioCtx.createMediaElementSource(audioEl);
        audioEl._srcNode = sourceRef.current;
        sourceRef.current.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch (error) {
        console.warn("MediaElementSource already connected:", error);
      }
    }

    const ctx = canvas.getContext("2d")!;
    const bufferLen = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLen);

    let animationId: number | null = null;

    const draw = () => {
      if (!isPlaying) return;

      animationId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#7c3aed";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      const centerY = canvas.height / 2;
      const scaleY = canvas.height * 0.8;
      const sliceWidth = canvas.width / bufferLen;
      let x = 0;

      // collect points
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < bufferLen; i++) {
        const v = (dataArray[i] - 128) / 128;
        const y = v * (scaleY / 2) + centerY;
        points.push({ x, y });
        x += sliceWidth;
      }

      // draw smooth curve with quadratic Bezier
      if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const cpX = (prev.x + curr.x) / 2;
          const cpY = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, cpX, cpY);
        }
        // line to last point
        const last = points[points.length - 1];
        ctx.lineTo(last.x, last.y);
      }

      ctx.stroke();
    };

    const startVisualization = () => {
      setIsPlaying(true);
      if (animationId) cancelAnimationFrame(animationId);
      draw();
    };

    const stopVisualization = () => {
      setIsPlaying(false);
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      // 캔버스 클리어
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // 이벤트 리스너들
    const handlePlay = () => startVisualization();
    const handlePause = () => stopVisualization();
    const handleEnded = () => stopVisualization();
    const handleSeeked = () => {
      // 재생 중이면 시각화 재시작
      if (!audioEl.paused) {
        startVisualization();
      }
    };

    audioEl.addEventListener("play", handlePlay);
    audioEl.addEventListener("pause", handlePause);
    audioEl.addEventListener("ended", handleEnded);
    audioEl.addEventListener("seeked", handleSeeked);

    // 초기 상태 확인
    if (!audioEl.paused) {
      startVisualization();
    }

    return () => {
      audioEl.removeEventListener("play", handlePlay);
      audioEl.removeEventListener("pause", handlePause);
      audioEl.removeEventListener("ended", handleEnded);
      audioEl.removeEventListener("seeked", handleSeeked);

      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [audioRef, isPlaying]);

  return (
    <div className="rounded-xl shadow-lg bg-gradient-to-r from-indigo-100 to-pink-100 p-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={120}
        className="w-full h-28 rounded-lg"
      />
    </div>
  );
};

export default AudioVisualizer;
