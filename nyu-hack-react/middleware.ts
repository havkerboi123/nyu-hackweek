import { NextRequest, NextResponse } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api', '/_next', '/favicon.ico', '/robots.txt'];

// Protected paths that require authentication
const PROTECTED_PATHS = ['/hospital', '/patient'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthed = req.cookies.get('auth')?.value === 'true';

  // Root path - redirect to login if not authenticated, or to patient portal if authenticated
  if (pathname === '/') {
    if (isAuthed) {
      const url = req.nextUrl.clone();
      url.pathname = '/patient';
      return NextResponse.redirect(url);
    } else {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Check if path is protected
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (isProtected) {
    if (!isAuthed) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from login page
  if (isAuthed && pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/patient';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
