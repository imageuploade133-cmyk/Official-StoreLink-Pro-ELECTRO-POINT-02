
'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, query, collection, where, limit, orderBy, getDoc, getDocs } from 'firebase/firestore';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { useRecentlyViewed } from '@/contexts/recently-viewed-context';
import { useSettings } from '@/contexts/settings-context';
import { useGlobalLoading } from '@/contexts/global-loading-context';
import { formatCurrency } from '@/lib/formatUtils';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import type { Product, Category, ProductReview, HomepageSection, VoiceSignature } from '@/lib/types';
import { 
  Star, 
  Heart, 
  ShoppingCart, 
  ShoppingBag,
  ChevronRight, 
  Truck, 
  ShieldCheck, 
  Plus, 
  Minus, 
  Zap,
  Info,
  Clock,
  Package,
  Share2,
  Share,
  ExternalLink,
  Link as LinkIcon,
  Send,
  CheckCircle2,
  Check,
  ThumbsUp,
  MessageSquare, 
  Reply as ReplyIcon,
  RotateCcw,
  ListChecks,
  Layers,
  Maximize,
  Award,
  CreditCard,
  BookOpen,
  FileText,
  Sparkles,
  History,
  ArrowRight,
  Video as VideoIcon,
  Play,
  Pause,
  X,
  Volume2,
  Square,
  AudioWaveform,
  FastForward,
  ArrowLeft,
  Gift,
  Loader2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ZoomIn,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, convertToDateSafely, slugify } from '@/lib/utils';
import { getContrastColor } from '@/lib/color-utils';
import { ProductCard } from '@/components/store/ProductCard';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { OutOfDataDrawer } from '@/components/ui/out-of-data-drawer';
import { ProductReviewForm } from '@/components/store/ProductReviewForm';
import { VoiceReviewPlayer } from "@/components/store/VoiceReviewPlayer";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCollectionBackgroundStyle } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { PromoCountdown } from '@/components/store/PromoCountdown';
import { RecentlyViewedSection } from '@/components/store/RecentlyViewedSection';
import { ProductVideoGallery } from '@/components/store/ProductVideoGallery';
import { StockBar } from '@/components/store/StockBar';
import { StickyProductBar } from '@/components/store/StickyProductBar';
import { BannerAd } from '@/components/ads/BannerAd';
import { useAds } from '@/contexts/ad-context';
import { useStoreUrl } from '@/hooks/use-store-url';
import { FastCheckoutButtons } from '@/components/store/FastCheckoutButtons';
import { AppleProductPageSkeleton } from '@/components/store/AppleProductPageSkeleton';
import { AppleImageGallery } from '@/components/store/AppleImageGallery';

import { useProductReviews } from '@/hooks/use-product-reviews';

const iconMap = {
  Truck,
  ShieldCheck,
  Zap,
  Clock,
  CreditCard,
  Award,
  BookOpen,
  FileText,
  Sparkles,
  Info,
  History,
  Package,
  ShoppingCart,
  ShoppingBag,
  Plus,
  Check,
  CheckCircle2,
  ArrowRight,
  Share2,
  Share,
  ExternalLink,
  LinkIcon,
  Send,
};

