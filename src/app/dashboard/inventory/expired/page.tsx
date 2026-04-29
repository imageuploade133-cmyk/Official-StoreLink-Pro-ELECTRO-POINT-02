'use client';

import { 
  CalendarClock, 
  AlertTriangle,
  History,
  RotateCcw,
  Loader2,
  PackageSearch,
  ChevronLeft,
  Edit,
  Trash2,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { ProductTable } from '@/components/inventory/ProductTable';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/contexts/settings-context';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionModal } from '@/components/dialogs/ActionModal';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { slugify } from '@/lib/utils';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function ExpiredProductsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, store, staffMember } = useAuth();
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);
  const { toast } = useToast();
  const { settings, isLoadingSettings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  const globalLowStockThreshold = settings?.lowStockThreshold ?? 10;

  const [isLoading, setIsLoading] = useState(true);
  const [expiredProducts, setExpiredProducts] = useState<Product[]>([]);
  const [comingSoonExpired, setComingSoonExpired] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Action states
  const [selectedProductForActions, setSelectedProductForActions] = useState<Product | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);

    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const productsRef = collection(firestore, 'products');
      const baseQuery = query(productsRef, where('store_id', '==', currentStoreId));

      // Fetch expired products
      const expiredQuery = query(
        baseQuery, 
        where('expiryDate', '<=', now),
        orderBy('expiryDate', 'desc')
      );
      
      // Fetch coming soon expired (next 30 days)
      const comingSoonQuery = query(
        baseQuery,
        where('expiryDate', '>', now),
        where('expiryDate', '<=', thirtyDaysFromNow),
        orderBy('expiryDate', 'asc')
      );

      const categoriesQuery = query(
        collection(firestore, 'categories'),
        where('store_id', '==', currentStoreId),
        orderBy('name')
      );

      const [expiredSnap, comingSoonSnap, categoriesSnap] = await Promise.all([
        getDocs(expiredQuery),
        getDocs(comingSoonQuery),
        getDocs(categoriesQuery)
      ]);

      setExpiredProducts(expiredSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setComingSoonExpired(comingSoonSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setCategories(categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));

    } catch (error: any) {
      console.error("Error fetching expired products:", error);
      toast({ 
        variant: 'destructive', 
        title: "Load Error", 
        description: "Could not load expired products data." 
      });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, currentStoreId, toast]);

  useEffect(() => {
    if (firestore && !isLoadingSettings && currentStoreId) {
      fetchProducts();
    }
  }, [firestore, isLoadingSettings, currentStoreId, fetchProducts]);

  const handleOpenActions = (product: Product) => {
    setSelectedProductForActions(product);
    setIsActionModalOpen(true);
  };

  const handleEditProduct = (productId: string) => {
    router.push(`/dashboard/inventory/edit/${productId}`);
  };

  const handleDeleteProduct = (product: Product) => {
      setSelectedProductForActions(product);
      setIsDeleteDialogOpen(true);
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
          description: `"${selectedProductForActions.name}" has been removed.`,
        });
        setIsDeleteDialogOpen(false);
        setSelectedProductForActions(null);
        fetchProducts();
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
      const newProductRef = doc(collection(firestore, 'products'));
      const originalProductData = await getDoc(doc(firestore, 'products', selectedProductForActions.id));

      if (!originalProductData.exists()) {
        throw new Error('Original product not found');
      }

      const originalData = originalProductData.data();
      const clonedData: any = {
        ...originalData,
        name: `${originalData.name} (Copy)`,
        slug: slugify(`${originalData.name} (Copy)`),
        stock: 0,
        store_id: currentStoreId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (originalData.sku) clonedData.sku = `${originalData.sku}-COPY`;
      delete clonedData.id;
      delete clonedData.barcode;
      delete clonedData.barcodeGenerated;

      batch.set(newProductRef, clonedData);

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
        description: `"${clonedData.name}" has been created.`,
      });

      setIsActionModalOpen(false);
      setSelectedProductForActions(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Error cloning product:', error);
      toast({
        variant: 'destructive',
        title: 'Clone Failed',
        description: error.message || 'Failed to clone product.',
      });
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.back()}
                className="rounded-full"
            >
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <PageHeader
                icon={CalendarClock}
                title="Expired Products"
                description="Monitor products that are expired or approaching their expiration date."
            />
        </div>
        <Button 
            variant="outline" 
            onClick={fetchProducts} 
            disabled={isLoading}
            className="rounded-xl h-11 border-dashed"
        >
            <RotateCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh List
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/30">
            <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Expired</p>
                    <p className="text-3xl font-black text-red-700 dark:text-red-300">{expiredProducts.length}</p>
                </div>
            </CardContent>
        </Card>
        <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30">
            <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <History className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Expiring within 30 days</p>
                    <p className="text-3xl font-black text-amber-700 dark:text-amber-300">{comingSoonExpired.length}</p>
                </div>
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expired" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="expired" className="font-bold">
            Expired ({expiredProducts.length})
          </TabsTrigger>
          <TabsTrigger value="coming-soon" className="font-bold">
            Coming Soon ({comingSoonExpired.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="expired" className="mt-0">
          <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton className="h-12 w-full" />)}
                </div>
              ) : expiredProducts.length === 0 ? (
                <div className="p-12 text-center">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                        <PackageSearch className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold">No expired products</h3>
                    <p className="text-muted-foreground">Great! You have no products that have passed their expiration date.</p>
                </div>
              ) : (
                <ProductTable
                  products={expiredProducts}
                  categories={categories}
                  onOpenActions={handleOpenActions}
                  currencySymbol={currencySymbol}
                  globalLowStockThreshold={globalLowStockThreshold}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coming-soon" className="mt-0">
          <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : comingSoonExpired.length === 0 ? (
                <div className="p-12 text-center">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                        <PackageSearch className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold">No products expiring soon</h3>
                    <p className="text-muted-foreground">None of your products are expiring within the next 30 days.</p>
                </div>
              ) : (
                <ProductTable
                  products={comingSoonExpired}
                  categories={categories}
                  onOpenActions={handleOpenActions}
                  currencySymbol={currencySymbol}
                  globalLowStockThreshold={globalLowStockThreshold}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
