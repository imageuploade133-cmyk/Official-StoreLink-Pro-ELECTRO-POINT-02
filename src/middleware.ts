import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Define main domain and reserved subdomains
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'storelinkpro.com';
  const reservedSubdomains = ['www', 'admin', 'dashboard', 'api', 'pos', 'signup', 'login', 'signup-merchant'];

  // Exclude internal paths and static files
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Handle localhost and preview deployments
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.endsWith('.vercel.app');
  
  let storeId = null;

  // 1. Pro Plan: storeid.domain.com
  if (hostname.endsWith(`.${mainDomain}`)) {
    const subdomain = hostname.replace(`.${mainDomain}`, '');
    if (!reservedSubdomains.includes(subdomain)) {
      // We'll rewrite to the storeId path. 
      // The application logic will handle plan validation since it already fetches store settings.
      storeId = subdomain;
    }
  } 
  // 2. Premium Plan: customdomain.com
  else if (hostname !== mainDomain && !isLocalhost) {
    // For custom domains, we MUST look up which store it belongs to.
    try {
        // We use an internal API to keep middleware light. 
        // In a real production app, you might use Edge Config or a fast KV store here.
        const lookupUrl = new URL(`/api/internal/domain-lookup?domain=${hostname}`, url.origin);
        const res = await fetch(lookupUrl.toString());
        if (res.ok) {
          const data = await res.json();
          storeId = data.storeId;
        }
    } catch (error) {
        console.error('Middleware domain lookup error:', error);
    }
  }

  if (storeId) {
    // If we have a storeId from hostname, rewrite the URL
    // e.g., store1.storelinkpro.com/shop -> storelinkpro.com/store1/shop
    
    // Avoid infinite rewrites
    if (url.pathname.startsWith(`/${storeId}`)) {
        return NextResponse.next();
    }

    const rewriteUrl = new URL(`/${storeId}${url.pathname}`, req.url);
    console.log(`Rewriting ${hostname}${url.pathname} to ${rewriteUrl.pathname}`);
    
    const response = NextResponse.rewrite(rewriteUrl);
    // Add storeId to headers so server components can access it
    response.headers.set('x-store-id', storeId);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
