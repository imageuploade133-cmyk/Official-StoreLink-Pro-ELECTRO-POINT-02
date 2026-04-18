'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { useMemo } from 'react';

export function useStoreUrl() {
  const params = useParams();
  const { store: ownedStore, staffMember } = useAuth();
  const { store: publicStore } = useSettings();
  
  const storeId = useMemo(() => {
    // Priority:
    // 1. Store ID from settings (resolved by middleware or path)
    // 2. params.storeId from URL
    // 3. staffMember's store_id
    // 4. ownedStore's id
    return publicStore?.id || (params?.storeId as string) || staffMember?.store_id || ownedStore?.id || 'global';
  }, [params, publicStore, ownedStore, staffMember]);

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
