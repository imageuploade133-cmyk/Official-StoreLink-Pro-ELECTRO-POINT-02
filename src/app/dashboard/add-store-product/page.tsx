'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, Timestamp, query, orderBy, doc, writeBatch, serverTimestamp, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ProductForm, type ProductFormValues } from '@/components/inventory/ProductForm';
import type { Category, Product } from '@/lib/types';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function AddStoreProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBarcode = searchParams.get('barcode') || '';
  const firestore = useFirestore();
  const { toast } = useToast();
  const { permissions, user, staffMember, store, isLoading: isAuthLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  // Fetch Categories
  const categoriesQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(collection(firestore, 'categories'), where('store_id', '==', currentStoreId), orderBy('name'));
  }, [firestore, currentStoreId]);
  const { data: categories, isLoading: isLoadingCategories, refetch: refetchCategories } = useCollection<Category>(categoriesQuery);

  const handleProductSubmit = async (values: ProductFormValues) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Session Error', description: 'User or database connection lost. Please refresh.' });
      return;
    }
    
    if (!currentStoreId) {
      toast({ variant: 'destructive', title: 'Store ID Missing', description: 'Could not determine your store ID. Please check your account settings or refresh.' });
      return;
    }
    
    setIsSaving(true);
    try {
      const { isPromo, promoType, promoValue, promoStartDate, promoEndDate, voiceSignatures, ...restValues } = values;

      // 1. Prepare main product data (WITHOUT heavy voices array)
      const productData: any = {
        ...restValues,
        store_id: currentStoreId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        promo: null,
        allowPriceModification: restValues.allowPriceModification ?? true,
        barcodeGenerated: false,
        isVisibleInPOS: restValues.isVisibleInPOS ?? true,
        isVisibleOnWeb: restValues.isVisibleOnWeb ?? true,
      };

      if (isPromo && promoType && promoValue !== undefined) {
        productData.promo = {
          type: promoType,
          value: promoValue,
          startDate: promoStartDate ? Timestamp.fromDate(promoStartDate) : null as any,
          endDate: promoEndDate ? Timestamp.fromDate(promoEndDate) : null as any,
          isActive: true,
        };
      }

      // 2. Perform distributed save using a batch
      const batch = writeBatch(firestore);
      const productsCol = collection(firestore, 'products');
      const productRef = doc(productsCol);
      
      batch.set(productRef, productData);

      // --- 3. LOG INITIAL STOCK AUDIT ---
      if (values.stock > 0) {
          const auditRef = doc(collection(firestore, 'stockAudit'));
          batch.set(auditRef, {
              productId: productRef.id,
              productName: values.name,
              type: 'ADJUSTMENT',
              referenceId: 'INITIAL-' + productRef.id.substring(0, 8).toUpperCase(),
              beforeStock: 0,
              afterStock: values.stock,
              change: values.stock,
              staffId: user.uid,
              staffName: user.displayName || user.email || 'Staff',
              store_id: currentStoreId,
              timestamp: serverTimestamp()
          });
      }

      // 4. Move heavy voices to a sub-collection (The "Another Part" logic)
      if (voiceSignatures && voiceSignatures.length > 0) {
          voiceSignatures.forEach(voice => {
              const voiceRef = doc(firestore, 'products', productRef.id, 'voiceSignatures', voice.id);
              batch.set(voiceRef, voice);
          });
      }

      await batch.commit()
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: productsCol.path,
            operation: 'create',
            requestResourceData: productData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
          throw serverError;
        });
      
      toast({ title: 'Product Added', description: `"${values.name}" and its distributed assets have been published.` });
      router.push('/dashboard/inventory');
    } catch (error: any) {
      console.error("Error saving product: ", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save product.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.manage_website_content) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          icon={Globe}
          title="Add Web Store Product"
          description="Create a premium entry for your public-facing storefront."
        />
        <Button variant="ghost" asChild className="gap-2 btn-back">
          <Link href="/dashboard/inventory">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
        </Button>
      </div>

      <ProductForm 
        onSubmit={handleProductSubmit}
        categories={categories || []}
        isSubmitting={isSaving}
        onCategoriesNeedRefresh={refetchCategories}
        defaultValues={{ barcode: initialBarcode }}
      />
    </div>
  );
}
