// app/layout.tsx

import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata = {
  title: "SingSongGame",
  description: "AI 기반 노래 맞추기 게임",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
        <Providers>
          <main className="flex-1 w-full max-w-screen-xl mx-auto px-4">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
