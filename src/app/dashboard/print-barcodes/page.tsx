
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  where,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  type QueryDocumentSnapshot,
  type DocumentData,
  getCountFromServer
} from 'firebase/firestore';
import type { BarcodeProduct, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Printer, RefreshCw, Tags, Loader2, RotateCcw } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { useSettings } from "@/contexts/settings-context";
import { formatCurrency } from "@/lib/formatUtils";
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { PageLayoutSettingsCard } from '@/components/barcode/PageLayoutSettingsCard';
import { ProductSelectionCard } from '@/components/barcode/ProductSelectionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';

export type LayoutSettings = {
    labelWidth: number;
    labelHeight: number;
    marginTop: number;
    marginLeft: number;
    verticalGap: number;
    horizontalGap: number;
};

export type LayoutPreset = {
    name: string;
    value: string;
    settings: LayoutSettings;
};

const layoutPresets: LayoutPreset[] = [
    { name: 'Standard (30 per page)', value: 'preset-30', settings: { labelWidth: 64, labelHeight: 25, marginTop: 11, marginLeft: 9, verticalGap: 0, horizontalGap: 2.5 } },
    { name: 'Large (10 per page)', value: 'preset-10', settings: { labelWidth: 90, labelHeight: 50, marginTop: 23.5, marginLeft: 15, verticalGap: 0, horizontalGap: 0 } },
    { name: 'Small (65 per page)', value: 'preset-65', settings: { labelWidth: 38, labelHeight: 21.2, marginTop: 10.9, marginLeft: 5, verticalGap: 0, horizontalGap: 0 } },
    { name: 'Custom', value: 'custom', settings: { labelWidth: 48, labelHeight: 25, marginTop: 13.5, marginLeft: 7.5, verticalGap: 0, horizontalGap: 0 } },
];

const ITEMS_PER_PAGE = 15;

// Safe barcode image component that runs only on the client
const BarcodeImage = ({ value }: { value: string }) => {
    const [dataUrl, setDataUrl] = useState<string | null>(null);

    useEffect(() => {
        const canvas = document.createElement('canvas');
        try {
            JsBarcode(canvas, value, {
                format: 'CODE128', displayValue: true, width: 1.5, height: 40, fontSize: 14, margin: 5,
            });
            setDataUrl(canvas.toDataURL('image/png'));
        } catch (error) {
            console.error("Error generating barcode", error);
            setDataUrl(null);
        }
    }, [value]);

    if (!dataUrl) return <Skeleton className="h-[50px] w-full" />;

    // eslint-disable-next-line @next/next/no-img-element
    return <img src={dataUrl} alt={`Barcode for ${value}`} className="barcode-img" />;
};

