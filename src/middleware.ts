import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getMainDomain, RESERVED_SUBDOMAINS } from '@/lib/domain';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Define main domain and reserved subdomains
  const mainDomain = getMainDomain(hostname);
  const reservedSubdomains = RESERVED_SUBDOMAINS;

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
  let storeData = null;

  // 1. Pro Plan: storeid.domain.com or custom-subdomain.domain.com
  if (hostname.endsWith(`.${mainDomain}`)) {
    const subdomain = hostname.replace(`.${mainDomain}`, '');
    if (!reservedSubdomains.includes(subdomain)) {
      try {
        const lookupUrl = new URL(`/api/internal/domain-lookup?subdomain=${subdomain}`, url.origin);
        const res = await fetch(lookupUrl.toString());
        if (res.ok) {
          const data = await res.json();
          storeId = data.storeId;
          storeData = data;
        }
      } catch (error) {
        console.error('Middleware subdomain lookup error:', error);
      }
    }
  } 
  // 2. Premium Plan: customdomain.com
  else if (hostname !== mainDomain && !isLocalhost) {
    // For custom domains, we MUST look up which store it belongs to.
    try {
        const lookupUrl = new URL(`/api/internal/domain-lookup?domain=${hostname}`, url.origin);
        const res = await fetch(lookupUrl.toString());
        if (res.ok) {
          const data = await res.json();
          storeId = data.storeId;
          storeData = data;
        }
    } catch (error) {
        console.error('Middleware domain lookup error:', error);
    }
  }
  // 3. Path-based redirect for Pro stores
  else if (hostname === mainDomain || isLocalhost) {
    const pathParts = url.pathname.split('/');
    if (pathParts.length >= 2) {
      const possibleStoreId = pathParts[1];
      if (possibleStoreId && !reservedSubdomains.includes(possibleStoreId)) {
        try {
          const lookupUrl = new URL(`/api/internal/domain-lookup?storeId=${possibleStoreId}`, url.origin);
          const res = await fetch(lookupUrl.toString());
          if (res.ok) {
            const data = await res.json();
            // Redirect to subdomain if on Pro/Premium plan and NOT on the subdomain already
            if ((data.plan === 'pro' || data.plan === 'premium') && data.subdomain) {
              // Construct the new URL on the subdomain
              // We remove the /[storeId] from the beginning of the path
              const newPath = url.pathname.startsWith(`/${possibleStoreId}`) 
                ? url.pathname.substring(possibleStoreId.length + 1) || '/' 
                : url.pathname;
              const protocol = url.protocol || 'https:';
              const newUrl = new URL(newPath + url.search, `${protocol}//${data.subdomain}.${mainDomain}`);
              
              console.log(`Redirecting from path ${url.pathname} to subdomain ${newUrl.toString()}`);
              return NextResponse.redirect(newUrl);
            }
          }
        } catch (error) {
          console.error('Middleware path redirect lookup error:', error);
        }
      }
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
