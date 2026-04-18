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
  let storeData: any = null;

  // 1. Check if we are on a subdomain (storeid.domain.com or custom-subdomain.domain.com)
  if (hostname.endsWith(`.${mainDomain}`)) {
    const subdomain = hostname.replace(`.${mainDomain}`, '');
    if (!reservedSubdomains.includes(subdomain)) {
      try {
        const lookupUrl = new URL(`/api/internal/domain-lookup?subdomain=${subdomain}`, url.origin);
        const res = await fetch(lookupUrl.toString(), { cache: 'no-store' });
        if (res.ok) {
          storeData = await res.json();
          storeId = storeData.storeId;
        }
      } catch (error) {
        console.error('Middleware subdomain lookup error:', error);
      }
    }
  } 
  // 2. Check if we are on a custom domain (customdomain.com)
  else if (hostname !== mainDomain && !isLocalhost) {
    try {
        const lookupUrl = new URL(`/api/internal/domain-lookup?domain=${hostname}`, url.origin);
        const res = await fetch(lookupUrl.toString(), { cache: 'no-store' });
        if (res.ok) {
          storeData = await res.json();
          storeId = storeData.storeId;
        }
    } catch (error) {
        console.error('Middleware domain lookup error:', error);
    }
  }
  // 3. Check if we are on the main domain with a path-based storeId (domain.com/storeId)
  else if (hostname === mainDomain || isLocalhost) {
    const pathParts = url.pathname.split('/');
    if (pathParts.length >= 2) {
      const possibleStoreId = pathParts[1];
      if (possibleStoreId && !reservedSubdomains.includes(possibleStoreId)) {
        try {
          const lookupUrl = new URL(`/api/internal/domain-lookup?storeId=${possibleStoreId}`, url.origin);
          const res = await fetch(lookupUrl.toString(), { cache: 'no-store' });
          if (res.ok) {
            storeData = await res.json();
            storeId = storeData.storeId;
          }
        } catch (error) {
          console.error('Middleware path lookup error:', error);
        }
      }
    }
  }

  // If we found a store, handle optional redirects and rewrites
  if (storeId && storeData) {
    const { primaryDomainType, redirectEnabled, subdomain, customDomain, plan } = storeData;
    
    // Determine the desired primary domain URL
    let primaryHostname = null;
    let isPathBased = false;

    if (primaryDomainType === 'custom' && customDomain) {
      primaryHostname = customDomain;
    } else if (primaryDomainType === 'subdomain' && subdomain) {
      primaryHostname = `${subdomain}.${mainDomain}`;
    } else if (primaryDomainType === 'free') {
      primaryHostname = mainDomain;
      isPathBased = true;
    }

    // Handle optional redirect if enabled and we are not on the primary domain
    if (redirectEnabled && primaryHostname) {
      const onCorrectHostname = hostname === primaryHostname;
      const onCorrectPath = isPathBased ? url.pathname.startsWith(`/${storeId}`) || url.pathname.startsWith(`/${storeData.slug}`) : true;

      if (!onCorrectHostname || (isPathBased && !onCorrectPath)) {
        const protocol = url.protocol || 'https:';
        let newPath = url.pathname;
        
        const pathStoreId = storeData.slug || storeId;
        if (isPathBased && !newPath.startsWith(`/${pathStoreId}`)) {
          newPath = `/${pathStoreId}${newPath}`;
        } else if (!isPathBased && (newPath.startsWith(`/${storeId}`) || (storeData.slug && newPath.startsWith(`/${storeData.slug}`)))) {
          newPath = newPath.replace(`/${storeId}`, '').replace(`/${storeData.slug}`, '') || '/';
        }

        const newUrl = new URL(newPath + url.search, `${protocol}//${primaryHostname}`);
        console.log(`Redirecting to primary domain: ${newUrl.toString()}`);
        return NextResponse.redirect(newUrl);
      }
    }

    // Rewrite the URL for internal routing if we are on a domain/subdomain that's NOT the main domain
    // Or if we are on the main domain but the store is NOT using path-based access (wait, no)
    // Actually, if we have a storeId from hostname, we must rewrite.
    
    const isHostnameBased = hostname !== mainDomain && !isLocalhost;
    if (isHostnameBased || (hostname.endsWith(`.${mainDomain}`) && !reservedSubdomains.includes(hostname.replace(`.${mainDomain}`, '')))) {
       // Avoid infinite rewrites
       if (url.pathname.startsWith(`/${storeId}`)) {
          const response = NextResponse.next();
          response.headers.set('x-store-id', storeId);
          return response;
       }

       const rewriteUrl = new URL(`/${storeId}${url.pathname}`, req.url);
       console.log(`Rewriting ${hostname}${url.pathname} to ${rewriteUrl.pathname}`);
       
       const response = NextResponse.rewrite(rewriteUrl);
       response.headers.set('x-store-id', storeId);
       return response;
    }

    // For path-based stores on main domain, also set the header
    const response = NextResponse.next();
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
