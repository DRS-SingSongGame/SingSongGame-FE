import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface LoginPageProps {
  onLogin: (userData: any) => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [name, setName] = useState("");
  const [showName, setShowName] = useState(false);

  const handleOAuthLogin = () => {
    // OAuth 로그인 시뮬레이션 - 실제로는 OAuth 플로우가 필요합니다
    window.location.href = "http://localhost:8080/oauth2/authorization/kakao";
  };

  const handleNameSubmit = () => {
    if (name.trim()) {
      onLogin({
        id: Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      });
    }
  };

  if (showName) {
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
              onClick={handleNameSubmit}
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🎵 Sing Song Game
          </CardTitle>
          <CardDescription className="text-lg">
            친구들과 함께 즐기는 음악 퀴즈 게임
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => handleOAuthLogin()}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3"
          >
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
            </svg>
            카카오톡으로 로그인
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
