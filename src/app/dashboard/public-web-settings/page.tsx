
'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Globe, Loader2, Search } from 'lucide-react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { BrandValuesSettings } from './components/BrandValuesSettings';
import { NewsletterSettings } from './components/NewsletterSettings';
import { SiteIdentitySettings } from './components/SiteIdentitySettings';
import { ColorSettings } from '../settings/components/ColorSettings';
import { AuthPageSettings } from './components/AuthPageSettings';
import { FooterSettings } from './components/FooterSettings';
import { ImageUploadSettings } from './components/ImageUploadSettings';
import { WatermarkSettings } from './components/WatermarkSettings';
import { HeroCarouselSettings } from './components/HeroCarouselSettings';
import { WebStoreGridSettings } from '@/components/dashboard/settings/WebStoreGridSettings';
import { ProductCardSizeSettings } from '@/components/dashboard/settings/ProductCardSizeSettings';

export default function PublicWebSettingsPage() {
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
    const isLoadingSettings = isLoadingMainSettings && (currentStoreId ? isLoadingOldSettings : true);
    
    const isLoading = isLoadingSettings || isAuthLoading;
    
    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (!permissions.manage_settings) {
        return <AccessDenied />;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Globe}
                title="General Website Settings"
                description="Manage general look, feel, and identity of your public-facing website."
            />
            
            <div className="space-y-6">
                <SiteIdentitySettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
                <AuthPageSettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
                <HeroCarouselSettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
                <ImageUploadSettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
                <WatermarkSettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
                <ColorSettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
                <WebStoreGridSettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
                <ProductCardSizeSettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
                <BrandValuesSettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
                <FooterSettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
                <NewsletterSettings settingsData={settingsData} isLoading={isLoading} storeId={currentStoreId} />
            </div>
        </div>
    );
}
