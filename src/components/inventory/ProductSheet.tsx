'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, Timestamp, query, orderBy, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { ProductForm, type ProductFormValues, type ProductFormProps } from '@/components/inventory/ProductForm';
import { PackagePlus, Loader2, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Category } from '@/lib/types';

interface ProductSheetProps {
  trigger?: ReactNode;
}

export function ProductSheet({ trigger }: ProductSheetProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { permissions, user, isLoading: isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch Categories
  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'categories'), orderBy('name'));
  }, [firestore]);
  const { data: categories, isLoading: isLoadingCategories, refetch: refetchCategories } = useCollection<Category>(categoriesQuery);

  const handleProductSubmit = async (values: ProductFormValues) => {
    if (!user || !firestore) return;
    
    setIsSubmitting(true);
    try {
      const { isPromo, promoType, promoValue, promoStartDate, promoEndDate, voiceSignatures, ...restValues } = values;

      const productData: any = {
        ...restValues,
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

      const batch = writeBatch(firestore);
      const productsCol = collection(firestore, 'products');
      const productRef = doc(productsCol);
      
      batch.set(productRef, productData);

      // Stock audit log
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
              timestamp: serverTimestamp()
          });
      }

      // Voice signatures
      if (voiceSignatures && voiceSignatures.length > 0) {
          voiceSignatures.forEach(voice => {
              const voiceRef = doc(firestore, 'products', productRef.id, 'voiceSignatures', voice.id);
              batch.set(voiceRef, voice);
          });
      }

      await batch.commit();
      
      toast({ title: 'Product Added', description: `"${values.name}" has been published.` });
      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error("Error saving product: ", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save product.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.add_products) {
    return <>{trigger}</>;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button>
            <PackagePlus className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        )}
      </SheetTrigger>
      <SheetContent 
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-w-[95vw] flex flex-col p-0 overflow-hidden"
        side="right"
      >
        {/* Drag Handle Indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 p-1 cursor-grab active:cursor-grabbing touch-none select-none z-10">
          <GripHorizontal className="h-5 w-5 text-muted-foreground/50" />
        </div>
        
        <SheetHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
          <SheetTitle className="flex items-center gap-2 pt-2">
            <PackagePlus className="h-5 w-5" />
            New Product
          </SheetTitle>
          <SheetDescription>
            Add a new product to your inventory catalog.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          <ProductForm 
            onSubmit={handleProductSubmit}
            categories={categories || []}
            isSubmitting={isSubmitting}
            onCategoriesNeedRefresh={refetchCategories}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ProductSheet;
