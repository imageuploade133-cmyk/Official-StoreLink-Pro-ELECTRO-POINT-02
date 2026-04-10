
'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFirestore, useCollection } from '@/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  getCountFromServer,
  writeBatch,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { PageHeader } from '@/components/PageHeader';
import {
  Globe,
  Search,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  ShoppingBag,
  Tag,
  AlertTriangle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  Mic,
  Zap,
  Trash2,
  MoreHorizontal,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/formatUtils';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, convertToDateSafely } from '@/lib/utils';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { ActionModal } from '@/components/dialogs/ActionModal';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const ITEMS_PER_PAGE = 15;

export default function ManageWebCatalogPage() {
  const { permissions, isLoading: isAuthLoading, user } = useAuth();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { toast } = useToast();
  const currencySymbol = settings?.currency || '$';
  const defaultProductImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/100x100.png';

  const [searchTerm, setSearchTerm] = useState('');
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  // Interaction State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedProductForActions, setSelectedProductForActions] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    setToday(new Date());
  }, []);

  // Pagination State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalRegistryCount, setTotalRegistryCount] = useState(0);

  // Stable cursors using refs to avoid infinite loops
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Fetch all categories for mapping
  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'categories'), orderBy('name'));
  }, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const categoriesMapFull = useMemo(() => {
    if (!categories) return new Map<string, Category>();
    return new Map(categories.map(c => [c.id, c]));
  }, [categories]);

  const categoryMap = useMemo(() => {
    if (!categories) return new Map();
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);

  const fetchWebProducts = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore) return;
    setIsLoadingProducts(true);

    try {
      let q = query(
        collection(firestore, 'products'), 
        where('isVisibleOnWeb', '==', true),
        orderBy('name', 'asc')
      );

      // 1. Initial count (Cost Efficient)
      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalRegistryCount(countSnap.data().count);
      }

      // 2. Apply Cursors
      if (direction === 'next' && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstDocRef.current) {
        q = query(q, endBefore(firstDocRef.current), limitToLast(ITEMS_PER_PAGE));
      } else {
        q = query(q, limit(ITEMS_PER_PAGE));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        // Update refs for next call
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
    } catch (error: any) {
      console.error("Error fetching web products:", error);
      toast({ variant: 'destructive', title: "Sync Error", description: "Could not load web catalog." });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [firestore, toast]);

  useEffect(() => {
    if (firestore && !isAuthLoading && permissions.manage_website_content) {
      fetchWebProducts('initial');
    }
  }, [firestore, isAuthLoading, permissions.manage_website_content, fetchWebProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase().trim();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.sku?.toLowerCase().includes(term) ||
      categoryMap.get(p.categoryId || '')?.toLowerCase().includes(term)
    );
  }, [products, searchTerm, categoryMap]);

  const handleToggleVisibility = async (productId: string, currentStatus: boolean) => {
    if (!firestore) return;
    setIsToggling(productId);
    try {
      const productRef = doc(firestore, 'products', productId);
      await updateDoc(productRef, { isVisibleOnWeb: !currentStatus });
      toast({ title: "Visibility Updated", description: `Product is now ${!currentStatus ? 'visible' : 'hidden'} on the storefront.` });
      // If we hidden it, we should probably refresh the current initial state to remove it from this specific view
      if (currentStatus === true) fetchWebProducts('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Update Failed", description: e.message });
    } finally {
      setIsToggling(null);
    }
  };

  const handleOpenActions = (product: Product) => {
    setSelectedProductForActions(product);
    setIsActionModalOpen(true);
  };

  const handleDeleteProductClick = () => {
    setIsActionModalOpen(false);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!selectedProductForActions || !firestore || !user) return;
    setIsDeleting(true);

    const batch = writeBatch(firestore);
    const productRef = doc(firestore, 'products', selectedProductForActions.id);
    const auditRef = doc(collection(firestore, 'stockAudit'));

    const auditData = {
      productId: selectedProductForActions.id,
      productName: selectedProductForActions.name,
      type: 'DELETE',
      referenceId: 'DELETE-WEB-' + selectedProductForActions.id.substring(0, 8).toUpperCase(),
      beforeStock: selectedProductForActions.stock || 0,
      afterStock: 0,
      change: -(selectedProductForActions.stock || 0),
      staffId: user.uid,
      staffName: user.displayName || user.email || 'Staff',
      timestamp: serverTimestamp()
    };

    batch.set(auditRef, auditData);
    batch.delete(productRef);

    batch.commit()
      .then(() => {
        toast({
          title: 'Product Deleted',
          description: `"${selectedProductForActions.name}" has been permanently removed.`,
        });
        setIsDeleteDialogOpen(false);
        setSelectedProductForActions(null);
        fetchWebProducts('initial');
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
    if (!selectedProductForActions || !firestore) return;
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
        sku: originalData.sku ? `${originalData.sku}-COPY` : undefined,
        barcode: undefined, // Remove barcode for clone
        barcodeGenerated: false,
        stock: 0, // Start with 0 stock
        // Preserve timestamps (new ones will be set)
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Clear fields that shouldn't be copied
        id: undefined,
      };

      // Remove id from cloned data (it's set by Firebase)
      delete clonedData.id;

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
        details: `Cloned from product: ${selectedProductForActions.name}`
      });

      await batch.commit();

      toast({
        title: 'Product Cloned Successfully',
        description: `"${clonedData.name}" has been created as a copy of "${selectedProductForActions.name}".`,
      });

      setIsActionModalOpen(false);
      setSelectedProductForActions(null);
      fetchWebProducts('initial');
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

  const handleNextPage = () => fetchWebProducts('next');
  const handlePrevPage = () => fetchWebProducts('prev');

  if (isAuthLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!permissions.manage_website_content) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          icon={Globe} 
          title="Web Store Catalog" 
          description="Manage products visible on your public storefront. Data is fetched incrementally."
        />
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchWebProducts('initial')} disabled={isLoadingProducts}>
                <RotateCcw className={cn("mr-2 h-4 w-4", isLoadingProducts && "animate-spin")} />
                Sync
            </Button>
            <Button asChild className="gap-2">
                <Link href="/dashboard/add-store-product">Add Store Product</Link>
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Registry Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProducts && totalRegistryCount === 0 ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-black">{totalRegistryCount.toLocaleString()}</div>}
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Total Products in Web Store</p>
          </CardContent>
        </Card>
        <Card className="shadow-none bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-green-600">Batch View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700">{products.length} Items</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Products in current viewport</p>
          </CardContent>
        </Card>
        <Card className="shadow-none bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-600">Catalog Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-700">
              {products.length > 0 ? Math.round((products.filter(p => p.description && p.imageUrl).length / products.length) * 100) : 0}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Media completion in batch</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="bg-muted/10 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle>Online Inventory</CardTitle>
                <CardDescription>Directly influence your public storefront independent of physical inventory.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search within current batch..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 h-11" 
              />
              {searchTerm && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearchTerm('')}>
                      <X className="h-4 w-4" />
                  </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1000px] md:min-w-full">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[80px] pl-6">Preview</TableHead>
                  <TableHead>Product Identity</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead className="text-right">Public Price</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingProducts && products.length === 0 ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6} className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingBag className="h-12 w-12 opacity-10" />
                        <p className="font-bold">No web products found in this batch.</p>
                        <Button asChild variant="link" size="sm"><Link href="/dashboard/inventory">Open Master Inventory</Link></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const hasVoice = !!product.audioDataUri;
                    
                    // Determine Sale Visibility
                    const isSaleActive = (() => {
                        if (!today) return false;
                        
                        // Direct product promo
                        if (product.promo?.isActive) {
                            const start = convertToDateSafely(product.promo.startDate);
                            const end = convertToDateSafely(product.promo.endDate);
                            if ((!start || today >= start) && (!end || today <= end)) return true;
                        }

                        // Category level promo
                        const cat = categoriesMapFull.get(product.categoryId || '');
                        if (cat?.isFlashSale) {
                            const start = convertToDateSafely(cat.flashSaleStartDate);
                            const end = convertToDateSafely(cat.flashSaleEndDate);
                            if ((!start || today >= start) && (!end || today <= end)) return true;
                        }

                        return false;
                    })();

                    return (
                      <TableRow key={product.id} className="group transition-colors hover:bg-muted/30">
                        <TableCell className="pl-6">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md bg-white">
                              <Image 
                                  src={product.imageUrl || defaultProductImageUrl} 
                                  alt={product.name} 
                                  fill 
                                  className="object-cover" 
                                  unoptimized
                              />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="font-black text-sm text-gray-900 leading-tight truncate max-w-[200px]" title={product.name}>
                                {product.name}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-[10px] font-mono text-muted-foreground uppercase">SKU: {product.sku || 'N/A'}</div>
                                {hasVoice && (
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[8px] h-4 px-1.5 uppercase font-black tracking-tighter">
                                        <Mic className="h-2 w-2 mr-1" /> Voice
                                    </Badge>
                                )}
                                {isSaleActive && (
                                    <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 text-[8px] h-4 px-1.5 uppercase font-black tracking-tighter">
                                        <Zap className="h-2 w-2 mr-1 fill-current" /> Sale
                                    </Badge>
                                )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-slate-50">
                              {categoryMap.get(product.categoryId || '') || 'Uncategorized'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-black text-base tracking-tighter">{formatCurrency(product.sellingPrice, currencySymbol)}</div>
                          {product.promo?.isActive && (
                              <Badge className="bg-amber-500 text-white text-[8px] h-4 py-0 font-black border-none px-1.5 mt-1">OFFER ACTIVE</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                              <Switch 
                                  checked={product.isVisibleOnWeb} 
                                  onCheckedChange={() => handleToggleVisibility(product.id, product.isVisibleOnWeb)}
                                  disabled={isToggling === product.id}
                              />
                              {product.isVisibleOnWeb ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] h-5 uppercase font-black px-2">
                                      LIVE
                                  </Badge>
                              ) : (
                                  <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] h-5 uppercase font-black px-2">
                                      DRAFT
                                  </Badge>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenActions(product)}
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                Page {currentPage} <span className="mx-2">|</span> Registry Batching Active
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1 || isLoadingProducts} className="font-bold h-10 px-4">
                    <ChevronLeft className="h-4 w-4 mr-1.5" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={isLastPage || isLoadingProducts} className="font-bold h-10 px-4">
                    Next <ChevronRight className="h-4 w-4 ml-1.5" />
                </Button>
            </div>
        </CardFooter>
      </Card>

      <ActionModal
        isOpen={isActionModalOpen}
        onOpenChange={setIsActionModalOpen}
        title={selectedProductForActions?.name || 'Product Actions'}
        description={`SKU: ${selectedProductForActions?.sku || 'N/A'}`}
      >
        {selectedProductForActions && (
          <div className="space-y-2 flex flex-col">
            <Button
              variant="outline"
              className="justify-start h-11 font-bold"
              onClick={() => handleCloneProduct()}
              disabled={isCloning}
            >
              {isCloning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
              Clone Product
            </Button>
            <Button variant="outline" className="justify-start h-11 font-bold" asChild>
              <Link href={`/dashboard/manage-web-catalog/edit/${selectedProductForActions.id}`}>
                <Edit className="mr-2 h-4 w-4 text-blue-500" /> Edit Web Details
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-11 font-bold" asChild>
              <Link href={`/store/product/${selectedProductForActions.id}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4 text-primary" /> Preview Live Page
              </Link>
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              className="justify-start h-11 font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/5"
              onClick={() => handleDeleteProductClick()}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Product Permanently
            </Button>
          </div>
        )}
      </ActionModal>

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