function IndividualTrackPlayer({ track, branding }: { track: any, branding: any }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragValue, setDragValue] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const audioSource = track.audioDataUri;

    const formatTime = (time: number) => {
        if (isNaN(time) || !isFinite(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current && !isDragging) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            const audioDuration = audioRef.current.duration;
            if (!isNaN(audioDuration) && isFinite(audioDuration)) {
                setDuration(audioDuration);
            }
        }
    };

    const handleValueChange = (vals: number[]) => {
        setIsDragging(true);
        setDragValue(vals[0]);
    };

    const handleValueCommit = (vals: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = vals[0];
            setCurrentTime(vals[0]);
        }
        setIsDragging(false);
    };

    const fastForward = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            const audioDuration = audioRef.current.duration;
            if (!isNaN(audioDuration) && isFinite(audioDuration)) {
                audioRef.current.currentTime = Math.min(audioDuration, audioRef.current.currentTime + 10);
            }
        }
    };

    if (!audioSource) return null;

    return (
        <div 
            className="p-5 rounded-[2.5rem] shadow-lg flex flex-col gap-4 relative overflow-hidden group/audio transition-all hover:scale-[1.01] text-white"
            style={{ backgroundColor: branding.color }}
        >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
            <div className="absolute -right-2 -top-2 opacity-10 group-hover/audio:scale-110 transition-transform duration-1000">
                {branding.iconUrl ? (
                    <div className="relative h-24 w-24 rounded-xl overflow-hidden grayscale brightness-[2]">
                        <Image src={branding.iconUrl} alt="" fill className="object-cover" unoptimized />
                    </div>
                ) : (
                    <Volume2 className="h-24 w-24" />
                )}
            </div>
            
            <div className="flex items-center gap-4 relative z-10">
                <Button 
                    onClick={togglePlayback}
                    variant="ghost" 
                    size="icon" 
                    className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md text-white border-2 border-white/30 shadow-xl relative z-10 flex-shrink-0 transition-transform active:scale-95"
                >
                    {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current ml-1" />}
                </Button>
                
                <div className="relative z-10 space-y-0.5 overflow-hidden flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-80">{branding.preTitle}</span>
                        {isPlaying && (
                            <div className="flex gap-0.5 h-3 items-end">
                                <div className="w-0.5 h-full bg-white animate-bounce" style={{animationDelay: '0.1s'}}/>
                                <div className="w-0.5 h-2/3 bg-white animate-bounce" style={{animationDelay: '0.3s'}}/>
                                <div className="w-0.5 h-full bg-white animate-bounce" style={{animationDelay: '0.2s'}}/>
                            </div>
                        )}
                    </div>
                    <h4 className="text-base font-black tracking-tight leading-tight truncate pr-4">{track.title || branding.title}</h4>
                </div>

                <Button 
                    onClick={fastForward}
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-sm flex-shrink-0 transition-all active:scale-90"
                    title="Forward 10s"
                >
                    <FastForward className="h-5 w-5" />
                </Button>
            </div>

            <div className="relative z-10 flex flex-col gap-1.5 px-1">
                <Slider
                    value={[isDragging ? dragValue : currentTime]}
                    max={(isNaN(duration) || !isFinite(duration)) ? 0 : duration}
                    step={0.1}
                    onValueChange={handleValueChange}
                    onValueCommit={handleValueCommit}
                    className="w-full"
                    trackClassName="bg-white/20 h-1.5"
                    rangeClassName="bg-white"
                    thumbClassName="h-3 w-3 bg-white border-none shadow-lg"
                />
                <div className="flex justify-between text-[10px] font-black font-mono tracking-widest opacity-70">
                    <span>{formatTime(isDragging ? dragValue : currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <audio 
                ref={audioRef}
                src={audioSource}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                className="hidden"
            />
        </div>
    );
}

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  const storeId = params.storeId as string;
  const { getStoreUrl } = useStoreUrl();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { addToCart } = useCart();
  const { setPageDataLoaded } = useGlobalLoading();
  const { isProductInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { addViewedProduct } = useRecentlyViewed();
  const { toast } = useToast();
  const { activeAds, rewardAdClicked, setRewardAdClicked, applyRewardDiscount, recordAdClick } = useAds();
  
  const [quantity, setQuantity] = useState(1);
  const [today, setToday] = useState<Date | null>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageSlideDirection, setImageSlideDirection] = useState<'left' | 'right' | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOutOfDataDrawerOpen, setIsOutOfDataDrawerOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isLoadingInstallment, setIsLoadingInstallment] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const mainImageContainerRef = useRef<HTMLDivElement>(null);

  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [isChangingVariant, setIsChangingVariant] = useState(false);

  const matchesVariant = (variant: any, options: { [key: string]: string }, skipOption?: string) => {
    if (!variant.options) return false;
    return Object.entries(options).every(([key, value]) => {
      if (skipOption && key === skipOption) return true;
      const actualKey = Object.keys(variant.options).find(k => k.toLowerCase() === key.toLowerCase());
      if (!actualKey) return false;
      return String(variant.options[actualKey]).toLowerCase().trim() === String(value).toLowerCase().trim();
    });
  };



  const [resolvedProductId, setResolvedProductId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    if (!firestore || !productId || !storeId) return;

    const resolve = async () => {
      setIsResolving(true);
      try {
        // 1. Try by ID
        const docRef = doc(firestore, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data()?.store_id === storeId) {
          setResolvedProductId(productId);
        } else {
          // 2. Try by Slug
          const q = query(
            collection(firestore, 'products'), 
            where('store_id', '==', storeId), 
            where('slug', '==', productId), 
            limit(1)
          );
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            setResolvedProductId(querySnap.docs[0].id);
          } else {
            // 3. Fallback: Check if name-to-slug matches
            // This handles existing products that don't have the slug field yet
            const productsRef = collection(firestore, 'products');
            const qAll = query(productsRef, where('store_id', '==', storeId));
            const allSnap = await getDocs(qAll);
            const match = allSnap.docs.find(d => slugify(d.data().name) === productId);
            if (match) {
              setResolvedProductId(match.id);
            }
          }
        }
      } catch (e) {
        console.error("Resolution error:", e);
      } finally {
        setIsResolving(false);
      }
    };
    resolve();
  }, [firestore, productId, storeId]);

  // Fetch Product
  const productRef = useMemo(() => firestore && resolvedProductId ? doc(firestore, 'products', resolvedProductId) : null, [firestore, resolvedProductId]);
  const { data: product, isLoading: isLoadingProductFromDoc } = useDoc<Product>(productRef);

  const isOptionValueAvailable = (optionName: string, value: string) => {
    if (!product?.variants || !product.variantOptions) return true;

    return product.variants.some(v => 
      v.isActive && 
      (Number(v.stock) || 0) > 0 &&
      matchesVariant(v, selectedOptions, optionName) &&
      v.options && 
      Object.keys(v.options).find(k => k.toLowerCase() === optionName.toLowerCase()) &&
      String(v.options[Object.keys(v.options).find(k => k.toLowerCase() === optionName.toLowerCase())!]).toLowerCase().trim() === String(value).toLowerCase().trim()
    );
  };

  const handleOptionChange = (optionName: string, value: string) => {
    if (!product?.variantOptions || !product.variants || isChangingVariant) return;

    setIsChangingVariant(true);

    const isDeselecting = selectedOptions[optionName] === value;
    const newOptions = { ...selectedOptions };
    if (isDeselecting) {
        delete newOptions[optionName];
    } else {
        newOptions[optionName] = value;
    }

    // Robustness: If the new combination doesn't exist, find the best matching valid variant
    const combinationExists = product.variants.some(v => v.isActive && matchesVariant(v, newOptions));
    
    if (!combinationExists && !isDeselecting) {
      // Find a variant that matches the new option value
      const matchingVariants = product.variants.filter(v => 
        v.isActive && 
        v.options && 
        Object.keys(v.options).find(k => k.toLowerCase() === optionName.toLowerCase()) &&
        String(v.options[Object.keys(v.options).find(k => k.toLowerCase() === optionName.toLowerCase())!]).toLowerCase().trim() === String(value).toLowerCase().trim()
      );

      if (matchingVariants.length > 0) {
        // Pick the variant that matches the most other previously selected options
        let bestMatch = matchingVariants[0];
        let maxMatches = -1;

        matchingVariants.forEach(v => {
          let currentMatches = 0;
          Object.entries(selectedOptions).forEach(([k, val]) => {
            if (k !== optionName && v.options[k] === val) currentMatches++;
          });
          
          if (currentMatches > maxMatches) {
            maxMatches = currentMatches;
            bestMatch = v;
          } else if (currentMatches === maxMatches) {
            if ((v.stock || 0) > (bestMatch.stock || 0)) bestMatch = v;
          }
        });
        setSelectedOptions(bestMatch.options);
      } else {
        setSelectedOptions(newOptions);
      }
    } else {
      setSelectedOptions(newOptions);
    }

    setTimeout(() => setIsChangingVariant(false), 400);
  };
  const isLoadingProduct = isResolving || isLoadingProductFromDoc;
  useEffect(() => {
    if (!isLoadingProduct) {
      setPageDataLoaded(true);
    }
  }, [isLoadingProduct, setPageDataLoaded]);

  // Fetch Category info
  const categoryRef = useMemo(() => (firestore && product?.categoryId) ? doc(firestore, 'categories', product.categoryId) : null, [firestore, product?.categoryId]);
  const { data: category } = useDoc<Category>(categoryRef);

  // Fetch active flash sale sections
  const sectionsQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(
      collection(firestore, 'homepageSections'), 
      where('store_id', '==', storeId),
      where('isFlashSale', '==', true),
      where('published', '==', true)
    );
  }, [firestore, storeId]);
  const { data: flashSections } = useCollection<HomepageSection>(sectionsQuery);

  const activeSectionPromo = useMemo(() => {
    if (!flashSections || !product || !today) return null;
    
    const activeSection = flashSections.find(s => {
        const start = convertToDateSafely(s.flashSaleStartDate);
        const end = convertToDateSafely(s.flashSaleEndDate);
        if (start && today < start) return false;
        if (end && today > end) return false;
        
        if (s.selectionType === 'category' && s.categoryId === product.categoryId) return true;
        if (s.selectionType === 'manual' && s.productIds?.includes(product.id)) return true;
        if (s.selectionType === 'all') return true;
        
        return false;
    });

    if (!activeSection) return null;

    return {
        type: activeSection.flashSaleDiscountType || 'percentage',
        value: activeSection.flashSaleDiscountValue || 0,
        endDate: convertToDateSafely(activeSection.flashSaleEndDate)
    };
  }, [flashSections, product, today]);

  const activeRewardAd = useMemo(() => {
    const ad = activeAds.find(ad => ad.adType === 'reward' && ad.placement === 'reward_button');
    if (!ad) return null;

    if (typeof window !== 'undefined') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (ad.deviceTargeting === 'mobile_only' && !isMobile) return null;
      if (ad.deviceTargeting === 'desktop_only' && isMobile) return null;
    }

    return ad;
  }, [activeAds]);

  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    let price = calculateEffectivePrice(product as any, today, category);

    if (activeSectionPromo) {
        const base = Number(product.sellingPrice) || 0;
        if (activeSectionPromo.type === 'percentage') {
            price = base * (1 - activeSectionPromo.value / 100);
        } else {
            price = Math.max(0, base - activeSectionPromo.value);
        }
    }

    if (rewardAdClicked && activeRewardAd && product.rewardAdsEnabled) {
      price = applyRewardDiscount(price, activeRewardAd);
    }

    return price;
  }, [product, today, category, activeSectionPromo, rewardAdClicked, activeRewardAd, applyRewardDiscount]);

  const previewVariant = useMemo(() => {
    if (!product?.hasVariants || !product.variants) return null;
    if (Object.keys(selectedOptions).length === 0) return null;
    return product.variants.find(v => 
      v.isActive && matchesVariant(v, selectedOptions)
    );
  }, [product, selectedOptions]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const all = [product.imageUrl, ...(product.additionalImageUrls || [])].filter(Boolean) as string[];
    
    // Priority: Add images from the currently previewed variant
    if (previewVariant) {
        if (previewVariant.imageUrl && !all.includes(previewVariant.imageUrl)) {
            all.push(previewVariant.imageUrl);
        }
        if (previewVariant.additionalImageUrls) {
            previewVariant.additionalImageUrls.forEach(url => {
                if (url && !all.includes(url)) {
                    all.push(url);
                }
            });
        }
    }

    // Add other variant images to ensure all are available in gallery
    if (product.variants) {
        product.variants.forEach(v => {
            if (v.imageUrl && !all.includes(v.imageUrl)) {
                all.push(v.imageUrl);
            }
            if (v.additionalImageUrls) {
                v.additionalImageUrls.forEach(url => {
                    if (url && !all.includes(url)) {
                        all.push(url);
                    }
                });
            }
        });
    }

    return all;
  }, [product, previewVariant]);

  const selectedVariant = useMemo(() => {
    if (!product?.hasVariants || !product.variants || !product.variantOptions) return null;
    // Only return a specific variant when ALL options are selected
    if (Object.keys(selectedOptions).length !== product.variantOptions.length) return null;
    return product.variants.find(v => 
      v.isActive && matchesVariant(v, selectedOptions)
    );
  }, [product, selectedOptions]);

  const canBuy = useMemo(() => {
    if (!product) return false;
    if (!product.hasVariants) return true;
    return !!selectedVariant;
  }, [product, selectedVariant]);

  const currentPrice = useMemo(() => {
    // Use previewVariant for price updates even if all options aren't selected
    const variantForPrice = selectedVariant || previewVariant;
    if (variantForPrice && variantForPrice.sellingPrice) {
       // Re-calculate effective price if variant has its own price
       return calculateEffectivePrice({ ...product, sellingPrice: variantForPrice.sellingPrice } as any, today, category);
    }
    return effectivePrice;
  }, [selectedVariant, previewVariant, effectivePrice, product, today, category]);

  const currentStock = useMemo(() => {
    if (!product) return 0;
    if (!product.hasVariants || !product.variants || product.variants.length === 0) return Number(product.stock) || 0;
    
    if (selectedVariant) return Number(selectedVariant.stock) || 0;
    
    // If variants exist but none/partially selected, show total stock of matching variants
    const matchingVariants = product.variants.filter(v => 
        v.isActive && matchesVariant(v, selectedOptions)
    );
    
    return matchingVariants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
  }, [product, selectedVariant, selectedOptions]);

  const installmentData = useMemo(() => {
    if (!product || !product.installmentEnabled || !currentPrice) return null;
    
    const downPaymentAmount = currentPrice * (product.downPaymentPercentage || 0) / 100;
    const remainingBalance = currentPrice - downPaymentAmount;
    const installmentAmount = remainingBalance / (product.numberOfPayments || 1);
    
    let nextDueDate = today ? new Date(today) : new Date();
    if (product.paymentInterval === 'daily') nextDueDate.setDate(nextDueDate.getDate() + 1);
    else if (product.paymentInterval === 'weekly') nextDueDate.setDate(nextDueDate.getDate() + 7);
    else nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    return {
      downPaymentAmount,
      remainingBalance,
      installmentAmount,
      nextDueDate
    };
  }, [product, currentPrice, today]);

  const isCurrentlyOutOfStock = currentStock <= 0;
  const isEntireProductOutOfStock = useMemo(() => {
    if (!product) return true;
    return (product.stock || 0) <= 0;
  }, [product]);

  // Update active image when preview variant or selected options change
  useEffect(() => {
    if (previewVariant?.imageUrl) {
      setActiveImage(previewVariant.imageUrl);
      setShowVideo(false);
    } else if (product?.variants && Object.keys(selectedOptions).length > 0) {
      // Robust fallback: if exact preview variant doesn't have an image, 
      // try to find ANY variant matching current selection that has an image
      const matchWithImage = product.variants.find(v => 
        v.isActive && matchesVariant(v, selectedOptions) && v.imageUrl
      );
      if (matchWithImage?.imageUrl) {
        setActiveImage(matchWithImage.imageUrl);
        setShowVideo(false);
      }
    }
  }, [previewVariant, selectedOptions, product]);

  // Initial selection - Auto-select best available variant
  const initializedRef = useRef(false);
  useEffect(() => {
    if (product && !initializedRef.current) {
        if (product.hasVariants && product.variants && product.variants.length > 0) {
            // Find first in-stock and active variant
            const firstInStockVariant = product.variants.find(v => v.isActive && (v.stock || 0) > 0);
            if (firstInStockVariant && firstInStockVariant.options) {
                setSelectedOptions(firstInStockVariant.options);
            } else {
                // If none in stock, pick first active
                const firstActiveVariant = product.variants.find(v => v.isActive);
                if (firstActiveVariant && firstActiveVariant.options) {
                    setSelectedOptions(firstActiveVariant.options);
                }
            }
        }
        initializedRef.current = true;
    }
  }, [product]);

  // Adjust quantity if it exceeds stock
  useEffect(() => {
    if (currentStock > 0 && quantity > currentStock) {
      setQuantity(currentStock);
    }
  }, [currentStock, quantity]);

  const filteredPaymentMethods = useMemo(() => {
    return availablePaymentMethods.filter(method => {
      // Filter by Region if store has a payment region set
      if (settings?.paymentRegion) {
        const isNigeriaSpecific = ['paystack', 'flutterwave', 'opay', 'palmpay', 'monnify'].includes(method.provider);
        if (settings.paymentRegion !== 'Nigeria' && isNigeriaSpecific) {
          return false;
        }
      }
      return true;
    });
  }, [availablePaymentMethods, settings?.paymentRegion]);

  useEffect(() => {
    if (!storeId) return;
    const fetchMethods = async () => {
      try {
        const res = await fetch(`/api/payment/methods?storeId=${storeId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setAvailablePaymentMethods(data);
        }
      } catch (e) {
        console.error('Failed to fetch payment methods', e);
      } finally {
        setIsLoadingMethods(false);
      }
    };
    fetchMethods();
  }, [storeId]);

  useEffect(() => {
    setToday(new Date());
  }, []);

  // Track Recently Viewed
  useEffect(() => {
    if (productId) {
      addViewedProduct(productId);
    }
  }, [productId, addViewedProduct]);

  // Set initial active image when product loads
  useEffect(() => {
    if (product?.imageUrl) {
      setActiveImage(product.imageUrl);
    }
  }, [product]);

  // Sync activeImageIndex with activeImage
  useEffect(() => {
    if (galleryImages.length > 0 && activeImage) {
      const index = galleryImages.indexOf(activeImage);
      if (index !== -1 && index !== activeImageIndex) {
        setActiveImageIndex(index);
      }
    }
  }, [activeImage, galleryImages, activeImageIndex]);

  // Image navigation functions
  const goToImage = useCallback((index: number) => {
    if (index >= 0 && index < galleryImages.length) {
      setImageSlideDirection(index > activeImageIndex ? 'right' : 'left');
      setActiveImageIndex(index);
      setActiveImage(galleryImages[index]);
      setShowVideo(false);
    }
  }, [galleryImages, activeImageIndex]);

  const goNextImage = useCallback(() => {
    if (activeImageIndex < galleryImages.length - 1) {
      goToImage(activeImageIndex + 1);
    }
  }, [activeImageIndex, galleryImages.length, goToImage]);


  const goPrevImage = useCallback(() => {
    if (activeImageIndex > 0) {
      goToImage(activeImageIndex - 1);
    }
  }, [activeImageIndex, goToImage]);

  // Zoom functionality
  const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainImageContainerRef.current) return;
    const rect = mainImageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  }, []);

  const handleImageMouseEnter = useCallback(() => setIsZoomed(true), []);
  const handleImageMouseLeave = useCallback(() => setIsZoomed(false), []);


  // Close lightbox on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isLightboxOpen]);


  // Verify product belongs to store
  const isProductInCorrectStore = product && product.store_id === storeId;

  // Fetch distributed voice signatures from sub-collection
  const voicesQuery = useMemo(() => {
      if (!firestore || !productId) return null;
      return query(collection(firestore, 'products', productId, 'voiceSignatures'));
  }, [firestore, productId]);
  const { data: distributedVoices } = useCollection<VoiceSignature>(voicesQuery);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Initial video play blocked:", error);
        });
    }

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [showVideo]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
        if (videoRef.current.paused) {
            videoRef.current.play().catch(err => console.log("Play failed:", err));
        } else {
            videoRef.current.pause();
        }
    }
  };

  const allCategoriesQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(collection(firestore, 'categories'), where('store_id', '==', storeId), orderBy('name'));
  }, [firestore, storeId]);
  const { data: allCategories } = useCollection<Category>(allCategoriesQuery);

  const categoryMap = useMemo(() => {
    if (!allCategories) return new Map();
    return new Map(allCategories.map(c => [c.id, c.name]));
  }, [allCategories]);

  // Fetch Reviews
  const reviewsQuery = useMemo(() => {
    if (!firestore || !productId) return null;
    return query(
      collection(firestore, 'products', productId, 'reviews'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, productId]);
  const { reviews, isLoading: isLoadingReviews, hasMore, loadMore } = useProductReviews(productId);

  const relatedQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    if (product?.categoryId) {
        return query(
            collection(firestore, 'products'),
            where('store_id', '==', storeId),
            where('categoryId', '==', product.categoryId),
            where('isVisibleOnWeb', '==', true),
            limit(12)
        );
    }
    return query(
        collection(firestore, 'products'),
        where('store_id', '==', storeId),
        where('isVisibleOnWeb', '==', true),
        orderBy('createdAt', 'desc'),
        limit(12)
    );
  }, [firestore, product?.categoryId, storeId]);

  const { data: rawRelatedProducts } = useCollection<Product>(relatedQuery);

  const finalRelatedProducts = useMemo(() => {
    if (!rawRelatedProducts) return [];
    return rawRelatedProducts
        .filter(p => p.id !== productId) 
        .map(p => ({
            ...p,
            categoryName: categoryMap.get(p.categoryId || '') || 'General Collection'
        }))
        .sort(() => 0.5 - Math.random()) 
        .slice(0, 4); 
  }, [rawRelatedProducts, productId, categoryMap]);

  const currencySymbol = settings?.currency || '$';
  const defaultImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/600x600.png';
  const isLogisticsEnabled = settings?.showLogisticsOnPublicSite !== false;
  
  const globalShowTechnicalSpecs = settings?.globalShowTechnicalSpecs !== false;
  const globalShowLogisticsInfo = settings?.globalShowLogisticsInfo !== false;
  const globalShowVerifiedReviews = settings?.globalShowVerifiedReviews !== false;

  const showTechnicalSpecs = (product?.showTechnicalSpecs !== false) && globalShowTechnicalSpecs;
  const showLogisticsTab = (product?.showLogisticsInfo !== false) && isLogisticsEnabled && globalShowLogisticsInfo;
  const showVerifiedReviews = (product?.showVerifiedReviews !== false) && globalShowVerifiedReviews;
  
  const addToCartText = settings?.storeAddToCartText || 'Secure Purchase';
  const AddToCartIcon = iconMap[settings?.storeAddToCartIcon as keyof typeof iconMap] || ShoppingCart;
  const ShareIcon = iconMap[settings?.productSharingIcon as keyof typeof iconMap] || Share2;

  const showRecommendations = settings?.showRelatedProducts !== false;
  const recommendationsBg = settings?.relatedProductsBackgroundColor || 'transparent';
  const recommendationsBgStyle = useMemo(() => {
    if (settings?.relatedProductsBackgroundStyle === 'gradient') {
      return {
        background: `linear-gradient(to bottom, ${settings?.relatedProductsGradientStart || '#f5f5f7'}, ${settings?.relatedProductsGradientEnd || '#ffffff'})`
      };
    }
    if (settings?.relatedProductsBackgroundStyle === 'solid' && settings?.relatedProductsBackgroundColor && settings.relatedProductsBackgroundColor !== 'transparent') {
      return { backgroundColor: settings.relatedProductsBackgroundColor };
    }
    return {};
  }, [settings]);
  const recommendationsTitle = settings?.relatedProductsTitle || 'You Might Also Like';
  const recommendationsDescription = settings?.relatedProductsDescription || 'Specially curated items from the same collection.';

  // Text Color Styling
  const recommendationsTextStyle = useMemo(() => {
    if (settings?.relatedProductsTextColorStyle === 'gradient') {
      return {
        background: `linear-gradient(to right, ${settings?.relatedProductsTextGradientStart || '#3b82f6'}, ${settings?.relatedProductsTextGradientEnd || '#8b5cf6'})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      };
    }
    return { color: settings?.relatedProductsTextColor || '#1d1d1f' };
  }, [settings]);

  // Button Color Styling
  const recommendationsButtonStyle = useMemo(() => {
    if (settings?.relatedProductsButtonStyle === 'gradient') {
      return {
        background: `linear-gradient(to right, ${settings?.relatedProductsButtonGradientStart || '#3b82f6'}, ${settings?.relatedProductsButtonGradientEnd || '#1d4ed8'})`,
        color: 'white',
        border: 'none'
      };
    }
    return {
      backgroundColor: settings?.relatedProductsButtonColor || '#3b82f6',
      color: 'white',
      border: 'none'
    };
  }, [settings]);

  const isDiscounted = product ? (effectivePrice < product.sellingPrice) : false;
  const isOutOfStock = useMemo(() => {
    if (!product) return false;
    return product.hasVariants ? isCurrentlyOutOfStock : (Number(product.stock) || 0) <= 0;
  }, [product, isCurrentlyOutOfStock]);

  const isInWishlist = isProductInWishlist(productId);


  const visibleReviews = useMemo(() => {
    if (!reviews) return [];
    return reviews.filter(r => r.isHidden !== true);
  }, [reviews]);

  const reviewStats = useMemo(() => {
    if (!visibleReviews || visibleReviews.length === 0) return { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
    const count = visibleReviews.length;
    const sum = visibleReviews.reduce((s, r) => s + r.rating, 0);
    const avg = parseFloat((sum / count).toFixed(1));
    const distribution = [0, 0, 0, 0, 0];
    visibleReviews.forEach(r => {
      const idx = Math.max(0, Math.min(Math.floor(r.rating) - 1, 4));
      distribution[idx]++;
    });
    const percentages = distribution.map(val => Math.round((val / count) * 100)).reverse();
    return { avg, count, distribution: percentages };
  }, [visibleReviews]);

  const handleAddToCart = () => {
    if (product) {
      setIsAddingToCart(true);
      // Use variant image if available for easy understanding in cart
      const variantImage = selectedVariant?.imageUrl || previewVariant?.imageUrl || activeImage;

      for (let i = 0; i < quantity; i++) {
        const itemWithVariant = {
          ...product,
          stock: currentStock, // Use variant stock
          selectedVariantId: selectedVariant?.id,
          selectedOptions: product.hasVariants ? selectedOptions : undefined,
          imageUrl: variantImage || product.imageUrl,
        };
        addToCart(itemWithVariant as any, currentPrice);
      }
      toast({
        title: "Added to Bag",
        description: `${quantity}x ${product.name} added to your bag`,
      });
      setTimeout(() => setIsAddingToCart(false), 300);
    }
  };

  const handleToggleWishlist = () => {
    if (isInWishlist) removeFromWishlist(productId);
    else addToWishlist(productId);
  };

  const handleShare = async () => {
    if (typeof window === 'undefined' || !product) return;

    const fullUrl = window.location.href;

    const shareData = {
      title: product.name || 'Check this out!',
      text: product.description?.replace(/<[^>]*>?/gm, '').substring(0, 100) || 'Amazing product found on StoreLink Pro.',
      url: fullUrl,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(fullUrl);
      toast({ title: "Link Copied!" });
    }
  };

  const handleRewardClick = () => {
    if (activeRewardAd) {
      recordAdClick(activeRewardAd.id);
      window.open(activeRewardAd.adLink, '_blank');
      setRewardAdClicked(true);
      toast({
        title: "Reward Unlocked!",
        description: `Your ${activeRewardAd.rewardDiscountType === 'percentage' ? activeRewardAd.rewardDiscountValue + '%' : currencySymbol + activeRewardAd.rewardDiscountValue} discount has been applied!`,
      });
    }
  };

  const buttonStyle = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const style = useIndividual 
      ? (settings?.storeAddToCartStyle || 'standard')
      : (settings?.storeBtnStyle || 'standard');
    
    if (style === 'gradient') {
        return {
          background: `linear-gradient(135deg, ${settings?.storeAddToCartGradientStart || '#3b82f6'}, ${settings?.storeAddToCartGradientEnd || '#1d4ed8'})`,
          color: 'white',
          border: 'none'
        };
    } else if (style === 'image' && settings?.storeAddToCartImageUrl) {
        return {
          backgroundImage: `url('${settings.storeAddToCartImageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          border: 'none'
        };
    } else if (style === 'outline') {
        return {
          backgroundColor: 'transparent',
          color: settings?.storeAddToCartColor || '#3b82f6',
          border: `2px solid ${settings?.storeAddToCartColor || '#3b82f6'}`
        };
    } else if (style === 'ghost') {
        return {
          backgroundColor: 'transparent',
          color: settings?.storeAddToCartColor || '#3b82f6',
          border: 'none'
        };
    }

    return {
      backgroundColor: settings?.storeAddToCartColor || '#3b82f6',
      color: 'white',
      border: 'none'
    };
  }, [settings]);

  const buttonClasses = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const shape = useIndividual 
      ? (settings?.storeAddToCartShape || 'lg')
      : (settings?.storeBtnShape || 'lg');
    const size = useIndividual
      ? (settings?.storeAddToCartSize || 'lg')
      : (settings?.storeBtnSize || 'md');
    
    const sizeClasses: Record<string, string> = {
      sm: 'px-3 py-2 text-xs h-10',
      md: 'px-4 py-2.5 text-sm h-12',
      lg: 'px-6 py-3 text-sm h-14',
      xl: 'px-8 py-4 text-base h-16'
    };

    const shapeClasses: Record<string, string> = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-2xl',
        full: 'rounded-full'
    };
    
    const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.lg;
    const shapeClass = shapeClasses[shape] || 'rounded-2xl';

    return `${shapeClass} ${sizeClass}`;
  }, [settings]);

  const productPageBgStyle = useMemo(() => {
    if (settings?.ourCollectionBackgroundApplyTo?.includes('product') && !settings?.ourCollectionBackgroundApplyTo?.includes('global')) {
      return getCollectionBackgroundStyle(settings);
    }
    return {};
  }, [settings]);

  const hasPageBg = useMemo(() => {
    return settings?.ourCollectionBackgroundApplyTo?.includes('product') || settings?.ourCollectionBackgroundApplyTo?.includes('global');
  }, [settings]);

  if (isLoadingProduct) {
    return <AppleProductPageSkeleton />;
  }

  if (!product || !isProductInCorrectStore) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Product not found in this store</h1>
        <Button asChild className="mt-4"><Link href={getStoreUrl('/store/shop')}>Return to Shop</Link></Button>
      </div>
    );
  }

  const creationDate = convertToDateSafely(product.createdAt);
  const Badge1Icon = iconMap[product.badge1Icon as keyof typeof iconMap] || Truck;
  const Badge2Icon = iconMap[product.badge2Icon as keyof typeof iconMap] || ShieldCheck;
  const DescriptionIcon = iconMap[product.descriptionIcon as keyof typeof iconMap] || BookOpen;
  const lowStockThreshold = product.lowStockThreshold || settings?.lowStockThreshold || 10;

  const voiceBranding = {
      preTitle: settings?.voiceExperiencePreTitle || 'Listen to Audio Signature',
      title: settings?.voiceExperienceTitle || 'Expert Insights & Detailed Pitch',
      color: settings?.voiceExperienceColor || '#3b82f6',
      iconUrl: settings?.voiceExperienceIconUrl
  };

  const visibleVoices = (distributedVoices || []).filter(v => v.isVisible !== false);

  return (
    <div 
        className={cn(
            "min-h-screen",
            !hasPageBg && "bg-white dark:bg-black"
        )}
        style={productPageBgStyle}
    >
      <StickyProductBar
        productName={product.name}
        productPrice={(!product.hasVariants || selectedVariant || previewVariant) ? formatCurrency(currentPrice, currencySymbol) : ""}
        isInWishlist={isInWishlist}
        isOutOfStock={isOutOfStock}
        onAddToCart={isOutOfStock ? () => setIsOutOfDataDrawerOpen(true) : handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        addToCartText={isOutOfStock ? "Out of Stock" : addToCartText}
        productImage={activeImage || product.imageUrl}
        showAddToCart={canBuy}
      />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        <div className={cn("md:hidden mb-4 sticky top-0 z-40 pb-2", !hasPageBg ? "bg-white dark:bg-black" : "bg-transparent")}>
          <Button 
            onClick={() => router.back()}
            variant="ghost" 
            size="sm"
            className="gap-2 text-primary hover:bg-primary/10 h-10 px-3 rounded-lg font-semibold transition-all active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Button>
        </div>

        <nav className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-[#86868b] mb-6 md:mb-8 overflow-x-auto pb-2">
          <Link href={getStoreUrl('/store')} className="hover:text-primary transition-colors flex-shrink-0">Home</Link>
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          <Link href={getStoreUrl('/store/shop')} className="hover:text-primary transition-colors flex-shrink-0">Shop</Link>
          {category && (
            <>
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
              <Link href={getStoreUrl(`/store/shop?category=${category.id}`)} className="hover:text-primary transition-colors flex-shrink-0 truncate max-w-[150px]">{category.name}</Link>
            </>
          )}
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          <span className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="sticky top-20 md:top-24 space-y-3 md:space-y-6">
              <div className="aspect-square bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-2xl md:rounded-3xl lg:rounded-[2.5rem] overflow-hidden relative group/main">
                {showVideo && product.videoUrl ? (
                    <div className="relative w-full h-full bg-black group">
                        <video ref={videoRef} src={product.videoUrl} autoPlay loop muted playsInline poster={product.videoPosterUrl || ''} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                            <Button onClick={togglePlay} variant="ghost" size="icon" className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40">
                                {isPlaying ? <Pause className="h-10 w-10 fill-current" /> : <Play className="h-10 w-10 fill-current ml-1" />}
                            </Button>
                        </div>
                        <Button onClick={() => setShowVideo(false)} className="absolute top-6 right-6 h-10 w-10 rounded-full bg-black/40 backdrop-blur-md text-white border-none shadow-xl transition-transform hover:scale-110 active:scale-95" size="icon">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                ) : (
                    <div 
                      ref={mainImageContainerRef}
                      className="relative w-full h-full cursor-zoom-in"
                      onMouseMove={handleImageMouseMove}
                      onMouseEnter={handleImageMouseEnter}
                      onMouseLeave={handleImageMouseLeave}
                      onClick={() => setIsLightboxOpen(true)}
                    >
                        <Image 
                          src={activeImage || product.imageUrl || defaultImageUrl} 
                          alt={product.name} 
                          fill 
                          priority 
                          className={cn(
                            "object-cover transition-all duration-500 ease-in-out",
                            (isEntireProductOutOfStock || isChangingVariant) && "opacity-50 grayscale",
                            imageSlideDirection === "right" && "animate-slide-left",
                            imageSlideDirection === "left" && "animate-slide-right"
                          )} 
                          unoptimized 
                        />
                        {/* Zoom Lens */}
                        <div
                          className={cn(
                            "absolute border-2 border-white/50 dark:border-white/50 rounded-xl shadow-2xl pointer-events-none transition-opacity duration-200 bg-no-repeat",
                            isZoomed ? "opacity-100" : "opacity-0"
                          )}
                          style={{
                            width: "150px",
                            height: "150px",
                            left: `calc(${zoomPosition.x}% - 75px)`,
                            top: `calc(${zoomPosition.y}% - 75px)`,
                            backgroundImage: `url(${activeImage || product.imageUrl || defaultImageUrl})`,
                            backgroundSize: "250%",
                            backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                            zIndex: 50,
                          }}
                        />
                        {/* Image Counter Badge */}
                        {galleryImages.length > 1 && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-1.5 rounded-full flex items-center gap-2 pointer-events-none">
                            <span className="text-xs font-medium">
                              {activeImageIndex + 1} / {galleryImages.length}
                            </span>
                          </div>
                        )}
                        {/* Navigation Arrows */}
                        {galleryImages.length > 1 && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); goPrevImage(); }}
                              disabled={activeImageIndex === 0}
                              className={cn(
                                "absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full",
                                "bg-white/80 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10",
                                "flex items-center justify-center",
                                "opacity-0 group-hover/main:opacity-100 transition-all duration-300",
                                "hover:scale-110 active:scale-95",
                                "disabled:opacity-30 disabled:cursor-not-allowed"
                              )}
                              aria-label="Previous image"
                            >
                              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); goNextImage(); }}
                              disabled={activeImageIndex === galleryImages.length - 1}
                              className={cn(
                                "absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full",
                                "bg-white/80 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10",
                                "flex items-center justify-center",
                                "opacity-0 group-hover/main:opacity-100 transition-all duration-300",
                                "hover:scale-110 active:scale-95",
                                "disabled:opacity-30 disabled:cursor-not-allowed"
                              )}
                              aria-label="Next image"
                            >
                              <ChevronRightIcon className="h-5 w-5 md:h-6 md:w-6" />
                            </button>
                          </>
                        )}
                        {/* Zoom Hint */}
                        <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center gap-2 opacity-0 group-hover/main:opacity-100 transition-opacity pointer-events-none">
                          <ZoomIn className="h-4 w-4" />
                          <span className="text-xs font-medium">Click to enlarge</span>
                        </div>
                        {/* Fullscreen Button */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                          className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/40 backdrop-blur-md text-white border-none shadow-xl transition-all hover:scale-110 active:scale-95 opacity-0 group-hover/main:opacity-100 flex items-center justify-center"
                          aria-label="View fullscreen"
                        >
                          <Maximize2 className="h-5 w-5" />
                        </button>
                        {isChangingVariant && (
                            <div className="absolute inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-[2px] flex items-center justify-center z-10 animate-in fade-in duration-300">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg" />
                                    <Badge className="bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1 shadow-xl border-none">Updating..</Badge>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="absolute top-8 left-8 flex flex-col gap-3">
                    {product.isOfficialBrand && (
                        <Badge className="bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest px-2 py-1 shadow-md border-none">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 fill-current" /> Official Brand
                        </Badge>
                    )}
                    {isDiscounted && !isEntireProductOutOfStock && today && (
                        <Badge className="text-white font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 shadow-xl border-none animate-pulse" style={{ backgroundColor: settings?.flashHubColor || '#e11d48' }}>
                            <Zap className="h-3.5 w-3.5 mr-2 fill-current" style={{ color: settings?.flashHubIconColor || '#fbbf24' }}/> 
                            Flash Sale Live
                        </Badge>
                    )}
                </div>
              </div>
              
              {/* Apple-style Image Gallery Modal */}
              <AppleImageGallery
                images={galleryImages}
                activeIndex={activeImageIndex}
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                onNext={goNextImage}
                onNavigate={goToImage}
                onPrev={goPrevImage}
                productName={product.name}
                alt={product.name}
              />
              
              <div className="flex flex-wrap gap-2 md:gap-3 lg:gap-4 justify-center md:justify-start overflow-x-auto pb-2">
                {galleryImages.map((url, idx) => {
                    const belongsToVariant = product.variants?.find(v => v.imageUrl === url || v.additionalImageUrls?.includes(url));
                    return (
                        <button
                            key={url + idx}
                            onClick={() => {
                                goToImage(idx);
                                if (belongsToVariant && belongsToVariant.options) {
                                    setSelectedOptions(prev => ({ ...prev, ...belongsToVariant.options }));
                                }
                            }}
                            className={cn(
                                "relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg md:rounded-2xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 active:scale-95",
                                !showVideo && activeImage === url ? "border-primary shadow-lg ring-2 ring-primary/20 scale-110" : "border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
                            )}
                        >
                            <Image src={url} alt={`View ${idx + 1}`} fill className="object-cover" unoptimized />
                            {belongsToVariant && (
                                <div className="absolute top-0 right-0 p-0.5 bg-primary/80 text-white rounded-bl-md">
                                    <Check className="h-2 w-2" />
                                </div>
                            )}
                        </button>
                    );
                })}
                {product.videoEnabled && product.videoUrl && (
                    <button onClick={() => setShowVideo(true)} className={cn("relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg md:rounded-2xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 active:scale-95 bg-slate-900 group", showVideo ? "border-primary shadow-lg ring-2 ring-primary/20 scale-110" : "border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100")}>
                        {product.videoPosterUrl && <Image src={product.videoPosterUrl} alt="" fill className="object-cover opacity-40" unoptimized />}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white"><VideoIcon className="h-5 md:h-6 w-5 md:w-6 mb-1" /><span className="text-[7px] md:text-[8px] font-black uppercase">Play</span></div>
                    </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4 md:gap-6 lg:gap-8">
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("h-3.5 md:h-4 w-3.5 md:w-4 fill-current", i >= Math.floor(reviewStats.avg) && "text-slate-200 dark:text-slate-800")} />
                  ))}
                </div>
                <span className="text-[10px] md:text-[11px] text-[#86868b] font-medium">{reviewStats.avg} / 5.0 ({reviewStats.count} reviews)</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] leading-tight">{product.name}</h1>
              {product.voiceEnabled && visibleVoices.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-500">
                  <Badge className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ backgroundColor: `${settings?.productReviewVoiceBtnColor || "#3b82f6"}0D`, color: settings?.productReviewVoiceBtnColor || "#3b82f6", borderColor: `${settings?.productReviewVoiceBtnColor || "#3b82f6"}1A` }}>
                    <Volume2 className="h-3.5 w-3.5" />
                    Voice Description Available
                  </Badge>
                </div>
              )}
              <div className="flex items-start gap-3 pt-2">
                <div className={cn("flex flex-col gap-1 md:gap-1.5 transition-all duration-300", isChangingVariant && "opacity-40 blur-[1px]")}>
                  {!today ? <Skeleton className="h-8 md:h-10 w-32" /> : (
(!product.hasVariants || selectedVariant || previewVariant) ? (
                      <><span className={cn("text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight", isDiscounted ? "text-[#e11d48]" : "text-[#1d1d1f] dark:text-[#f5f5f7]")}>{formatCurrency(currentPrice, currencySymbol)}</span>
                      {isDiscounted && !product.hasVariants && <span className="text-sm md:text-base text-[#86868b] line-through">Was: {formatCurrency(product.sellingPrice, currencySymbol)}</span>}</>
                    ) : null
                  )}
                  {(selectedVariant?.sku || previewVariant?.sku || product.sku) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="h-5 px-2 rounded-md text-[9px] font-bold border-slate-200 text-[#86868b] bg-slate-50 uppercase tracking-tighter">SKU: {selectedVariant?.sku || previewVariant?.sku || product.sku}</Badge>
                    </div>
                  )}
                  <div className="pt-0.5 md:pt-1">
                    <Badge 
                      variant="outline"
                      className={cn(
                        "h-6 md:h-7 px-3 md:px-4 rounded-full font-bold text-[10px] md:text-[11px] border-none shadow-sm flex items-center gap-1.5",
                        isOutOfStock 
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" 
                          : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", isOutOfStock ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                      {isOutOfStock ? 'Sold Out' : 'In Stock'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {product.rewardAdsEnabled && activeRewardAd && !rewardAdClicked && !isOutOfStock && (
              <Button 
                onClick={handleRewardClick}
                variant="outline"
                className="w-full h-14 rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100 font-black uppercase tracking-widest gap-2 shadow-sm animate-pulse"
              >
                <Gift className="h-5 w-5" />
                Unlock {activeRewardAd.rewardDiscountType === 'percentage' ? activeRewardAd.rewardDiscountValue + '%' : currencySymbol + activeRewardAd.rewardDiscountValue} Discount
              </Button>
            )}

            {product.voiceEnabled && visibleVoices.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AudioWaveform className="h-4 w-4" style={{ color: settings?.productReviewVoiceBtnColor || "#3b82f6" }} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Audio Experience Suite</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {visibleVoices.map((voice) => (
                            <IndividualTrackPlayer 
                                key={voice.id} 
                                track={voice} 
                                branding={voiceBranding} 
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-3 md:space-y-4 p-4 md:p-5 bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-3xl transition-all duration-500 shadow-sm border-2 border-black/10 dark:border-white/20">
              {product.hasVariants && product.variantOptions && (
                <div className="space-y-6 mb-6">
                  {product.variantOptions.map((option, idx) => {
                    const isColor = option.name.toLowerCase().includes('color');
                    const isSize = option.name.toLowerCase().includes('size');
                    return (
                      <div key={option.name} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#86868b] flex items-center gap-2">
                            {option.name}
                          </label>
                          {selectedOptions[option.name] && (
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "h-6 px-3 rounded-full border-none text-[10px] font-black uppercase tracking-wider animate-in fade-in zoom-in duration-500",
                                (isSize && !isColor) ? "bg-white text-black shadow-sm" : "bg-primary/10 text-primary"
                              )}
                            >
                              {selectedOptions[option.name]}
                            </Badge>
                          )}
                        </div>
                      <div className="flex flex-wrap gap-2 md:gap-3">
                        {option.values.map((value) => {
                          const isSelected = selectedOptions[option.name] === value;
                          const isAvailable = isOptionValueAvailable(option.name, value);
                          const useRound = isColor || isSize;
                          
                          // Shorten text if too long (Robust truncation)
                          const displayValue = value.length > 8 ? value.substring(0, 6).trim() + '..' : value;
                          
                          if (useRound) {
                            const colorValue = value.toLowerCase();
                            const textColor = isColor 
                              ? getContrastColor(colorValue) 
                              : (isSelected ? getContrastColor(settings?.storeAddToCartColor || '#3b82f6') : undefined);

                            return (
                              <button
                                key={value}
                                onClick={() => handleOptionChange(option.name, value)}
                                className={cn(
                                  "min-w-[3rem] h-12 rounded-full border-2 transition-all p-1 relative flex items-center justify-center group active:scale-95",
                                  isSelected
                                    ? "border-primary scale-110 shadow-lg ring-4 ring-primary/10 z-10"
                                    : "border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:scale-105",
                                  !isAvailable && "opacity-40"
                                )}
                                title={value + (!isAvailable ? " (Out of Stock)" : "")}
                                >
                                <div
                                  className={cn(
                                    "w-full h-full rounded-full border border-black/5 flex flex-col items-center justify-center overflow-hidden relative px-2.5 transition-all duration-300",
                                    !isColor && (isSelected ? (isSize ? "bg-white shadow-inner" : "bg-primary") : (isSize ? "bg-white" : "bg-white dark:bg-black/40"))
                                  )}
                                  style={{ 
                                    backgroundColor: isColor ? colorValue : undefined,
                                  }}
                                >
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-tight truncate relative z-10 transition-colors duration-300",
                                    !isColor && (isSelected ? (isSize ? "text-black" : "") : (isSize ? "text-black" : "text-black dark:text-white"))
                                  )}
                                  style={{ color: (isColor) ? textColor : (isSize ? "black" : (isSelected ? textColor : undefined)) }}
                                  >
                                    {displayValue}
                                  </span>
                                  {!isAvailable && !(isColor && isOutOfStock) && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                      <div className="w-full h-[1.5px] bg-rose-500/80 rotate-45 shadow-sm" />
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-white/10 dark:bg-black/10 animate-pulse" />
                                  )}
                                </div>
                                </button>
                            );
                          }
                          
                          return (
                            <button
                              key={value}
                              onClick={() => handleOptionChange(option.name, value)}
                              disabled={false} // Allow selecting out of stock to see it's out of stock
                              className={cn(
                                "relative px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all min-w-[5rem] h-14 flex flex-col items-center justify-center gap-0.5 overflow-hidden active:scale-95",
                                isSelected 
                                  ? "border-primary bg-primary text-white shadow-lg z-10 scale-105" 
                                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-black text-[#1d1d1f] dark:text-white hover:border-primary/50",
                                !isAvailable && "opacity-60"
                              )}
                              title={value}
                            >
                              <span className="relative z-10 truncate w-full px-1">{displayValue}</span>
                              {!isAvailable && (
                                <>
                                  <span className="relative z-10 text-[7px] leading-none uppercase font-black text-rose-500">Sold Out</span>
                                  <div className="absolute inset-0 z-0">
                                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-rose-500/20 -rotate-45" />
                                  </div>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
              {previewVariant && (previewVariant.description || previewVariant.sku || (previewVariant.options && Object.keys(previewVariant.options).length > 0) || (previewVariant.additionalImageUrls && previewVariant.additionalImageUrls.length > 0)) && (
                <div className="mb-6 p-5 rounded-2xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-500 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-primary">Specification: {previewVariant.name}</span>
                    </div>
                    {previewVariant.sku && (
                      <Badge variant="outline" className="text-[9px] font-bold border-primary/20 text-primary bg-white px-2 py-0.5 rounded-lg">SKU: {previewVariant.sku}</Badge>
                    )}
                  </div>
                  
                  {previewVariant.description && (
                    <p className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] leading-relaxed mb-4 p-3 bg-white/50 dark:bg-black/20 rounded-xl">
                      {previewVariant.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {previewVariant.options && Object.entries(previewVariant.options).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">{key}</span>
                        <span className="text-[11px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">{value}</span>
                      </div>
                    ))}
                  </div>

                  {previewVariant.additionalImageUrls && previewVariant.additionalImageUrls.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-primary/10">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Extended Gallery</span>
                      <div className="flex flex-wrap gap-2">
                        {previewVariant.additionalImageUrls.map((url, i) => {
                          const globalIndex = galleryImages.indexOf(url);
                          return (
                          <button 
                            key={i} 
                            onClick={() => { 
                              if (globalIndex !== -1) {
                                goToImage(globalIndex);
                              } else {
                                setActiveImage(url);
                                setShowVideo(false);
                              }
                            }}
                            className={cn(
                              "relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                              activeImage === url ? "border-primary shadow-md scale-110" : "border-transparent opacity-70 hover:opacity-100"
                            )}
                          >
                            <Image src={url} alt="" fill className="object-cover" unoptimized />
                          </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(activeSectionPromo?.endDate || (isDiscounted && product.promo?.endDate)) && (
                <PromoCountdown endDate={activeSectionPromo?.endDate || convertToDateSafely(product.promo!.endDate)!} />
              )}
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary dark:text-primary bg-gradient-to-r from-primary/20 to-transparent px-2.5 py-1 rounded-lg inline-w-max w-fit">Select Quantity</label>
                  {isDiscounted && !isOutOfStock && today && (
                    <div 
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider animate-pulse"
                      style={{ color: settings?.flashHubColor || '#e11d48' }}
                    >
                      <Zap className="h-3 w-3 fill-current" />
                      Flash Sale Live
                    </div>
                  )}
                </div>
                {currentStock <= 5 && currentStock > 0 && (
                  <span className="text-[10px] font-bold text-[#e11d48] animate-pulse">Only {currentStock} left!</span>
                )}
              </div>
              {canBuy && (
<div className={cn("flex items-center gap-3 md:gap-4 transition-all duration-300", isChangingVariant && "opacity-50 pointer-events-none")}>
                <div className="flex items-center bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/15 border-2 border-primary/30 dark:border-primary/40 rounded-[18px] p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 md:h-12 w-10 md:w-12 rounded-[14px] bg-gradient-to-br from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-700 text-white hover:shadow-lg dark:hover:shadow-rose-500/50 active:scale-95 transition-all font-bold disabled:opacity-30"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={isOutOfStock || isChangingVariant}
                  >
                    <Minus className="h-4 md:h-5 w-4 md:w-5" />
                  </Button>
                  <span className={cn("w-10 md:w-12 text-center text-lg font-black tabular-nums tracking-tight text-primary dark:text-primary", (isOutOfStock || isChangingVariant) && "opacity-30")}>{isOutOfStock ? 0 : quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 md:h-12 w-10 md:w-12 rounded-[14px] bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700 text-white hover:shadow-lg dark:hover:shadow-emerald-500/50 active:scale-95 transition-all font-bold disabled:opacity-30"
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    disabled={isOutOfStock || isChangingVariant}
                  >
                    <Plus className="h-4 md:h-5 w-4 md:w-5" />
                  </Button>
                </div>
                <Button
                  onClick={isOutOfStock ? () => setIsOutOfDataDrawerOpen(true) : handleAddToCart}
                  style={isOutOfStock ? { backgroundColor: '#e2e8f0', color: '#94a3b8' } : buttonStyle}
                  disabled={isChangingVariant || isAddingToCart}
                  className={cn(
                      "flex-1 font-semibold tracking-tight shadow-sm transition-all active:scale-[0.98] group",
                      buttonClasses,
                      (isOutOfStock || isChangingVariant) && "cursor-pointer"
                  )}
                >
                  {isAddingToCart ? (
                    <Loader2 className="mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5 animate-spin" />
                  ) : (
                    <AddToCartIcon className="mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5" />
                  )}
                  {isOutOfStock ? "Out of Stock" : (isChangingVariant ? "Updating.." : addToCartText)}
                </Button>
              </div>
              )}

              
              {canBuy && installmentData && !isOutOfStock && (
                <div className="mt-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
                  <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Flexible Ownership</span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Pay Small Small</h3>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Spread your cost comfortably over {product.numberOfPayments} payments.</p>
                      </div>
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20">
                        Instant Approval
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pay Today</p>
                        <p className="text-xl font-black text-primary">{formatCurrency(installmentData.downPaymentAmount, currencySymbol)}</p>
                      </div>
                      <div className="p-5 rounded-3xl bg-slate-100/50 dark:bg-white/5 border border-transparent shadow-inner space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Balance</p>
                        <p className="text-xl font-black text-slate-700 dark:text-slate-200">{formatCurrency(installmentData.remainingBalance, currencySymbol)}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Down Payment</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{product.downPaymentPercentage}% required upfront</p>
                          </div>
                          <span className="text-xs font-black text-primary">{product.downPaymentPercentage}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-white/5">
                           <div 
                              className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-1000 ease-out" 
                              style={{ width: `${product.downPaymentPercentage}%` }}
                           />
                        </div>
                      </div>

                      <div className="relative p-5 rounded-[2rem] bg-primary/5 border border-primary/10 overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500">
                           <Clock className="h-12 w-12 text-primary" />
                        </div>
                        
                        <div className="relative z-10 space-y-3">
                          <div className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-wider">
                            <Clock className="h-3.5 w-3.5" />
                            Next: {format(installmentData.nextDueDate, 'MMMM do')}
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                              {formatCurrency(installmentData.installmentAmount, currencySymbol)} / {product.paymentInterval}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                              Your remaining balance will be split into {product.numberOfPayments} equal installments.
                            </p>
                          </div>

                          {product.lateFee > 0 && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <Info className="h-3 w-3 text-rose-500" />
                              <p className="text-[9px] text-rose-500 font-bold italic tracking-tight">
                                Late fee of {formatCurrency(product.lateFee, currencySymbol)} applies after due date.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        setIsLoadingInstallment(true);
                        // Short delay for loading feedback before navigation
                        setTimeout(() => {
                          router.push(getStoreUrl(`/store/checkout/installment?productId=${product.id}&qty=${quantity}&variantId=${selectedVariant?.id || ''}`));
                        }, 300);
                      }}
                      disabled={isLoadingInstallment}
                      className="w-full h-16 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 dark:shadow-none group"
                    >
                      {isLoadingInstallment ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          <span className="text-lg font-black tracking-tight">Loading...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-black tracking-tight">Choose Installment Plan</span>
                          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                    
                    {product.installmentTerms && (
                      <div className="text-center">
                         <p className="text-[10px] text-slate-400 font-medium italic">By proceeding, you agree to our <span className="text-primary hover:underline cursor-pointer">Installment Terms & Conditions</span>.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <StockBar stock={currentStock} lowStockThreshold={lowStockThreshold} className="mt-4" />
              
              {canBuy && filteredPaymentMethods.find(m => m.id === 'fast_checkout')?.config?.enableQuickPayButtons && !isOutOfStock && (
                <div className="pt-6 border-t border-black/[0.05] dark:border-white/[0.1]">
                  <FastCheckoutButtons 
                    storeId={storeId}
                    amount={currentPrice * quantity}
                    currency={settings?.currency || 'NGN'}
                    availableMethods={filteredPaymentMethods}
                    onSuccess={(orderId) => {}}
                    onBeforeCheckout={async () => {
                      try {
                        const result = await fetch('/api/internal/create-express-order', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            storeId,
                            items: [{
                              productId: product.id,
                              quantity,
                              price: currentPrice,
                              variantId: selectedVariant?.id,
                              selectedOptions: product.hasVariants ? selectedOptions : undefined,
                            }],
                            totalAmount: currentPrice * quantity,
                            totalCost: (product.purchasePrice || 0) * quantity,
                          })
                        }).then(r => r.json());
                        
                        if (result.success) return result.orderId;
                        throw new Error(result.error);
                      } catch (e: any) {
                        toast({ variant: 'destructive', title: 'Order Failed', description: e.message });
                        return null;
                      }
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 md:gap-4">
              <Button variant="outline" size="lg" className={cn("flex-1 h-12 md:h-14 rounded-full font-semibold tracking-tight transition-all", isInWishlist && "text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-950/20")} onClick={handleToggleWishlist}>
                <Heart className={cn("h-5 w-5 mr-2", isInWishlist && "fill-current")} /> {isInWishlist ? "Saved to Wishlist" : "Save for Later"}
              </Button>
              {settings?.enableProductSharing && (
                <Button variant="outline" size="icon" className="h-12 md:h-14 w-12 md:w-14 rounded-full group hover:border-primary transition-all" onClick={handleShare}>
                  <ShareIcon className="h-5 w-5 group-hover:text-primary" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4 pt-6 md:pt-8 border-t border-black/[0.05] dark:border-white/[0.1]">
              {(product.badge1Enabled !== false) && (
                <div className="flex items-center gap-3 text-[11px] font-medium text-[#86868b]">
                  <div className="h-10 w-10 rounded-full bg-[#f5f5f7] dark:bg-[#1d1d1f] flex items-center justify-center text-[#1d1d1f] dark:text-[#f5f5f7] flex-shrink-0"><Badge1Icon className="h-5 w-5" /></div>
                  <span className="leading-tight">{product.badge1Title || 'Free Express'}<br/>{product.badge1Sub || 'Fulfillment'}</span>
                </div>
              )}
              {(product.badge2Enabled !== false) && (
                <div className="flex items-center gap-3 text-[11px] font-medium text-[#86868b]">
                  <div className="h-10 w-10 rounded-full bg-[#f5f5f7] dark:bg-[#1d1d1f] flex items-center justify-center text-[#1d1d1f] dark:text-[#f5f5f7] flex-shrink-0"><Badge2Icon className="h-5 w-5" /></div>
                  <span className="leading-tight">{product.badge2Title || '2-Year Warranty'}<br/>{product.badge2Sub || 'Protection'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {product.description && (
          <>
            <BannerAd location="product_details" className="mt-12" />
            <section className="mt-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[#f5f5f7] dark:bg-[#1d1d1f] flex items-center justify-center text-[#1d1d1f] dark:text-[#f5f5f7] border-2 border-black/10 dark:border-white/20 shadow-sm">
                  <DescriptionIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">{product.descriptionTitle || 'Product Story'}</h2>
                  <p className="text-xs font-medium uppercase tracking-widest text-[#86868b] mt-1">Detailed insights</p>
                </div>
              </div>
              <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2.5rem] p-6 md:p-8 border-2 border-black/10 dark:border-white/20 transition-all duration-500 shadow-sm relative overflow-hidden">
                <div className="prose dark:prose-invert max-w-none text-[#1d1d1f] dark:text-[#f5f5f7] leading-relaxed text-lg font-normal relative z-10">
                  <div className="rich-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{product.description}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {product.videos && product.videos.length > 0 && (
            <ProductVideoGallery videos={product.videos} title={product.videosTitle} description={product.videosDescription} />
        )}

        {(showTechnicalSpecs || showLogisticsTab || showVerifiedReviews) && (
        <div className="mt-24">
          <Tabs defaultValue={showTechnicalSpecs ? "details" : showLogisticsTab ? "shipping" : "reviews"} className="w-full">
            <div className="flex justify-center md:justify-start mb-10">
              <TabsList className="inline-flex h-auto p-1.5 bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-full border border-black/[0.05] dark:border-white/[0.1] overflow-x-auto no-scrollbar">
                {showTechnicalSpecs && (
                  <TabsTrigger value="details" className="group flex items-center gap-2 px-6 py-2 rounded-full transition-all font-semibold text-xs tracking-tight">
                    <Info className="h-4 w-4" /> Technical Specs
                  </TabsTrigger>
                )}
                {showLogisticsTab && (
                  <TabsTrigger value="shipping" className="group flex items-center gap-2 px-6 py-2 rounded-full transition-all font-semibold text-xs tracking-tight">
                    <Truck className="h-4 w-4" /> Shipping & Returns
                  </TabsTrigger>
                )}
                {showVerifiedReviews && (
                  <TabsTrigger value="reviews" className="group flex items-center gap-2 px-6 py-2 rounded-full transition-all font-semibold text-xs tracking-tight">
                    <Star className="h-4 w-4" /> Reviews <span className="ml-1 opacity-50">{reviewStats.count}</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            {showTechnicalSpecs && (
            <TabsContent value="details" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-7 space-y-8">
                  {(product.specifications && product.specifications.length > 0) && (
                    <div className="p-6 rounded-[2rem] bg-[#f5f5f7] dark:bg-[#1d1d1f] space-y-4 border-2 border-black/10 dark:border-white/20">
                      <h3 className="text-2xl font-semibold tracking-tight flex items-center gap-4 text-[#1d1d1f] dark:text-[#f5f5f7]">
                        <ListChecks className="h-6 w-6" /> 
                        {product.specificationsTitle || 'Specifications'}
                      </h3>
                      <div className="grid grid-cols-1">
                        {product.specifications?.map((spec, i) => (
                          <div key={`custom-${i}`} className="flex justify-between py-4 border-b last:border-0 border-black/[0.05] dark:border-white/[0.1]">
                            <span className="text-[#86868b] font-medium text-sm">{spec.label}</span>
                            <span className="font-semibold text-sm text-right text-[#1d1d1f] dark:text-[#f5f5f7]">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(product.variations && product.variations.length > 0) && (
                    <div className="p-6 rounded-[2rem] bg-[#f5f5f7] dark:bg-[#1d1d1f] space-y-4 border-2 border-black/10 dark:border-white/20">
                      <h3 className="text-2xl font-semibold tracking-tight flex items-center gap-4 text-[#1d1d1f] dark:text-[#f5f5f7]">
                        <Layers className="h-6 w-6" /> 
                        {product.variationsTitle || 'Variations'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {product.variations.map((v, i) => (
                          <Badge key={i} variant="outline" className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-black border-black/[0.05] dark:border-white/[0.1]">
                            {v.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.sizeGuideImageUrl && (
                    <div className="p-6 rounded-[2rem] bg-[#f5f5f7] dark:bg-[#1d1d1f] space-y-4 border-2 border-black/10 dark:border-white/20">
                      <h3 className="text-2xl font-semibold tracking-tight flex items-center gap-4 text-[#1d1d1f] dark:text-[#f5f5f7]">
                        <Maximize className="h-6 w-6" /> 
                        Sizing Guide
                      </h3>
                      <div className="relative aspect-video rounded-2xl overflow-hidden border border-black/[0.05] dark:border-white/[0.1] bg-white p-4">
                        <Image src={product.sizeGuideImageUrl} alt="Size guide" fill className="object-contain" unoptimized />
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-5 space-y-8">
                  {product.whatsInTheBox && product.whatsInTheBox.length > 0 && (
                    <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] p-6 rounded-[2rem] space-y-4 border-2 border-black/10 dark:border-white/20">
                      <h3 className="text-2xl font-semibold tracking-tight flex items-center gap-4 text-[#1d1d1f] dark:text-[#f5f5f7]">
                        <Package className="h-6 w-6" /> 
                        {product.whatsInTheBoxTitle || 'In the Box'}
                      </h3>
                      <div className="space-y-3">
                        {product.whatsInTheBox.map((item, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7] bg-white dark:bg-black/40 p-4 rounded-xl border border-black/[0.05] dark:border-white/[0.1]">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#1d1d1f] dark:bg-[#f5f5f7]" />
                            {item.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(product.showProductInsight === true) && (
                    <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] p-6 rounded-[2rem] space-y-4 border-2 border-black/10 dark:border-white/20">
                      <h3 className="text-2xl font-semibold tracking-tight flex items-center gap-4 text-[#1d1d1f] dark:text-[#f5f5f7]">
                        <Info className="h-6 w-6" />
                        Insights
                      </h3>
                      <div className="space-y-6">
                        {product.supplierName && (
                          <div className="flex justify-between items-center pb-4 border-b border-black/[0.05] dark:border-white/[0.1]">
                            <span className="text-xs font-medium text-[#86868b] uppercase tracking-wider">Brand</span>
                            <span className="font-semibold text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">{product.supplierName}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-8">
                          {creationDate && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-medium text-[#86868b] uppercase tracking-wider">Release Date</span>
                              <span className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{format(creationDate, 'MMMM yyyy')}</span>
                            </div>
                          )}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-[#86868b] uppercase tracking-wider">Condition</span>
                            <span className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">New</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            )}
            {showLogisticsTab && (
              <TabsContent value="shipping" className="mt-0">
                <div className="max-w-5xl space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-[2rem] space-y-3 bg-[#f5f5f7] dark:bg-[#1d1d1f] border-2 border-black/10 dark:border-white/20">
                      <div className="h-12 w-12 rounded-full bg-white dark:bg-black flex items-center justify-center text-[#1d1d1f] dark:text-[#f5f5f7] mb-4 shadow-sm border-2 border-black/5 dark:border-white/5">
                        <Truck className="h-6 w-6" />
                      </div>
                      <h4 className="font-semibold text-xl tracking-tight">Free Express Delivery</h4>
                      <p className="text-sm text-[#86868b] leading-relaxed">{settings?.shippingPolicy || "Orders are processed within 24 hours. Domestic delivery typically arrives in 3-5 business days."}</p>
                    </div>
                    <div className="p-6 rounded-[2rem] space-y-3 bg-[#f5f5f7] dark:bg-[#1d1d1f] border-2 border-black/10 dark:border-white/20">
                      <div className="h-12 w-12 rounded-full bg-white dark:bg-black flex items-center justify-center text-[#1d1d1f] dark:text-[#f5f5f7] mb-4 shadow-sm border-2 border-black/5 dark:border-white/5">
                        <RotateCcw className="h-6 w-6" />
                      </div>
                      <h4 className="font-semibold text-xl tracking-tight">Easy Returns</h4>
                      <p className="text-sm text-[#86868b] leading-relaxed">{settings?.returnsPolicy || "Not the perfect fit? Return any unused item within 30 days for a full refund."}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
            {showVerifiedReviews && (
            <TabsContent value="reviews" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <div className="lg:col-span-4 space-y-8">
                  <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] p-6 rounded-[2rem] text-center border-2 border-black/10 dark:border-white/20">
                    <p className="text-6xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">{reviewStats.avg}</p>
                    <div className="flex justify-center text-amber-400 my-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("h-6 w-6 fill-current", i >= Math.floor(reviewStats.avg) && "text-slate-300 dark:text-slate-800")} />
                      ))}
                    </div>
                    <p className="text-sm font-medium text-[#86868b]">Based on {reviewStats.count} ratings</p>
                  </div>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((stars, idx) => (
                      <div key={stars} className="flex items-center gap-4">
                        <span className="w-12 text-xs font-medium text-[#86868b]">{stars} Star</span>
                        <Progress value={reviewStats.distribution[idx]} className="h-1.5 flex-1 bg-black/[0.05] dark:bg-white/[0.05]" />
                        <span className="w-10 text-right text-xs font-medium text-[#86868b]">{reviewStats.distribution[idx]}%</span>
                      </div>
                    ))}
                  </div>
                  <ProductReviewForm productId={productId} storeId={storeId} />
                </div>
                <div className="lg:col-span-8 space-y-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Customer Feedback</h3>
                  </div>
                  {visibleReviews && visibleReviews.length > 0 ? (
                    <div className="space-y-12">
                      {visibleReviews.map((review) => { 
                        const reviewDate = convertToDateSafely(review.createdAt); 
                        return (
                          <div key={review.id} className="space-y-4 group animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-4">
                                <Avatar className="h-10 w-10 border-0">
                                  <AvatarImage src={review.userPhotoURL || ''} alt={review.userName} />
                                  <AvatarFallback className="bg-[#f5f5f7] dark:bg-[#1d1d1f] text-xs font-bold">{review.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                  <div className="flex text-amber-400">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={cn("h-3 w-3 fill-current", i >= review.rating && "text-slate-300 dark:text-slate-800")} />
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">{review.userName}</p>
                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-[9px] h-5 rounded-full border-0 font-medium px-2">Verified Purchase</Badge>
                                  </div>
                                </div>
                              </div>
                              <span className="text-[11px] font-medium text-[#86868b]">{reviewDate ? format(reviewDate, 'PP') : 'Recently'}</span>
                            </div>
                            <p className="text-[#1d1d1f] dark:text-[#f5f5f7] leading-relaxed text-sm opacity-80">{review.comment}</p>
                            {review.audioDataUri && (
                              <div className="mt-3">
                                <VoiceReviewPlayer dataUri={review.audioDataUri} />
                              </div>
                            )}
                            {review.reply && (
                                <div className="mt-4 p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#1d1d1f] border border-black/5 dark:border-white/5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                                        <ReplyIcon className="h-3 w-3" /> Merchant Response
                                    </div>
                                    <p className="text-sm text-[#1d1d1f] dark:text-[#f5f5f7] opacity-80 italic">{review.reply}</p>
                                </div>
                            )}
                          </div>
                        ); 
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-[2rem] bg-black/[0.02] dark:bg-white/[0.02] border-black/20 dark:border-white/20">
                      <MessageSquare className="h-10 w-10 text-[#86868b] mb-4 opacity-20" />
                      <h4 className="text-xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">No reviews yet</h4>
                      <p className="text-sm text-[#86868b] max-w-xs mx-auto">Be the first to share your experience with this product!</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            )}

          </Tabs>
        </div>
        )}

        {showRecommendations && finalRelatedProducts.length > 0 && (
          <section className="mt-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-24" style={recommendationsBgStyle}>
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between mb-16 px-4">
                <div className="space-y-2">
                  <h2 className="text-4xl font-semibold tracking-tight" style={recommendationsTextStyle}>{recommendationsTitle}</h2>
                  <p className="font-medium uppercase tracking-widest text-xs" style={{ ...recommendationsTextStyle, fontSize: "12px", opacity: 0.7 }}>{recommendationsDescription}</p>
                </div>
                <div className="flex gap-4">
                  <Button asChild variant="ghost" className="font-semibold text-sm gap-2 hover:bg-primary/5 rounded-full" style={recommendationsButtonStyle}>
                    <Link href={getStoreUrl('/store/shop')}>
                      Browse Collection <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {finalRelatedProducts.map((related) => (
                  <ProductCard key={related.id} product={related} currencySymbol={currencySymbol} recommendationButtonStyle={recommendationsButtonStyle} />
                ))}
              </div>
            </div>
          </section>
        )}

        <RecentlyViewedSection excludeId={productId} />
        <OutOfDataDrawer 
            isOpen={isOutOfDataDrawerOpen} 
            onOpenChange={setIsOutOfDataDrawerOpen}
            title="Out of Stock"
            description={`${product.name} is currently out of stock. We'll restock soon!`}
            type="stock"
        />
      </main>
    </div>
  );
}
