import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata = {
  title: "SingSongGame",
  description: "AI 기반 노래 맞추기 게임",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
