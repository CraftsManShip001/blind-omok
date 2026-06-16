import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SocketProvider } from "@/components/SocketProvider";
import { Toaster } from "@/components/Toaster";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESCRIPTION =
  "모든 돌이 같은 색입니다. 내 돌과 상대 돌을 기억해서 두는 온라인 블라인드 오목. 랜덤 매칭, 방 만들기, 관전까지.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "블라인드 오목 — 같은 색. 다른 기억.",
    template: "%s · 블라인드 오목",
  },
  description: DESCRIPTION,
  applicationName: "블라인드 오목",
  keywords: [
    "블라인드 오목",
    "오목",
    "온라인 오목",
    "실시간 오목",
    "blind gomoku",
    "gomoku",
    "omok",
    "five in a row",
  ],
  authors: [{ name: "블라인드 오목" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "블라인드 오목",
    title: "블라인드 오목 — 같은 색. 다른 기억.",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "블라인드 오목 — 같은 색. 다른 기억.",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
    >
      <body className="min-h-dvh">
        <SocketProvider>
          {children}
          <Toaster />
        </SocketProvider>
      </body>
    </html>
  );
}
