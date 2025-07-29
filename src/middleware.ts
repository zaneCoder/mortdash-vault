import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/forgot-password'];
  const isPublicPath = publicPaths.some(publicPath => path.startsWith(publicPath));

  // Get the token from the Authorization header or cookies
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                request.cookies.get('auth-token')?.value;

  // For client-side routes, let the client handle authentication
  // The middleware will only handle API routes and redirects
  if (!path.startsWith('/api/')) {
    // For login page, redirect authenticated users to dashboard
    if (path === '/login' && token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // For other pages, let the client-side ProtectedRoute handle authentication
    return NextResponse.next();
  }

  // For API routes, check if the request has a valid token
  if (path.startsWith('/api/')) {
    // Skip authentication for certain API routes if needed
    const publicApiRoutes = ['/api/auth'];
    const isPublicApiRoute = publicApiRoutes.some(route => path.startsWith(route));
    
    if (isPublicApiRoute) {
      return NextResponse.next();
    }

    // For protected API routes, ensure token is present
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 