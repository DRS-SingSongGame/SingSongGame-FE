// app/nickname/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function NicknamePage() {
  const [name, setName] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null); // null: 아직 검사 안함
  const [checking, setChecking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCheckRequiredModal, setShowCheckRequiredModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const router = useRouter();

  const checkDuplicate = async () => {
    if (!name.trim()) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/user/check-name?name=${encodeURIComponent(name)}`);
      const result = await res.json();
      setIsAvailable(result?.data ?? result?.body ?? false);
    } catch (err) {
      console.error("중복 검사 실패", err);
      setIsAvailable(false);
    } finally {
      setChecking(false);
    }
  };

  const handleStartClick = () => {
    if (isAvailable === null) {
      setShowCheckRequiredModal(true); // 아직 중복검사 안함
    } else if (isAvailable === true) {
      setShowConfirmModal(true); // 중복검사 OK → 확인 모달 띄움
    } else {
      // 중복된 닉네임 → 버튼이 disabled라 여긴 안옴
      setShowDuplicateModal(true);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
  
    try {
      // 1. 닉네임 설정 요청
      await fetch(`/api/auth/nickname`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include", // ✅ 쿠키 포함
      });
  
      // 2. 유저 정보 다시 가져오기
      const res = await fetch(`/api/user/me`, {
        method: "GET",
        credentials: "include",
      });
  
      const result = await res.json();
      const user = result?.data ?? result?.body;
  
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
  
        // ✅ localStorage 저장 이후에 리다이렉트
        router.push("/lobby");
      } else {
        console.warn("인증 실패: 유저 정보 없음 → /login으로 이동");
        router.push("/login");
      }
    } catch (err) {
      console.error("닉네임 등록 실패", err);
    }
  };
  

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
        {showCheckRequiredModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
          <p className="text-lg font-semibold">닉네임 중복 확인 후 진행해주세요.</p>
          <Button onClick={() => setShowCheckRequiredModal(false)} className="mt-4 w-full">
            확인
          </Button>
        </div>
      </div>
    )}

    {showConfirmModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
          <p className="text-lg font-semibold">
            작성하신 닉네임은 <span className="text-purple-600 font-bold">{name}</span>입니다.
            <br />
            게임을 시작하시겠습니까?
          </p>
          <div className="mt-6 flex gap-4 justify-center">
            <Button onClick={handleSubmit}>네</Button>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              취소
            </Button>
          </div>
        </div>
      </div>
    )}
        {showDuplicateModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
        <p className="text-lg font-semibold text-red-600">
            이미 사용 중인 닉네임입니다.
        </p>
        <Button onClick={() => setShowDuplicateModal(false)} className="mt-4 w-full">
            확인
        </Button>
        </div>
    </div>
    )}

      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            닉네임 설정
          </CardTitle>
          <CardDescription>
            게임에서 사용할 닉네임을 입력해주세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="name">닉네임</Label>
            <div className="flex gap-2">
                <Input
                id="name"
                placeholder="닉네임을 입력하세요"
                value={name}
                onChange={(e) => {
                    setName(e.target.value);
                    setIsAvailable(null); // 입력 바뀌면 초기화
                }}
                maxLength={10}
                className="flex-1"
                />
                <Button
                type="button"
                variant="outline"
                onClick={checkDuplicate}
                disabled={!name.trim() || checking}
                >
                중복확인
                </Button>
            </div>
            {isAvailable === true && (
                <p className="text-green-600 text-sm mt-1">사용 가능한 닉네임입니다.</p>
            )}
            {isAvailable === false && (
                <p className="text-red-600 text-sm mt-1">이미 사용 중인 닉네임입니다.</p>
            )}
            </div>
          <Button
            onClick={handleStartClick}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            disabled={!name.trim()}
          >
            게임 시작하기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
