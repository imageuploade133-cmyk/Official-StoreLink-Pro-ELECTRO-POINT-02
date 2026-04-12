'use client';

import { useMemo } from 'react';
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
    const { permissions, isLoading: isAuthLoading } = useAuth();

    const settingsRef = useMemo(
        () => (firestore ? doc(firestore, 'settings', 'global') : null),
        [firestore]
    );
    const { data: settingsData, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);
    const isLoading = isLoadingSettings || isAuthLoading;
    
    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Skeleton className="h-96 w-full" /></div>;
    }

    if (!permissions.manage_settings) {
        return <AccessDenied />;
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="Store Navigation Settings"
                description="Customize the public store header, navigation, and menu appearance."
            />
            
            <div className="space-y-6">
                <NavigationBarSettings settingsData={settingsData} isLoading={isLoading} />
            </div>
        </div>
    );
}