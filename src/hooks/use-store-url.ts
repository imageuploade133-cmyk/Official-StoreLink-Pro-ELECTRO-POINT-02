'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useMemo } from 'react';

export function useStoreUrl() {
  const params = useParams();
  const { store, staffMember } = useAuth();
  
  const storeId = useMemo(() => {
    if (params?.storeId) return params.storeId as string;
    return staffMember?.store_id || store?.id || 'global';
  }, [params, store, staffMember]);

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
