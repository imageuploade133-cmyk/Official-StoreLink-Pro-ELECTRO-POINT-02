
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  query,
  runTransaction,
  Timestamp,
  where,
  increment,
  getDoc,
  orderBy,
  writeBatch,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  getDocs,
  getCountFromServer,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import type { RestockEntry, Product } from '@/lib/types';
import { RestockForm, type RestockFormValues } from '@/components/forms/restock-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2, PackageSearch, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { useAuth } from '@/contexts/auth-context';
import { useFirestore, useCollection } from '@/firebase';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { PageHeader } from '@/components/PageHeader';
import { StockLevelTable } from '@/components/inventory/StockLevelTable';
import { sendStockAlert } from '@/lib/whatsapp';
import { Skeleton } from '@/components/ui/skeleton';
import { RestockStats } from '@/components/inventory/RestockStats';
import { BulkStockUpdateDialog, type BulkUpdateFormValues } from '@/components/dialogs/BulkStockUpdateDialog';
import { cn, convertToDateSafely } from '@/lib/utils';
import { startOfDay, endOfDay } from 'date-fns';

const ITEMS_PER_PAGE = 10;

export default function StockAlertsPage() {
  const { permissions, isLoading: authLoading, user, store, staffMember } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { settings, isLoading: isLoadingSettings } = useSettings();

  const currentStoreId = React.useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [activeTab, setActiveTab] = useState<'low_stock' | 'out_of_stock'>('low_stock');
  
  // Products Pagination State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<Product | undefined>(undefined);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [productsForBulkUpdate, setProductsForBulkUpdate] = useState<Product[]>([]);

  // Restock Stats Data (Kept simple for summary)
  const restockQuery = React.useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(collection(firestore, 'restockEntries'), where('store_id', '==', currentStoreId), limit(500));
  }, [firestore, currentStoreId]);
  const { data: allRestockEntries, isLoading: isLoadingRestocks } = useCollection<RestockEntry>(restockQuery);

  const calculatedRestockStats = React.useMemo(() => {
    if (!allRestockEntries) return { totalItems: 0, totalValue: 0, todayItems: 0 };
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    
    return allRestockEntries.reduce((acc, entry) => {
      acc.totalItems += entry.quantity || 0;
      acc.totalValue += entry.totalCost || 0;
      const entryDate = convertToDateSafely(entry.restockDate);
      if (entryDate && entryDate >= todayStart && entryDate <= todayEnd) {
        acc.todayItems += entry.quantity || 0;
      }
      return acc;
    }, { totalItems: 0, totalValue: 0, todayItems: 0 });
  }, [allRestockEntries]);

  const fetchProducts = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !settings || !currentStoreId) return;
    setIsLoadingProducts(true);

    try {
      const globalThreshold = settings.lowStockThreshold ?? 10;
      let q = collection(firestore, 'products');
      let baseQuery;

      if (activeTab === 'low_stock') {
        baseQuery = query(
            q, 
            where('store_id', '==', currentStoreId),
            where('stock', '>', 0), 
            where('stock', '<=', globalThreshold),
            orderBy('stock', 'asc')
        );
      } else {
        baseQuery = query(
            q, 
            where('store_id', '==', currentStoreId),
            where('stock', '<=', 0),
            orderBy('name', 'asc')
        );
      }

      if (direction === 'initial') {
        const countSnap = await getCountFromServer(baseQuery);
        setTotalCount(countSnap.data().count);
      }

      let paginatedQuery;
      if (direction === 'next' && lastDocRef.current) {
        paginatedQuery = query(baseQuery, startAfter(lastDocRef.current), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstDocRef.current) {
        paginatedQuery = query(baseQuery, endBefore(firstDocRef.current), limitToLast(ITEMS_PER_PAGE));
      } else {
        paginatedQuery = query(baseQuery, limit(ITEMS_PER_PAGE));
      }

      const snapshot = await getDocs(paginatedQuery);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        firstDocRef.current = docs[0];
        lastDocRef.current = docs[docs.length - 1];
        setIsLastPage(docs.length < ITEMS_PER_PAGE);

        const productsData = docs.map(d => ({ id: d.id, ...d.data() } as Product));
        setProducts(productsData);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setProducts([]);
          setIsLastPage(true);
        }
      }
    } catch (e: any) {
      console.error("Error fetching stock alerts:", e);
      toast({ variant: 'destructive', title: "Sync Error", description: "Could not load stock alerts." });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [firestore, settings, activeTab, toast, currentStoreId]);

  useEffect(() => {
    if (!authLoading && !isLoadingSettings && firestore && currentStoreId) {
      fetchProducts('initial');
    }
  }, [authLoading, isLoadingSettings, firestore, activeTab, fetchProducts, currentStoreId]);

  const handleRestockClick = (product: Product) => {
    setSelectedProductForRestock(product);
    setIsFormOpen(true);
  };
  
  const handleBulkUpdateClick = (productsToUpdate: Product[]) => {
      setProductsForBulkUpdate(productsToUpdate);
      setIsBulkUpdateOpen(true);
  };

  const handleBulkFormSubmit = async (values: BulkUpdateFormValues) => {
    if (!firestore || !user || !currentStoreId || productsForBulkUpdate.length === 0) return;
    setIsSubmittingForm(true);

    const { quantity, supplierName, notes } = values;
    const batch = writeBatch(firestore);

    for (const product of productsForBulkUpdate) {
        const productRef = doc(firestore, 'products', product.id);
        const newRestockEntryRef = doc(collection(firestore, 'restockEntries'));
        const auditRef = doc(collection(firestore, 'stockAudit'));

        const newStockLevel = (product.stock || 0) + quantity;
        if (newStockLevel < 0 && quantity < 0) {
            toast({
                variant: 'destructive',
                title: 'Operation Stopped',
                description: `Cannot deduct ${-quantity} from ${product.name}, as it only has ${product.stock} units.`,
            });
            setIsSubmittingForm(false);
            return;
        }

        batch.update(productRef, { stock: increment(quantity) });
        
        batch.set(newRestockEntryRef, {
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            costPricePerUnit: product.purchasePrice,
            totalCost: quantity > 0 ? quantity * product.purchasePrice : 0,
            supplierName: supplierName || null,
            notes: notes || `Bulk update: ${quantity > 0 ? 'added' : 'deducted'} ${Math.abs(quantity)} units.`,
            restockDate: Timestamp.now(),
            createdAt: Timestamp.now(),
            userEmail: user.email || 'N/A',
            branchId: null,
            store_id: currentStoreId
        });

        batch.set(auditRef, {
            productId: product.id,
            productName: product.name,
            type: 'ADJUSTMENT',
            referenceId: newRestockEntryRef.id,
            beforeStock: product.stock || 0,
            afterStock: newStockLevel,
            change: quantity,
            staffId: user.uid,
            staffName: user.displayName || user.email || 'Staff',
            timestamp: serverTimestamp(),
            store_id: currentStoreId
        });
    }

    try {
        await batch.commit();
        toast({ title: 'Bulk Update Successful', description: `Stock for ${productsForBulkUpdate.length} products has been adjusted.` });
        setIsBulkUpdateOpen(false);
        fetchProducts('initial');
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Bulk Update Failed', description: e.message });
    } finally {
        setIsSubmittingForm(false);
    }
  };

  const handleFormSubmit = async (values: RestockFormValues) => {
    if (!firestore || !user || !currentStoreId) return;
    setIsSubmittingForm(true);
    
    const productRef = doc(firestore, 'products', values.productId);
    
    try {
      await runTransaction(firestore, async (transaction) => {
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) throw new Error("Product document does not exist!");
          
          const currentProductData = productDoc.data() as Product;
          const newStockLevel = (currentProductData.stock || 0) + values.quantity;
          
          if (newStockLevel < 0 && values.quantity < 0) {
            throw new Error(`Cannot deduct ${-values.quantity} units. Current stock is only ${currentProductData.stock}.`);
          }

          const restockRef = doc(collection(firestore, 'restockEntries'));
          const auditRef = doc(collection(firestore, 'stockAudit'));

          transaction.update(productRef, {
            stock: newStockLevel,
            updatedAt: Timestamp.now(),
            purchasePrice: (typeof values.newPurchasePrice === 'number' && values.newPurchasePrice >= 0) ? values.newPurchasePrice : currentProductData.purchasePrice,
            sellingPrice: (typeof values.newSellingPrice === 'number' && values.newSellingPrice >= 0) ? values.newSellingPrice : currentProductData.sellingPrice,
          });

          transaction.set(restockRef, {
            productId: values.productId,
            productName: currentProductData.name,
            quantity: values.quantity,
            costPricePerUnit: values.costPricePerUnit,
            totalCost: values.quantity > 0 ? values.quantity * values.costPricePerUnit : 0,
            supplierName: values.supplierName || null,
            supplierBusinessName: values.supplierBusinessName || null,
            supplierContactName: values.supplierContactName || null,
            supplierPhone: values.supplierPhone || null,
            supplierLocation: values.supplierLocation || null,
            receiptUrl: values.receiptUrl || null,
            restockDate: Timestamp.fromDate(values.restockDate),
            createdAt: Timestamp.now(),
            userEmail: user.email || 'N/A',
            branchId: null,
            notes: values.notes || null,
            store_id: currentStoreId
          });

          transaction.set(auditRef, {
            productId: values.productId,
            productName: currentProductData.name,
            type: 'RESTOCK',
            referenceId: restockRef.id,
            beforeStock: currentProductData.stock || 0,
            afterStock: newStockLevel,
            change: values.quantity,
            staffId: user.uid,
            staffName: user.displayName || user.email || 'Staff',
            timestamp: serverTimestamp(),
            store_id: currentStoreId
          });
      });
      
      const updatedProductFull = await getDoc(productRef);
      if (updatedProductFull.exists()) {
          sendStockAlert(updatedProductFull.data() as Product, settings);
      }

      toast({ title: 'Stock Updated', description: `Stock adjusted successfully.` });
      setIsFormOpen(false);
      fetchProducts('initial');

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Error', description: e.message || 'Could not save entry.' });
    } finally {
      setIsSubmittingForm(false);
    }
  };
  
  if (authLoading || isLoadingSettings) {
      return (
        <div className="space-y-6">
            <PageHeader icon={AlertTriangle} title="Stock Alerts" description="Syncing registry..." />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
      );
  }
  
  if (!permissions.view_stock_alerts) {
      return <AccessDenied />;
  }
  
  const handlePrevPage = () => fetchProducts('prev');
  const handleNextPage = () => fetchProducts('next');

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <PageHeader
                icon={AlertTriangle}
                title="Stock Alerts"
                description="Manage products that are running low or are out of stock."
            />
            <Button variant="outline" onClick={() => fetchProducts('initial')} disabled={isLoadingProducts}>
                <RotateCcw className={cn("mr-2 h-4 w-4", isLoadingProducts && "animate-spin")} />
                Sync Alerts
            </Button>
        </div>
        
        <RestockStats
            isLoading={isLoadingRestocks}
            totalItems={calculatedRestockStats.totalItems}
            totalValue={calculatedRestockStats.totalValue}
            todayItems={calculatedRestockStats.todayItems}
            currencySymbol={settings?.currency || '$'}
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="low_stock">
                    Low Stock Alerts
                </TabsTrigger>
                <TabsTrigger value="out_of_stock">
                    Out of Stock Alerts
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
                <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
                    <CardHeader className="flex flex-row justify-between items-center bg-muted/10 border-b">
                        <div>
                            <CardTitle>{activeTab === 'low_stock' ? 'Low Stock Inventory' : 'Depleted Inventory'}</CardTitle>
                            <CardDescription>
                                {activeTab === 'low_stock' 
                                    ? 'Products currently at or below their defined alert thresholds.' 
                                    : 'Products with zero or negative stock requiring urgent fulfillment.'}
                            </CardDescription>
                        </div>
                        <Button onClick={() => handleBulkUpdateClick(products)} disabled={products.length === 0 || isLoadingProducts}>
                            Bulk Restock Current View
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                       <StockLevelTable
                            products={products}
                            isLoading={isLoadingProducts}
                            onRestock={handleRestockClick}
                            title={activeTab === 'low_stock' ? 'Low on Stock' : 'Out of Stock'}
                            description={activeTab === 'low_stock' ? 'No items are currently below their threshold.' : 'No items are currently out of stock.'}
                       />
                    </CardContent>
                    <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
                        <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                            Page {currentPage} <span className="mx-2">|</span> {totalCount} Total Alerts
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1 || isLoadingProducts} className="font-bold">
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={isLastPage || isLoadingProducts} className="font-bold">
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </TabsContent>
        </Tabs>

        {/* Global Restock Form */}
        <RestockForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          products={[]} 
          defaultProduct={selectedProductForRestock}
          isSubmitting={isSubmittingForm}
          allowStockDeduction={settings?.allowStockDeduction ?? true}
        />
        
        <BulkStockUpdateDialog
            isOpen={isBulkUpdateOpen}
            onOpenChange={setIsBulkUpdateOpen}
            onSubmit={handleBulkFormSubmit}
            selectedProducts={productsForBulkUpdate}
            isSubmitting={isSubmittingForm}
        />
    </div>
  );
}
