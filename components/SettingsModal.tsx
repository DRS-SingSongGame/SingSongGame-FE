import React, { useState } from "react";

const musicOptions = [
  { value: "acoustic", label: "어쿠스틱" },
  { value: "jazz", label: "기본음악" },
  { value: "pop", label: "팝" },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { bgmVolume: number; effectVolume: number; bgmType: string }) => void;
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [bgmVolume, setBgmVolume] = useState(50);
  const [effectVolume, setEffectVolume] = useState(50);
  const [bgmType, setBgmType] = useState("acoustic");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white rounded-lg p-6 w-80 shadow-lg">
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
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1 border rounded bg-gray-200 hover:bg-gray-300"
          >
            취소
          </button>
          <button
            onClick={() => onSave({ bgmVolume, effectVolume, bgmType })}
            className="px-4 py-1 border rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
} 