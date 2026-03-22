
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
  ArrowLeft
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
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { addToCart } = useCart();
  const { isProductInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { addViewedProduct } = useRecentlyViewed();
  const { toast } = useToast();
  
  const [quantity, setQuantity] = useState(1);
  const [today, setToday] = useState<Date | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Fetch Category info
  const categoryRef = useMemo(() => (firestore && product?.categoryId) ? doc(firestore, 'categories', product.categoryId) : null, [firestore, product?.categoryId]);
  const { data: category } = useDoc<Category>(categoryRef);

  // Fetch distributed voice signatures from sub-collection (The "Unlimited Parts" logic)
  const voicesQuery = useMemo(() => {
      if (!firestore || !productId) return null;
      return query(collection(firestore, 'products', productId, 'voiceSignatures'));
  }, [firestore, productId]);
  const { data: distributedVoices } = useCollection<VoiceSignature>(voicesQuery);

  // Fetch active flash sale sections
  const sectionsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'homepageSections'), 
      where('isFlashSale', '==', true),
      where('published', '==', true)
    );
  }, [firestore]);
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
    if (!firestore) return null;
    return query(collection(firestore, 'categories'), orderBy('name'));
  }, [firestore]);
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
    if (!firestore) return null;
    if (product?.categoryId) {
        return query(
            collection(firestore, 'products'),
            where('categoryId', '==', product.categoryId),
            where('isVisibleOnWeb', '==', true),
            limit(12)
        );
    }
    return query(
        collection(firestore, 'products'),
        where('isVisibleOnWeb', '==', true),
        orderBy('createdAt', 'desc'),
        limit(12)
    );
  }, [firestore, product?.categoryId, productId]);

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
  
  const addToCartText = settings?.storeAddToCartText || 'Secure Purchase';
  const AddToCartIcon = iconMap[settings?.storeAddToCartIcon as keyof typeof iconMap] || ShoppingCart;

  const showRecommendations = settings?.showRelatedProducts !== false;
  const recommendationsBg = settings?.relatedProductsBackgroundColor || 'transparent';
  const recommendationsTitle = settings?.relatedProductsTitle || 'You Might Also Like';
  const recommendationsDescription = settings?.relatedProductsDescription || 'Specially curated items from the same collection.';

  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    const catStart = convertToDateSafely(category?.flashSaleStartDate);
    const catEnd = convertToDateSafely(category?.flashSaleEndDate);
    const isCategoryPromoActive = category?.isFlashSale && (!catStart || today! >= catStart) && (!catEnd || today! <= catEnd);

    if (isCategoryPromoActive) {
        return calculateEffectivePrice(product as any, today, category);
    }
    if (activeSectionPromo) {
        const base = Number(product.sellingPrice) || 0;
        if (activeSectionPromo.type === 'percentage') {
            return base * (1 - activeSectionPromo.value / 100);
        }
        return Math.max(0, base - activeSectionPromo.value);
    }
    return calculateEffectivePrice(product as any, today, category);
  }, [product, today, category, activeSectionPromo]);

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
    if (typeof window === 'undefined') return;
    const shareData = {
      title: product?.name || 'Check this out!',
      text: product?.description?.replace(/<[^>]*>?/gm, '').substring(0, 100) || 'Amazing product found on StoreLink Pro.',
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link Copied!" });
    }
  };

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

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Button asChild className="mt-4"><Link href="/store/shop">Return to Shop</Link></Button>
      </div>
    );
  }

  const creationDate = convertToDateSafely(product.createdAt);
  const Badge1Icon = iconMap[product.badge1Icon as keyof typeof iconMap] || Truck;
  const Badge2Icon = iconMap[product.badge2Icon as keyof typeof iconMap] || ShieldCheck;
  const DescriptionIcon = iconMap[product.descriptionIcon as keyof typeof iconMap] || BookOpen;
  const lowStockThreshold = product.lowStockThreshold || settings?.lowStockThreshold || 10;

  // Voice Signature Branding
  const voiceBranding = {
      preTitle: settings?.voiceExperiencePreTitle || 'Listen to Audio Signature',
      title: settings?.voiceExperienceTitle || 'Expert Insights & Detailed Pitch',
      color: settings?.voiceExperienceColor || 'var(--primary)',
      iconUrl: settings?.voiceExperienceIconUrl
  };

  // Filter visible voice signatures from distributed parts
  const visibleVoices = (distributedVoices || []).filter(v => v.isVisible !== false);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen">
      {/* Sticky Product Action Bar */}
      <StickyProductBar
        productName={product.name}
        productPrice={formatCurrency(effectivePrice, currencySymbol)}
        isInWishlist={isInWishlist}
        isOutOfStock={isOutOfStock}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        addToCartText={addToCartText}
      />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        {/* Mobile Back Button - Sticky on Mobile */}
        <div className="md:hidden mb-4 sticky top-0 z-40 bg-background-light dark:bg-background-dark pb-2">
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

        {/* Breadcrumb Navigation - Hidden on small mobile, visible on sm+ */}
        <nav className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-6 md:mb-8 overflow-x-auto pb-2">
          <Link href="/store" className="hover:text-primary transition-colors flex-shrink-0">Home</Link>
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          <Link href="/store/shop" className="hover:text-primary transition-colors flex-shrink-0">Shop</Link>
          {category && (
            <>
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
              <Link href={`/store/shop?category=${category.id}`} className="hover:text-primary transition-colors flex-shrink-0 truncate max-w-[150px]">{category.name}</Link>
            </>
          )}
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          <span className="text-slate-900 dark:text-slate-100 font-bold truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="sticky top-20 md:top-24 space-y-3 md:space-y-6">
              <div className="aspect-square bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl lg:rounded-[2.5rem] overflow-hidden shadow-lg md:shadow-2xl border-2 md:border-4 border-white dark:border-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 relative">
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
                    <Image src={activeImage || product.imageUrl || defaultImageUrl} alt={product.name} fill priority className={cn("object-cover transition-all duration-700 ease-in-out", isOutOfStock && "opacity-50 grayscale" [0.5])} unoptimized />
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
                    <Star key={i} className={cn("h-3.5 md:h-4 w-3.5 md:w-4 fill-current", i >= Math.floor(reviewStats.avg) && "text-slate-200 dark:text-slate-700")} />
                  ))}
                </div>
                <span className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest">{reviewStats.avg} / 5.0 ({reviewStats.count})</span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-[1.2]">{product.name}</h1>
              <div className="flex items-start gap-3 pt-2">
                <div className="flex flex-col gap-1 md:gap-1.5">
                  {!today ? <Skeleton className="h-8 md:h-10 w-32" /> : (
                    <><span className={cn("text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter", isDiscounted ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>{formatCurrency(effectivePrice, currencySymbol)}</span>
                    {isDiscounted && <span className="text-xs md:text-sm text-slate-400 line-through font-bold">Original: {formatCurrency(product.sellingPrice, currencySymbol)}</span>}</>
                  )}
                  <div className="pt-0.5 md:pt-1"><Badge variant={isOutOfStock ? "destructive" : "secondary"} className="h-6 md:h-7 px-2 md:px-3 font-black uppercase text-[8px] md:text-[9px] tracking-widest">{isOutOfStock ? 'Sold Out' : 'Ready'}</Badge></div>
                </div>
              </div>
            </div>

            {/* Distributed Voice Signatures - No longer limited by parent document size */}
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
              <div className="space-y-3 md:space-y-4 p-4 md:p-6 lg:p-8 bg-white dark:bg-slate-900/50 rounded-xl md:rounded-2xl lg:rounded-[2.5rem] border-2 border-primary/20 hover:border-primary/40 transition-all duration-500 shadow-lg md:shadow-2xl shadow-primary/5 ring-1 ring-primary/5">
                {(activeSectionPromo?.endDate || (isDiscounted && product.promo?.endDate)) && (
                  <PromoCountdown endDate={activeSectionPromo?.endDate || convertToDateSafely(product.promo!.endDate)!} />
                )}
                <div className="flex items-center justify-between mb-1 md:mb-2"><label className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-slate-400">Inventory</label></div>
                <StockBar stock={product.stock} lowStockThreshold={lowStockThreshold} className="mb-4 md:mb-6" />
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="flex items-center bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg md:rounded-2xl p-0.5 md:p-1">
                    <Button variant="ghost" size="icon" className="h-10 md:h-12 w-10 md:w-12 rounded-md md:rounded-xl" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="h-4 md:h-5 w-4 md:w-5" /></Button>
                    <span className="w-10 md:w-12 text-center text-lg md:text-xl font-black">{quantity}</span>
                    <Button variant="ghost" size="icon" className="h-10 md:h-12 w-10 md:w-12 rounded-md md:rounded-xl" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><Plus className="h-4 md:h-5 w-4 md:w-5" /></Button>
                  </div>
                  <Button onClick={handleAddToCart} size="lg" className="flex-1 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-12 md:h-14 rounded-lg md:rounded-2xl shadow-xl transition-all group text-xs md:text-sm">
                    <AddToCartIcon className="mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5 group-hover:animate-bounce" /> {addToCartText}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 md:gap-4">
              <Button variant="outline" size="lg" className={cn("flex-1 h-11 md:h-13 lg:h-14 rounded-lg md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all", isInWishlist && "text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-950/20")} onClick={handleToggleWishlist}>
                <Heart className={cn("h-4 md:h-5 w-4 md:w-5 mr-1 md:mr-2", isInWishlist && "fill-current")} /> <span className="hidden sm:inline">{isInWishlist ? "Saved" : "Save"}</span><span className="sm:hidden">{isInWishlist ? "Saved" : "Save"}</span>
              </Button>
              <Button variant="outline" size="icon" className="h-11 md:h-13 lg:h-14 w-11 md:w-13 lg:w-14 rounded-lg md:rounded-2xl group hover:border-primary transition-all" onClick={handleShare}><Share2 className="h-4 md:h-5 w-4 md:w-5 group-hover:text-primary" /></Button>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-3 lg:gap-4 pt-4 md:pt-6 border-t border-slate-200 dark:border-slate-800">
              {(product.badge1Enabled !== false) && (
                <div className="flex items-center gap-2 md:gap-3 text-[8px] md:text-[9px] lg:text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <div className="h-8 md:h-10 w-8 md:w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary flex-shrink-0"><Badge1Icon className="h-4 md:h-5 w-4 md:w-5" /></div>
                  <span className="leading-tight">{product.badge1Title || 'Free Express'}<br/>{product.badge1Sub || 'Fulfillment'}</span>
                </div>
              )}
              {(product.badge2Enabled !== false) && (
                <div className="flex items-center gap-2 md:gap-3 text-[8px] md:text-[9px] lg:text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <div className="h-8 md:h-10 w-8 md:w-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 flex-shrink-0"><Badge2Icon className="h-4 md:h-5 w-4 md:w-5" /></div>
                  <span className="leading-tight">{product.badge2Title || '2-Year Warranty'}<br/>{product.badge2Sub || 'Protection'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {product.description && (
          <section className="mt-24 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><DescriptionIcon className="h-6 w-6" /></div><div><h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{product.descriptionTitle || 'Product Story'}</h2><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">Detailed narrative and insights</p></div></div>
            <div className="bg-white dark:bg-slate-900/50 rounded-[3rem] p-8 md:p-12 border-2 border-primary/20 hover:border-primary/40 transition-all duration-500 shadow-2xl relative overflow-hidden"><div className="absolute top-0 right-0 p-8 opacity-5"><Info className="h-64 w-64 -mr-20 -mt-20" /></div><div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed text-lg font-medium relative z-10"><div className="rich-content"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{product.description}</ReactMarkdown></div></div></div>
          </section>
        )}

        {product.videos && product.videos.length > 0 && (
            <ProductVideoGallery videos={product.videos} title={product.videosTitle} description={product.videosDescription} />
        )}

        <div className="mt-24">
          <Tabs defaultValue="details" className="w-full">
            <div className="flex justify-center md:justify-start mb-10"><TabsList className="inline-flex h-auto p-1 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/50 shadow-inner overflow-x-auto no-scrollbar"><TabsTrigger value="details" className="group flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.15em]"><Info className="h-4 w-4" /> Technical Specs</TabsTrigger>{isLogisticsEnabled && (<TabsTrigger value="shipping" className="group flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.15em]"><Truck className="h-4 w-4" /> Logistics Info</TabsTrigger>)}<TabsTrigger value="reviews" className="group flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.15em]"><Star className="h-4 w-4" /> Verified Reviews <Badge variant="secondary" className="ml-1 h-5 px-1.5 min-w-[20px] rounded-full text-[10px] font-bold border-none transition-colors">{reviewStats.count}</Badge></TabsTrigger></TabsList></div>
            <TabsContent value="details" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-7 space-y-12">
                  {(product.specifications && product.specifications.length > 0) && (
                    <div className="p-8 rounded-[2.5rem] border-[3px] border-primary/20 bg-white dark:bg-slate-900/50 shadow-xl space-y-6 transition-all hover:border-primary/40 group/card">
                      <h3 className="text-2xl font-black tracking-tighter flex items-center gap-4">
                        <ListChecks className="h-8 w-8 text-primary group-hover/card:scale-110 transition-transform" /> 
                        {product.specificationsTitle || 'Key Features & Specifications'}
                      </h3>
                      <div className="grid grid-cols-1 gap-y-2">
                        {product.specifications?.map((spec, i) => (
                          <div key={`custom-${i}`} className="flex justify-between py-4 border-b last:border-0 border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{spec.label}</span>
                            <span className="font-black text-sm text-right text-slate-900 dark:text-slate-100">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(product.variations && product.variations.length > 0) && (
                    <div className="p-8 rounded-[2.5rem] border-[3px] border-primary/20 bg-white dark:bg-slate-900/50 shadow-xl space-y-6 transition-all hover:border-primary/40 group/card">
                      <h3 className="text-2xl font-black tracking-tighter flex items-center gap-4">
                        <Layers className="h-8 w-8 text-primary group-hover/card:scale-110 transition-transform" /> 
                        {product.variationsTitle || 'Variations Available'}
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {product.variations.map((v, i) => (
                          <Badge key={i} variant="outline" className="px-4 py-2 rounded-xl text-sm font-bold border-2 bg-white dark:bg-slate-900 shadow-sm hover:border-primary/50 transition-colors">
                            {v.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.sizeGuideImageUrl && (
                    <div className="p-8 rounded-[2.5rem] border-[3px] border-primary/20 bg-white dark:bg-slate-900/50 shadow-xl space-y-6 transition-all hover:border-primary/40 group/card">
                      <h3 className="text-2xl font-black tracking-tighter flex items-center gap-4">
                        <Maximize className="h-8 w-8 text-primary group-hover/card:scale-110 transition-transform" /> 
                        Sizing Chart
                      </h3>
                      <div className="relative aspect-video rounded-[2rem] overflow-hidden border-2 bg-white p-4">
                        <Image src={product.sizeGuideImageUrl} alt="Size guide" fill className="object-contain" unoptimized />
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-5 space-y-10">
                  {product.whatsInTheBox && product.whatsInTheBox.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] space-y-8 border-[3px] border-primary/20 shadow-xl transition-all hover:border-primary/40 group/card">
                      <h3 className="text-2xl font-black tracking-tighter flex items-center gap-4">
                        <Package className="h-8 w-8 text-primary group-hover/card:scale-110 transition-transform" /> 
                        {product.whatsInTheBoxTitle || 'What’s In The Box'}
                      </h3>
                      <div className="space-y-4">
                        <ul className="grid grid-cols-1 gap-3">
                          {product.whatsInTheBox.map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                              <div className="h-2 w-2 rounded-full bg-primary" />
                              {item.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {(product.showProductInsight === true) && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border-[3px] border-primary/20 shadow-xl transition-all hover:border-primary/40 group/card">
                      <h3 className="text-2xl font-black tracking-tighter mb-6 flex items-center gap-4">
                        <Info className="h-8 w-8 text-primary group-hover/card:scale-110 transition-transform" />
                        Product Insight
                      </h3>
                      <div className="space-y-6">
                        {product.supplierName && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Manufacturer</span>
                            <span className="font-bold text-sm">{product.supplierName}</span>
                          </div>
                        )}
                        {product.supplierName && <Separator className="bg-slate-200 dark:bg-slate-700" />}
                        <div className="grid grid-cols-2 gap-8">
                          {creationDate && (
                            <div className="flex flex-col gap-2">
                              <Clock className="h-6 w-6 text-primary" />
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Listed Since</span>
                              <span className="text-sm font-bold">{format(creationDate, 'PP')}</span>
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quality Check</span>
                            <span className="text-sm font-bold">100% Certified</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            {isLogisticsEnabled && (
                <TabsContent value="shipping" className="mt-0"><div className="max-w-5xl space-y-12"><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="p-10 border-2 rounded-[2rem] space-y-4 bg-white dark:bg-slate-900"><div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-primary mb-4"><Truck className="h-6 w-6" /></div><h4 className="font-black text-xl tracking-tight">Standard Shipping</h4><p className="text-sm text-slate-500 leading-relaxed">{settings?.shippingPolicy || "Orders are processed within 24 hours. Domestic delivery typically arrives in 3-5 business days."}</p></div><div className="p-10 border-2 rounded-[2rem] space-y-4 bg-white dark:bg-slate-900"><div className="h-12 w-12 rounded-2xl bg-orange-50 dark:bg-orange-950 flex items-center justify-center text-orange-600 mb-4"><RotateCcw className="h-6 w-6" /></div><h4 className="font-black text-xl tracking-tight">30-Day Returns</h4><p className="text-sm text-slate-500 leading-relaxed">{settings?.returnsPolicy || "Not the perfect fit? Return any unused item within 30 days for a full refund."}</p></div></div>{settings?.logisticsImageUrl && (<div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-4"><Image src={settings.logisticsImageUrl} alt="" fill className="object-cover" /></div>)}</div></TabsContent>
            )}
            <TabsContent value="reviews" className="mt-0"><div className="grid grid-cols-1 lg:grid-cols-12 gap-16"><div className="lg:col-span-4 space-y-8"><div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[2rem] border text-center"><p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{reviewStats.avg}</p><div className="flex justify-center text-amber-400 my-4">{[...Array(5)].map((_, i) => (<Star key={i} className={cn("h-6 w-6 fill-current", i >= Math.floor(reviewStats.avg) && "text-slate-200 dark:text-slate-700")} />))}</div><p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Based on {reviewStats.count} Verified Ratings</p></div><div className="space-y-4">{[5, 4, 3, 2, 1].map((stars, idx) => (<div key={stars} className="flex items-center gap-4"><span className="w-12 text-xs font-black text-slate-400 uppercase tracking-tighter">{stars} Stars</span><Progress value={reviewStats.distribution[idx]} className="h-2 flex-1" /><span className="w-10 text-right text-xs font-bold text-slate-500">{reviewStats.distribution[idx]}%</span></div>))}</div><ProductReviewForm productId={productId} /></div><div className="lg:col-span-8 space-y-10"><div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-black tracking-tight">Top Feedback</h3></div>{reviews && reviews.length > 0 ? (<div className="space-y-12">{reviews.map((review) => { const reviewDate = convertToDateSafely(review.createdAt); return (<div key={review.id} className="space-y-4 group animate-in fade-in slide-in-from-bottom-2 duration-500"><div className="flex justify-between items-start"><div className="flex items-start gap-4"><Avatar className="h-10 w-10 border-2"><AvatarImage src={review.userPhotoURL || ''} alt={review.userName} /><AvatarFallback>{review.userName.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="space-y-1"><div className="flex text-amber-400">{[...Array(5)].map((_, i) => (<Star key={i} className={cn("h-3 w-3 fill-current", i >= review.rating && "text-slate-200 dark:text-slate-700")} />))}</div><div className="flex items-center gap-2"><p className="font-black text-sm">{review.userName}</p><Badge variant="secondary" className="bg-green-50 text-green-700 text-[8px] h-4 font-black uppercase tracking-tighter border-green-100"><CheckCircle2 className="h-2 w-2 mr-1" /> Verified Purchase</Badge></div></div></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{reviewDate ? format(reviewDate, 'PP') : 'Recently'}</span></div><p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm font-medium">"{review.comment}"</p></div>); })}</div>) : (<div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-[3rem] bg-muted/10"><MessageSquare className="h-12 w-12 text-slate-300 mb-4" /><h4 className="text-xl font-black tracking-tight">No reviews yet</h4><p className="text-sm text-muted-foreground max-w-xs mx-auto">Be the first to share your experience with this product!</p></div>)}</div></div></TabsContent>
          </Tabs>
        </div>

        {showRecommendations && finalRelatedProducts.length > 0 && (
          <section className="mt-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-20" style={{ backgroundColor: recommendationsBg }}><div className="max-w-7xl mx-auto"><div className="flex items-end justify-between mb-16 px-4"><div className="space-y-2"><h2 className="text-4xl font-black tracking-tighter">{recommendationsTitle}</h2><p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{recommendationsDescription}</p></div><div className="flex gap-4"><Button asChild variant="ghost" className="font-black text-[10px] uppercase tracking-[0.2em] text-primary gap-3 p-0 h-auto"><Link href="/store/shop">Explore Full Shop <ChevronRight className="h-4 w-4" /></Link></Button></div></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">{finalRelatedProducts.map((related) => (<ProductCard key={related.id} product={related} currencySymbol={currencySymbol} />))}</div></div></section>
        )}

        <RecentlyViewedSection excludeId={productId} />
      </main>
    </div>
  );
}