// A4 Preview Component
const A4Preview = ({ products, currencySymbol, settings, generatingBarcode, generateBarcode, fontSize, isBold }: {
    products: { product: Product; quantity: number; }[];
    currencySymbol: string;
    settings: LayoutSettings;
    generatingBarcode: string | null;
    generateBarcode: (productId: string) => Promise<void>;
    fontSize: number;
    isBold: boolean;
}) => {
    const { labelWidth, labelHeight, marginTop, marginLeft, verticalGap, horizontalGap } = settings;

    return (
        <div className="a4-sheet mx-auto origin-top shadow-lg print:shadow-none print:m-0">
            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <Tags className="w-16 h-16 mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold">Print Preview</h3>
                    <p className="text-sm">Select products to see a preview.</p>
                </div>
            ) : (
                <div className="a4-grid">
                    {products.flatMap((item, index) =>
                        Array.from({ length: item.quantity }, (_, i) => (
                            <div key={`${item.product.id}-${index}-${i}`} className="product-label">
                                <div className="product-name" style={{ fontSize: `${fontSize}px`, fontWeight: isBold ? 'bold' : '600' }}>{item.product.name}</div>
                                {item.product.barcode ? (
                                    <BarcodeImage value={item.product.barcode} />
                                ) : (
                                    <div className="text-xs text-red-500 my-2 flex flex-col items-center gap-1">
                                        No Barcode
                                        <Button variant="secondary" size="sm" onClick={() => generateBarcode(item.product.id)} disabled={generatingBarcode === item.product.id}>
                                            {generatingBarcode === item.product.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Tags className="mr-2 h-4 w-4" />}
                                            Generate
                                        </Button>
                                    </div>
                                )}
                                <div className="product-price" style={{ fontSize: `${fontSize}px` }}>{formatCurrency(item.product.sellingPrice, currencySymbol)}</div>
                            </div>
                        ))
                    )}
                </div>
            )}
            <style jsx>{`
                .a4-sheet { width: 210mm; min-height: 297mm; background: white; padding: ${marginTop}mm ${marginLeft}mm; box-sizing: border-box; }
                .a4-grid { display: grid; grid-template-columns: repeat(auto-fill, ${labelWidth}mm); grid-auto-rows: ${labelHeight}mm; gap: ${verticalGap}mm ${horizontalGap}mm; justify-content: start; align-content: start; }
                .product-label { border: 1px dotted #ccc; padding: 2mm; display: flex; flex-direction: column; align-items: center; justify-content: space-around; text-align: center; overflow: hidden; box-sizing: border-box; }
                .product-name { font-weight: 600; line-height: 1.2; word-break: break-word; }
                .product-price { font-weight: bold; margin-top: auto; }
            `}</style>
        </div>
    );
};

