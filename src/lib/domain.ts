
export const RESERVED_SUBDOMAINS = ['www', 'admin', 'dashboard', 'api', 'pos', 'signup', 'login', 'signup-merchant', 'shop', 'auth', 'mail', 'support', 'docs'];

/**
 * Gets the main domain of the application.
 * Priority:
 * 1. NEXT_PUBLIC_MAIN_DOMAIN environment variable
 * 2. Provided host (e.g. from headers)
 * 3. Current window location (client-side)
 * 4. Default fallback
 */
export function getMainDomain(host?: string | null): string {
  // Check environment variable first
  if (process.env.NEXT_PUBLIC_MAIN_DOMAIN) {
    return process.env.NEXT_PUBLIC_MAIN_DOMAIN;
  }

  const currentHost = host || (typeof window !== 'undefined' ? window.location.host : null);

  if (currentHost) {
    // Extract hostname without port for check
    const hostname = currentHost.split(':')[0];
    
    // Handle localhost and IP addresses
    if (
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.match(/^\d+\.\d+\.\d+\.\d+$/)
    ) {
      return currentHost;
    }

    // Try to strip common system subdomains
    const parts = hostname.split('.');
    
    // Special handling for Vercel domains
    if (hostname.endsWith('.vercel.app')) {
      // valentino-ice-creame-01-nine.vercel.app -> 3 parts
      // test11.valentino-ice-creame-01-nine.vercel.app -> 4 parts
      if (parts.length > 3) {
        const baseDomain = parts.slice(-3).join('.');
        const port = currentHost.split(':')[1];
        return port ? `${baseDomain}:${port}` : baseDomain;
      }
      return hostname;
    }

    if (parts.length > 2 && RESERVED_SUBDOMAINS.includes(parts[0])) {
      // If we're on dashboard.example.com, the main domain is example.com
      const port = currentHost.split(':')[1];
      const baseDomain = parts.slice(1).join('.');
      return port ? `${baseDomain}:${port}` : baseDomain;
    }

    return currentHost;
  }

  // Server-side fallback (this will be used during build/SSR if env is missing)
  return 'storelinkpro.com';
}

/**
 * Gets the protocol for the current environment
 */
export function getProtocol(): string {
  if (typeof window !== 'undefined') {
    return window.location.protocol;
  }
  return process.env.NODE_ENV === 'development' ? 'http:' : 'https:';
}

/**
 * Gets the full URL for a store based on its ID and the current plan
 */
export function getStoreUrl(storeId: string, plan: string, customDomain?: string | null, subdomain?: string | null): string {
  const mainDomain = getMainDomain();
  const protocol = getProtocol();
  
  if (plan === 'premium' && customDomain) {
    return `${protocol}//${customDomain}`;
  }
  
  if ((plan === 'pro' || plan === 'premium') && subdomain) {
    return `${protocol}//${subdomain}.${mainDomain}`;
  }

  if (plan === 'pro') {
    return `${protocol}//${storeId}.${mainDomain}`;
  }
  
  return `${protocol}//${mainDomain}/${storeId}`;
}
