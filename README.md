# SingSong Game Frontend

노래 맞추기 게임의 프론트엔드 애플리케이션입니다.

## 시작하기

먼저 개발 서버를 실행하세요:

```bash
npm run dev
# 또는
yarn dev
# 또는
pnpm dev
# 또는
bun dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

## 기술 스택

- **Next.js 14** - React 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링
- **App Router** - Next.js 13+ 라우팅 시스템

## 프로젝트 구조

```
singsonggameFE/
├── app/                 # App Router 디렉토리
│   ├── layout.tsx      # 루트 레이아웃
│   ├── page.tsx        # 홈 페이지
│   └── globals.css     # 글로벌 스타일
├── components/         # 재사용 가능한 컴포넌트
├── lib/               # 유틸리티 함수
├── public/            # 정적 파일
└── package.json       # 프로젝트 설정
```

## 개발

페이지를 수정하려면 `app/page.tsx`를 편집하세요. 파일을 저장하면 페이지가 자동으로 업데이트됩니다.

## 배포

가장 쉬운 Next.js 앱 배포 방법은 [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)을 사용하는 것입니다.

## 설치 패키지

`npm install axios`