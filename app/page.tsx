'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

const Home = () => {
  const router = useRouter();

  const handleLoginClick = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center">
      <div className="text-center text-white max-w-2xl px-8 relative z-50">
        {/* 로고 */}
        <div className="mb-8 relative z-50">
          <img 
            src="/singsonglogo.png" 
            alt="SingSong Game Logo" 
            width={600}
            height={600}
            className="mx-auto mb-6 drop-shadow-lg"  // 그림자도 추가
          />
        </div>

        {/* 게임 특징 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-4xl mb-3">🎤</div>
            <h3 className="text-lg font-semibold mb-2">실시간 멀티플레이</h3>
            <p className="text-sm text-blue-100">친구들과 동시에<br></br> 게임을 즐겨보세요</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold mb-2">키워드 맞춤 게임</h3>
            <p className="text-sm text-blue-100">원하는 장르의 음악으로 게임하세요</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="text-lg font-semibold mb-2">점수 경쟁</h3>
            <p className="text-sm text-blue-100">빠른 정답으로<br></br> 높은 점수를 획득하세요</p>
          </div>
        </div>

        {/* 시작 버튼 */}
        <Button
          onClick={handleLoginClick}
          size="lg"
          className="bg-white text-purple-600 hover:bg-blue-50 font-bold text-xl px-12 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          🎮 게임 시작하기
        </Button>

        {/* 추가 정보 */}
        <p className="text-sm text-blue-100 mt-6">
          Made in Team DRS
        </p>
      </div>
    </div>
  );
};

export default Home;