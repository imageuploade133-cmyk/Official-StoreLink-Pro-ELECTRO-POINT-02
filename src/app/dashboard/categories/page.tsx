'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  collection,
  doc,
  query,
  writeBatch,
  updateDoc,
  getDocs,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';

import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import type { Settings, Product, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/formatUtils';

// --- UI Components ---
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
    FolderTree, 
    PackageSearch, 
    Unlink, 
    PlusCircle, 
    Trash2, 
    Edit, 
    Search, 
    X, 
    ChevronLeft, 
    ChevronRight, 
    Loader2, 
    Boxes, 
    RotateCcw,
    Zap,
    Clock
} from 'lucide-react';

// --- Custom Components ---
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { CategorySheet } from '@/components/inventory/CategorySheet';
import { cn, convertToDateSafely } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Separator } from '@/components/ui/separator';


// --- Type Definitions ---
interface CategoryWithProducts extends Category {
  products: Product[];
}

// --- Constants ---
const ITEMS_PER_PAGE = 10;


export default function CategoriesPage() {
    // --- State Management ---
    const [openAccordions, setOpenAccordions] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    
    // Pagination state
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);
    const [totalCategoryCount, setTotalCategoryCount] = useState(0);
    
    // Stable cursors using refs
    const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

    // Products state (kept simpler for category mapping)
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    
    // Dialog states
    const [isRemoveProductDialogOpen, setIsRemoveProductDialogOpen] = React.useState(false);
    const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = React.useState(false);

    // Submission/Deletion states
    const [isDeletingCategory, setIsDeletingCategory] = React.useState(false);
    const [isRemovingProduct, setIsRemovingProduct] = React.useState(false);
    
    // Data for dialogs
    const [categoryToDelete, setCategoryToDelete] = React.useState<CategoryWithProducts | null>(null);
    const [productToRemove, setProductToRemove] = React.useState<{ product: Product; categoryName: string } | null>(null);

    // --- Hooks ---
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user, permissions, isLoading: authLoading } = useAuth();

    // Settings
    const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore]);
    const { data: settings } = useDoc<Settings>(settingsRef);
    const currencySymbol = settings?.currency || '$';
    const defaultProductImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x300.png';

    // Data Fetching Logic (Cost Optimized)
    const fetchCategories = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
        if (!firestore) return;
        setIsLoadingCategories(true);

        try {
            let q = query(collection(firestore, 'categories'), orderBy('name', 'asc'));

            if (direction === 'initial') {
                const countSnap = await getCountFromServer(q);
                setTotalCategoryCount(countSnap.data().count);
            }

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
                firstDocRef.current = docs[0];
                lastDocRef.current = docs[docs.length - 1];
                setIsLastPage(docs.length < ITEMS_PER_PAGE);

                const categoriesData = docs.map(d => ({ id: d.id, ...d.data() } as Category));
                setCategories(categoriesData);
                
                if (direction === 'next') setCurrentPage(p => p + 1);
                else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
                else setCurrentPage(1);
            } else {
                if (direction === 'initial') {
                    setCategories([]);
                    setIsLastPage(true);
                }
            }
        } catch (e: any) {
            console.error("Error fetching categories:", e);
            toast({ variant: 'destructive', title: "Sync Error", description: "Could not load categories." });
        } finally {
            setIsLoadingCategories(false);
        }
    }, [firestore, toast]);

    const fetchProducts = useCallback(async () => {
        if (!firestore) return;
        setIsLoadingProducts(true);
        try {
            const q = query(collection(firestore, 'products'), limit(2000)); // Limit to a large but reasonable batch
            const snapshot = await getDocs(q);
            setAllProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        } catch (e) {
            console.error("Error fetching products:", e);
        } finally {
            setIsLoadingProducts(false);
        }
    }, [firestore]);

    useEffect(() => {
        if (firestore) {
            fetchCategories('initial');
            fetchProducts();
        }
    }, [firestore, fetchCategories, fetchProducts]);

    const categoriesWithProducts = useMemo((): CategoryWithProducts[] => {
        if (!categories) return [];
        return categories.map(category => ({
            ...category,
            products: allProducts.filter(product => product.categoryId === category.id)
        }));
    }, [categories, allProducts]);
    
    const totalStockAcrossAll = useMemo(() => {
        return allProducts.reduce((acc, product) => acc + (product.stock || 0), 0);
    }, [allProducts]);


    // --- Filtering Logic (Local for UX) ---
    const filteredCategories = React.useMemo(() => {
        const lowercasedTerm = searchTerm.trim().toLowerCase();
        if (!lowercasedTerm) return categoriesWithProducts;
        return categoriesWithProducts.filter(category =>
            category.name.toLowerCase().includes(lowercasedTerm) || 
            (category.description && category.description.toLowerCase().includes(lowercasedTerm))
        );
    }, [searchTerm, categoriesWithProducts]);

    const handleDeleteCategory = (category: CategoryWithProducts) => { setCategoryToDelete(category); setIsDeleteCategoryDialogOpen(true); };
    const confirmDeleteCategory = async () => {
        if (!categoryToDelete || !firestore) return;
        setIsDeletingCategory(true);
        
        try {
            const batch = writeBatch(firestore);
            categoryToDelete.products.forEach(product => {
                const productRef = doc(firestore, 'products', product.id);
                batch.update(productRef, { categoryId: null });
            });
            const categoryRef = doc(firestore, 'categories', categoryToDelete.id);
            batch.delete(categoryRef);
            await batch.commit();

            toast({ title: 'Category Deleted', description: `"${categoryToDelete.name}" was removed.` });
            fetchCategories('initial');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: 'The category could not be deleted.' });
        } finally {
            setIsDeleteCategoryDialogOpen(false);
            setIsDeletingCategory(false);
            setCategoryToDelete(null);
        }
    };

    const handleRemoveProductFromCategory = (product: Product, categoryName: string) => { setProductToRemove({ product, categoryName }); setIsRemoveProductDialogOpen(true); };
    const confirmRemoveProductFromCategory = async () => {
        if (!productToRemove || !firestore) return;
        setIsRemovingProduct(true);
        try {
            const productRef = doc(firestore, 'products', productToRemove.product.id);
            await updateDoc(productRef, { categoryId: null });
            toast({ title: 'Product Removed', description: `"${productToRemove.product.name}" is now uncategorized.` });
            fetchProducts(); // Refresh product list to update category mapping
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not remove product.' });
        } finally {
            setIsRemoveProductDialogOpen(false);
            setIsRemovingProduct(false);
            setProductToRemove(null);
        }
    };

    const isLoading = authLoading || isLoadingCategories || isLoadingProducts;

    if (authLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }
    
    if (!permissions.view_categories) {
        return <AccessDenied />;
    }

    const renderContent = () => {
        if (categories.length === 0 && !searchTerm && !isLoading) {
            return (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <FolderTree className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Categories Yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first product category.</p>
                </div>
            );
        }
        if (filteredCategories.length === 0 && searchTerm) {
            return (
                <div className="text-center py-16"><PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">No Results Found</h3><p className="mt-1 text-sm text-muted-foreground">Your search for <strong className="text-foreground">"{searchTerm}"</strong> did not match any categories on this page.</p></div>
            );
        }
        return (
            <Accordion type="multiple" value={openAccordions} onValueChange={setOpenAccordions} className="w-full">
                {filteredCategories.map((category) => {
                    const now = new Date();
                    const start = convertToDateSafely(category.flashSaleStartDate);
                    const end = convertToDateSafely(category.flashSaleEndDate);
                    
                    const isPromoActive = category.isFlashSale && 
                        (!start || now >= start) && 
                        (!end || now <= end);
                    
                    const isScheduled = category.isFlashSale && start && now < start;

                    return (
                        <AccordionItem value={category.id} key={category.id} className="border-b last:border-b-0">
                            <AccordionTrigger className="hover:bg-accent/50 px-4 py-3 text-base group rounded-t-lg">
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted">
                                            <Image src={category.imageUrl || `https://placehold.co/40x40.png?text=${category.name.charAt(0)}`} alt={category.name} fill className="object-cover" unoptimized />
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-primary">{category.name}</span>
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{category.products.length}</Badge>
                                                {isPromoActive && (
                                                    <Badge className="bg-rose-500 text-white font-black h-5 px-1.5 border-none shadow-sm animate-pulse flex items-center gap-1">
                                                        <Zap className="h-2.5 w-2.5 fill-current" />
                                                        {category.flashSaleDiscountType === 'percentage' ? `${category.flashSaleDiscountValue}%` : `${currencySymbol}${category.flashSaleDiscountValue}`}
                                                    </Badge>
                                                )}
                                                {isScheduled && (
                                                    <Badge variant="outline" className="text-blue-600 border-blue-200 h-5 px-1.5 flex items-center gap-1">
                                                        <Clock className="h-2.5 w-2.5" /> Scheduled
                                                    </Badge>
                                                )}
                                            </div>
                                            {category.description && (
                                                <p 
                                                    className="text-[10px] text-muted-foreground truncate max-w-[200px]"
                                                    dangerouslySetInnerHTML={{ __html: category.description }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    {(permissions.edit_categories || permissions.delete_categories) && <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                        {permissions.edit_categories && (
                                            <Link
                                                href={`/dashboard/categories/edit/${category.id}`}
                                                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        )}
                                        {permissions.delete_categories && <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleDeleteCategory(category); } }}
                                            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8 text-destructive hover:text-destructive')}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </div>}
                                    </div>}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="bg-muted/30 overflow-y-auto max-h-[350px]">
                                {category.products.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground"><PackageSearch className="mx-auto h-10 w-10 mb-2" /><p>No products are assigned to this category.</p></div>
                                ) : (
                                    <Table>
                                        <TableHeader><TableRow><TableHead className="w-[60px]">Image</TableHead><TableHead>Product Name</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-center w-[120px]">Action</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {category.products.map((product) => (
                                                <TableRow key={product.id}>
                                                    <TableCell><Image src={product.imageUrl || defaultProductImageUrl} alt={product.name} width={40} height={40} className="rounded-md object-cover aspect-square" unoptimized/></TableCell>
                                                    <TableCell className="font-medium">{product.name}{product.sku && <span className="block text-xs text-muted-foreground">SKU: {product.sku}</span>}</TableCell>
                                                    <TableCell className={cn("text-right font-mono", product.stock <= 0 ? 'text-red-600' : product.stock <= (product.lowStockThreshold ?? 10) ? 'text-orange-500' : '')}>{product.stock}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(product.sellingPrice, currencySymbol)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive hover:bg-destructive/10" onClick={() => handleRemoveProductFromCategory(product, category.name)} disabled={!permissions.edit_categories}>
                                                            <Unlink className="mr-1.5 h-3 w-3" /> Remove
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <PageHeader
                    icon={FolderTree}
                    title="Product Categories"
                    description="Organize your inventory into meaningful groups for POS and Web storefronts."
                />
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => fetchCategories('initial')} disabled={isLoadingCategories}>
                        <RotateCcw className={cn("mr-2 h-4 w-4", isLoadingCategories && "animate-spin")} />
                        Sync
                    </Button>
                    {permissions.add_categories && (
                        <CategorySheet
                          trigger={
                            <Button>
                              <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                            </Button>
                          }
                        />
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingCategories ? <Skeleton className="h-8 w-1/4"/> : <div className="text-2xl font-bold">{totalCategoryCount.toLocaleString()}</div>}
                        <p className="text-xs text-muted-foreground">Global classification count.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stock (All Products)</CardTitle>
                        <Boxes className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingProducts ? <Skeleton className="h-8 w-1/2"/> : <div className="text-2xl font-bold">{totalStockAcrossAll.toLocaleString()}</div>}
                        <p className="text-xs text-muted-foreground">Total units across entire catalog.</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Category Registry</CardTitle>
                    <CardDescription>Fetched incrementally to ensure performance and cost efficiency.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center mb-4 gap-4">
                        <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search within current set..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />{searchTerm && (<Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}><X className="h-4 w-4" /></Button>)}</div>
                    </div>
                    {isLoadingCategories && categories.length === 0 ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                        </div>
                    ) : (
                        renderContent()
                    )}
                </CardContent>
                <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
                    <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                        Page {currentPage} <span className="mx-2">|</span> {totalCategoryCount} Total Groups
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => fetchCategories('prev')} disabled={currentPage === 1 || isLoadingCategories} className="font-bold">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => fetchCategories('next')} disabled={isLastPage || isLoadingCategories} className="font-bold">
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            <DeleteConfirmationDialog isOpen={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen} onConfirm={confirmDeleteCategory} itemName={categoryToDelete?.name || ''} itemType="category" isDeleting={isDeletingCategory} dialogDescription={`This will delete <strong>"${categoryToDelete?.name || ''}"</strong>. All associated products will become "Uncategorized". This cannot be undone.`} />
            <DeleteConfirmationDialog isOpen={isRemoveProductDialogOpen} onOpenChange={setIsRemoveProductDialogOpen} onConfirm={confirmRemoveProductFromCategory} itemName={`"${productToRemove?.product.name || ''}" from "${productToRemove?.categoryName || ''}"`} itemType="product from category" isDeleting={isRemovingProduct} confirmButtonText="Yes, Remove" dialogTitle="Confirm Product Removal" dialogDescription={`Are you sure? This will make <strong>"${productToRemove?.product.name}"</strong> uncategorized, but it will not delete the product itself.`} />
        </div>
    )
}
