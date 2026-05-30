import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/ui/Providers';

export const metadata: Metadata = {
  title: 'VideoForge Pro — Premiere-Level Browser Editor',
  description: 'Real video rendering, color grading, audio mixing. Powered by FFmpeg.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Syne:wght@700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
