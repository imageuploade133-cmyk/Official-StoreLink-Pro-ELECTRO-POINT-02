
'use client';

import { 
  PackagePlus, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Loader2, 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Copy,
  Share2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { ProductTable } from '@/components/inventory/ProductTable';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  doc, 
  writeBatch,
  getDocs, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast, 
  serverTimestamp,
  addDoc,
  getDoc,
  where,
  type QueryDocumentSnapshot, 
  type DocumentData, 
  getCountFromServer 
} from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ActionModal } from '@/components/dialogs/ActionModal';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/contexts/settings-context';
import { InventoryStats } from '@/components/inventory/InventoryStats';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { AdvancedPagination } from '@/components/pagination/AdvancedPagination';
import { Switch } from '@/components/ui/switch';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import { Label } from '@/components/ui/label';

export default function InventoryPage() {
  const router = useRouter();
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedProductForActions, setSelectedProductForActions] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const firestore = useFirestore();
  const { user, store, staffMember } = useAuth();
  const { toast } = useToast();
  const { settings, isLoadingSettings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  const globalLowStockThreshold = settings?.lowStockThreshold ?? 10;

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  // Pagination State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Stable cursors using refs to avoid infinite loops in useEffect
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Still fetch categories once as they are few and static-ish
  const categoriesQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(collection(firestore, 'categories'), where('store_id', '==', currentStoreId), orderBy('name'));
  }, [firestore, currentStoreId]);

  const { data: categoriesData, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);
  const categories = categoriesData || [];

  const fetchProducts = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoadingProducts(true);

    try {
      let q = query(collection(firestore, 'products'), where('store_id', '==', currentStoreId), orderBy('name', 'asc'));

      // 1. Initial count (Cost Efficient)
      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalProductCount(countSnap.data().count);
      }

      // 2. Apply cursors from refs
      if (direction === 'next' && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current), limit(itemsPerPage));
      } else if (direction === 'prev' && firstDocRef.current) {
        q = query(q, endBefore(firstDocRef.current), limitToLast(itemsPerPage));
      } else {
        q = query(q, limit(itemsPerPage));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        // Update refs for next call
        firstDocRef.current = docs[0];
        lastDocRef.current = docs[docs.length - 1];
        
        setIsLastPage(docs.length < itemsPerPage);

        const productsData = docs.map(d => ({ id: d.id, ...d.data() } as Product));
        setProducts(productsData);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setProducts([]);
          setIsLastPage(true);
        } else if (direction === 'next') {
          setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({ variant: 'destructive', title: "Sync Error", description: "Could not load inventory registry." });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [firestore, currentStoreId, toast, itemsPerPage]);

  useEffect(() => {
    if (firestore && !isLoadingSettings && currentStoreId) {
      fetchProducts('initial');
    }
  }, [firestore, isLoadingSettings, currentStoreId, fetchProducts]);

  const handleEditProduct = (productId: string) => {
    setIsNavigating(true);
    router.push(`/dashboard/inventory/edit/${productId}`);
  };

  const handleDeleteProduct = (product: Product) => {
      setSelectedProductForActions(product);
      setIsDeleteDialogOpen(true);
  };
  
  const handleOpenActions = (product: Product) => {
    setSelectedProductForActions(product);
    setIsActionModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!selectedProductForActions || !firestore || !currentStoreId) return;
    setIsDeleting(true);

    const batch = writeBatch(firestore);
    const productRef = doc(firestore, 'products', selectedProductForActions.id);
    const auditRef = doc(collection(firestore, 'stockAudit'));

    const auditData = {
      productId: selectedProductForActions.id,
      productName: selectedProductForActions.name,
      type: 'DELETE',
      referenceId: 'DELETE-' + selectedProductForActions.id.substring(0, 8).toUpperCase(),
      beforeStock: selectedProductForActions.stock || 0,
      afterStock: 0,
      change: -(selectedProductForActions.stock || 0),
      staffId: user?.uid || 'SYSTEM',
      staffName: user?.displayName || user?.email || 'Staff',
      timestamp: serverTimestamp(),
      store_id: currentStoreId
    };

    batch.set(auditRef, auditData);
    batch.delete(productRef);

    batch.commit()
      .then(() => {
        toast({
          title: 'Product Deleted',
          description: `"${selectedProductForActions.name}" has been removed and audited.`,
        });
        setIsDeleteDialogOpen(false);
        setSelectedProductForActions(null);
        fetchProducts('initial');
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: productRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  const handleCloneProduct = async () => {
    if (!selectedProductForActions || !firestore || !currentStoreId) return;
    setIsCloning(true);

    try {
      const batch = writeBatch(firestore);

      // 1. Create the cloned product document
      const newProductRef = doc(collection(firestore, 'products'));
      const originalProductData = await getDoc(doc(firestore, 'products', selectedProductForActions.id));

      if (!originalProductData.exists()) {
        throw new Error('Original product not found');
      }

      const originalData = originalProductData.data();

      // Prepare cloned product data
      const clonedData: any = {
        ...originalData,
        // Update fields that should change
        name: `${originalData.name} (Copy)`,
        stock: 0, // Start with 0 stock
        store_id: currentStoreId,
        // Preserve timestamps (new ones will be set)
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Only include SKU if original had one
      if (originalData.sku) {
        clonedData.sku = `${originalData.sku}-COPY`;
      }

      // Remove fields that shouldn't be copied
      delete clonedData.id;
      delete clonedData.barcode;
      delete clonedData.barcodeGenerated;

      // Set the cloned product
      batch.set(newProductRef, clonedData);

      // 2. Clone voice signatures sub-collection
      const voiceSignaturesQuery = query(collection(firestore, 'products', selectedProductForActions.id, 'voiceSignatures'));
      const voiceSignaturesSnapshot = await getDocs(voiceSignaturesQuery);

      voiceSignaturesSnapshot.forEach((voiceDoc) => {
        const newVoiceRef = doc(collection(firestore, 'products', newProductRef.id, 'voiceSignatures'));
        batch.set(newVoiceRef, voiceDoc.data());
      });

      // 3. Create audit entry for the clone
      const auditRef = doc(collection(firestore, 'stockAudit'));
      batch.set(auditRef, {
        productId: newProductRef.id,
        productName: clonedData.name,
        type: 'ADJUSTMENT',
        referenceId: 'CLONE-' + newProductRef.id.substring(0, 8).toUpperCase(),
        beforeStock: 0,
        afterStock: 0,
        change: 0,
        staffId: user?.uid || 'SYSTEM',
        staffName: user?.displayName || user?.email || 'Staff',
        timestamp: serverTimestamp(),
        details: `Cloned from product: ${selectedProductForActions.name}`,
        store_id: currentStoreId
      });

      await batch.commit();

      toast({
        title: 'Product Cloned Successfully',
        description: `"${clonedData.name}" has been created as a copy of "${selectedProductForActions.name}".`,
      });

      setIsActionModalOpen(false);
      setSelectedProductForActions(null);
      fetchProducts('initial');
    } catch (error: any) {
      console.error('Error cloning product:', error);
      toast({
        variant: 'destructive',
        title: 'Clone Failed',
        description: error.message || 'Failed to clone product. Please try again.',
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handleToggleProductSharing = async (enabled: boolean) => {
    if (!firestore) return;
    setIsUpdatingSettings(true);
    try {
      await saveGlobalSettings(firestore, { enableProductSharing: enabled });
      toast({
        title: enabled ? 'Product Sharing Enabled' : 'Product Sharing Disabled',
        description: `Product sharing is now ${enabled ? 'active' : 'inactive'} across your store.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update sharing settings.',
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const isLoading = isLoadingProducts || isLoadingCategories || isLoadingSettings;
  
  const { totalStock, totalStockValue, totalStockProfit } = useMemo(() => {
    return products.reduce(
      (acc, product) => {
        const stock = product.stock || 0;
        const purchasePrice = product.purchasePrice || 0;
        const sellingPrice = product.sellingPrice || 0;
        
        acc.totalStock += stock;
        acc.totalStockValue += stock * purchasePrice;
        acc.totalStockProfit += stock * (sellingPrice - purchasePrice);
        
        return acc;
      },
      { totalStock: 0, totalStockValue: 0, totalStockProfit: 0 }
    );
  }, [products]);

  const handlePrevPage = () => fetchProducts('prev');
  const handleNextPage = () => fetchProducts('next');
  
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    firstDocRef.current = null;
    lastDocRef.current = null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          icon={PackagePlus}
          title="Inventory Management"
          description="A complete control center for your product catalog and stock levels."
        />
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-xl border border-dashed">
                <div className="flex flex-col">
                    <Label htmlFor="sharing-toggle" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Product Sharing</Label>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">{settings?.enableProductSharing ? 'Active' : 'Disabled'}</span>
                </div>
                <Switch 
                    id="sharing-toggle"
                    checked={settings?.enableProductSharing ?? true}
                    onCheckedChange={handleToggleProductSharing}
                    disabled={isUpdatingSettings}
                />
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => fetchProducts('initial')} disabled={isLoading}>
                    <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                    Sync Registry
                </Button>
                <Button 
                  disabled={isLoading || isNavigating} 
                  size="lg"
                  onClick={() => {
                    setIsNavigating(true);
                    router.push('/dashboard/inventory/add');
                  }}
                >
                  {isNavigating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Add New Product
                </Button>
            </div>
        </div>
      </div>

      <InventoryStats
        isLoading={isLoading}
        totalStock={totalStock}
        totalStockValue={totalStockValue}
        totalStockProfit={totalStockProfit}
        currencySymbol={currencySymbol}
      />

      <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden">
        <CardContent className="p-0">
          {isLoadingProducts && products.length === 0 ? (
            <div className="p-6">
              <Skeleton className="h-10 w-1/3 mb-4" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            </div>
          ) : (
            <ProductTable
              products={products}
              categories={categories}
              onOpenActions={handleOpenActions}
              currencySymbol={currencySymbol}
              globalLowStockThreshold={globalLowStockThreshold}
            />
          )}
        </CardContent>
        <CardFooter className="py-4 border-t bg-muted/5">
            <AdvancedPagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalProductCount / itemsPerPage) || 1}
              itemsPerPage={itemsPerPage}
              totalItems={totalProductCount}
              onPageChange={(page) => {
                if (page > currentPage) fetchProducts('next');
                else if (page < currentPage) fetchProducts('prev');
                setCurrentPage(page);
              }}
              onItemsPerPageChange={handleItemsPerPageChange}
              isLoading={isLoadingProducts}
              itemsPerPageOptions={[10, 15, 25, 50, 100]}
            />
        </CardFooter>
      </Card>

    {selectedProductForActions && (
        <ActionModal
            isOpen={isActionModalOpen}
            onOpenChange={setIsActionModalOpen}
            title={selectedProductForActions.name}
            description={`SKU: ${selectedProductForActions.sku || 'N/A'}`}
        >
            <Button
              variant="outline"
              className="justify-start h-11"
              onClick={() => handleCloneProduct()}
              disabled={isCloning}
            >
                {isCloning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                Clone Product
            </Button>
            <Button variant="outline" className="justify-start h-11" onClick={() => handleEditProduct(selectedProductForActions.id)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Master Details
            </Button>
            <Button variant="destructive" className="justify-start h-11" onClick={() => { handleDeleteProduct(selectedProductForActions); setIsActionModalOpen(false); }}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Product Permanently
            </Button>
        </ActionModal>
    )}
    
    <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteProduct}
        itemName={selectedProductForActions?.name || ''}
        itemType="product"
        isDeleting={isDeleting}
    />

    </div>
  );
}
