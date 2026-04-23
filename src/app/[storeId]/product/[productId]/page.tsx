
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, query, collection, where, limit, orderBy } from 'firebase/firestore';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { useRecentlyViewed } from '@/contexts/recently-viewed-context';
import { useSettings } from '@/contexts/settings-context';
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
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, convertToDateSafely } from '@/lib/utils';
import { ProductCard } from '@/components/store/ProductCard';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { OutOfDataDrawer } from '@/components/ui/out-of-data-drawer';
import { ProductReviewForm } from '@/components/store/ProductReviewForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { getStoreUrl as getAbsoluteStoreUrl } from '@/lib/domain';

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
        if (audioRef.current) {
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

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
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
                <input 
                    type="range" 
                    min="0" 
                    max={(isNaN(duration) || !isFinite(duration)) ? 0 : duration} 
                    step="0.1"
                    value={currentTime} 
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:bg-white/30 transition-all"
                />
                <div className="flex justify-between text-[10px] font-black font-mono tracking-widest opacity-70">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <audio 
                ref={audioRef}
                src={audioSource}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
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
  const { isProductInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { addViewedProduct } = useRecentlyViewed();
  const { toast } = useToast();
  const { activeAds, rewardAdClicked, setRewardAdClicked, applyRewardDiscount, recordAdClick } = useAds();
  
  const [quantity, setQuantity] = useState(1);
  const [today, setToday] = useState<Date | null>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOutOfDataDrawerOpen, setIsOutOfDataDrawerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Fetch Product
  const productRef = useMemo(() => firestore ? doc(firestore, 'products', productId) : null, [firestore, productId]);
  const { data: product, isLoading: isLoadingProduct } = useDoc<Product>(productRef);

  // Set initial active image when product loads
  useEffect(() => {
    if (product?.imageUrl) {
      setActiveImage(product.imageUrl);
    }
  }, [product]);

  // Verify product belongs to store
  const isProductInCorrectStore = product && product.store_id === storeId;

  // Fetch Category info
  const categoryRef = useMemo(() => (firestore && product?.categoryId) ? doc(firestore, 'categories', product.categoryId) : null, [firestore, product?.categoryId]);
  const { data: category } = useDoc<Category>(categoryRef);

  // Fetch distributed voice signatures from sub-collection
  const voicesQuery = useMemo(() => {
      if (!firestore || !productId) return null;
      return query(collection(firestore, 'products', productId, 'voiceSignatures'));
  }, [firestore, productId]);
  const { data: distributedVoices } = useCollection<VoiceSignature>(voicesQuery);

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
  const { data: reviews, isLoading: isLoadingReviews } = useCollection<ProductReview>(reviewsQuery);

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
  }, [firestore, product?.categoryId, productId, storeId]);

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
  const recommendationsTitle = settings?.relatedProductsTitle || 'You Might Also Like';
  const recommendationsDescription = settings?.relatedProductsDescription || 'Specially curated items from the same collection.';

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

  const isDiscounted = product ? (effectivePrice < product.sellingPrice) : false;
  const isOutOfStock = product ? product.stock <= 0 : false;
  const isInWishlist = isProductInWishlist(productId);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const all = [product.imageUrl, ...(product.additionalImageUrls || [])].filter(Boolean) as string[];
    return all;
  }, [product]);

  const reviewStats = useMemo(() => {
    if (!reviews || reviews.length === 0) return { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
    const count = reviews.length;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    const avg = parseFloat((sum / count).toFixed(1));
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      const idx = Math.max(0, Math.min(Math.floor(r.rating) - 1, 4));
      distribution[idx]++;
    });
    const percentages = distribution.map(val => Math.round((val / count) * 100)).reverse();
    return { avg, count, distribution: percentages };
  }, [reviews]);

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addToCart(product, effectivePrice);
      }
    }
  };

  const handleToggleWishlist = () => {
    if (isInWishlist) removeFromWishlist(productId);
    else addToWishlist(productId);
  };

  const handleShare = async () => {
    if (typeof window === 'undefined' || !product) return;

    const baseUrl = getAbsoluteStoreUrl(
        storeId, 
        settings?.plan || 'free', 
        settings?.customDomain, 
        settings?.subdomain, 
        settings?.primaryDomainType
    );
    
    let path = `/product/${productId}`;
    // If we're on the free domain, we need to include /store in the path if that's how it's structured
    // Wait, the public pages are under [storeId]/product/[productId]
    // The relative URL for shop is /store/shop ? 
    // Let's check useStoreUrl hook again.
    
    const fullUrl = `${baseUrl}${path}`;

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

  if (isLoadingProduct) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7"><Skeleton className="aspect-square w-full rounded-3xl" /></div>
          <div className="lg:col-span-5 space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
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
      color: settings?.voiceExperienceColor || 'var(--primary)',
      iconUrl: settings?.voiceExperienceIconUrl
  };

  const visibleVoices = (distributedVoices || []).filter(v => v.isVisible !== false);

  return (
    <div className="bg-white dark:bg-black min-h-screen">
      <StickyProductBar
        productName={product.name}
        productPrice={formatCurrency(effectivePrice, currencySymbol)}
        isInWishlist={isInWishlist}
        isOutOfStock={isOutOfStock}
        onAddToCart={isOutOfStock ? () => setIsOutOfDataDrawerOpen(true) : handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        addToCartText={isOutOfStock ? "Out of Stock" : addToCartText}
      />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        <div className="md:hidden mb-4 sticky top-0 z-40 bg-white dark:bg-black pb-2">
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
              <div className="aspect-square bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-2xl md:rounded-3xl lg:rounded-[2.5rem] overflow-hidden relative">
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
                    <Image src={activeImage || product.imageUrl || defaultImageUrl} alt={product.name} fill priority className={cn("object-cover transition-all duration-700 ease-in-out", isOutOfStock && "opacity-50 grayscale")} unoptimized />
                )}
                <div className="absolute top-8 left-8 flex flex-col gap-3">
                    {product.isOfficialBrand && (
                        <Badge className="bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest px-2 py-1 shadow-md border-none">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2 fill-current" /> Official Brand
                        </Badge>
                    )}
                    {isDiscounted && !isOutOfStock && today && (
                        <Badge className="text-white font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 shadow-xl border-none animate-pulse" style={{ backgroundColor: settings?.flashHubColor || '#e11d48' }}>
                            <Zap className="h-3.5 w-3.5 mr-2 fill-current" style={{ color: settings?.flashHubIconColor || '#fbbf24' }}/> 
                            Flash Sale Live
                        </Badge>
                    )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3 lg:gap-4 justify-center md:justify-start overflow-x-auto pb-2">
                {galleryImages.map((url, idx) => (
                <button key={url + idx} onClick={() => { setActiveImage(url); setShowVideo(false); }} className={cn("relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg md:rounded-2xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 active:scale-95", !showVideo && activeImage === url ? "border-primary shadow-lg ring-2 ring-primary/20 scale-110" : "border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100")}>
                    <Image src={url} alt={`View ${idx + 1}`} fill className="object-cover" unoptimized />
                </button>
                ))}
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
              <div className="flex items-start gap-3 pt-2">
                <div className="flex flex-col gap-1 md:gap-1.5">
                  {!today ? <Skeleton className="h-8 md:h-10 w-32" /> : (
                    <><span className={cn("text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight", isDiscounted ? "text-[#e11d48]" : "text-[#1d1d1f] dark:text-[#f5f5f7]")}>{formatCurrency(effectivePrice, currencySymbol)}</span>
                    {isDiscounted && <span className="text-sm md:text-base text-[#86868b] line-through">Was: {formatCurrency(product.sellingPrice, currencySymbol)}</span>}</>
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
                        <AudioWaveform className="h-4 w-4 text-primary" />
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

            {!isOutOfStock && (
              <div className="space-y-3 md:space-y-4 p-4 md:p-5 bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-3xl transition-all duration-500 shadow-sm border-2 border-black/10 dark:border-white/20">
                {(activeSectionPromo?.endDate || (isDiscounted && product.promo?.endDate)) && (
                  <PromoCountdown endDate={activeSectionPromo?.endDate || convertToDateSafely(product.promo!.endDate)!} />
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1d1d1f] dark:text-[#f5f5f7]">Select Quantity</label>
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
                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="text-[10px] font-bold text-[#e11d48] animate-pulse">Only {product.stock} left!</span>
                  )}
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex items-center bg-black/[0.03] dark:bg-white/[0.08] border-2 border-black/10 dark:border-white/20 rounded-[18px] p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 md:h-12 w-10 md:w-12 rounded-[14px] hover:bg-white dark:hover:bg-white/10 hover:shadow-sm active:scale-95 transition-all" 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 md:h-5 w-4 md:w-5" />
                    </Button>
                    <span className="w-10 md:w-12 text-center text-lg font-semibold tabular-nums tracking-tight">{quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 md:h-12 w-10 md:w-12 rounded-[14px] hover:bg-white dark:hover:bg-white/10 hover:shadow-sm active:scale-95 transition-all" 
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    >
                      <Plus className="h-4 md:h-5 w-4 md:w-5" />
                    </Button>
                  </div>
                  <Button 
                    onClick={isOutOfStock ? () => setIsOutOfDataDrawerOpen(true) : handleAddToCart} 
                    style={isOutOfStock ? { backgroundColor: '#e2e8f0', color: '#94a3b8' } : buttonStyle}
                    className={cn(
                        "flex-1 font-semibold tracking-tight shadow-sm transition-all active:scale-[0.98] group", 
                        buttonClasses,
                        isOutOfStock && "cursor-pointer"
                    )}
                  >
                    <AddToCartIcon className="mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5" /> {isOutOfStock ? "Out of Stock" : addToCartText}
                  </Button>
                </div>

                <StockBar stock={product.stock} lowStockThreshold={lowStockThreshold} className="mt-4" />
                
                {filteredPaymentMethods.find(m => m.id === 'fast_checkout')?.config?.enableQuickPayButtons && !isOutOfStock && (
                  <div className="pt-6 border-t border-black/[0.05] dark:border-white/[0.1]">
                    <FastCheckoutButtons 
                      storeId={storeId}
                      amount={effectivePrice * quantity}
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
                                price: effectivePrice
                              }],
                              totalAmount: effectivePrice * quantity,
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
            )}

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
                  <TabsTrigger value="details" className="group flex items-center gap-2 px-6 py-2 rounded-full transition-all font-semibold text-xs tracking-tight data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:shadow-sm">
                    <Info className="h-4 w-4" /> Technical Specs
                  </TabsTrigger>
                )}
                {showLogisticsTab && (
                  <TabsTrigger value="shipping" className="group flex items-center gap-2 px-6 py-2 rounded-full transition-all font-semibold text-xs tracking-tight data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:shadow-sm">
                    <Truck className="h-4 w-4" /> Shipping & Returns
                  </TabsTrigger>
                )}
                {showVerifiedReviews && (
                  <TabsTrigger value="reviews" className="group flex items-center gap-2 px-6 py-2 rounded-full transition-all font-semibold text-xs tracking-tight data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:shadow-sm">
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
                  <ProductReviewForm productId={productId} />
                </div>
                <div className="lg:col-span-8 space-y-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Customer Feedback</h3>
                  </div>
                  {reviews && reviews.length > 0 ? (
                    <div className="space-y-12">
                      {reviews.map((review) => { 
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
          <section className="mt-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-24 bg-[#f5f5f7] dark:bg-[#1d1d1f]">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between mb-16 px-4">
                <div className="space-y-2">
                  <h2 className="text-4xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">{recommendationsTitle}</h2>
                  <p className="text-[#86868b] font-medium uppercase tracking-widest text-xs">{recommendationsDescription}</p>
                </div>
                <div className="flex gap-4">
                  <Button asChild variant="ghost" className="font-semibold text-sm text-primary gap-2 hover:bg-primary/5 rounded-full">
                    <Link href={getStoreUrl('/store/shop')}>
                      Browse Collection <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {finalRelatedProducts.map((related) => (
                  <ProductCard key={related.id} product={related} currencySymbol={currencySymbol} />
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
