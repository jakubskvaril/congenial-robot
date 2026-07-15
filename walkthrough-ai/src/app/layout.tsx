import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { TrpcProvider } from '@/lib/trpc/Provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Walkthrough AI — Cinematic Real Estate Video, Automated',
  description:
    'Upload property photos, get a physically-accurate cinematic luxury walkthrough video in minutes. Powered by a multi-agent AI pipeline.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" data-theme="dark" className="dark">
        <body className="font-sans">
          <TrpcProvider>
            {children}
            <Toaster theme="dark" position="bottom-right" richColors />
          </TrpcProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
