import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PayNudge - Collections Desk',
  description: 'AI-powered invoice management for freelancers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
