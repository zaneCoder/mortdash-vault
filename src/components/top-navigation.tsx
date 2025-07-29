'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Video, Home, FileText } from 'lucide-react';

export function TopNavigation() {
  const pathname = usePathname();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Image
                src="/mortdash.png"
                alt="MortDash Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-xl font-bold">MortDash</span>
              <span className="text-sm text-muted-foreground">Vault</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            <Link href="/">
              <Button
                variant={pathname === '/' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            
            {pathname.startsWith('/files/') && (
              <div className="flex items-center gap-2">
                <div className="w-px h-6 bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled
                >
                  <FileText className="w-4 h-4" />
                  Files
                </Button>
              </div>
            )}
          </nav>

          {/* Right side - could add user menu, settings, etc. */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              Zoom Recordings Manager
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 