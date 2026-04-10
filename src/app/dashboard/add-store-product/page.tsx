
'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { 
  Globe, 
  Loader2, 
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { WebStoreProductForm } from '@/components/inventory/WebStoreProductForm';

export default function AddStoreProductPage() {
  const { permissions, isLoading: isAuthLoading } = useAuth();
  
  if (isAuthLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!permissions.manage_website_content) return <AccessDenied />;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          icon={Globe} 
          title="Add Web Store Product" 
          description="Create a premium entry for your public-facing storefront."
        />
        <Button variant="ghost" asChild className="gap-2 btn-back">
          <Link href="/dashboard/inventory"><ArrowLeft className="h-4 w-4" /> Back to Inventory</Link>
        </Button>
      </div>

      <WebStoreProductForm />
    </div>
  );
}
