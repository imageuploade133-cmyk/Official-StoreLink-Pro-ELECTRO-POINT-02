
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { List, Loader2, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import { useAuth } from '@/contexts/auth-context';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { BulkUploadCard } from '@/components/bulk-products/BulkUploadCard';
import { PreviewTable } from '@/components/bulk-products/PreviewTable';
import { useSettings } from '@/contexts/settings-context';
import { logActivity } from '@/lib/activity-log-utils';

type ParsedProduct = Omit<Product, 'id'> & { id?: string; action: 'create' | 'update' };

const OPTIONAL_HEADERS = ['description', 'supplierName', 'supplierContactName', 'supplierPhone', 'supplierLocation', 'stockDocumentUrl', 'lowStockThreshold', 'isVisibleInPOS', 'imageUrl'];

export default function BulkAddProductsPage() {
  const { user, permissions, isLoading: authLoading, store, staffMember } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);
  
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const requiredHeaders = useMemo(() => {
    return ['name', 'sku', 'sellingPrice', 'purchasePrice', 'stock', 'categoryId'];
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsedData([]);
    setValidationError(null);
    setIsProcessing(true);

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

          if (missingHeaders.length > 0) {
            throw new Error(`CSV is missing required headers: ${missingHeaders.join(', ')}.`);
          }
          
          const data = results.data.map((row) => {
            return {
              name: row.name || 'Unnamed Product',
              sku: row.sku || '',
              sellingPrice: parseFloat(row.sellingPrice) || 0,
              purchasePrice: parseFloat(row.purchasePrice) || 0,
              stock: parseInt(row.stock, 10) || 0,
              categoryId: row.categoryId || 'uncategorized',
              description: row.description || '',
              supplierName: row.supplierName || '',
              supplierContactName: row.supplierContactName || '',
              supplierPhone: row.supplierPhone || '',
              supplierLocation: row.supplierLocation || '',
              stockDocumentUrl: row.stockDocumentUrl || '',
              lowStockThreshold: row.lowStockThreshold ? parseInt(row.lowStockThreshold, 10) : null,

              imageUrl: row.imageUrl || '',
              action: 'create' as 'create' | 'update',
            };
          });
          
          setParsedData(data as ParsedProduct[]);
        } catch (err: any) {
            setValidationError(err.message || 'An error occurred during file processing.');
            setParsedData([]);
        } finally {
            setIsProcessing(false);
        }
      },
      error: (error: any) => {
        setValidationError(`Error parsing CSV file: ${error.message}`);
        setIsProcessing(false);
      }
    });
  };

  const handleImport = async () => {
    if (!user || !firestore || !currentStoreId || parsedData.length === 0) return;
    setIsProcessing(true);
    
    let createdCount = 0;
    let updatedCount = 0;
    const batch = writeBatch(firestore);

    try {
        const skus = parsedData.map(p => p.sku).filter(Boolean) as string[];
        const existingProductsMap = new Map<string, Product>();

        if (skus.length > 0) {
            for (let i = 0; i < skus.length; i += 30) {
                const chunk = skus.slice(i, i + 30);
                const q = query(
                    collection(firestore, 'products'), 
                    where('store_id', '==', currentStoreId),
                    where('sku', 'in', chunk)
                );
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => {
                    const product = { id: doc.id, ...doc.data() } as Product;
                    if (product.sku) existingProductsMap.set(product.sku, product);
                });
            }
        }
        
        for (const productData of parsedData) {
            const { action, ...dataToWrite } = productData;
            const existingProduct = productData.sku ? existingProductsMap.get(productData.sku) : undefined;
            if (existingProduct) {
                const productRef = doc(firestore, 'products', existingProduct.id);
                batch.update(productRef, { ...dataToWrite, store_id: currentStoreId, updatedAt: serverTimestamp() });
                
                // --- ADD AUDIT IF STOCK CHANGED ---
                if (existingProduct.stock !== dataToWrite.stock) {
                    const auditRef = doc(collection(firestore, 'stockAudit'));
                    batch.set(auditRef, {
                        productId: existingProduct.id,
                        productName: dataToWrite.name,
                        store_id: currentStoreId,
                        type: 'ADJUSTMENT',
                        referenceId: 'BULK-' + existingProduct.id.substring(0, 8).toUpperCase(),
                        beforeStock: existingProduct.stock || 0,
                        afterStock: dataToWrite.stock,
                        change: dataToWrite.stock - (existingProduct.stock || 0),
                        staffId: user.uid,
                        staffName: user.displayName || user.email || 'Staff',
                        timestamp: serverTimestamp()
                    });
                }
                updatedCount++;
            } else {
                const newProductRef = doc(collection(firestore, 'products'));
                batch.set(newProductRef, { ...dataToWrite, store_id: currentStoreId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                
                // --- ADD AUDIT ---
                const auditRef = doc(collection(firestore, 'stockAudit'));
                batch.set(auditRef, {
                    productId: newProductRef.id,
                    productName: dataToWrite.name,
                    store_id: currentStoreId,
                    type: 'ADJUSTMENT',
                    referenceId: 'BULK-' + newProductRef.id.substring(0, 8).toUpperCase(),
                    beforeStock: 0,
                    afterStock: dataToWrite.stock,
                    change: dataToWrite.stock,
                    staffId: user.uid,
                    staffName: user.displayName || user.email || 'Staff',
                    timestamp: serverTimestamp()
                });
                createdCount++;
            }
        }

      await batch.commit();

      await logActivity(firestore, {
          user: { uid: user.uid, displayName: user.displayName || user.email || 'System' },
          store_id: currentStoreId,
          actionType: 'BULK_IMPORT', entityType: 'Product', entityId: 'BULK',
          summary: `User imported products via CSV`,
          entityDescription: `Bulk import: ${createdCount} created, ${updatedCount} updated.`,
          details: { created: createdCount, updated: updatedCount, fileName },
      });
      
      toast({
          title: "Import Successful",
          description: `Created ${createdCount} new products and updated ${updatedCount} existing products.`,
      });
      setParsedData([]);
      setFileName('');

    } catch (e: any) {
        console.error("Error committing batch:", e);
        toast({ variant: "destructive", title: "Import Failed", description: `An error occurred during the import: ${e.message}` });
    } finally {
        setIsProcessing(false);
    }
  };
  
  if (authLoading) {
      return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (!permissions.canBulkAddProducts) {
      return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl font-semibold flex items-center">
            <List className="mr-3 h-8 w-8 text-primary" /> Bulk Add/Update Products
          </CardTitle>
          <CardDescription>
            Import new products or update existing ones by SKU.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <BulkUploadCard 
        onFileUpload={handleFileUpload}
        fileName={fileName}
        isProcessing={isProcessing}
        validationError={validationError}
        requiredHeaders={requiredHeaders}
        optionalHeaders={OPTIONAL_HEADERS}
        isAllBranchesView={false}
      />
      
      <PreviewTable
        parsedData={parsedData}
        currencySymbol={currencySymbol}
        onImport={handleImport}
        isProcessing={isProcessing}
      />
    </div>
  );
}
