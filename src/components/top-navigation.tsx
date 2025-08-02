'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Home, FileText, Activity, HardDrive, GraduationCap } from 'lucide-react';

export function TopNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Create URL with preserved search parameters
  const createUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

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
            <Link href={createUrlWithParams('/')}>
              <Button
                variant={pathname === '/' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            
            <Link href={createUrlWithParams('/storage')}>
              <Button
                variant={pathname === '/storage' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <HardDrive className="w-4 h-4" />
                Storage
              </Button>
            </Link>
            
            <Link href={createUrlWithParams('/courses')}>
              <Button
                variant={pathname === '/courses' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                Courses
              </Button>
            </Link>
            
            <Link href={createUrlWithParams('/logs')}>
              <Button
                variant={pathname === '/logs' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Logs
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

          {/* Right side - empty for now */}
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