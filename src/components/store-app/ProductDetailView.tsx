'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ChevronLeft,
  Volume2,
  X,
  Share2,
  CheckCircle2,
  Play,
  Pause,
  FastForward,
  Info,
  BookOpen,
  FileText,
  Sparkles,
  History,
  ArrowRight,
  Video as VideoIcon,
  Plus,
  Minus,
  MessageSquare,
  AudioWaveform,
  Loader2,
  TrendingUp,
  RotateCcw,
  Check,
  Package,
  Truck,
  ShieldCheck,
  Zap,
  Clock,
  CreditCard,
  Award,
  ListChecks,
  Layers,
  Maximize
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
import { ProductVideoGallery } from '@/components/store/ProductVideoGallery';
import { StockBar } from '@/components/store/StockBar';
import { RecentlyViewedSection } from '@/components/store/RecentlyViewedSection';

import { useStoreUrl } from '@/hooks/use-store-url';

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
  Maximize
};

function IndividualTrackPlayer({ track, branding }: { track: any, branding: any }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const formatTime = (time: number) => {
        if (isNaN(time) || !isFinite(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
    };

    return (
        <div 
            className="p-5 rounded-[2rem] shadow-lg flex flex-col gap-4 relative overflow-hidden group/audio transition-all hover:scale-[1.01] text-white"
            style={{ backgroundColor: branding.color }}
        >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
            <div className="flex items-center gap-4 relative z-10">
                <Button 
                    onClick={togglePlayback}
                    variant="ghost" 
                    size="icon" 
                    className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md text-white border-2 border-white/30 shadow-xl relative z-10 flex-shrink-0"
                >
                    {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current ml-1" />}
                </Button>
                <div className="relative z-10 space-y-0.5 overflow-hidden flex-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-80">{branding.preTitle}</span>
                    <h4 className="text-sm font-black tracking-tight leading-tight truncate pr-4">{track.title || branding.title}</h4>
                </div>
            </div>
            <div className="relative z-10 flex flex-col gap-1.5 px-1">
                <input 
                    type="range" 
                    min="0" 
                    max={duration || 0} 
                    step="0.1"
                    value={currentTime} 
                    onChange={(e) => {
                        const time = parseFloat(e.target.value);
                        if (audioRef.current) audioRef.current.currentTime = time;
                    }}
                    className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-[10px] font-black font-mono tracking-widest opacity-70">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
            <audio 
                ref={audioRef}
                src={track.audioDataUri}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                className="hidden"
            />
        </div>
    );
}

interface ProductDetailViewProps {
    id: string;
    onClose: () => void;
    onNavigateToCart: () => void;
    onNavigateToRecentlyViewed: () => void; // Added for internal discovery
}

export function ProductDetailView({ id, onClose, onNavigateToCart, onNavigateToRecentlyViewed }: ProductDetailViewProps) {
    const firestore = useFirestore();
    const { settings } = useSettings();
    const { storeId } = useStoreUrl();
    const { addToCart } = useCart();
    const { isProductInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
    const { addViewedProduct } = useRecentlyViewed();
    const { toast } = useToast();
    
    const [detailQty, setDetailQty] = useState(1);
    const [activeTabSub, setActiveTabSub] = useState('details');
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [showVideo, setShowVideo] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const currencySymbol = settings?.currency || '$';
    const defaultImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/600x600.png';

    const productRef = useMemo(() => (firestore && id) ? doc(firestore, 'products', id) : null, [firestore, id]);
    const { data: product, isLoading: isFetching } = useDoc<Product>(productRef);

    useEffect(() => {
        if (product?.imageUrl) setActiveImage(product.imageUrl);
        if (id) addViewedProduct(id);
    }, [product, id, addViewedProduct]);

    const categoryRef = useMemo(() => (firestore && product?.categoryId) ? doc(firestore, 'categories', product.categoryId) : null, [firestore, product?.categoryId]);
    const { data: category } = useDoc<Category>(categoryRef);

    const galleryImages = useMemo(() => {
        if (!product) return [];
        const all = [product.imageUrl, ...(product.additionalImageUrls || [])].filter(Boolean) as string[];
        return all;
    }, [product]);

    const voicesQuery = useMemo(() => firestore ? query(collection(firestore, 'products', id, 'voiceSignatures')) : null, [firestore, id]);
    const { data: distributedVoices } = useCollection<VoiceSignature>(voicesQuery);

    const reviewsQuery = useMemo(() => firestore ? query(collection(firestore, 'products', id, 'reviews'), orderBy('createdAt', 'desc')) : null, [firestore, id]);
    const { data: reviews } = useCollection<ProductReview>(reviewsQuery);

    const sectionsQuery = useMemo(() => (firestore && storeId) ? query(collection(firestore, 'homepageSections'), where('store_id', '==', storeId), where('isFlashSale', '==', true), where('published', '==', true)) : null, [firestore, storeId]);
    const { data: flashSections } = useCollection<HomepageSection>(sectionsQuery);

    const activeSectionPromo = useMemo(() => {
        if (!flashSections || !product) return null;
        const now = new Date();
        const s = flashSections.find(s => {
            const start = convertToDateSafely(s.flashSaleStartDate);
            const end = convertToDateSafely(s.flashSaleEndDate);
            if (start && now < start) return false;
            if (end && now > end) return false;
            return (s.selectionType === 'category' && s.categoryId === product.categoryId) || (s.selectionType === 'manual' && s.productIds?.includes(product.id)) || (s.selectionType === 'all');
        });
        return s ? { type: s.flashSaleDiscountType || 'percentage', value: s.flashSaleDiscountValue || 0, endDate: convertToDateSafely(s.flashSaleEndDate) } : null;
    }, [flashSections, product]);

    const effectivePrice = useMemo(() => {
        if (!product) return 0;
        if (activeSectionPromo) {
            const base = Number(product.sellingPrice) || 0;
            if (activeSectionPromo.type === 'percentage') return base * (1 - activeSectionPromo.value / 100);
            return Math.max(0, base - activeSectionPromo.value);
        }
        return calculateEffectivePrice(product as any, new Date(), category);
    }, [product, activeSectionPromo, category]);

    const relatedQuery = useMemo(() => (firestore && storeId) ? query(collection(firestore, 'products'), where('store_id', '==', storeId), where('categoryId', '==', product?.categoryId || ''), where('isVisibleOnWeb', '==', true), limit(6)) : null, [firestore, product?.categoryId, storeId]);
    const { data: relatedProducts } = useCollection<Product>(relatedQuery);

    // Dynamic Button Style for Add to Cart - Moved up to avoid hook error
    const addToCartButtonStyle = useMemo(() => {
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

    const addToCartButtonClasses = useMemo(() => {
        const useIndividual = settings?.useIndividualBtnSettings !== false;
        const size = useIndividual
            ? (settings?.storeAddToCartSize || 'lg')
            : (settings?.storeBtnSize || 'lg');
        
        const shape = useIndividual
            ? (settings?.storeAddToCartShape || 'lg')
            : (settings?.storeBtnShape || 'lg');

        const shadow = useIndividual
            ? (settings?.storeAddToCartShadow || 'sm')
            : 'sm';

        const sizeClasses = {
            sm: 'h-10 text-xs px-4',
            md: 'h-12 text-sm px-6',
            lg: 'h-14 text-sm px-8',
            xl: 'h-16 text-base px-10'
        };

        const shapeClasses: Record<string, string> = {
            none: 'rounded-none',
            sm: 'rounded-sm',
            md: 'rounded-md',
            lg: 'rounded-2xl',
            full: 'rounded-full'
        };

        const shadowClasses: Record<string, string> = {
            none: 'shadow-none',
            sm: 'shadow-sm',
            md: 'shadow-md',
            lg: 'shadow-lg',
            xl: 'shadow-xl',
            '2xl': 'shadow-2xl',
            inner: 'shadow-inner'
        };

        const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.lg;
        const shapeClass = shapeClasses[shape] || 'rounded-2xl';
        const shadowClass = shadowClasses[shadow as keyof typeof shadowClasses] || 'shadow-sm';

        return `${sizeClass} ${shapeClass} ${shadowClass}`;
    }, [settings]);

    if (isFetching) return <div className="p-10 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>;
    if (!product) return null;

    const isDiscounted = effectivePrice < product.sellingPrice;
    const isLiked = isProductInWishlist(product.id);
    const isOutOfStock = product.stock <= 0;
    const lowStockThreshold = product.lowStockThreshold || settings?.lowStockThreshold || 10;
    const voiceBranding = { preTitle: settings?.voiceExperiencePreTitle || 'Audio Signature', title: settings?.voiceExperienceTitle || 'Product Insights', color: settings?.voiceExperienceColor || '#5048e5', iconUrl: settings?.voiceExperienceIconUrl };
    const visibleVoices = (distributedVoices || []).filter(v => v.isVisible !== false);
    const DescriptionIcon = iconMap[product.descriptionIcon as keyof typeof iconMap] || BookOpen;

    const addToCartText = settings?.storeAddToCartText || 'Secure Purchase';
    const AddToCartIcon = iconMap[settings?.storeAddToCartIcon as keyof typeof iconMap] || ShoppingBag;

    const reviewStats = (() => {
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
    })();

    const handleToggleWishlist = () => {
        if (isLiked) removeFromWishlist(product.id);
        else addToWishlist(product.id);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right-4 duration-500 pb-32">
            <div className="relative aspect-[4/5] w-full overflow-hidden">
                {showVideo && product.videoUrl ? (
                    <video ref={videoRef} src={product.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                    <Image 
                        src={activeImage || product.imageUrl || defaultImageUrl} 
                        alt={product.name} 
                        fill 
                        className="object-cover" 
                        unoptimized 
                    />
                )}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/40 to-transparent pt-8">
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 active:scale-90 transition-transform"><ChevronLeft className="h-6 w-6" /></button>
                    <div className="flex gap-2">
                        <button onClick={handleToggleWishlist} className={cn("w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md border", isLiked ? "bg-rose-500 text-white border-rose-400" : "bg-white/20 text-white border-white/30")}><Heart className={cn("h-5 w-5", isLiked && "fill-current")} /></button>
                        <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link Copied" }); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30"><Share2 className="h-5 w-5" /></button>
                    </div>
                </div>
            </div>

            {/* Centered slidable thumbnail gallery */}
            <div className="px-6 py-4 flex justify-center gap-3 overflow-x-auto no-scrollbar -mt-12 relative z-20">
                {galleryImages.map((url, idx) => (
                    <button 
                        key={url + idx} 
                        onClick={() => { setActiveImage(url); setShowVideo(false); }} 
                        className={cn(
                            "relative w-20 h-20 rounded-[1.5rem] overflow-hidden border-2 transition-all duration-300 shadow-xl shrink-0",
                            !showVideo && activeImage === url ? "border-primary scale-110 z-10 ring-4 ring-primary/10" : "border-white dark:border-slate-800 opacity-90 hover:opacity-100"
                        )}
                    >
                        <Image src={url} alt={`View ${idx + 1}`} fill className="object-cover" unoptimized />
                    </button>
                ))}
                {product.videoEnabled && product.videoUrl && (
                    <button 
                        onClick={() => setShowVideo(true)} 
                        className={cn(
                            "relative w-20 h-20 rounded-[1.5rem] overflow-hidden border-2 transition-all duration-300 shadow-xl shrink-0 bg-slate-900 group",
                            showVideo ? "border-primary scale-110 z-10 ring-4 ring-primary/10" : "border-white dark:border-slate-800 opacity-90 hover:opacity-100"
                        )}
                    >
                        {product.videoPosterUrl && <Image src={product.videoPosterUrl} alt="" fill className="object-cover opacity-40" unoptimized />}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                            <Play className="h-6 w-6 fill-current mb-1 translate-x-0.5" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Play</span>
                        </div>
                    </button>
                )}
            </div>

            <div className="px-6 pt-6 space-y-8">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">{product.name}</h1>
                        {settings?.showProductReviews && (
                            <div className="flex items-center gap-2 pt-1">
                                <div className="flex text-amber-400">
                                    {[...Array(5)].map((_, i) => <Star key={i} className={cn("h-4 w-4 fill-current", i >= Math.floor(reviewStats.avg) && "text-slate-200 dark:text-slate-700")} />)}
                                </div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{reviewStats.avg} ({reviewStats.count})</span>
                            </div>
                        )}
                        </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(effectivePrice, currencySymbol)}</p>
                        {isDiscounted && <p className="text-[10px] text-slate-400 line-through font-bold">{formatCurrency(product.sellingPrice, currencySymbol)}</p>}
                    </div>
                </div>

                <StockBar stock={product.stock} lowStockThreshold={lowStockThreshold} />

                {(activeSectionPromo?.endDate || (isDiscounted && product.promo?.endDate)) && (
                  <PromoCountdown endDate={activeSectionPromo?.endDate || convertToDateSafely(product.promo!.endDate)!} />
                )}

                {product.voiceEnabled && visibleVoices.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <AudioWaveform className="h-4 w-4" /> Audio Identity
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {visibleVoices.map(v => <IndividualTrackPlayer key={v.id} track={v} branding={voiceBranding} />)}
                        </div>
                    </div>
                )}

                {product.description && (
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <DescriptionIcon className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">{product.descriptionTitle || 'Product Story'}</h3>
                        </div>
                        <div className="prose dark:prose-invert prose-sm max-w-none text-slate-600 leading-relaxed [&_*]:dark:!text-white dark:!text-white">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{product.description}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {product.videos && product.videos.length > 0 && (
                    <ProductVideoGallery videos={product.videos} title={product.videosTitle} description={product.videosDescription} />
                )}

                <div className="pt-4">
                    <Tabs value={activeTabSub} onValueChange={setActiveTabSub} className="w-full">
                        <TabsList className={cn(
                            "grid w-full h-11 bg-muted/50 rounded-xl p-1",
                            settings?.showProductReviews ? "grid-cols-3" : "grid-cols-2"
                        )}>
                            <TabsTrigger value="details" className="text-[10px] font-black uppercase tracking-widest">Specs</TabsTrigger>
                            <TabsTrigger value="shipping" className="text-[10px] font-black uppercase tracking-widest">Shipping</TabsTrigger>
                            {settings?.showProductReviews && (
                                <TabsTrigger value="reviews" className="text-[10px] font-black uppercase tracking-widest">Reviews</TabsTrigger>
                            )}
                        </TabsList>
                        
                        <TabsContent value="details" className="pt-6 space-y-8">
                            {product.specifications && product.specifications.length > 0 && (
                                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border">
                                    <h4 className="font-bold text-sm uppercase tracking-wider mb-4">{product.specificationsTitle || 'Specifications'}</h4>
                                    {product.specifications.map((s, i) => (
                                        <div key={i} className="flex justify-between text-xs border-b border-slate-200/50 last:border-0 pb-3 last:pb-0">
                                            <span className="font-bold text-slate-400 uppercase">{s.label}</span>
                                            <span className="font-black text-slate-900 dark:text-white">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {product.whatsInTheBox && product.whatsInTheBox.length > 0 && (
                                <div className="space-y-4 bg-muted/30 p-6 rounded-[2rem] border">
                                    <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        <Package className="h-4 w-4 text-primary" /> {product.whatsInTheBoxTitle || 'Inside the Box'}
                                    </h4>
                                    <ul className="space-y-2">
                                        {product.whatsInTheBox.map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-xs font-medium">
                                                <CheckCircle2 className="h-3 w-3 text-green-500" /> {item.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {product.variations && product.variations.length > 0 && (
                                <div className="space-y-4 bg-muted/30 p-6 rounded-[2rem] border">
                                    <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-primary" /> {product.variationsTitle || 'Variations'}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {product.variations.map((v, i) => (
                                            <Badge key={i} variant="secondary" className="px-3 py-1 rounded-full text-[10px] font-bold uppercase">{v.name}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {product.sizeGuideImageUrl && (
                                <div className="space-y-4">
                                    <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 px-1">
                                        <Maximize className="h-4 w-4 text-primary" /> Sizing Guide
                                    </h4>
                                    <div className="relative aspect-video rounded-3xl overflow-hidden border bg-white p-4">
                                        <Image src={product.sizeGuideImageUrl} alt="Size guide" fill className="object-contain" unoptimized />
                                    </div>
                                </div>
                            )}

                            {product.showProductInsight && (
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border space-y-4">
                                    <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        <Info className="h-4 w-4 text-primary" /> Insights
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                        <div className="space-y-1">
                                            <p className="opacity-60">Listed Since</p>
                                            <p className="text-slate-900 dark:text-white">{product.createdAt ? format(convertToDateSafely(product.createdAt)!, 'PP') : 'N/A'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="opacity-60">Brand</p>
                                            <p className="text-slate-900 dark:text-white">{product.supplierName || 'Verified Official'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="shipping" className="pt-6">
                            <div className="p-8 border-2 rounded-[2rem] space-y-6 bg-slate-50 dark:bg-slate-900/50">
                                <div className="space-y-2">
                                    <Truck className="h-8 w-8 text-primary mb-2" />
                                    <h4 className="text-lg font-black uppercase tracking-tight">Fulfillment Protocol</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">{settings?.shippingPolicy || "Standard processing time: 24 Hours. Delivery typically finalized in 3-5 business days."}</p>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <RotateCcw className="h-8 w-8 text-orange-500 mb-2" />
                                    <h4 className="text-lg font-black uppercase tracking-tight">Returns Guarantee</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">{settings?.returnsPolicy || "Our commitment to quality is absolute. Enjoy a seamless 30-day return window."}</p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="reviews" className="pt-6 space-y-8">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border text-center space-y-4">
                                <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{reviewStats.avg}</p>
                                <div className="flex justify-center text-amber-400">
                                    {[...Array(5)].map((_, i) => <Star key={i} className={cn("h-5 w-5 fill-current", i >= Math.floor(reviewStats.avg) && "text-slate-200 dark:text-slate-700")} />)}
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Based on {reviewStats.count} Verified Ratings</p>
                                
                                <div className="space-y-2 pt-4">
                                    {[5, 4, 3, 2, 1].map((stars, idx) => (
                                        <div key={stars} className="flex items-center gap-4">
                                            <span className="w-10 text-[8px] font-black text-slate-400 uppercase">{stars} Stars</span>
                                            <Progress value={reviewStats.distribution[idx]} className="h-1.5 flex-1" />
                                            <span className="w-8 text-right text-[8px] font-bold text-slate-500">{reviewStats.distribution[idx]}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <ProductReviewForm productId={id} />

                            <div className="space-y-8 pt-4">
                                {reviews && reviews.length > 0 ? (
                                    reviews.map((review) => (
                                        <div key={review.id} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-3">
                                                    <Avatar className="h-10 w-10 border-2">
                                                        <AvatarImage src={review.userPhotoURL || ''} />
                                                        <AvatarFallback className="font-bold text-xs">{review.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="flex text-amber-400 mb-0.5">
                                                            {[...Array(5)].map((_, i) => <Star key={i} className={cn("h-3 w-3 fill-current", i >= review.rating && "text-slate-200 dark:text-slate-700")} />)}
                                                        </div>
                                                        <p className="font-black text-sm">{review.userName}</p>
                                                        <p className="text-[8px] font-black uppercase text-green-600 tracking-widest mt-0.5 flex items-center gap-1">
                                                            <CheckCircle2 className="h-2 w-2 fill-current" /> Verified Purchase
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{review.createdAt ? format(convertToDateSafely(review.createdAt)!, 'PP') : 'Recently'}</span>
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed italic">"{review.comment}"</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center border-2 border-dashed rounded-[2rem] bg-muted/10">
                                        <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No reviews yet</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {relatedProducts && relatedProducts.length > 1 && (
                    <div className="space-y-6 pt-12 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-lg font-black tracking-tight uppercase">You Might Also Like</h3>
                            <Link href="/store/shop" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {relatedProducts.filter(p => p.id !== id).slice(0, 4).map(p => (
                                <div key={p.id} className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-lg p-3 group active:scale-95 transition-all">
                                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted mb-3">
                                        <Image 
                                            src={p.imageUrl || 'https://placehold.co/200x200.png'} 
                                            alt={p.name} 
                                            fill 
                                            className={cn(
                                                "object-cover transition-transform duration-700",
                                                settings?.enableHoverZoom !== false && "group-hover:scale-110"
                                            )} 
                                            unoptimized 
                                        />
                                    </div>
                                    <div className="space-y-1 px-1">
                                        <p className="text-[8px] font-black uppercase text-primary/60 tracking-widest">
                                            {category?.name || 'Collection'}
                                        </p>
                                        <h4 className="font-bold text-xs truncate leading-tight">{p.name}</h4>
                                        <p className="text-sm font-black text-primary tracking-tighter">{formatCurrency(calculateEffectivePrice(p as any, new Date()), currencySymbol)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <RecentlyViewedSection 
                    excludeId={id} 
                    onViewAll={onNavigateToRecentlyViewed}
                />
            </div>

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex gap-4">
                    <button className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-sm active:scale-90 transition-transform">
                        <MessageSquare className="h-6 w-6" />
                    </button>
                    {!isOutOfStock ? (
                        <div className="flex-1 flex gap-2">
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200/50">
                                <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} className="w-8 h-8 flex items-center justify-center text-slate-500"><Minus className="h-3.5 w-3.5" /></button>
                                <span className="w-6 text-center font-black text-sm">{detailQty}</span>
                                <button onClick={() => setDetailQty(Math.min(product.stock, detailQty + 1))} className="w-8 h-8 flex items-center justify-center text-slate-500"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                            <Button
                                onClick={() => {
                                    for(let i=0; i<detailQty; i++) addToCart(product, effectivePrice);
                                    onNavigateToCart();
                                }}
                                style={addToCartButtonStyle}
                                className={cn(
                                    "flex-1 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] group",
                                    addToCartButtonClasses
                                )}
                            >
                                <AddToCartIcon className="mr-2 h-5 w-5 group-hover:animate-bounce" strokeWidth={3} /> {addToCartText}
                            </Button>
                        </div>
                    ) : (
                        <Button disabled className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest bg-slate-200 text-slate-400">Out of Stock</Button>
                    )}
                </div>
            </div>
        </div>
    );
}
