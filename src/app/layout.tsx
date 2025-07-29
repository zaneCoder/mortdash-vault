import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/sonner";
import { TopNavigation } from '@/components/top-navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MortDash - Vault',
  description: 'Zoom recordings management and storage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TopNavigation />
        <main className="pt-16">
          {children}
        </main>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
