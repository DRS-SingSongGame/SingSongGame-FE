// app/layout.tsx

import { Providers } from "@/components/providers";
import "./globals.css";
import FloatingMicBackground from "@/components/FloatingMicBackground";

export const metadata = {
  title: "SingSongGame",
  description: "AI 기반 노래 맞추기 게임",
  icons: {
    icon: '/singsonglogo.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <body 
        className="min-h-screen flex flex-col bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 "
        style={{ cursor: "url('/cursor/mic.png') 0 0, auto" }}
      >
        <FloatingMicBackground />
        <Providers>
          <main className="flex-1 w-full max-w-screen-xl mx-auto px-4">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
