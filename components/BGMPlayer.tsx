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
    audio.volume = 0.5; // 볼륨 50%로 고정
    audio.preload = 'auto'; // 오디오 미리 로드
    audioRef.current = audio;

    // 자동 재생 시도
    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log('자동 재생 실패, 사용자 상호작용 대기:', error);
          // 자동 재생이 실패해도 isPlaying 상태는 유지
        });
      }
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
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log('재생 실패:', error);
            // 재생 실패 시에도 상태는 유지
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, setIsPlaying]);

  return null;
} 