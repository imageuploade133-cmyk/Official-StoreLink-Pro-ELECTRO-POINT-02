'use client';

import { useMemo } from 'react';
import { Navigation } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { NavigationBarSettings } from './components/NavigationBarSettings';

export default function StoreNavigationSettingsPage() {
    const firestore = useFirestore();
    const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();

    const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

    const settingsRef = useMemo(
        () => {
            if (!firestore) return null;
            if (currentStoreId) {
                return doc(firestore, 'stores', currentStoreId, 'settings', 'config');
            }
            return doc(firestore, 'settings', 'global');
        },
        [firestore, currentStoreId]
    );

    // Fallback for old stores
    const oldSettingsRef = useMemo(
        () => (firestore && currentStoreId) ? doc(firestore, 'settings', currentStoreId) : null,
        [firestore, currentStoreId]
    );

    const { data: mainSettingsData, isLoading: isLoadingMainSettings } = useDoc<AppSettings>(settingsRef);
    const { data: oldSettingsData, isLoading: isLoadingOldSettings } = useDoc<AppSettings>(oldSettingsRef);

    const settingsData = mainSettingsData || oldSettingsData;
    const isLoading = (isLoadingMainSettings && (currentStoreId ? isLoadingOldSettings : true)) || isAuthLoading;
    
    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Skeleton className="h-96 w-full" /></div>;
    }

    if (!permissions.manage_settings) {
        return <AccessDenied />;
    }

    return (
        <div className="space-y-8">
            <PageHeader
                icon={Navigation}
                title="Store Navigation Settings"
                description="Customize the public store header, navigation, and menu appearance."
            />
            
            <div className="space-y-6">
                <NavigationBarSettings settingsData={settingsData} isLoading={isLoading} />
            </div>
        </div>
    );
}