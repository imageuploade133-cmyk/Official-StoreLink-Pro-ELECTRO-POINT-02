
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, updateDoc, Timestamp, query, where, orderBy, writeBatch, getDocs, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PackagePlus, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ProductForm, type ProductFormValues } from '@/components/inventory/ProductForm';
import type { Category, Product, VoiceSignature } from '@/lib/types';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const { permissions, user, isLoading: isAuthLoading, staffMember, store } = useAuth();
  
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [isSaving, setIsSaving] = useState(false);
  const [voiceParts, setVoiceParts] = useState<VoiceSignature[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);

  // Fetch Product
  const productRef = useMemo(() => firestore && productId ? doc(firestore, 'products', productId) : null, [firestore, productId]);
  const { data: product, isLoading: isLoadingProduct } = useDoc<Product>(productRef);

  // Fetch Voice Parts (Sub-collection)
  useEffect(() => {
      if (!firestore || !productId) return;
      const fetchParts = async () => {
          setIsLoadingParts(true);
          try {
              const q = query(collection(firestore, 'products', productId, 'voiceSignatures'));
              const snap = await getDocs(q);
              setVoiceParts(snap.docs.map(d => ({ id: d.id, ...d.data() } as VoiceSignature)));
          } catch (e) {
              console.error("Failed to load distributed voice parts:", e);
          } finally {
              setIsLoadingParts(false);
          }
      };
      fetchParts();
  }, [firestore, productId]);

  // Fetch Categories
  const categoriesQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(collection(firestore, 'categories'), where('store_id', '==', currentStoreId), orderBy('name'));
  }, [firestore, currentStoreId]);
  const { data: categories, isLoading: isLoadingCategories, refetch: refetchCategories } = useCollection<Category>(categoriesQuery);

  const handleProductUpdate = async (values: ProductFormValues) => {
    if (!firestore || !productId || !product) return;
    
    setIsSaving(true);
    try {
      const { isPromo, promoType, promoValue, promoStartDate, promoEndDate, voiceSignatures, ...restValues } = values;

      const productData: any = {
        ...restValues,
        updatedAt: Timestamp.now(),
        promo: null,
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

      // Perform distributed update
      const batch = writeBatch(firestore);
      const docRef = doc(firestore, 'products', productId);
      
      batch.update(docRef, productData);

      // --- LOG AUDIT IF STOCK CHANGED MANUALLY ---
      const beforeStock = product.stock || 0;
      const afterStock = values.stock;
      if (beforeStock !== afterStock) {
          const auditRef = doc(collection(firestore, 'stockAudit'));
          batch.set(auditRef, {
              productId: productId,
              productName: values.name,
              type: 'MANUAL_EDIT',
              referenceId: 'MANUAL-' + productId.substring(0, 8).toUpperCase(),
              beforeStock: beforeStock,
              afterStock: afterStock,
              change: afterStock - beforeStock,
              staffId: user?.uid || 'SYSTEM',
              staffName: user?.displayName || user?.email || 'Staff',
              store_id: (product as any).store_id || null,
              timestamp: serverTimestamp()
          });
      }

      // Sync Distributed Voice Parts
      // 1. Delete old ones first to handle removals perfectly
      const oldVoicesQuery = await getDocs(collection(firestore, 'products', productId, 'voiceSignatures'));
      oldVoicesQuery.docs.forEach(d => batch.delete(d.ref));

      // 2. Add current ones from form
      if (voiceSignatures && voiceSignatures.length > 0) {
          voiceSignatures.forEach(voice => {
              const voiceRef = doc(firestore, 'products', productId, 'voiceSignatures', voice.id);
              batch.set(voiceRef, voice);
          });
      }

      await batch.commit()
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: productData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
          throw serverError;
        });
      
      toast({ title: 'Sync Successful', description: `"${values.name}" and its distributed data parts have been updated.` });
      router.push('/dashboard/inventory');
    } catch (error: any) {
      console.error("Error updating product: ", error);
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Failed to update product.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingProduct || isLoadingCategories || isLoadingParts;

  const initialValues = useMemo(() => {
      if (!product) return undefined;
      return {
          ...product,
          voiceSignatures: voiceParts
      };
  }, [product, voiceParts]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={PackagePlus} title="Edit Product" description="Loading distributed data parts..." />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!permissions.edit_products) {
    return <AccessDenied />;
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Button asChild className="mt-4"><Link href="/dashboard/inventory">Back to Inventory</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          icon={PackagePlus}
          title="Edit Product"
          description={`Modifying: ${product.name} | Multi-Part Sync Active`}
        />
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/dashboard/inventory">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
        </Button>
      </div>

      <ProductForm 
        onSubmit={handleProductUpdate}
        categories={categories || []}
        isSubmitting={isSaving}
        defaultValues={initialValues}
        onCategoriesNeedRefresh={refetchCategories}
      />
    </div>
  );
}
