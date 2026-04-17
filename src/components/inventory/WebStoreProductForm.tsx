
'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection } from '@/firebase';
import { useSettings } from '@/contexts/settings-context';
import { useAuth } from '@/contexts/auth-context';
import { collection, addDoc, Timestamp, query, where, orderBy, doc, writeBatch, serverTimestamp, limit, startAfter, getDocs, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Globe, 
  Sparkles, 
  Loader2, 
  Save, 
  Zap,
  Info,
  Store,
  MonitorSmartphone,
  PlusCircle,
  SlidersHorizontal,
  Search as SearchIcon,
  Check, 
  ListPlus,
  Trash2,
  GripVertical,
  Type,
  Lock,
  LockKeyholeOpen,
  Package,
  Layers,
  Maximize,
  Upload,
  X,
  Plus,
  Truck,
  ShieldCheck,
  Award,
  Clock,
  CreditCard,
  BookOpen,
  FileText,
  History,
  Video,
  TrendingUp,
  Tag,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Volume2,
  ListChecks,
  Star
} from 'lucide-react';
import { Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { generateMarketingContent } from '@/ai/flows/product-marketing-flow';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import type { Category, Product, ProductVideo } from '@/lib/types';
import { CategoryForm, type CategoryFormValues } from '@/components/inventory/CategoryForm';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, convertToDateSafely } from '@/lib/utils';
import { ProductImageGallery } from '@/components/inventory/ProductImageGallery';
import { StoreMerchandisingSettings } from '@/components/inventory/StoreMerchandisingSettings';
import { AdvancedVideoManager } from './AdvancedVideoManager';
import { ProductVoiceRecorder } from './ProductVoiceRecorder';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const badgeIcons = [
  { name: 'Truck', icon: Truck },
  { name: 'ShieldCheck', icon: ShieldCheck },
  { name: 'Zap', icon: Zap },
  { name: 'Clock', icon: Clock },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Award', icon: Award },
];

const sectionIcons = [
  { name: 'BookOpen', icon: BookOpen },
  { name: 'FileText', icon: FileText },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Info', icon: Info },
  { name: 'History', icon: History },
  { name: 'Package', icon: Package },
];

