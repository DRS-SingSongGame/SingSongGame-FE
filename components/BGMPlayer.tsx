'use client';

import { useEffect, useRef } from 'react';

interface BGMPlayerProps {
  bgmVolume?: number; // 0~100
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
}

export default function BGMPlayer({ bgmVolume = 50, isPlaying, setIsPlaying }: BGMPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('/audio/energy.mp3');
    audio.loop = true;
    audio.volume = bgmVolume / 100;
    audioRef.current = audio;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }

    return () => {
      audio.pause();
    };
    // eslint-disable-next-line
  }, []);

  // 볼륨이 바뀔 때마다 반영
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = bgmVolume / 100;
    }
  }, [bgmVolume]);

  // isPlaying이 바뀔 때마다 play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, setIsPlaying]);

  return null;
} 