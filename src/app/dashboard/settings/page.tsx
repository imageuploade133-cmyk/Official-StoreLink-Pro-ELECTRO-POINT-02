
'use client';

import { useMemo, useState } from 'react';
import { Settings as SettingsIcon, Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';
import { GeneralSettings } from './components/GeneralSettings';
import { PosReceiptSettings } from './components/PosReceiptSettings';
import { InventoryStockSettings } from './components/InventoryStockSettings';
import { MessagingSettings } from './components/MessagingSettings';
import { useAuth } from '@/contexts/auth-context';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiKeysSettings } from './components/ApiKeysSettings';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentMethodsSettings } from './components/PaymentMethodsSettings';
import { SocialMediaSettings } from './components/SocialMediaSettings';
import { ShopSettings } from './components/ShopSettings';
import { LogoSizeSettings } from '@/components/dashboard/settings/LogoSizeSettings';
import { PosProductSizeSettings } from '@/components/dashboard/settings/PosProductSizeSettings';

// Keyword mapping for search functionality
const settingsKeywords = {
  general: ['currency', 'country', 'region', 'phone', 'localization', 'identity', 'business'],
  api: ['api', 'key', 'keys', 'imgbb', 'integration', 'third-party'],
  pos: ['pos', 'receipt', 'printer', 'invoice', 'price modification', 'logo size', 'product size', 'columns', 'grid', 'layout'],
  inventory: ['inventory', 'stock', 'alert', 'product image', 'deduction', 'threshold', 'wastage'],
  messaging: ['messaging', 'sms', 'whatsapp', 'webhook', 'notifications', 'messages'],
  payment: ['payment methods', 'cash', 'card', 'transfer', 'payment options', 'gateways'],
  social: ['social media', 'links', 'facebook', 'twitter', 'instagram'],
  shop: ['shop', 'collection', 'banner', 'alignment', 'products'],
};

export default function SettingsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const settingsRef = useMemo(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  );

  const { data: settingsData, isLoading: isLoadingSettings } =
    useDoc<AppSettings>(settingsRef);
    
  const isLoading = isLoadingSettings || isAuthLoading;

  const visibleSections = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase().trim();
    if (!lowercasedTerm) {
        return { general: true, api: true, pos: true, inventory: true, messaging: true, payment: true, social: true, shop: true };
    }
    
    const visible: Record<string, boolean> = { general: false, api: false, pos: false, inventory: false, messaging: false, payment: false, social: false, shop: false };
    
    // Check card titles and descriptions
    if ('business & regional settings'.includes(lowercasedTerm)) visible.general = true;
    if ('api keys'.includes(lowercasedTerm)) visible.api = true;
    if ('pos & receipt settings'.includes(lowercasedTerm)) visible.pos = true;
    if ('inventory & stock alerts'.includes(lowercasedTerm)) visible.inventory = true;
    if ('messaging & webhooks'.includes(lowercasedTerm)) visible.messaging = true;
    if ('payment methods'.includes(lowercasedTerm)) visible.payment = true;
    if ('social media links'.includes(lowercasedTerm)) visible.social = true;
    if ('shop our collection settings'.includes(lowercasedTerm)) visible.shop = true;
    
    // Check keywords for each section
    for (const section in settingsKeywords) {
        if (settingsKeywords[section as keyof typeof settingsKeywords].some(keyword => keyword.includes(lowercasedTerm))) {
            visible[section] = true;
        }
    }
    
    return visible;
  }, [searchTerm]);
  
  const noResultsFound = Object.values(visibleSections).every(v => !v);

  if (isLoading) {
    return (
        <div className="space-y-8">
             <PageHeader
                icon={SettingsIcon}
                title="Settings"
                description="Manage your store's global settings and preferences."
            />
            <div className="space-y-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
  }
  
  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Manage your store's global settings and preferences."
      />
      
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
            type="search"
            placeholder="Search settings... (e.g., 'currency', 'social media', 'receipt')"
            className="pl-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {visibleSections.general && <GeneralSettings settingsData={settingsData} isLoading={isLoading} />}
        {visibleSections.shop && <ShopSettings settingsData={settingsData} isLoading={isLoading} />}
        {visibleSections.payment && <PaymentMethodsSettings settingsData={settingsData} isLoading={isLoading} />}
        {visibleSections.social && <SocialMediaSettings settingsData={settingsData} isLoading={isLoading} />}
        {visibleSections.api && <ApiKeysSettings settingsData={settingsData} isLoading={isLoading} />}
        {visibleSections.pos && (
            <>
                <PosProductSizeSettings settingsData={settingsData} isLoading={isLoading} />
                <LogoSizeSettings settingsData={settingsData} isLoading={isLoading} />
                <PosReceiptSettings settingsData={settingsData} isLoading={isLoading} />
            </>
        )}
        {visibleSections.inventory && <InventoryStockSettings settingsData={settingsData} isLoading={isLoading} />}
        {visibleSections.messaging && <MessagingSettings settingsData={settingsData} isLoading={isLoading} />}
        
        {noResultsFound && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
                <p className="font-semibold text-lg">No Settings Found</p>
                <p>Your search for "{searchTerm}" did not match any settings.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
