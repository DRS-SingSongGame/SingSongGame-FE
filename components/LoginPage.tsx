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
  const [nickname, setNickname] = useState("");
  const [showNickname, setShowNickname] = useState(false);

  const handleOAuthLogin = (provider: "kakao" | "google") => {
    // OAuth 로그인 시뮬레이션 - 실제로는 OAuth 플로우가 필요합니다
    console.log(`${provider} 로그인 시도`);
    setShowNickname(true);
  };

  const handleNicknameSubmit = () => {
    if (nickname.trim()) {
      onLogin({
        id: Math.random().toString(36).substr(2, 9),
        nickname: nickname.trim(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${nickname}`,
      });
    }
  };

  if (showNickname) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              닉네임 설정1
            </CardTitle>
            <CardDescription>
              게임에서 사용할 닉네임을 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                placeholder="닉네임을 입력하세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
              />
            </div>
            <Button
              onClick={handleNicknameSubmit}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={!nickname.trim()}
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
            🎵 뮤직 게임
          </CardTitle>
          <CardDescription className="text-lg">
            친구들과 함께 즐기는 음악 퀴즈 게임
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => handleOAuthLogin("kakao")}
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
          <Button
            onClick={() => handleOAuthLogin("google")}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-semibold py-3"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            구글로 로그인
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