const storeProductSchema = z.object({
  name: z.string().min(3, 'Product name is required.'),
  categoryId: z.string().min(1, 'Please select a category.'),
  sellingPrice: z.coerce.number().min(0.01, 'Price must be greater than 0.'),
  newPrice: z.coerce.number().min(0.01, 'Discount price must be greater than 0.').optional().nullable(),
  purchasePrice: z.coerce.number().min(0, 'Cost price cannot be negative.'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.'),
  sku: z.string().optional().or(z.literal('')),
  descriptionTitle: z.string().optional().or(z.literal('')),
  descriptionIcon: z.string().default('BookOpen'),
  description: z.string().optional().or(z.literal('')),
  imageUrl: z.string().url('Must be a valid image URL.').optional().or(z.literal('')),
  additionalImageUrls: z.array(z.string().url()).optional().default([]),
  dataAiHint: z.string().optional().or(z.literal('')),
  audioDataUri: z.string().optional().or(z.literal('')),
  voiceEnabled: z.boolean().default(false),
  voiceSignatures: z.array(z.object({
      id: z.string(),
      audioDataUri: z.string(),
      title: z.string(),
      isVisible: z.boolean()
  })).optional().default([]),
  videoUrl: z.string().optional().or(z.literal('')),
  videoPosterUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  videoEnabled: z.boolean().default(false),
  videos: z.array(z.object({
      type: z.enum(['direct', 'youtube', 'facebook', 'tiktok']),
      url: z.string().min(1, 'Media reference is required'),
      title: z.string().optional().or(z.literal(''))
  })).optional().default([]),
  videosTitle: z.string().optional().or(z.literal('')),
  videosDescription: z.string().optional().or(z.literal('')),
  isVisibleOnWeb: z.boolean().default(true),
  isVisibleInPOS: z.boolean().default(true),
  isNewArrival: z.boolean().default(false),
  isPopular: false,
  isOldStock: z.boolean().default(false),
  showProductInsight: z.boolean().default(false),
  isOfficialBrand: z.boolean().default(false),
  lowStockThreshold: z.coerce.number().int().min(0).optional().nullable(),
  isPromo: z.boolean().default(false),
  promoType: z.enum(['percentage', 'fixed']).default('percentage'),
  promoValue: z.coerce.number().min(0).optional(),
  promoStartDate: z.date().optional().nullable(),
  promoEndDate: z.date().optional().nullable(),
  specificationsTitle: z.string().optional().or(z.literal('')),
  specifications: z.array(z.object({
    label: z.string().min(1, 'Label is required'),
    value: z.string().min(1, 'Value is required'),
  })).optional().default([]),
  whatsInTheBoxTitle: z.string().optional().or(z.literal('')),
  whatsInTheBox: z.array(z.object({
    name: z.string().min(1, 'Item name is required'),
  })).optional().default([]),
  variationsTitle: z.string().optional().or(z.literal('')),
  variations: z.array(z.object({
    name: z.string().min(1, 'Variation name is required'),
  })).optional().default([]),
  sizeGuideImageUrl: z.string().url('Must be a valid image URL.').optional().or(z.literal('')),
  badge1Enabled: z.boolean().default(true),
  badge1Icon: z.string().default('Truck'),
  badge1Title: z.string().default('Free Express'),
  badge1Sub: z.string().default('Fulfillment'),
  badge2Enabled: z.boolean().default(true),
  badge2Icon: z.string().default('ShieldCheck'),
  badge2Title: z.string().default('2-Year Warranty'),
  badge2Sub: z.string().default('Protection'),
  showTechnicalSpecs: z.boolean().default(true),
  showLogisticsInfo: z.boolean().default(true),
  showVerifiedReviews: z.boolean().default(true),
  rewardAdsEnabled: z.boolean().default(false),
}).refine(data => !data.isPromo || (!!data.promoType && !!data.promoValue && data.promoValue > 0), {
    message: 'Promo value is required and must be positive when active.',
    path: ['promoValue']
}).refine(data => !data.newPrice || data.newPrice < data.sellingPrice, {
    message: 'New price must be less than the original selling price.',
    path: ['newPrice']
});

type FormValues = z.infer<typeof storeProductSchema>;

export function WebStoreProductForm() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, store, staffMember } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { settings } = useSettings();
  
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isChangeCategoryModalOpen, setIsChangeCategoryModalOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [isSpecsTitleLocked, setIsSpecsTitleLocked] = useState(true);
  const [isBoxTitleLocked, setIsBoxTitleLocked] = useState(true);
  const [isVariationsTitleLocked, setIsVariationsTitleLocked] = useState(true);
  const [isDescriptionTitleLocked, setIsDescriptionTitleLocked] = useState(true);
  const [isVideosTitleLocked, setIsVideosTitleLocked] = useState(true);
  const [isUploadingSizeGuide, setIsUploadingSizeGuide] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Paginated category loading state
  const CATEGORY_BATCH_SIZE = 20;
  const [paginatedCategories, setPaginatedCategories] = useState<Category[]>([]);
  const [isLoadingPaginatedCategories, setIsLoadingPaginatedCategories] = useState(false);
  const [isLoadingMoreCategories, setIsLoadingMoreCategories] = useState(false);
  const [hasMoreCategories, setHasMoreCategories] = useState(true);
  const lastCategoryDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const hasMoreCategoriesRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currencySymbol = settings?.currency || '$';

  // Fetch Categories
  const categoriesQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(collection(firestore, 'categories'), where('store_id', '==', currentStoreId), orderBy('name'));
  }, [firestore, currentStoreId]);
  const { data: categories, refetch: refetchCategories } = useCollection<Category>(categoriesQuery);

  const filteredCategories = useMemo(() => {
    return (categories || []).filter(c => c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()));
  }, [categories, categorySearchTerm]);

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
  }, [firestore, CATEGORY_BATCH_SIZE, currentStoreId]);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(storeProductSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      sellingPrice: 0,
      newPrice: null,
      purchasePrice: 0,
      stock: 0,
      sku: '',
      descriptionTitle: 'Product Story',
      descriptionIcon: 'BookOpen',
      description: '',
      imageUrl: '',
      additionalImageUrls: [],
      dataAiHint: '',
      audioDataUri: '',
      voiceEnabled: false,
      voiceSignatures: [],
      videoUrl: '',
      videoPosterUrl: '',
      videoEnabled: false,
      videos: [],
      videosTitle: 'Multimedia Showcase',
      videosDescription: 'Cinematic product insights & social proof',
      isVisibleOnWeb: true,
      isVisibleInPOS: true,
      isNewArrival: false,
      isPopular: false,
      isOldStock: false,
      showProductInsight: false,
      isOfficialBrand: false,
      lowStockThreshold: null,
      isPromo: false,
      promoType: 'percentage',
      promoValue: 0,
      promoStartDate: null,
      promoEndDate: null,
      specificationsTitle: 'Key Features & Specifications',
      specifications: [],
      whatsInTheBoxTitle: 'What’s In The Box',
      whatsInTheBox: [],
      variationsTitle: 'Variations Available',
      variations: [],
      sizeGuideImageUrl: '',
      badge1Enabled: true,
      badge1Icon: 'Truck',
      badge1Title: 'Free Express',
      badge1Sub: 'Fulfillment',
      badge2Enabled: true,
      badge2Icon: 'ShieldCheck',
      badge2Title: '2-Year Warranty',
      badge2Sub: 'Protection',
      showTechnicalSpecs: true,
      showLogisticsInfo: true,
      showVerifiedReviews: true,
      rewardAdsEnabled: false,
    }
  });

  const { fields: specFields, append: appendSpec, remove: removeSpec, move: moveSpec } = useFieldArray({
    control: form.control,
    name: "specifications"
  });

  const { fields: boxFields, append: appendBoxItem, remove: removeBoxItem, move: moveBoxItem } = useFieldArray({
    control: form.control,
    name: "whatsInTheBox"
  });

  const { fields: variationFields, append: appendVariation, remove: removeVariation, move: moveVariation } = useFieldArray({
    control: form.control,
    name: "variations"
  });

  const watchImageUrl = form.watch('imageUrl');
  const watchAdditionalUrls = form.watch('additionalImageUrls') || [];
  const watchName = form.watch('name');
  const watchCategory = form.watch('categoryId');
  const watchVideoEnabled = form.watch('videoEnabled');
  const watchVoiceEnabled = form.watch('voiceEnabled');
  const watchVideoPoster = form.watch('videoPosterUrl');

  const handleAiAssist = async () => {
    if (!watchName || !watchCategory) {
      toast({ variant: "destructive", title: "Missing Info", description: "Please enter a product name and category first." });
      return;
    }

    setIsAiGenerating(true);
    try {
      const categoryName = categories?.find(c => c.id === watchCategory)?.name || 'General';
      const result = await generateMarketingContent({ name: watchName, categoryName });
      
      form.setValue('description', result.description, { shouldValidate: true });
      form.setValue('dataAiHint', result.aiHint, { shouldValidate: true });
      
      toast({ title: "AI Copy Generated", description: "Marketing content has been populated." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Error", description: error.message });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'videoPosterUrl') => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { 
      toast({ variant: "destructive", title: "File too large", description: "Image must be smaller than 2MB." });
      return;
    }
    if (field === 'videoPosterUrl') setIsUploadingPoster(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue(field, result.display_url, { shouldValidate: true });
        toast({ title: "Asset Uploaded", description: "Product video poster updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
      } finally {
        setIsUploadingPoster(false);
      }
    };
  };

  const handleSizeGuideUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({ variant: "destructive", title: "File too large", description: "Size guide image must be smaller than 2MB." });
      return;
    }
    setIsUploadingSizeGuide(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('sizeGuideImageUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Size Guide Uploaded", description: "Your sizing chart has been saved." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload size guide." });
      } finally {
        setIsUploadingSizeGuide(false);
      }
    };
  };

  const handleCreateCategory = async (values: CategoryFormValues) => {
    if (!firestore || !currentStoreId) return;
    setIsSubmittingCategory(true);
    try {
        const docRef = await addDoc(collection(firestore, 'categories'), {
            ...values,
            store_id: currentStoreId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        toast({ title: "Category Created", description: `"${values.name}" is now available.` });
        if (refetchCategories) await refetchCategories();
        // Refresh paginated categories list
        setPaginatedCategories([]);
        lastCategoryDocRef.current = null;
        hasMoreCategoriesRef.current = true;
        await fetchPaginatedCategories();
        form.setValue('categoryId', docRef.id, { shouldValidate: true });
        setIsCategoryModalOpen(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
        setIsSubmittingCategory(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !user || !currentStoreId) return;
    setIsSaving(true);
    try {
      const { isPromo, promoType, promoValue, promoStartDate, promoEndDate, voiceSignatures, ...rest } = values;
      
      const productData: any = {
        ...rest,
        store_id: currentStoreId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        promo: null,
        allowPriceModification: true,
        barcodeGenerated: false,
      };

      if (isPromo && promoType && promoValue !== undefined) {
        productData.promo = {
          type: promoType,
          value: promoValue,
          startDate: promoStartDate ? Timestamp.fromDate(promoStartDate) : null as any,
          endDate: promoEndDate ? Timestamp.fromDate(promoEndDate) : null as any,
          isActive: true, 
        };
      }

      const batch = writeBatch(firestore);
      const productsCol = collection(firestore, 'products');
      const productRef = doc(productsCol);
      batch.set(productRef, productData);

      // --- LOG INITIAL STOCK AUDIT ---
      if (values.stock > 0) {
          const auditRef = doc(collection(firestore, 'stockAudit'));
          batch.set(auditRef, {
              productId: productRef.id,
              productName: values.name,
              type: 'ADJUSTMENT',
              referenceId: 'INITIAL-' + productRef.id.substring(0, 8).toUpperCase(),
              beforeStock: 0,
              afterStock: values.stock,
              change: values.stock,
              staffId: user.uid,
              staffName: user.displayName || user.email || 'Staff',
              timestamp: serverTimestamp(),
              store_id: currentStoreId
          });
      }

      // Distributed Parts Logic
      if (voiceSignatures && voiceSignatures.length > 0) {
          voiceSignatures.forEach(voice => {
              const voiceRef = doc(firestore, 'products', productRef.id, 'voiceSignatures', voice.id);
              batch.set(voiceRef, voice);
          });
      }

      await batch.commit()
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: productsCol.path,
            operation: 'create',
            requestResourceData: productData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
          throw serverError;
        });
      
      toast({ title: "Product Published", description: `"${values.name}" and distributed assets are live.` });
      router.push('/dashboard/inventory');
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Save Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const currentCategoryName = useMemo(() => {
    return categories?.find(c => c.id === watchCategory)?.name || 'Select Category...';
  }, [categories, watchCategory]);

  const categorySelectionBody = (
    <div className="space-y-6">
      <div className="relative group">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <Input
          placeholder="Search categories (e.g. Shoes, Luxury...)"
          value={categorySearchTerm}
          onChange={(e) => setCategorySearchTerm(e.target.value)}
          className="pl-12 h-14 bg-muted/40 border-primary/10 focus:border-primary/30 rounded-2xl  text-base transition-all"
        />
      </div>
      <div
        ref={scrollContainerRef}
        onScroll={handleCategoryScroll}
        className={cn(
          "h-80 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20",
          isMobile && "h-[calc(100vh-400px)] min-h-[300px]"
        )}
      >
        {isLoadingPaginatedCategories ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <Loader2 className="h-10 w-10 animate-spin text-primary absolute inset-0 [animation-delay:-0.3s]" />
            </div>
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Scanning Catalog...</span>
          </div>
        ) : displayedCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/5 rounded-3xl border-2 border-dashed">
            <SearchIcon className="h-12 w-12 text-muted-foreground/20" />
            <div className="space-y-1">
              <p className="font-bold text-muted-foreground">No matches found</p>
              <p className="text-xs text-muted-foreground/60 max-w-[200px]">Try a different search term or create a new category.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pb-4">
            {displayedCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={cn(
                  "group relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 hover:",
                  form.watch('categoryId') === cat.id
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                    : "border-muted-foreground/10 bg-background hover:border-primary/30 hover:bg-primary/5"
                )}
                onClick={() => {
                  form.setValue('categoryId', cat.id, { shouldValidate: true });
                  setIsChangeCategoryModalOpen(false);
                  setCategorySearchTerm('');
                }}
              >
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-muted mb-3 shadow-inner">
                  <Image
                    src={cat.imageUrl || `https://picsum.photos/seed/${cat.id}/200/200`}
                    alt={cat.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 640px) 40vw, 150px"
                    unoptimized
                  />
                  {form.watch('categoryId') === cat.id && (
                    <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                      <div className="bg-white text-primary rounded-full p-2  scale-110">
                        <Check className="h-5 w-5" strokeWidth={4} />
                      </div>
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-black text-center line-clamp-2 leading-tight uppercase tracking-wider",
                  form.watch('categoryId') === cat.id ? "text-primary" : "text-foreground"
                )}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Load more indicator */}
        {isLoadingMoreCategories && (
          <div className="flex items-center justify-center py-6 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs font-black text-muted-foreground uppercase tracking-tighter">Loading more collections...</span>
          </div>
        )}

        {/* End of list indicator */}
        {!hasMoreCategories && paginatedCategories.length > 0 && !categorySearchTerm && (
          <div className="flex items-center justify-center gap-2 py-6">
            <div className="h-px w-8 bg-muted" />
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">
              End of Catalog ({paginatedCategories.length})
            </div>
            <div className="h-px w-8 bg-muted" />
          </div>
        )}
      </div>
    </div>
  );

  const categorySelectionFooter = (
    <div className="flex flex-row justify-between items-center w-full">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium italic">
        <Info className="h-4 w-4 text-primary opacity-50" />
        <span className="hidden sm:inline">Missing a category?</span>
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsChangeCategoryModalOpen(false);
            setIsCategoryModalOpen(true);
            setCategorySearchTerm('');
          }}
          className="gap-2 border-primary/20 text-primary hover:bg-primary/5 font-bold rounded-xl h-11"
        >
          <PlusCircle className="h-4 w-4" /> Create New
        </Button>
        {isMobile ? (
          <DrawerClose asChild>
            <Button type="button" variant="ghost" className="font-bold h-11 rounded-xl">Cancel</Button>
          </DrawerClose>
        ) : (
          <DialogClose asChild>
            <Button type="button" variant="ghost" className="font-bold h-11 rounded-xl">Cancel</Button>
          </DialogClose>
        )}
      </div>
    </div>
  );

  return (
    <>
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-primary/5 border border-primary/10 p-3 rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-primary animate-in fade-in slide-in-from-top-2">
            <Info className="h-4 w-4" />
            Note: Fields marked with an asterisk (*) are mandatory for catalog integrity.
          </div>

          <Card className=" border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
              <CardTitle>Core Information</CardTitle>
              <CardDescription>Fundamental details for your web catalog.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Display Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="e.g., Artisan Silk Scarf" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel className="font-bold text-gray-700">Categorization <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                      <div className="flex gap-2 w-full">
                      <Input 
                          value={currentCategoryName} 
                          readOnly 
                          className="bg-muted font-bold cursor-default border-primary/20" 
                      />
                      <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsChangeCategoryModalOpen(true)}
                          className="shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                      >
                          <SlidersHorizontal className="h-4 w-4 mr-2" />
                          Select
                      </Button>
                      </div>
                  </FormControl>
                  <FormMessage />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Original Price <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-green-600">New Price (Discount)</FormLabel>
                      <FormControl><Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : Number(val));
                        }}
                        placeholder="Optional"
                      /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground">Internal Cost <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Initial Stock <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-dashed">
                <div className="flex justify-between items-center">
                  <div className="flex-1 mr-4">
                    <FormField
                        control={form.control}
                        name="descriptionTitle"
                        render={({ field }) => (
                        <FormItem className="space-y-1">
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Type className="h-3 w-3" /> Section Display Heading
                            </FormLabel>
                            <div className="flex items-center gap-3">
                            <FormControl>
                                <Input 
                                {...field} 
                                value={field.value || ''} 
                                disabled={isDescriptionTitleLocked}
                                className={cn(
                                    "font-bold text-xl bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity",
                                    isDescriptionTitleLocked ? "opacity-50" : "opacity-100"
                                )}
                                placeholder="Product Story"
                                />
                            </FormControl>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className={cn(
                                "h-8 w-8 rounded-full",
                                isDescriptionTitleLocked ? "text-muted-foreground" : "text-primary bg-primary/10"
                                )}
                                onClick={() => setIsDescriptionTitleLocked(!isDescriptionTitleLocked)}
                            >
                                {isDescriptionTitleLocked ? <Lock className="h-4 w-4" /> : <LockKeyholeOpen className="h-4 w-4" />}
                            </Button>
                            </div>
                        </FormItem>
                        )}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <FormField
                        control={form.control}
                        name="descriptionIcon"
                        render={({ field }) => (
                            <FormItem className="w-32">
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {sectionIcons.map(item => (
                                            <SelectItem key={item.name} value={item.name}>
                                                <div className="flex items-center gap-2"><item.icon className="h-3 w-3" /> {item.name}</div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold gap-2"
                        onClick={handleAiAssist}
                        disabled={isAiGenerating}
                    >
                        {isAiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                        Smart Assist
                    </Button>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RichTextEditor 
                          value={field.value || ''} 
                          onChange={field.onChange} 
                          placeholder="Describe your product elegantly with bold text, colors, and more..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className=" border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
              <CardTitle>Visuals & Assets</CardTitle>
              <CardDescription>Control how the product appears visually across the web.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <ProductImageGallery 
                primaryUrl={watchImageUrl}
                additionalUrls={watchAdditionalUrls}
                onPrimaryChange={(url) => form.setValue('imageUrl', url)}
                onAdditionalChange={(urls) => form.setValue('additionalImageUrls', urls)}
                disabled={isSaving}
              />

              <Separator className="border-dashed" />

              <FormField
                control={form.control}
                name="dataAiHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Image AI Hint</FormLabel>
                    <FormControl><Input placeholder="e.g., luxury watch, silk textile detail" {...field} value={field.value || ''}/></FormControl>
                    <FormDescription className="text-xs">Used to suggest relevant stock photos if the Hero image fails to load.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Voice Signature Experience Card */}
          <Card className={cn(" border-none ring-1 ring-border transition-all", !watchVoiceEnabled && "opacity-60")}>
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Volume2 className="h-5 w-5 text-primary" /> Voice Signature Hub
                    </CardTitle>
                    <CardDescription>Add expert audio pitches to this product.</CardDescription>
                </div>
                <FormField
                    control={form.control}
                    name="voiceEnabled"
                    render={({ field }) => (
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    )}
                />
              </div>
            </CardHeader>
            <CardContent className={cn("pt-6 transition-opacity", !watchVoiceEnabled && "opacity-40 pointer-events-none")}>
                <ProductVoiceRecorder />
            </CardContent>
          </Card>

          {/* Video Experience Section */}
          <Card className=" border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
              <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" /> Product Video Experience
                    </CardTitle>
                    <CardDescription>Add a primary auto-playing showcase video.</CardDescription>
                </div>
                <FormField
                    control={form.control}
                    name="videoEnabled"
                    render={({ field }) => (
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    )}
                />
              </div>
            </CardHeader>
            <CardContent className={cn("pt-6 space-y-6 transition-opacity", !watchVideoEnabled && "opacity-40 pointer-events-none")}>
                <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold">Primary Video URL (Direct MP4)</FormLabel>
                            <FormControl><Input placeholder="https://example.com/product-video.mp4" {...field} value={field.value || ''} /></FormControl>
                            <FormDescription className="text-xs">Direct link used for the main gallery auto-play experience.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="videoPosterUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold">Video Poster Image</FormLabel>
                            <div className="flex items-start gap-4">
                                {watchVideoPoster && (
                                    <div className="relative w-32 h-20 rounded-xl overflow-hidden border shrink-0">
                                        <Image src={watchVideoPoster} alt="Video poster" fill className="object-cover" unoptimized />
                                    </div>
                                )}
                                <div className="flex-grow space-y-3">
                                    <FormControl><Input placeholder="https://example.com/poster.jpg" {...field} value={field.value || ''} disabled={isSaving || isUploadingPoster} /></FormControl>
                                    <div className="flex items-center gap-3">
                                        <Button asChild variant="outline" size="sm" disabled={isSaving || isUploadingPoster}>
                                            <label htmlFor="poster-image-upload" className="cursor-pointer">
                                                {isUploadingPoster ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <Upload className="h-3 w-3 mr-2" />}
                                                Upload Poster
                                            </label>
                                        </Button>
                                        <input id="poster-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'videoPosterUrl')} disabled={isSaving || isUploadingPoster} />
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase">Recommended: 1200x800px</p>
                                    </div>
                                </div>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
          </Card>

          {/* Social Media & Gallery Multi-Video Section */}
          <Card className=" border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
                <div className="flex justify-between items-center">
                    <div className="flex-1 mr-4">
                        <FormField
                            control={form.control}
                            name="videosTitle"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Type className="h-3 w-3" /> Section Display Heading
                                </FormLabel>
                                <div className="flex items-center gap-3">
                                <FormControl>
                                    <Input 
                                    {...field} 
                                    value={field.value || ''} 
                                    disabled={isVideosTitleLocked}
                                    className={cn(
                                        "font-bold text-xl bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity",
                                        isVideosTitleLocked ? "opacity-50" : "opacity-100"
                                    )}
                                    placeholder="Multimedia Showcase"
                                    />
                                </FormControl>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className={cn(
                                    "h-8 w-8 rounded-full",
                                    isVideosTitleLocked ? "text-muted-foreground" : "text-primary bg-primary/10"
                                    )}
                                    onClick={() => setIsVideosTitleLocked(!isVideosTitleLocked)}
                                >
                                    {isVideosTitleLocked ? <Lock className="h-4 w-4" /> : <LockKeyholeOpen className="h-4 w-4" />}
                                </Button>
                                </div>
                            </FormItem>
                            )}
                        />
                    </div>
                    <div className="shrink-0">
                        <FormField
                            control={form.control}
                            name="videosDescription"
                            render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subtitle / Tagline</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value || ''} placeholder="Cinematic product insights & social proof" className="h-8 text-xs w-64" />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <AdvancedVideoManager />
            </CardContent>
          </Card>

          {/* Trust Badges Section */}
          <Card className=" border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
              <CardTitle>Trust & Service Badges</CardTitle>
              <CardDescription>Customize the trust indicators shown on the product detail page.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Badge 1 */}
                <div className="space-y-4 p-4 border rounded-2xl bg-muted/10">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm uppercase tracking-wider">Service Badge 1</h4>
                    <FormField
                      control={form.control}
                      name="badge1Enabled"
                      render={({ field }) => <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>}
                    />
                  </div>
                  <div className={cn("space-y-4 transition-opacity", !form.watch('badge1Enabled') && "opacity-40 pointer-events-none")}>
                    <FormField
                      control={form.control}
                      name="badge1Icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Icon</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {badgeIcons.map(item => (
                                <SelectItem key={item.name} value={item.name}>
                                  <div className="flex items-center gap-2"><item.icon className="h-4 w-4" /> {item.name}</div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="badge1Title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Main Title</FormLabel>
                          <FormControl><Input placeholder="Free Express" {...field} value={field.value || ''}/></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="badge1Sub"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Subtitle</FormLabel>
                          <FormControl><Input placeholder="Fulfillment" {...field} value={field.value || ''}/></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Badge 2 */}
                <div className="space-y-4 p-4 border rounded-2xl bg-muted/10">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm uppercase tracking-wider">Service Badge 2</h4>
                    <FormField
                      control={form.control}
                      name="badge2Enabled"
                      render={({ field }) => <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>}
                    />
                  </div>
                  <div className={cn("space-y-4 transition-opacity", !form.watch('badge2Enabled') && "opacity-40 pointer-events-none")}>
                    <FormField
                      control={form.control}
                      name="badge2Icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Icon</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {badgeIcons.map(item => (
                                <SelectItem key={item.name} value={item.name}>
                                  <div className="flex items-center gap-2"><item.icon className="h-4 w-4" /> {item.name}</div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="badge2Title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Main Title</FormLabel>
                          <FormControl><Input placeholder="2-Year Warranty" {...field} value={field.value || ''}/></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="badge2Sub"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Subtitle</FormLabel>
                          <FormControl><Input placeholder="Protection" {...field} value={field.value || ''}/></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Features Section */}
          <Card className=" border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
              <div className="flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <FormField
                    control={form.control}
                    name="specificationsTitle"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <Type className="h-3 w-3" /> Section Display Heading
                        </FormLabel>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              disabled={isSpecsTitleLocked}
                              className={cn(
                                "font-bold text-xl bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity",
                                isSpecsTitleLocked ? "opacity-50" : "opacity-100"
                              )}
                              placeholder="Key Features & Specifications"
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                              "h-8 w-8 rounded-full",
                              isSpecsTitleLocked ? "text-muted-foreground" : "text-primary bg-primary/10"
                            )}
                            onClick={() => setIsSpecsTitleLocked(!isSpecsTitleLocked)}
                            title={isSpecsTitleLocked ? "Unlock to edit heading" : "Lock heading"}
                          >
                            {isSpecsTitleLocked ? <Lock className="h-4 w-4" /> : <LockKeyholeOpen className="h-4 w-4" />}
                          </Button>
                        </div>
                        <FormDescription className="text-[10px]">Customize the heading shown on the storefront.</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 border-primary/30 text-primary"
                  onClick={() => appendSpec({ label: '', value: '' })}
                >
                  <PlusCircle className="h-4 w-4" /> Add Specification
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {specFields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/10">
                    <ListPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-medium text-muted-foreground">No specifications added yet.</p>
                    <Button 
                      type="button" 
                      variant="link" 
                      onClick={() => appendSpec({ label: '', value: '' })}
                      className="mt-2"
                    >
                      Click here to add the first one
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {specFields.map((field, index) => (
                      <div key={field.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
                        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 pt-1 text-muted-foreground">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 p-0 hover:text-primary disabled:opacity-30"
                                onClick={() => moveSpec(index, index - 1)}
                                disabled={index === 0}
                            >
                                <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <GripVertical className="h-4 w-4 opacity-30" />
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 p-0 hover:text-primary disabled:opacity-30"
                                onClick={() => moveSpec(index, index + 1)}
                                disabled={index === specFields.length - 1}
                            >
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`specifications.${index}.label`}
                            render={({ field: subField }) => (
                              <FormItem className="space-y-1">
                                <FormControl><Input placeholder="Label (e.g. Battery Life)" {...subField} className="h-10 text-sm" /></FormControl>
                                <FormMessage className="text-[10px]" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`specifications.${index}.value`}
                            render={({ field: subField }) => (
                              <FormItem className="space-y-1">
                                <FormControl><Input placeholder="Value (e.g. 24 Hours)" {...subField} className="h-10 text-sm" /></FormControl>
                                <FormMessage className="text-[10px]" />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeSpec(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Whats In The Box Section */}
          <Card className=" border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
              <div className="flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <FormField
                    control={form.control}
                    name="whatsInTheBoxTitle"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <Type className="h-3 w-3" /> Section Display Heading
                        </FormLabel>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              disabled={isBoxTitleLocked}
                              className={cn(
                                "font-bold text-xl bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity",
                                isBoxTitleLocked ? "opacity-50" : "opacity-100"
                              )}
                              placeholder="What’s In The Box"
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                              "h-8 w-8 rounded-full",
                              isBoxTitleLocked ? "text-muted-foreground" : "text-primary bg-primary/10"
                            )}
                            onClick={() => setIsBoxTitleLocked(!isBoxTitleLocked)}
                            title={isBoxTitleLocked ? "Unlock to edit heading" : "Lock heading"}
                          >
                            {isBoxTitleLocked ? <Lock className="h-4 w-4" /> : <LockKeyholeOpen className="h-4 w-4" />}
                          </Button>
                        </div>
                        <FormDescription className="text-[10px]">Customize the heading shown on the storefront.</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 border-primary/30 text-primary"
                  onClick={() => appendBoxItem({ name: '' })}
                >
                  <PlusCircle className="h-4 w-4" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {boxFields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/10">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-medium text-muted-foreground">No package items listed yet.</p>
                    <Button 
                      type="button" 
                      variant="link" 
                      onClick={() => appendBoxItem({ name: '' })}
                      className="mt-2"
                    >
                      Click here to list the first item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {boxFields.map((field, index) => (
                      <div key={field.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
                        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 pt-1 text-muted-foreground">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 p-0 hover:text-primary disabled:opacity-30"
                                onClick={() => moveBoxItem(index, index - 1)}
                                disabled={index === 0}
                            >
                                <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <GripVertical className="h-4 w-4 opacity-30" />
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 p-0 hover:text-primary disabled:opacity-30"
                                onClick={() => moveBoxItem(index, index + 1)}
                                disabled={index === boxFields.length - 1}
                            >
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`whatsInTheBox.${index}.name`}
                            render={({ field: subField }) => (
                              <FormItem className="space-y-1">
                                <FormControl><Input placeholder="Item name (e.g. Charging Cable)" {...subField} className="h-10 text-sm" /></FormControl>
                                <FormMessage className="text-[10px]" />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeBoxItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Variations & Sizing Section */}
          <Card className=" border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
              <div className="flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <FormField
                    control={form.control}
                    name="variationsTitle"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <Type className="h-3 w-3" /> Section Display Heading
                        </FormLabel>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              disabled={isVariationsTitleLocked}
                              className={cn(
                                "font-bold text-xl bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity",
                                isVariationsTitleLocked ? "opacity-50" : "opacity-100"
                              )}
                              placeholder="Variations Available"
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                              "h-8 w-8 rounded-full",
                              isVariationsTitleLocked ? "text-muted-foreground" : "text-primary bg-primary/10"
                            )}
                            onClick={() => setIsVariationsTitleLocked(!isVariationsTitleLocked)}
                            title={isVariationsTitleLocked ? "Unlock to edit heading" : "Lock heading"}
                          >
                            {isVariationsTitleLocked ? <Lock className="h-4 w-4" /> : <LockKeyholeOpen className="h-4 w-4" />}
                          </Button>
                        </div>
                        <FormDescription className="text-[10px]">Customize the heading shown on the storefront.</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 border-primary/30 text-primary"
                  onClick={() => appendVariation({ name: '' })}
                >
                  <PlusCircle className="h-4 w-4" /> Add Variation
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="space-y-4">
                {variationFields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/10">
                    <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-medium text-muted-foreground">No variations listed yet (e.g. Colors, Materials).</p>
                    <Button 
                      type="button" 
                      variant="link" 
                      onClick={() => appendVariation({ name: '' })}
                      className="mt-2"
                    >
                      Click here to add the first variation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {variationFields.map((field, index) => (
                      <div key={field.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
                        <div className="flex-shrink-0 flex flex-col items-center gap-0.5 pt-1 text-muted-foreground">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 p-0 hover:text-primary disabled:opacity-30"
                                onClick={() => moveVariation(index, index - 1)}
                                disabled={index === 0}
                            >
                                <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <GripVertical className="h-4 w-4 opacity-30" />
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 p-0 hover:text-primary disabled:opacity-30"
                                onClick={() => moveVariation(index, index + 1)}
                                disabled={index === variationFields.length - 1}
                            >
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`variations.${index}.name`}
                            render={({ field: subField }) => (
                              <FormItem className="space-y-1">
                                <FormControl><Input placeholder="Variation (e.g. Space Gray Finish)" {...subField} className="h-10 text-sm" /></FormControl>
                                <FormMessage className="text-[10px]" />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeVariation(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="sizeGuideImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold flex items-center gap-2">
                        <Maximize className="h-4 w-4 text-primary" /> Size Guide / Sizing Chart
                    </FormLabel>
                    <div className="flex items-start gap-4">
                        {field.value && (
                            <div className="relative w-32 h-32 rounded-xl border overflow-hidden shrink-0 ">
                                <Image src={field.value} alt="Size guide" fill className="object-contain" unoptimized />
                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full" onClick={() => form.setValue('sizeGuideImageUrl', '')}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                        <div className="flex-grow space-y-3">
                            <FormControl>
                                <Input placeholder="https://example.com/size-guide.png" {...field} value={field.value || ''} disabled={isSaving || isUploadingSizeGuide} />
                            </FormControl>
                            <Button asChild variant="outline" size="sm" disabled={isSaving || isUploadingSizeGuide}>
                                <label htmlFor="size-guide-upload" className="cursor-pointer">
                                    {isUploadingSizeGuide ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Upload Sizing Chart
                                </label>
                            </Button>
                            <input id="size-guide-upload" type="file" accept="image/*" className="hidden" onChange={handleSizeGuideUpload} disabled={isSaving || isUploadingSizeGuide} />
                            <FormDescription className="text-[10px]">Recommended: High-resolution PNG or JPG with transparent background.</FormDescription>
                        </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className=" border-none ring-1 ring-border">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-lg flex items-center gap-2">
                  <MonitorSmartphone className="h-5 w-5 text-primary" />
                  Channel Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <FormField
                control={form.control}
                name="isVisibleOnWeb"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-slate-50 dark:bg-slate-900">
                    <div className="space-y-0.5">
                      <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-blue-500" /> Web Store
                      </FormLabel>
                      <p className="text-[10px] text-muted-foreground">Show on public website</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isVisibleInPOS"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-slate-50 dark:bg-slate-900">
                    <div className="space-y-0.5">
                      <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                          <Store className="h-3.5 w-3.5 text-green-600" /> POS Terminal
                      </FormLabel>
                      <p className="text-[10px] text-muted-foreground">Show in cashier interface</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="showProductInsight"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-slate-50 dark:bg-slate-900">
                    <div className="space-y-0.5">
                      <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                          <Info className="h-3.5 w-3.5 text-primary" /> Product Insight
                      </FormLabel>
                      <p className="text-[10px] text-muted-foreground">Show "Listed Since" metrics</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} /></FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Public Store Section Visibility - Red Color */}
          <Card className=" border-none ring-1 ring-destructive/30">
            <CardHeader className="bg-destructive/10">
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <Eye className="h-5 w-5" />
                  Public Store Sections
              </CardTitle>
              <CardDescription className="text-destructive/70 text-xs">
                Control which sections appear on the public product page.
                <span className="block mt-1 font-bold text-[10px] uppercase tracking-tighter">Note: Global settings can override these.</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="showTechnicalSpecs"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border border-destructive/20 rounded-2xl bg-destructive/5">
                    <div className="space-y-0.5">
                      <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2 text-destructive">
                          <ListChecks className="h-3.5 w-3.5" /> Technical Specs
                      </FormLabel>
                      <p className="text-[10px] text-muted-foreground">Show specifications, variations, sizing</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="showLogisticsInfo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border border-destructive/20 rounded-2xl bg-destructive/5">
                    <div className="space-y-0.5">
                      <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2 text-destructive">
                          <Truck className="h-3.5 w-3.5" /> Logistics Info
                      </FormLabel>
                      <p className="text-[10px] text-muted-foreground">Show shipping & returns tab</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="showVerifiedReviews"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border border-destructive/20 rounded-2xl bg-destructive/5">
                    <div className="space-y-0.5">
                      <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2 text-destructive">
                          <Star className="h-3.5 w-3.5" /> Verified Reviews
                      </FormLabel>
                      <p className="text-[10px] text-muted-foreground">Show customer reviews & ratings</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} /></FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className=" border-none ring-1 ring-border">
              <CardHeader className="bg-muted/30">
                  <CardTitle className="text-lg">Merchandising Settings</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                  <StoreMerchandisingSettings />
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-muted/10">
                  <Button type="submit" disabled={isSaving || isUploadingSizeGuide || isUploadingPoster} className="w-full h-14 text-lg font-bold  shadow-primary/20">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                    ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Publish Product
                    </>
                  )}
                  </Button>
                  <div className="flex items-start gap-2 text-[10px] text-muted-foreground leading-relaxed">
                      <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <p>New products are instantly live across all enabled channels. Prices and stock levels will sync in real-time.</p>
                  </div>
              </CardFooter>
          </Card>
        </div>
      </form>
    </FormProvider>

    {/* Change Category Modal */}
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
            <DrawerTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
              <div className="p-2.5 bg-primary/10 rounded-2xl">
                <Layers className="h-6 w-6 text-primary"/>
              </div>
              Select Target Category
            </DrawerTitle>
            <DrawerDescription className="text-base text-left">
              Organize your product by assigning it to a specific collection.
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

    {/* Create New Category Modal */}
    <Drawer open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen} dismissible={true}>
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
            onSubmit={handleCreateCategory}
            isSubmitting={isSubmittingCategory}
            onCancel={() => { setIsCategoryModalOpen(false); setIsChangeCategoryModalOpen(true); }}
            isModal={true}
          />
        </div>
      </DrawerContent>
    </Drawer>

    </>
  );
}
