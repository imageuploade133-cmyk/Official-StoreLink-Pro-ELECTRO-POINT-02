'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection } from '@/firebase';
import Image from 'next/image';
import { useSettings } from '@/contexts/settings-context';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { collection, query, where, orderBy, addDoc, Timestamp, limit, startAfter, getDocs, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import type { HomepageSection, Category, Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { 
  Loader2, 
  Save, 
  X, 
  Search as SearchIcon, 
  SlidersHorizontal, 
  Check, 
  Plus,
  LayoutGrid,
  Columns,
  AlignLeft,
  AlignCenter,
  Zap,
  TrendingDown,
  CalendarIcon,
  Info,
  ChevronRight,
  ArrowRight,
  CircleArrowRight,
  Circle,
  Square,
  Type,
  MousePointer2,
  CircleDashed,
  Box
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { CategoryForm, type CategoryFormValues } from '../inventory/CategoryForm';
import { cn, convertToDateSafely } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const homepageSectionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().optional().or(z.literal('')),
  order: z.coerce.number().int().min(0, 'Order must be a non-negative number.'),
  published: z.boolean().default(true),
  layout: z.enum(['carousel', 'grid']).default('carousel'),
  alignment: z.enum(['left', 'center']).default('left'),
  backgroundColor: z.string().optional().or(z.literal('')),
  selectionType: z.enum(['manual', 'category']),
  categoryId: z.string().optional().or(z.literal('')),
  productIds: z.array(z.string()).optional().default([]),
  // Flash Sale Fields
  isFlashSale: z.boolean().default(false),
  flashSaleDiscountType: z.enum(['percentage', 'fixed']).default('percentage'),
  flashSaleDiscountValue: z.coerce.number().min(0).optional().default(0),
  flashSaleStartDate: z.date().optional().nullable(),
  flashSaleEndDate: z.date().optional().nullable(),
  // Carousel Extensions
  autoScroll: z.boolean().default(false),
  slideIcon: z.enum(['chevron', 'arrow', 'circle']).default('chevron'),
  slideStyle: z.enum(['default', 'rounded', 'square', 'outline', 'ghost']).default('default'),
}).superRefine((data, ctx) => {
    if (data.selectionType === 'category' && !data.categoryId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A category is required for this selection type.', path: ['categoryId'] });
    }
    if (data.selectionType === 'manual' && (!data.productIds || data.productIds.length === 0)) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one product must be selected for manual mode.', path: ['productIds'] });
    }
    if (data.isFlashSale && (!data.flashSaleDiscountValue || data.flashSaleDiscountValue <= 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Flash sale requires a discount value greater than zero.', path: ['flashSaleDiscountValue'] });
    }
    if (data.isFlashSale && data.flashSaleStartDate && data.flashSaleEndDate && data.flashSaleEndDate < data.flashSaleStartDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Flash sale end date must be after start date.', path: ['flashSaleEndDate'] });
    }
});

type HomepageSectionFormValues = z.infer<typeof homepageSectionSchema>;

interface HomepageSectionFormProps {
    defaultValues?: Partial<HomepageSection>;
    onSubmit: (values: HomepageSectionFormValues) => Promise<void>;
    isSaving: boolean;
}

export function HomepageSectionForm({ defaultValues, onSubmit, isSaving }: HomepageSectionFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const { settings } = useSettings();
    const { store, staffMember } = useAuth();
    const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);
    const currencySymbol = settings?.currency || '$';

    const categoriesQuery = useMemo(() => {
        if (!firestore || !currentStoreId) return null;
        return query(collection(firestore, 'categories'), where('store_id', '==', currentStoreId), orderBy('name'));
    }, [firestore, currentStoreId]);

    const productsQuery = useMemo(() => {
        if (!firestore || !currentStoreId) return null;
        return query(collection(firestore, 'products'), where('store_id', '==', currentStoreId), orderBy('name'));
    }, [firestore, currentStoreId]);

    const { data: categories, isLoading: isLoadingCategories, refetch: refetchCategories } = useCollection<Category>(categoriesQuery);
    const { data: allProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

    const form = useForm<HomepageSectionFormValues>({
        resolver: zodResolver(homepageSectionSchema),
        defaultValues: {
            title: '',
            description: '',
            order: 0,
            published: true,
            layout: 'carousel',
            selectionType: 'category',
            categoryId: '',
            productIds: [],
            alignment: 'left',
            backgroundColor: '#FFFFFF',
            isFlashSale: false,
            flashSaleDiscountType: 'percentage',
            flashSaleDiscountValue: 0,
            flashSaleStartDate: null,
            flashSaleEndDate: null,
            autoScroll: false,
            slideIcon: 'chevron',
            slideStyle: 'default',
        },
    });

    const [isChangeCategoryModalOpen, setIsChangeCategoryModalOpen] = useState(false);
    const [isNewCategoryFormOpen, setIsNewCategoryFormOpen] = useState(false);
    const [isSubmittingNewCategory, setIsSubmittingNewCategory] = useState(false);
    const [categorySearchTerm, setCategorySearchTerm] = useState('');
    
    const [openProductSearch, setOpenProductSearch] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');

    // Paginated category loading state
    const CATEGORY_BATCH_SIZE = 20;
    const [paginatedCategories, setPaginatedCategories] = useState<Category[]>([]);
    const [isLoadingPaginatedCategories, setIsLoadingPaginatedCategories] = useState(false);
    const [isLoadingMoreCategories, setIsLoadingMoreCategories] = useState(false);
    const [hasMoreCategories, setHasMoreCategories] = useState(true);
    const lastCategoryDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const hasMoreCategoriesRef = useRef(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (defaultValues && categories && categories.length > 0) {
            form.reset({
                title: defaultValues.title || '',
                description: defaultValues.description || '',
                order: defaultValues.order ?? 0,
                published: defaultValues.published ?? true,
                layout: (defaultValues.layout as any) || 'carousel',
                selectionType: (defaultValues.selectionType as any) || 'category',
                categoryId: defaultValues.categoryId || '',
                productIds: defaultValues.productIds || [],
                alignment: defaultValues.alignment || 'left',
                backgroundColor: defaultValues.backgroundColor || '#FFFFFF',
                isFlashSale: defaultValues.isFlashSale ?? false,
                flashSaleDiscountType: defaultValues.flashSaleDiscountType || 'percentage',
                flashSaleDiscountValue: defaultValues.flashSaleDiscountValue || 0,
                flashSaleStartDate: convertToDateSafely(defaultValues.flashSaleStartDate),
                flashSaleEndDate: convertToDateSafely(defaultValues.flashSaleEndDate),
                autoScroll: defaultValues.autoScroll ?? false,
                slideIcon: defaultValues.slideIcon || 'chevron',
                slideStyle: defaultValues.slideStyle || 'default',
            });
        }
    }, [defaultValues, categories, form]);

    const selectionType = form.watch('selectionType');
    const selectedProductIds = form.watch('productIds') || [];
    const currentCategoryId = form.watch('categoryId');
    const isFlashSale = form.watch('isFlashSale');

    const productMap = useMemo(() => {
        return new Map(allProducts?.map(p => [p.id, p]));
    }, [allProducts]);

    const filteredCategories = useMemo(() => {
        if (!categories) return [];
        return categories.filter(c => c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()));
    }, [categories, categorySearchTerm]);

    const filteredProductsForSearch = useMemo(() => {
        if (!allProducts) return [];
        const lowercasedTerm = productSearchTerm.toLowerCase();
        return allProducts.filter(p => !selectedProductIds.includes(p.id) && p.name.toLowerCase().includes(lowercasedTerm));
    }, [allProducts, selectedProductIds, productSearchTerm]);

    // Filtered paginated categories based on search term
    const displayedCategories = useMemo(() => {
        if (!categorySearchTerm.trim()) return paginatedCategories;
        return paginatedCategories.filter(c => 
            c.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
        );
    }, [paginatedCategories, categorySearchTerm]);

    // Fetch categories with pagination
    const fetchPaginatedCategories = useCallback(async (isNextPage = false) => {
        if (!firestore || !currentStoreId || (isNextPage && !hasMoreCategoriesRef.current)) return;

        if (isNextPage) {
            setIsLoadingMoreCategories(true);
        } else {
            setIsLoadingPaginatedCategories(true);
            lastCategoryDocRef.current = null;
            hasMoreCategoriesRef.current = true;
        }

        try {
            let q = query(
                collection(firestore, 'categories'),
                where('store_id', '==', currentStoreId),
                orderBy('name', 'asc'),
                limit(CATEGORY_BATCH_SIZE)
            );

            if (isNextPage && lastCategoryDocRef.current) {
                q = query(q, startAfter(lastCategoryDocRef.current));
            }

            const snapshot = await getDocs(q);
            const categoryList = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
            } as Category));

            setPaginatedCategories(prev => isNextPage ? [...prev, ...categoryList] : categoryList);

            const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
            const newHasMore = snapshot.docs.length === CATEGORY_BATCH_SIZE;

            lastCategoryDocRef.current = newLastDoc;
            hasMoreCategoriesRef.current = newHasMore;
            setHasMoreCategories(newHasMore);
        } catch (error) {
            console.error("Error fetching paginated categories:", error);
        } finally {
            setIsLoadingPaginatedCategories(false);
            setIsLoadingMoreCategories(false);
        }
    }, [firestore, currentStoreId, CATEGORY_BATCH_SIZE]);

    // Load categories when modal opens
    useEffect(() => {
        if (isChangeCategoryModalOpen && paginatedCategories.length === 0) {
            fetchPaginatedCategories();
        }
    }, [isChangeCategoryModalOpen, fetchPaginatedCategories, paginatedCategories.length]);

    // Scroll handler for infinite loading
    const handleCategoryScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container || isLoadingMoreCategories || !hasMoreCategories) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        // Load more when scrolled to 80% of content
        if (scrollTop + clientHeight >= scrollHeight * 0.8) {
            fetchPaginatedCategories(true);
        }
    }, [fetchPaginatedCategories, isLoadingMoreCategories, hasMoreCategories]);

    const handleProductSelect = (productId: string) => {
        form.setValue('productIds', [...selectedProductIds, productId], { shouldValidate: true });
        setOpenProductSearch(false);
        setProductSearchTerm('');
    };

    const handleProductDeselect = (productId: string) => {
        form.setValue('productIds', selectedProductIds.filter(id => id !== productId), { shouldValidate: true });
    };

    const handleNewCategorySubmit = async (categoryValues: CategoryFormValues) => {
        if (!firestore || !currentStoreId) return;
        setIsSubmittingNewCategory(true);
        try {
            const docRef = await addDoc(collection(firestore, 'categories'), {
                ...categoryValues,
                store_id: currentStoreId,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            
            toast({ title: "Category Created", description: `"${categoryValues.name}" is now available.` });
            if (refetchCategories) await refetchCategories();
            // Refresh paginated categories list
            setPaginatedCategories([]);
            lastCategoryDocRef.current = null;
            hasMoreCategoriesRef.current = true;
            await fetchPaginatedCategories();
            form.setValue('categoryId', docRef.id, { shouldValidate: true });
            setIsNewCategoryFormOpen(false);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: "Could not create new category." });
        } finally {
            setIsSubmittingNewCategory(false);
        }
    };

    const categorySelectionBody = (
        <div className="space-y-4">
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filter categories..." 
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    className="pl-10 h-11"
                />
            </div>
            <div 
                ref={scrollContainerRef}
                onScroll={handleCategoryScroll}
                className={cn(
                    "h-80 overflow-y-auto border rounded-xl bg-muted/5 p-3",
                    isMobile && "h-[calc(100vh-400px)] min-h-[300px]"
                )}
            >
                {isLoadingPaginatedCategories ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Loading categories...</span>
                    </div>
                ) : displayedCategories.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                        {categorySearchTerm ? 'No categories match your search.' : 'No categories found.'}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {displayedCategories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                className={cn(
                                    "group relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-300 hover:",
                                    currentCategoryId === cat.id 
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                                        : "border-transparent bg-background hover:border-primary/30 hover:bg-muted/50"
                                )}
                                onClick={() => {
                                    form.setValue('categoryId', cat.id, { shouldValidate: true });
                                    setIsChangeCategoryModalOpen(false);
                                    setCategorySearchTerm('');
                                }}
                            >
                                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                                    <Image
                                        src={cat.imageUrl || `https://picsum.photos/seed/${cat.id}/200/200`}
                                        alt={cat.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        sizes="(max-width: 640px) 40vw, 150px"
                                        unoptimized
                                    />
                                    {currentCategoryId === cat.id && (
                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                            <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                                                <Check className="h-4 w-4" strokeWidth={3} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <span className={cn(
                                    "text-xs font-bold text-center line-clamp-2 leading-tight",
                                    currentCategoryId === cat.id ? "text-primary" : "text-foreground"
                                )}>
                                    {cat.name}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                
                {/* Load more indicator */}
                {isLoadingMoreCategories && (
                    <div className="flex items-center justify-center py-4 gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Loading more...</span>
                    </div>
                )}
                
                {/* End of list indicator */}
                {!hasMoreCategories && paginatedCategories.length > 0 && !categorySearchTerm && (
                    <div className="text-center py-3 text-xs text-muted-foreground">
                        All {paginatedCategories.length} categories loaded
                    </div>
                )}
            </div>
        </div>
    );

    const categorySelectionFooter = (
        <div className="flex flex-row justify-between items-center w-full">
            <Button type="button" variant="secondary" onClick={() => { setIsChangeCategoryModalOpen(false); setIsNewCategoryFormOpen(true); setCategorySearchTerm(''); }} className="gap-2">
                <Plus className="h-4 w-4" /> Create New
            </Button>
            {isMobile ? (
                <DrawerClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DrawerClose>
            ) : (
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
            )}
        </div>
    );

    return (
        <>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card className=" border-none ring-1 ring-border">
                    <CardHeader className="bg-muted/30">
                        <CardTitle>Section Configuration</CardTitle>
                        <CardDescription>Define how products are selected and displayed on the homepage.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="title" render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel className="font-bold">Section Title <span className="text-destructive">*</span></FormLabel> 
                                    <FormControl><Input placeholder="e.g., Summer Essentials" {...field} /></FormControl> 
                                    <FormMessage /> 
                                </FormItem> 
                            )}/>
                            <FormField control={form.control} name="description" render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel className="font-bold">Tagline (Optional)</FormLabel> 
                                    <FormControl><Input placeholder="A short catchphrase..." {...field} value={field.value ?? ''} /></FormControl> 
                                    <FormMessage /> 
                                </FormItem> 
                            )}/>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <FormField control={form.control} name="order" render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel className="font-bold">Sort Order</FormLabel> 
                                    <FormControl><Input type="number" {...field} /></FormControl> 
                                    <FormDescription className="text-[10px]">Lower numbers appear first.</FormDescription> 
                                    <FormMessage /> 
                                </FormItem> 
                            )}/>
                            <FormField control={form.control} name="layout" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold">Layout Style</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Select layout" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="carousel"><div className="flex items-center gap-2"><Columns className="h-4 w-4" /> Carousel (Slider)</div></SelectItem>
                                            <SelectItem value="grid"><div className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Grid (Static)</div></SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="alignment" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold">Alignment</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Select alignment" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="left"><div className="flex items-center gap-2"><AlignLeft className="h-4 w-4" /> Left Aligned</div></SelectItem>
                                            <SelectItem value="center"><div className="flex items-center gap-2"><AlignCenter className="h-4 w-4" /> Centered</div></SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="published" render={({ field }) => (
                                <FormItem className="flex flex-col justify-end">
                                    <div className="flex flex-row items-center justify-between rounded-lg border p-2 h-10 bg-muted/20">
                                        <FormLabel className="text-xs font-bold uppercase tracking-widest mr-2">Live</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </div>
                                </FormItem>
                            )}/>
                        </div>

                        {form.watch('layout') === 'carousel' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-dashed">
                                <FormField control={form.control} name="autoScroll" render={({ field }) => (
                                    <FormItem className="flex flex-col justify-end">
                                        <div className="flex flex-row items-center justify-between rounded-lg border p-2 h-10 bg-muted/20">
                                            <FormLabel className="text-xs font-bold uppercase tracking-widest mr-2">Auto Scroll</FormLabel>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </div>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="slideIcon" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Slide Icon</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Select icon" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="chevron">
                                                    <div className="flex items-center gap-2">
                                                        <ChevronRight className="h-4 w-4" />
                                                        <span>Chevron</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="arrow">
                                                    <div className="flex items-center gap-2">
                                                        <ArrowRight className="h-4 w-4" />
                                                        <span>Arrow</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="circle">
                                                    <div className="flex items-center gap-2">
                                                        <CircleArrowRight className="h-4 w-4" />
                                                        <span>Circle</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="slideStyle" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Slide Button Style</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Select style" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="default">
                                                    <div className="flex items-center gap-2">
                                                        <Circle className="h-4 w-4 fill-current" />
                                                        <span>Default (Solid)</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="rounded">
                                                    <div className="flex items-center gap-2">
                                                        <Box className="h-4 w-4 fill-current" />
                                                        <span>Rounded</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="square">
                                                    <div className="flex items-center gap-2">
                                                        <Square className="h-4 w-4 fill-current" />
                                                        <span>Square</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="outline">
                                                    <div className="flex items-center gap-2">
                                                        <CircleDashed className="h-4 w-4" />
                                                        <span>Outline</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="ghost">
                                                    <div className="flex items-center gap-2">
                                                        <MousePointer2 className="h-4 w-4" />
                                                        <span>Ghost</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        )}
                        
                        <FormField
                            control={form.control}
                            name="backgroundColor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold">Section Background Color</FormLabel>
                                    <div className="flex items-center gap-3">
                                        <FormControl>
                                            <Input type="color" {...field} value={field.value || '#FFFFFF'} className="p-1 h-10 w-12 cursor-pointer rounded-md border-muted-foreground/30" />
                                        </FormControl>
                                        <span className="text-sm text-muted-foreground font-mono">{field.value || '#FFFFFF'}</span>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange('#FFFFFF')}>Reset to White</Button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="space-y-6 pt-8 border-t border-dashed">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Target Merchandising</h3>
                            <FormField control={form.control} name="selectionType" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className="font-bold">Selection Strategy</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="category" id="selection-category" />
                                                <Label htmlFor="selection-category" className="font-medium cursor-pointer">Dynamic (Sync with Category)</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="manual" id="selection-manual" />
                                                <Label htmlFor="selection-manual" className="font-medium cursor-pointer">Manual (Curate individual items)</Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}/>

                            {selectionType === 'category' && (
                                <div className="space-y-2 max-w-md">
                                    <FormLabel className="font-bold">Target Category <span className="text-destructive">*</span></FormLabel>
                                    <div className="flex gap-2">
                                        <FormField
                                            control={form.control}
                                            name="categoryId"
                                            render={({ field }) => (
                                                <FormControl>
                                                    <div className="flex gap-2 w-full">
                                                        <Input 
                                                            value={categories?.find(c => c.id === field.value)?.name || 'No Category Selected'} 
                                                            readOnly 
                                                            className="bg-muted font-bold cursor-default" 
                                                        />
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            onClick={() => setIsChangeCategoryModalOpen(true)}
                                                            className="shrink-0"
                                                        >
                                                            {field.value ? 'Change' : 'Select'}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                            )}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">Automatically pulls all visible products from this category.</p>
                                    <FormField control={form.control} name="categoryId" render={() => <FormMessage />} />
                                </div>
                            )}

                            {selectionType === 'manual' && (
                                <div className="space-y-4">
                                    <FormLabel className="font-bold">Hand-Picked Products ({selectedProductIds.length}) <span className="text-destructive">*</span></FormLabel>
                                    <Popover open={openProductSearch} onOpenChange={setOpenProductSearch}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start font-normal text-muted-foreground h-11 border-dashed">
                                                <SearchIcon className="mr-2 h-4 w-4"/>
                                                Search the master catalog to add items...
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                            <Command shouldFilter={false}>
                                                <CommandInput placeholder="Type product name..." value={productSearchTerm} onValueChange={setProductSearchTerm}/>
                                                <CommandList>
                                                    {isLoadingProducts && <div className="p-4 text-sm text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto"/></div>}
                                                    <CommandEmpty>No matching products found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {filteredProductsForSearch.slice(0, 50).map(p => (
                                                            <CommandItem key={p.id} value={p.name} onSelect={() => handleProductSelect(p.id)} className="cursor-pointer">
                                                                {p.name} {p.sku ? `(${p.sku})` : ''}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <div className="bg-muted/10 p-4 rounded-2xl border-2 border-dashed min-h-[120px]">
                                        {selectedProductIds.length === 0 ? (
                                            <p className="text-sm text-center text-muted-foreground pt-8">No products curated yet. Search above to begin.</p>
                                        ) : (
                                            <div className="flex wrap gap-2">
                                                {selectedProductIds.map(id => {
                                                    const product = productMap.get(id);
                                                    return (
                                                        <Badge key={id} variant="secondary" className="pl-3 pr-1 py-1.5 gap-2 text-xs font-bold border ">
                                                            {product?.name || 'Loading...'}
                                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive hover:text-white rounded-full transition-colors" onClick={() => handleProductDeselect(id)}>
                                                                <X className="h-3 w-3"/>
                                                            </Button>
                                                        </Badge>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <FormField control={form.control} name="productIds" render={() => <FormMessage />} />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Flash Sale Card */}
                <Card className={cn(" border-none ring-1 ring-border transition-all", isFlashSale ? "border-rose-500 ring-rose-500/20" : "")}>
                    <CardHeader className={cn("bg-muted/30 transition-colors", isFlashSale ? "bg-rose-500/10" : "")}>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className={cn("h-5 w-5", isFlashSale ? "text-rose-500 fill-current" : "text-muted-foreground")} />
                                    Flash Sale Engine (Promo)
                                </CardTitle>
                                <CardDescription>Turn this section into a high-visibility, section-wide promotional event.</CardDescription>
                            </div>
                            <FormField
                                control={form.control}
                                name="isFlashSale"
                                render={({ field }) => (
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                )}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className={cn("pt-6 space-y-6 transition-opacity", !isFlashSale && "opacity-40 pointer-events-none")}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormField
                                control={form.control}
                                name="flashSaleDiscountType"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Uniform Discount Type</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="percentage" id="fs-perc" />
                                                    <Label htmlFor="fs-perc" className="font-bold cursor-pointer text-sm">Percentage (%)</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="fixed" id="fs-fix" />
                                                    <Label htmlFor="fs-fix" className="font-bold cursor-pointer text-sm">Fixed Amount ({currencySymbol})</Label>
                                                </div>
                                            </RadioGroup>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="flashSaleDiscountValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Discount Value</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-500" />
                                                <Input type="number" step="0.01" {...field} className="pl-10 h-12 text-xl font-black border-rose-200 focus-visible:ring-rose-500" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Scheduling Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-dashed">
                            <FormField
                                control={form.control}
                                name="flashSaleStartDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="font-black text-xs uppercase tracking-widest text-primary mb-2">Promotion Start (Optional)</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal h-11",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? format(field.value, "PPP p") : <span>Start Immediately</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value || undefined}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date < new Date("1900-01-01")}
                                                    initialFocus
                                                />
                                                <div className="p-3 border-t border-dashed flex justify-between gap-2">
                                                    <Input 
                                                        type="time" 
                                                        className="h-8 text-xs" 
                                                        onChange={(e) => {
                                                            if (!field.value) return;
                                                            const [hours, minutes] = e.target.value.split(':');
                                                            const newDate = new Date(field.value);
                                                            newDate.setHours(parseInt(hours), parseInt(minutes));
                                                            field.onChange(newDate);
                                                        }}
                                                    />
                                                    <Button variant="ghost" size="sm" onClick={() => field.onChange(null)} className="h-8 text-[10px] font-black uppercase">Clear</Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <FormDescription className="text-[10px]">When the flash sale banner should appear.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="flashSaleEndDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="font-black text-xs uppercase tracking-widest text-primary mb-2">Promotion End (Optional)</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal h-11",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? format(field.value, "PPP p") : <span>No End Date</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value || undefined}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => {
                                                        const start = form.getValues('flashSaleStartDate');
                                                        return date < (start || new Date("1900-01-01"));
                                                    }}
                                                    initialFocus
                                                />
                                                <div className="p-3 border-t border-dashed flex justify-between gap-2">
                                                    <Input 
                                                        type="time" 
                                                        className="h-8 text-xs" 
                                                        onChange={(e) => {
                                                            if (!field.value) return;
                                                            const [hours, minutes] = e.target.value.split(':');
                                                            const newDate = new Date(field.value);
                                                            newDate.setHours(parseInt(hours), parseInt(minutes));
                                                            field.onChange(newDate);
                                                        }}
                                                    />
                                                    <Button variant="ghost" size="sm" onClick={() => field.onChange(null)} className="h-8 text-[10px] font-black uppercase">Clear</Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <FormDescription className="text-[10px]">When the sale automatically deactivates.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-4 items-start">
                            <div className="bg-rose-500 p-2 rounded-full text-white">
                                <Info className="h-4 w-4" />
                            </div>
                            <div className="text-xs space-y-1">
                                <p className="font-black text-rose-700 uppercase tracking-wider">Automated Scheduling</p>
                                <p className="text-rose-600/80 leading-relaxed font-medium">
                                    Setting dates allows the system to autonomously toggle the "Splas Sale" effects. If dates are omitted, the promotion will remain live as long as the "Flash Sale Engine" switch is ON.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="submit" disabled={isSaving} size="lg" className="min-w-[200px] h-14 text-lg font-black  shadow-primary/20">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? 'Syncing...' : 'Save Configuration'}
                    </Button>
                </div>
            </form>
        </Form>

        {/* Category Selection Modal */}
        <Drawer open={isChangeCategoryModalOpen} onOpenChange={(open) => {
            setIsChangeCategoryModalOpen(open);
            if (!open) setCategorySearchTerm('');
        }} dismissible={true}>
            <DrawerContent className="flex flex-col h-screen w-screen overflow-hidden border-none rounded-none">
                <div 
                    className="w-full flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none hover:bg-muted/20 transition-colors shrink-0"
                    data-vaul-drag-handle
                >
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                <div className="flex justify-end px-6 py-2 shrink-0">
                    <DrawerClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </DrawerClose>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <DrawerHeader className="px-8 pb-4 text-left shrink-0">
                        <DrawerTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5"/> Select Target Category</DrawerTitle>
                        <DrawerDescription className="text-base text-left">
                            Search and pick a category to feature in this homepage section.
                        </DrawerDescription>
                    </DrawerHeader>
                    
                    <div className="flex-1 overflow-y-auto px-8 py-2">
                       {categorySelectionBody}
                    </div>

                    <DrawerFooter className="flex flex-row justify-between items-center border-t p-8 bg-muted/10 shrink-0 mt-auto">
                      {categorySelectionFooter}
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>

        <Drawer open={isNewCategoryFormOpen} onOpenChange={setIsNewCategoryFormOpen} dismissible={true}>
            <DrawerContent className="flex flex-col h-screen w-screen overflow-hidden border-none rounded-none">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Create New Category</DrawerTitle>
                    <DrawerDescription>Add a new collection to organize your products.</DrawerDescription>
                </DrawerHeader>
                <div 
                    className="w-full flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none hover:bg-muted/20 transition-colors shrink-0"
                    data-vaul-drag-handle
                >
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                <div className="flex justify-end px-6 py-2 shrink-0">
                    <DrawerClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </DrawerClose>
                </div>

                <div className="flex-1 overflow-hidden">
                    <CategoryForm 
                        onSubmit={handleNewCategorySubmit}
                        isSubmitting={isSubmittingNewCategory}
                        onCancel={() => { setIsNewCategoryFormOpen(false); setIsChangeCategoryModalOpen(true); }}
                        isModal={true}
                    />
                </div>
            </DrawerContent>
        </Drawer>
        </>
    );
}
