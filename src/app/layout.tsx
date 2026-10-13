import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Pulse Radar",
  description: "Cutting-edge AI techniques and tools, ranked from X, Hacker News, Reddit and GitHub.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SiteNav />
        {children}
        <footer className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 text-xs text-muted sm:px-6">
          Signals from X, Hacker News, Reddit and GitHub, refreshed about every 15 minutes.
        </footer>
      </body>
    </html>
  );
}
