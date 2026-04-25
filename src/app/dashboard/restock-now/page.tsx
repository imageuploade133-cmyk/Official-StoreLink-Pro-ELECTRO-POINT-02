'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDocs,
  limit,
  serverTimestamp,
  runTransaction,
  type DocumentData
} from 'firebase/firestore';
import { useSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import Image from 'next/image';
import { 
  PackagePlus, 
  Search, 
  Barcode, 
  Loader2, 
  History, 
  TrendingUp, 
  TrendingDown, 
  Info,
  DollarSign,
  PlusCircle,
  Truck,
  FileText,
  PackageSearch,
  Eye,
  Upload,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BarcodeScannerField } from '@/components/inventory/BarcodeScannerField';
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import type { Product, SaleTransaction, RestockEntry } from '@/lib/types';
import { formatCurrency } from '@/lib/formatUtils';
import { format } from 'date-fns';
import { cn, convertToDateSafely } from '@/lib/utils';
import { ProductImage } from '@/components/ProductImage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import AccessDenied from '@/components/staff-management/AccessDenied';

export default function RestockNowPage() {
  const { user, permissions, isLoading: authLoading, store, staffMember } = useAuth();
  const { settings, isLoading: settingsLoading } = useSettings();
  const { toast } = useToast();
  const firestore = useFirestore();

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);
  const currencySymbol = settings?.currency || '$';

  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [foundProducts, setFoundProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  
  const [restockQuantity, setRestockQuantity] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [supplierName, setSupplierName] = useState('');
  const [supplierContactName, setSupplierContactName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierLocation, setSupplierLocation] = useState('');
  const [stockDocumentUrl, setStockDocumentUrl] = useState('');
  const [isUploadingStockDoc, setIsUploadingStockDoc] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productSales, setProductSales] = useState<any[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  const searchProducts = useCallback(async (term: string) => {
    if (!firestore || !currentStoreId || !term.trim()) return;
    setIsLoadingProducts(true);
    try {
      const trimmedTerm = term.trim();
      const lowerTerm = trimmedTerm.toLowerCase();

      // Try exact barcode match first
      const barcodeQ = query(
        collection(firestore, 'products'),
        where('store_id', '==', currentStoreId),
        where('barcode', '==', trimmedTerm),
        limit(5)
      );

      const nameQ = query(
        collection(firestore, 'products'),
        where('store_id', '==', currentStoreId),
        where('name', '>=', trimmedTerm),
        where('name', '<=', trimmedTerm + '\uf8ff'),
        limit(10)
      );

      const [barcodeSnap, nameSnap] = await Promise.all([
        getDocs(barcodeQ),
        getDocs(nameQ)
      ]);

      const productsMap = new Map<string, Product>();
      barcodeSnap.docs.forEach(d => productsMap.set(d.id, { id: d.id, ...d.data() } as Product));
      nameSnap.docs.forEach(d => productsMap.set(d.id, { id: d.id, ...d.data() } as Product));

      // Also search within variants for barcode/SKU match
      const allProductsQ = query(
        collection(firestore, 'products'),
        where('store_id', '==', currentStoreId)
      );
      const allProductsSnap = await getDocs(allProductsQ);
      allProductsSnap.docs.forEach(d => {
        const p = { id: d.id, ...d.data() } as Product;
        if (p.hasVariants && p.variants) {
          const match = p.variants.some(v => 
            v.barcode === trimmedTerm || 
            v.sku?.toLowerCase() === lowerTerm ||
            v.name.toLowerCase().includes(lowerTerm)
          );
          if (match) productsMap.set(p.id, p);
        }
      });

      const products = Array.from(productsMap.values());
      setFoundProducts(products);
      
      if (products.length === 1) {
        handleSelectProduct(products[0]);
      } else if (products.length === 0) {
        toast({ title: 'No Products Found', description: `Could not find any product matching "${trimmedTerm}".` });
      }
    } catch (error) {
      console.error('Error searching products:', error);
      toast({ variant: 'destructive', title: 'Search Failed', description: 'Failed to search for products.' });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [firestore, currentStoreId, toast]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariantId(null);
    setCostPrice(product.purchasePrice || 0);
    setFoundProducts([]);
    setSearchTerm('');
    fetchProductSales(product.id);
  };

  const fetchProductSales = async (productId: string) => {
    if (!firestore || !currentStoreId) return;
    setIsLoadingSales(true);
    try {
      const q = query(
        collection(firestore, 'saleTransactions'),
        where('store_id', '==', currentStoreId),
        orderBy('createdAt', 'desc'),
        limit(50) // Fetch recent transactions to find sales for this product
      );
      const snapshot = await getDocs(q);
      const sales: any[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const items = data.items || [];
        const productItem = items.find((item: any) => item.productId === productId);
        
        if (productItem) {
          sales.push({
            id: doc.id,
            date: convertToDateSafely(data.createdAt),
            quantity: productItem.quantity,
            unitPrice: productItem.unitPrice,
            totalPrice: productItem.totalPrice,
            customerName: data.customerName || 'Guest'
          });
        }
      });
      
      setProductSales(sales);
    } catch (error) {
      console.error('Error fetching product sales:', error);
    } finally {
      setIsLoadingSales(false);
    }
  };

  const handleStockDocUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file type
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
        toast({ variant: "destructive", title: "Invalid format", description: "Only images and PDF receipts are accepted." });
        return;
    }

    if (file.size > 5 * 1024 * 1024) { 
      toast({ variant: "destructive", title: "File too large", description: "Receipt must be smaller than 5MB." });
      return;
    }
    
    setIsUploadingStockDoc(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const { uploadImage } = await import('@/ai/flows/image-upload-flow');
        const result = await uploadImage({ imageDataUri, storeId: currentStoreId });
        setStockDocumentUrl(result.display_url);
        toast({ title: "Receipt Uploaded", description: "Stock document has been saved." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload document." });
      } finally {
        setIsUploadingStockDoc(false);
      }
    };
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !firestore || !currentStoreId || !user) return;
    
    setIsSubmitting(true);
    try {
      const productRef = doc(firestore, 'products', selectedProduct.id);
      const restockRef = doc(collection(firestore, 'restockEntries'));
      const auditRef = doc(collection(firestore, 'stockAudit'));
      
      await runTransaction(firestore, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) throw new Error('Product not found');
        
        const restockQtyNum = Number(restockQuantity) || 0;
        const currentStock = Number(productDoc.data().stock) || 0;
        const newStock = currentStock + restockQtyNum;
        let currentCalculatedNewStock = newStock;

        let variantName = '';
        if (selectedVariantId && productDoc.data().hasVariants && productDoc.data().variants) {
          const variants = [...productDoc.data().variants];
          const variantIndex = variants.findIndex((v: any) => v.id === selectedVariantId);
          if (variantIndex !== -1) {
            const variant = { ...variants[variantIndex] };
            variant.stock = (Number(variant.stock) || 0) + restockQtyNum;
            variants[variantIndex] = variant;
            variantName = ` (${variant.name})`;

            // Recalculate total stock from all variants to stay perfectly in sync
            const totalStock = variants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0);

            transaction.update(productRef, {
              variants,
              stock: totalStock,
              purchasePrice: Number(costPrice) || 0,
              updatedAt: serverTimestamp()
            });
            
            // Update local calculation for audit and state
            currentCalculatedNewStock = totalStock;
          } else {
            // Fallback if variant not found but was selected (should not happen)
            transaction.update(productRef, {
              stock: newStock,
              purchasePrice: Number(costPrice) || 0,
              updatedAt: serverTimestamp()
            });
          }
        } else {
          // Update product stock directly
          transaction.update(productRef, {
            stock: newStock,
            purchasePrice: Number(costPrice) || 0,
            updatedAt: serverTimestamp()
          });
        }

        // Create restock entry
        const restockData: RestockEntry = {
          id: restockRef.id,
          store_id: currentStoreId,
          productId: selectedProduct.id,
          productName: selectedProduct.name + variantName,
          quantity: restockQtyNum,
          costPricePerUnit: Number(costPrice) || 0,
          totalCost: restockQtyNum * (Number(costPrice) || 0),
          supplierName: supplierName || null,
          supplierContactName: supplierContactName || null,
          supplierPhone: supplierPhone || null,
          supplierLocation: supplierLocation || null,
          receiptUrl: stockDocumentUrl || null,
          notes: notes || null,
          restockDate: serverTimestamp() as any,
          createdAt: serverTimestamp() as any,
          userEmail: user.email || 'system'
        };
        transaction.set(restockRef, restockData);

        // Create audit log
        transaction.set(auditRef, {
          store_id: currentStoreId,
          productId: selectedProduct.id,
          productName: selectedProduct.name + variantName,
          variantId: selectedVariantId || null,
          type: 'RESTOCK',
          referenceId: restockRef.id,
          beforeStock: currentStock,
          afterStock: currentCalculatedNewStock,
          change: restockQtyNum,
          staffId: user.uid,
          staffName: user.displayName || user.email || 'Staff',
          timestamp: serverTimestamp()
        });
      });

      toast({ title: 'Stock Updated', description: `Successfully added ${restockQuantity} units to "${selectedProduct.name}".` });

      // Refresh product data
      setSelectedProduct({ 
        ...selectedProduct, 
        stock: currentCalculatedNewStock, 
        purchasePrice: Number(costPrice) || 0 
      });
      setRestockQuantity(1);
      setSupplierName('');
      setSupplierContactName('');
      setSupplierPhone('');
      setSupplierLocation('');
      setStockDocumentUrl('');
      setNotes('');
    } catch (error: any) {
      console.error('Restock error:', error);
      toast({ variant: 'destructive', title: 'Restock Failed', description: error.message || 'Failed to update stock.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScan = (barcode: string) => {
    setSearchTerm(barcode);
    searchProducts(barcode);
    setIsScannerOpen(false);
  };

  useBarcodeScanner({
    onScan: (barcode) => {
      if (!isScannerOpen && !selectedProduct) {
        handleScan(barcode);
      }
    },
    enabled: !isScannerOpen
  });

  if (authLoading || settingsLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!permissions.transfer_stock) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={PackagePlus}
        title="Restock Now"
        description="Quickly update your inventory levels and track recent sales performance."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Product Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg border-none ring-1 ring-border">
            <CardHeader>
              <CardTitle>Find Product</CardTitle>
              <CardDescription>Search by name, scan barcode or use external scanner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <BarcodeScannerField
                  onScan={(barcode) => searchProducts(barcode)}
                  placeholder="Name or scan barcode..."
                  className="flex-1"
                />
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-dashed" onClick={() => setIsScannerOpen(true)}>
                  <Barcode className="h-4 w-4" />
                </Button>
              </div>

              {isLoadingProducts && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {foundProducts.length > 0 && (
                <div className="border rounded-md divide-y overflow-hidden">
                  {foundProducts.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3"
                      onClick={() => handleSelectProduct(p)}
                    >
                      <div className="relative h-10 w-10 rounded border overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                        <ProductImage
                          src={p.imageUrl}
                          alt={p.name}
                          minimal
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold truncate">SKU: {p.sku || 'N/A'} | Barcode: {p.barcode || 'N/A'}</div>
                      </div>
                      <PlusCircle className="h-4 w-4 text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {selectedProduct && (
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-lg border overflow-hidden shrink-0">
                        <ProductImage
                            src={selectedProduct.imageUrl}
                            alt={selectedProduct.name}
                            minimal
                        />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg leading-tight truncate" title={selectedProduct.name}>{selectedProduct.name}</h3>
                      <p className="text-sm text-muted-foreground">Stock: <span className={cn("font-bold", selectedProduct.stock <= (selectedProduct.lowStockThreshold || 10) ? "text-destructive" : "text-green-600")}>{selectedProduct.stock} units</span></p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selling Price</Label>
                        <div className="text-lg font-bold">
                          {formatCurrency(
                            (selectedVariantId && selectedProduct.variants
                              ? selectedProduct.variants.find(v => v.id === selectedVariantId)?.sellingPrice
                              : selectedProduct.sellingPrice) || selectedProduct.sellingPrice,
                            currencySymbol
                          )}
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/5 border border-secondary/10">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Purchase Price</Label>
                        <div className="text-lg font-bold">{formatCurrency(selectedProduct.purchasePrice, currencySymbol)}</div>
                    </div>
                  </div>

                  {selectedProduct.hasVariants && selectedProduct.variants && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs font-bold uppercase tracking-wider">Select Variant to Restock</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedProduct.variants.filter(v => v.isActive).map(variant => (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedVariantId(variant.id)}
                            className={cn(
                              "text-left px-3 py-2 rounded-lg border-2 transition-all flex justify-between items-center",
                              selectedVariantId === variant.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-muted hover:border-primary/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative h-8 w-8 rounded overflow-hidden border">
                                <ProductImage
                                  src={variant.imageUrl}
                                  alt={variant.name}
                                  minimal
                                />
                              </div>
                              <div>
                                <p className="text-sm font-bold">{variant.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">SKU: {variant.sku || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black">{variant.stock} in stock</p>
                              {variant.sellingPrice && <p className="text-[10px] text-primary font-bold">{formatCurrency(variant.sellingPrice, currencySymbol)}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" className="w-full" onClick={() => { setSelectedProduct(null); setFoundProducts([]); setProductSales([]); }}>
                    Change Product
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Restock Form & Sales History */}
        <div className="lg:col-span-2 space-y-6">
          {selectedProduct ? (
            <>
              <Card className="shadow-lg border-none ring-1 ring-border">
                <CardHeader>
                  <CardTitle>Restock Product</CardTitle>
                  <CardDescription>Update stock levels for "{selectedProduct.name}"</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRestock} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Restock Quantity</Label>
                        <div className="relative">
                          <PlusCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            className="pl-8"
                            value={restockQuantity}
                            onChange={(e) => setRestockQuantity(parseInt(e.target.value) || 0)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="costPrice">Cost Price per Unit ({currencySymbol})</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="costPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-8"
                            value={costPrice}
                            onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplier">Supplier Company (Optional)</Label>
                        <div className="relative">
                          <Truck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="supplier"
                            className="pl-8"
                            placeholder="e.g., Electronics Wholesale Ltd"
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supplierAgent">Supplier Agent Name (Optional)</Label>
                        <div className="relative">
                          <PlusCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="supplierAgent"
                            className="pl-8"
                            placeholder="e.g., John Doe"
                            value={supplierContactName}
                            onChange={(e) => setSupplierContactName(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplierPhone">Supplier Phone (Optional)</Label>
                        <div className="relative">
                          <Truck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="supplierPhone"
                            className="pl-8"
                            placeholder="+1 234 567 890"
                            value={supplierPhone}
                            onChange={(e) => setSupplierPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supplierLocation">Supplier Location (Optional)</Label>
                        <div className="relative">
                          <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="supplierLocation"
                            className="pl-8"
                            placeholder="City, Country"
                            value={supplierLocation}
                            onChange={(e) => setSupplierLocation(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" /> Stock Document / Receipt (Optional)
                      </Label>
                      <div className="flex items-start gap-4">
                          {stockDocumentUrl && (
                              <div className="relative w-20 h-20 rounded-lg border overflow-hidden shrink-0 shadow-sm bg-muted flex items-center justify-center">
                                  {stockDocumentUrl.match(/\.(jpeg|jpg|gif|png)$/) != null || stockDocumentUrl.includes('imgbb') ? (
                                    <Image src={stockDocumentUrl} alt="Receipt" fill className="object-contain" unoptimized />
                                  ) : (
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                  )}
                                  <Button type="button" variant="destructive" size="icon" className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full" onClick={() => setStockDocumentUrl('')}>
                                      <X className="h-3 w-3" />
                                  </Button>
                              </div>
                          )}
                          <div className="flex-grow space-y-2">
                              <Input 
                                placeholder="URL or upload below" 
                                value={stockDocumentUrl} 
                                onChange={(e) => setStockDocumentUrl(e.target.value)}
                                disabled={isSubmitting || isUploadingStockDoc} 
                                className="h-10" 
                              />
                              <div className="flex items-center gap-2">
                                <Button asChild variant="outline" size="sm" disabled={isSubmitting || isUploadingStockDoc}>
                                    <label htmlFor="restock-doc-upload-page" className="cursor-pointer flex items-center gap-1">
                                        {isUploadingStockDoc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                        Upload Receipt
                                    </label>
                                </Button>
                                {stockDocumentUrl && (
                                  <Button type="button" variant="ghost" size="sm" asChild>
                                    <a href={stockDocumentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" /> View
                                    </a>
                                  </Button>
                                )}
                              </div>
                              <input id="restock-doc-upload-page" type="file" accept="image/*,.pdf" className="hidden" onChange={handleStockDocUpload} disabled={isSubmitting || isUploadingStockDoc} />
                          </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <div className="relative">
                        <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="notes"
                          className="pl-8 min-h-[80px]"
                          placeholder="Any details about this shipment..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" disabled={isSubmitting || (selectedProduct.hasVariants && !selectedVariantId)}>
                      {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                      Complete Restock
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Recent Sales History
                  </CardTitle>
                  <CardDescription>How this product has been selling recently.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingSales ? (
                    <div className="p-6 space-y-2">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : productSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <TrendingDown className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                      <h3 className="text-lg font-semibold">No Sales Found</h3>
                      <p className="text-sm text-muted-foreground max-w-[250px]">This product hasn't been sold in the most recent 50 transactions.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="text-[10px] font-bold uppercase">
                              {sale.date ? format(sale.date, 'MMM dd, p') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm font-medium">{sale.customerName}</TableCell>
                            <TableCell className="text-right font-black">{sale.quantity}</TableCell>
                            <TableCell className="text-right text-xs">{formatCurrency(sale.unitPrice, currencySymbol)}</TableCell>
                            <TableCell className="text-right font-black text-primary">{formatCurrency(sale.totalPrice, currencySymbol)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="py-3 bg-muted/5 border-t">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Showing sales from recent activity</p>
                </CardFooter>
              </Card>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-12 text-center space-y-4 bg-muted/5">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Barcode className="h-10 w-10 text-primary" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-2xl font-bold">Select a Product to Start</h2>
                <p className="text-muted-foreground">
                  Use the search box or barcode scanner on the left to find the product you want to restock.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <BarcodeScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />
    </div>
  );
}
