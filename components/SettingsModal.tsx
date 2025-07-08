import React, { useState, useEffect } from "react";

const musicOptions = [
  { value: "acoustic", label: "기본음악" },
  { value: "jazz", label: "재즈" },
  { value: "pop", label: "팝" },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { bgmVolume: number; effectVolume: number; bgmType: string }) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

export default function SettingsModal({ isOpen, onClose, onSave, isPlaying, onPlay, onPause }: SettingsModalProps) {
  const [bgmVolume, setBgmVolume] = useState(50);
  const [effectVolume, setEffectVolume] = useState(50);
  const [bgmType, setBgmType] = useState("acoustic");

  // 모달이 열릴 때 localStorage에서 값 불러오기
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('ssg_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.bgmVolume === 'number') setBgmVolume(parsed.bgmVolume);
          if (typeof parsed.effectVolume === 'number') setEffectVolume(parsed.effectVolume);
          if (typeof parsed.bgmType === 'string') setBgmType(parsed.bgmType);
        } catch {}
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    const settings = { bgmVolume, effectVolume, bgmType };
    localStorage.setItem('ssg_settings', JSON.stringify(settings));
    onSave(settings);
  };

  // 취소 버튼은 변경사항을 저장하지 않고 모달만 닫음
  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white rounded-lg p-6 w-80 shadow-lg relative">
        <h2 className="text-lg font-bold mb-4">환경 설정</h2>
        <div className="mb-2">
          <label className="block mb-1">배경음악 조절</label>
          <input
            type="range"
            min={0}
            max={100}
            value={bgmVolume}
            onChange={e => setBgmVolume(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-2">
          <label className="block mb-1">효과음 조절</label>
          <input
            type="range"
            min={0}
            max={100}
            value={effectVolume}
            onChange={e => setEffectVolume(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">배경음악 선택</label>
          <select
            value={bgmType}
            onChange={e => setBgmType(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            {musicOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 mb-10">
          <button
            onClick={handleCancel}
            className="px-4 py-1 border rounded bg-gray-200 hover:bg-gray-300"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1 border rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            저장
          </button>
        </div>
        {/* 하단 컨트롤 영역 */}
        <div className="absolute left-0 bottom-0 w-full flex items-end justify-between px-4 pb-3">
          <div>
            {isPlaying ? (
              <button
                onClick={onPause}
                className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-sm"
              >
                음악 끄기
              </button>
            ) : (
              <button
                onClick={onPlay}
                className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-sm"
              >
                음악 켜기
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 text-right">
            Music: 'Energy' by Bensound (<a href="https://www.bensound.com" target="_blank" rel="noopener noreferrer" className="underline">https://www.bensound.com</a>)
          </div>
        </div>
      </div>
    </div>
  );
}