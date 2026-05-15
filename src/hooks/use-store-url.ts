'use client';

import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { useMemo } from 'react';
import { RESERVED_SUBDOMAINS } from '@/lib/domain';

export function useStoreUrl() {
  const params = useParams();
  const pathname = usePathname();
  const { store: ownedStore, staffMember } = useAuth();
  const { store: publicStore } = useSettings();
  
  const storeId = useMemo(() => {
    // Priority:
    // 1. Store ID from settings (resolved by middleware or path)
    // 2. params.storeId from URL
    // 3. Extract from pathname (fallback for hydration)
    // 4. staffMember's store_id
    // 5. ownedStore's id

    const pathnameStoreId = (() => {
        const parts = pathname.split('/');
        if ((parts[1] === 'store' || parts[1] === 'store-app') && parts[2]) {
            return parts[2];
        }
        if (parts[1] && !RESERVED_SUBDOMAINS.includes(parts[1])) {
            return parts[1];
        }
        return null;
    })();

    return publicStore?.id || (params?.storeId as string) || pathnameStoreId || staffMember?.store_id || ownedStore?.id || 'global';
  }, [params, pathname, publicStore, ownedStore, staffMember]);

  const getStoreUrl = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (cleanPath.startsWith('/store-app')) {
        const remaining = cleanPath.replace('/store-app', '');
        return `/store-app/${storeId}${remaining}`;
    }
    if (cleanPath.startsWith('/store')) {
        const remaining = cleanPath.replace('/store', '');
        return `/${storeId}${remaining}`;
    }
    return cleanPath;
  };

  return { storeId, getStoreUrl };
}