// Main Page Component
const PrintBarcodePage = () => {
    const { permissions, isLoading: authLoading } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { settings } = useSettings();
    const currencySymbol = settings?.currency || '$';

    const [products, setProducts] = useState<Product[]>([]);
    const [selectedMap, setSelectedMap] = useState<Record<string, { product: Product, quantity: number }>>({});
    const [labelQuantities, setLabelQuantities] = useState<Record<string, number>>({});
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalFilteredCount, setTotalFilteredCount] = useState(0);
    const [allProductsCountInDb, setAllProductsCountInDb] = useState(0);
    const [withBarcodesCountInDb, setWithBarcodesCountInDb] = useState(0);
    const [generatingBarcode, setGeneratingBarcode] = useState<string | null>(null);

    const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [isLastPage, setIsLastPage] = useState(false);

    const [selectedPreset, setSelectedPreset] = useState<string>(layoutPresets[0].value);
    const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(layoutPresets[0].settings);
    const [fontSize, setFontSize] = useState<number>(10);
    const [isBold, setIsBold] = useState<boolean>(false);

    const fetchProducts = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
        if (!firestore) return;
        setIsLoading(true);
        setError(null);

        try {
            let q = query(collection(firestore, 'products'), orderBy('name', 'asc'));

            if (activeFilter === 'withBarcodes') {
                q = query(q, where('barcode', '!=', null));
            }

            if (searchTerm.trim()) {
                const term = searchTerm.trim();
                q = query(q, where('name', '>=', term), where('name', '<=', term + '\uf8ff'));
            }

            // 1. Initial count & Global stats (Cost Efficient)
            if (direction === 'initial') {
                const countSnap = await getCountFromServer(q);
                setTotalFilteredCount(countSnap.data().count);

                const allCountSnap = await getCountFromServer(collection(firestore, 'products'));
                setAllProductsCountInDb(allCountSnap.data().count);

                const withBarcodeQuery = query(collection(firestore, 'products'), where('barcode', '!=', null));
                const withBarcodeCountSnap = await getCountFromServer(withBarcodeQuery);
                setWithBarcodesCountInDb(withBarcodeCountSnap.data().count);
            }

            // 2. Apply cursors from refs
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

                const productsList = docs.map(d => ({ id: d.id, ...d.data() } as Product));
                setProducts(productsList);
                
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
            console.error("Error fetching products:", e);
            setError("Failed to load products. You may need to create a Firestore index if searching or filtering.");
            toast({ variant: 'destructive', title: 'Fetch Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [firestore, activeFilter, searchTerm, toast]);

    useEffect(() => { 
        if(!authLoading && permissions?.canPrintBarcodes) {
            fetchProducts('initial'); 
        }
    }, [fetchProducts, authLoading, permissions]);

    const handleLayoutChange = (setting: keyof LayoutSettings, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setLayoutSettings(prev => ({ ...prev, [setting]: numValue }));
            setSelectedPreset('custom');
        }
    };
    const handlePresetChange = (value: string) => {
        const preset = layoutPresets.find(p => p.value === value);
        if (preset) { setSelectedPreset(preset.value); setLayoutSettings(preset.settings); }
    };

    const calculatedLabelsPerPage = useMemo(() => {
        const { labelWidth, labelHeight, marginTop, marginLeft, verticalGap, horizontalGap } = layoutSettings;
        if (labelWidth <= 0 || labelHeight <= 0) return 0;
        const A4_WIDTH_MM = 210; const A4_HEIGHT_MM = 297;
        const effectiveWidth = A4_WIDTH_MM - (marginLeft * 2); const effectiveHeight = A4_HEIGHT_MM - (marginTop * 2);
        const cols = Math.floor(effectiveWidth / (labelWidth + horizontalGap)); const rows = Math.floor(effectiveHeight / (labelHeight + verticalGap));
        return Math.max(0, cols * rows);
    }, [layoutSettings]);

    const barcodeProducts = useMemo((): BarcodeProduct[] => {
        return products.map(p => ({
            ...p,
            isSelected: !!selectedMap[p.id],
            labelQuantity: labelQuantities[p.id] ?? (selectedMap[p.id]?.quantity ?? 1)
        }));
    }, [products, selectedMap, labelQuantities]);

    const selectedProducts = useMemo(() => Object.values(selectedMap), [selectedMap]);

    const handleSelectProduct = (id: string, isSelected: boolean) => {
        const product = products.find(p => p.id === id);
        if (!product) return;

        setSelectedMap(prev => {
            const next = { ...prev };
            if (isSelected) {
                next[id] = { product, quantity: labelQuantities[id] || 1 };
            } else {
                delete next[id];
            }
            return next;
        });
    }
    
    const handleSelectAllVisible = (checked: boolean) => {
        setSelectedMap(prev => {
            const next = { ...prev };
            products.forEach(p => {
                if (checked) {
                    next[p.id] = { product: p, quantity: labelQuantities[p.id] || 1 };
                } else {
                    delete next[p.id];
                }
            });
            return next;
        });
    };

    const areAllVisibleSelected = useMemo(() => products.length > 0 && products.every(p => !!selectedMap[p.id]), [products, selectedMap]);
    
    const generateBarcode = async (productId: string) => {
        if (!firestore) return;
        setGeneratingBarcode(productId);
        try {
            let newBarcode = '';
            let isUnique = false;
            while (!isUnique) {
                newBarcode = Math.random().toString(36).substring(2, 15).toUpperCase();
                const q = query(collection(firestore, "products"), where("barcode", "==", newBarcode));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) {
                    isUnique = true;
                }
            }
            
            await updateDoc(doc(firestore, 'products', productId), { barcode: newBarcode, barcodeGenerated: true });
            
            // Update local state
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, barcode: newBarcode } : p));
            setSelectedMap(prev => {
                if (!prev[productId]) return prev;
                return {
                    ...prev,
                    [productId]: { 
                        ...prev[productId], 
                        product: { ...prev[productId].product, barcode: newBarcode } 
                    }
                };
            });

            toast({ title: 'Barcode Generated Successfully', description: `New barcode for product is ${newBarcode}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Generating Barcode', description: error.message });
        } finally { setGeneratingBarcode(null); }
    };
    
    const handleLabelQuantityChange = (id: string, quantity: number) => {
        const newQuantity = isNaN(quantity) || quantity < 0 ? 0 : quantity;
        setLabelQuantities(prev => ({ ...prev, [id]: newQuantity }));
        
        if (selectedMap[id]) {
            setSelectedMap(prev => ({
                ...prev,
                [id]: { ...prev[id], quantity: newQuantity }
            }));
        }
    };
    
    const handlePrint = () => window.print();

    if (authLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }
    
    if (!permissions || !permissions.canPrintBarcodes) {
        return <AccessDenied />;
    }

    const handleNextPage = () => fetchProducts('next');
    const handlePrevPage = () => fetchProducts('prev');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageHeader
                    icon={Printer}
                    title="Print Barcodes"
                    description="Incremental fetching active to save costs. Select products from the list below."
                />
                <Button variant="outline" onClick={() => fetchProducts('initial')} disabled={isLoading}>
                    <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                    Sync Registry
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="w-full flex flex-col gap-6">
                    <PageLayoutSettingsCard
                        layoutSettings={layoutSettings}
                        onLayoutSettingChange={handleLayoutChange}
                        layoutPresets={layoutPresets}
                        selectedPreset={selectedPreset}
                        onPresetChange={handlePresetChange}
                        calculatedLabelsPerPage={calculatedLabelsPerPage}
                        fontSize={fontSize}
                        isBold={isBold}
                        onFontSizeChange={setFontSize}
                        onIsBoldChange={setIsBold}
                    />
                    
                    <ProductSelectionCard
                        products={barcodeProducts}
                        allProductsCount={allProductsCountInDb}
                        withBarcodesCount={withBarcodesCountInDb}
                        totalFilteredCount={totalFilteredCount}
                        activeFilter={activeFilter}
                        setActiveFilter={setActiveFilter}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        currentPage={currentPage}
                        setCurrentPage={handlePageChange} // Logic to trigger server fetch
                        onPageChange={handlePageChange}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onProductSelectionChange={handleSelectProduct}
                        onLabelQuantityChange={handleLabelQuantityChange}
                        onSelectAllVisible={handleSelectAllVisible}
                        areAllVisibleSelected={areAllVisibleSelected}
                        onBarcodeRegenerate={generateBarcode}
                    />

                    <Button onClick={handlePrint} disabled={selectedProducts.length === 0} className="w-full mt-2 h-12 text-lg font-black shadow-lg shadow-primary/20">
                        <Printer className="mr-2 h-5 w-5" /> 
                        Print ({selectedProducts.reduce((acc, p) => acc + p.quantity, 0)}) Labels
                    </Button>
                </div>
                
                <div className="flex-grow lg:sticky top-6 print-area">
                    {isLoading && selectedProducts.length === 0 ? (
                        <Skeleton className="w-full h-[500px] rounded-2xl" />
                    ) : (
                        <A4Preview 
                            products={selectedProducts} 
                            currencySymbol={currencySymbol} 
                            settings={layoutSettings} 
                            generatingBarcode={generatingBarcode} 
                            generateBarcode={generateBarcode} 
                            fontSize={fontSize}
                            isBold={isBold}
                        />
                    )}
                </div>
            </div>
            
            <style jsx global>{`
              @media print { 
                body > *:not(.print-area) { display: none !important; } 
                .print-area, .print-area > * { 
                  display: block !important; 
                  width: 100% !important; 
                  height: auto !important; 
                  overflow: visible !important; 
                  box-shadow: none !important; 
                  border: none !important; 
                  margin: 0 !important; 
                  padding: 0 !important; 
                  background: transparent !important; 
                } 
                @page { size: A4; margin: 0; } 
              }
            `}</style>
        </div>
    );

    function handlePageChange(newPage: number) {
        if (newPage > currentPage) fetchProducts('next');
        else if (newPage < currentPage) fetchProducts('prev');
    }
};

export default PrintBarcodePage;
