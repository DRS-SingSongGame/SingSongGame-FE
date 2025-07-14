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

  const loginUrl = `/api/oauth2/authorization/kakao`;

  const handleOAuthLogin = () => {
    // OAuth 로그인 시뮬레이션 - 실제로는 OAuth 플로우가 필요합니다
    window.location.href = loginUrl;
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-400 via-purple-500 via-blue-500 to-cyan-400">
      {/* ✅ 로고를 카드 밖에 배치 */}
      <div className="mb-8 text-center relative z-50">
        <img 
          src="/singsonglogo.png" 
          alt="SingSong Game Logo" 
          width={600}
          height={600}
          className="mx-auto mb-4 drop-shadow-lg"
        />
        
      </div>

      {/* 로그인 카드 */}
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm relative z-40">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            로그인
          </CardTitle>
          <CardDescription className="text-gray-600">
            게임을 시작하려면 로그인해주세요
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
