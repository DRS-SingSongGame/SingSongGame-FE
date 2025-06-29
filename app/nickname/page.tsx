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
  const router = useRouter();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;


  const handleSubmit = async () => {
    if (!name.trim()) return;
  
    try {
      // 1. 닉네임 설정 요청
      await fetch(`${API_BASE_URL}/api/auth/nickname`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include", // ✅ 쿠키 포함
      });
  
      // 2. 유저 정보 다시 가져오기
      const res = await fetch(`${API_BASE_URL}/api/user/me`, {
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
            <Input
              id="name"
              placeholder="닉네임을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
            />
          </div>
          <Button
            onClick={handleSubmit}
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
