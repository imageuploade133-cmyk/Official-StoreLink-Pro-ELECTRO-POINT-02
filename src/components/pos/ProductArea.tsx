'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { collection, getDocs, query as firestoreQuery, where, orderBy } from 'firebase/firestore';
import type { Product as ProductType, Category, DisplayProduct } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { convertToDateSafely } from '@/lib/utils';
import { ensureNumber, calculateEffectivePrice } from '@/lib/pos-utils';

import { ProductSearchBar } from './ProductSearchBar';
import { ProductGrid } from './ProductGrid';
import { PaginationControls } from './PaginationControls';
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner';

interface ProductAreaProps {
    onAddToCart: (product: DisplayProduct, priceForSale: number) => void;
    onProductsLoaded: (products: DisplayProduct[]) => void;
}

const PRODUCTS_PER_PAGE = 20;

const useDebouncedValue = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
    React.useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
};


export function ProductArea({ onAddToCart, onProductsLoaded }: ProductAreaProps) {
    const firestore = useFirestore();
    const { settings } = useSettings();
    const { toast } = useToast();
    const { user, staffMember, store } = useAuth();
    
    const currencySymbol = settings?.currency || '$';
    const defaultProductImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x300.png';
    const globalLowStockThreshold = settings?.lowStockThreshold ?? 10;

    
    const [products, setProducts] = useState<DisplayProduct[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
    const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
    const [productError, setProductError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [filteredProducts, setFilteredProducts] = useState<DisplayProduct[]>([]);

    const [today, setToday] = React.useState<Date | null>(null);
    React.useEffect(() => { setToday(new Date()); }, []);

    const [liveSearchResults, setLiveSearchResults] = useState<DisplayProduct[]>([]);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const searchInputContainerRef = useRef<HTMLDivElement>(null);

    const fetchInitialData = useCallback(async () => {
        const currentStoreId = staffMember?.store_id || store?.id;
        if (!firestore || !currentStoreId) return;
        setLoadingProducts(true);
        setLoadingCategories(true);
        setProductError(null);
        try {
            const productsQuery = firestoreQuery(collection(firestore, 'products'), where('store_id', '==', currentStoreId));
            const categoriesQuery = firestoreQuery(collection(firestore, 'categories'), where('store_id', '==', currentStoreId));
            
            const [productSnapshot, categorySnapshot] = await Promise.all([
                getDocs(productsQuery),
                getDocs(categoriesQuery),
            ]);

            const productList = productSnapshot.docs.map(doc => {
                const data = doc.data() as ProductType;
                return {
                    id: doc.id,
                    ...data,
                    name: data.name || 'Unnamed Product',
                    stock: ensureNumber(data.stock, 0),
                    purchasePrice: ensureNumber(data.purchasePrice, 0),
                    sellingPrice: ensureNumber(data.sellingPrice, 0),
                    categoryId: data.categoryId || '__global__',
                    promo: data.promo ? { ...data.promo, startDate: convertToDateSafely(data.promo.startDate)!, endDate: convertToDateSafely(data.promo.endDate)! } : null,
                    isVisibleInPOS: data.isVisibleInPOS ?? true,
                    allowPriceModification: data.allowPriceModification ?? true,
                } as DisplayProduct;
            }).filter(p => p.isVisibleInPOS);
            setProducts(productList);
            onProductsLoaded(productList);
            
            const categoryList = categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            categoryList.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(categoryList);

        } catch (e: any) {
            console.error("Error fetching products/categories: ", e);
            errorEmitter.emit('firestore-error', e);
            setProductError("Failed to load products. Please check your connection.");
            toast({ variant: 'destructive', title: 'Error Loading Data', description: e.message });
        }
        setLoadingProducts(false);
        setLoadingCategories(false);
    }, [toast, firestore, onProductsLoaded, staffMember, store]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        const searchTermLower = debouncedSearchTerm.toLowerCase().trim();
        const gridFiltered = products.filter((product) => {
          const nameMatch = product.name.toLowerCase().includes(searchTermLower);
          const barcodeMatch = product.barcode?.toLowerCase().includes(searchTermLower) ?? false;
          const skuMatch = product.sku?.toLowerCase().includes(searchTermLower) ?? false;
          const categoryMatch = selectedCategory === 'all' || product.categoryId === selectedCategory;
          return (nameMatch || barcodeMatch || skuMatch) && categoryMatch;
        });
        setFilteredProducts(gridFiltered);
        setCurrentPage(1);
    }, [debouncedSearchTerm, selectedCategory, products]);
    
    useEffect(() => {
        const currentSearchTermLower = searchTerm.toLowerCase().trim();
        if (currentSearchTermLower) {
          const liveResults = products.filter(p =>
            p.name.toLowerCase().includes(currentSearchTermLower) ||
            p.barcode?.toLowerCase().includes(currentSearchTermLower) ||
            p.sku?.toLowerCase().includes(currentSearchTermLower)
          ).slice(0, 7);
          setLiveSearchResults(liveResults);
          setIsSearchDropdownOpen(liveResults.length > 0);
        } else {
          setLiveSearchResults([]);
          setIsSearchDropdownOpen(false);
        }
    }, [searchTerm, products]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchInputContainerRef.current && !searchInputContainerRef.current.contains(event.target as Node)) {
                setIsSearchDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const indexOfLastProduct = currentPage * PRODUCTS_PER_PAGE;
    const indexOfFirstProduct = indexOfLastProduct - PRODUCTS_PER_PAGE;
    const currentProductsOnGrid = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    
    const handleScan = useCallback((barcode: string) => {
        const foundProduct = products.find(p => p.barcode === barcode);
        if (foundProduct) {
            onAddToCart(foundProduct, calculateEffectivePrice(foundProduct, today));
            setSearchTerm('');
            setIsSearchDropdownOpen(false);
        } else {
            toast({
                variant: 'destructive',
                title: 'Product Not Found',
                description: `No product with barcode: ${barcode}`,
            });
        }
    }, [products, onAddToCart, today, toast]);

    return (
        <>
            <ProductSearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categories={categories}
                loadingCategories={loadingCategories}
                liveSearchResults={liveSearchResults}
                isSearchDropdownOpen={isSearchDropdownOpen}
                searchInputContainerRef={searchInputContainerRef}
                onSearchResultClick={(product) => {
                    onAddToCart(product, calculateEffectivePrice(product, today));
                    setSearchTerm('');
                    setIsSearchDropdownOpen(false);
                }}
                onScan={handleScan}
                onOpenScanner={() => setIsScannerOpen(true)}
                currencySymbol={currencySymbol}
                globalLowStockThreshold={globalLowStockThreshold}
                today={today}
            />

            <BarcodeScanner 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
                onScan={(barcode) => {
                    handleScan(barcode);
                }} 
            />

            <ProductGrid
                products={currentProductsOnGrid}
                loading={loadingProducts}
                error={productError}
                onAddToCart={onAddToCart}
                currencySymbol={currencySymbol}
                isGlobalPriceModificationDisabled={settings?.disablePriceModification ?? false}
                defaultImageUrl={defaultProductImageUrl}
                globalLowStockThreshold={globalLowStockThreshold}
                today={today}
                onRetry={fetchInitialData}
                allProductsCount={products.length}
            />

            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </>
    );
}
