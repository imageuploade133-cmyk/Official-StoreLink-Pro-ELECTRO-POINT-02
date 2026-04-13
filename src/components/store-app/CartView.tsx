
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useCart } from '@/contexts/cart-context';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Trash2, 
    Plus, 
    Minus, 
    ShoppingBag, 
    ArrowRight, 
    Tag, 
    X, 
    CheckCircle2, 
    Loader2, 
    AlertTriangle, 
    ArrowLeft,
    ShieldCheck,
    Sparkles,
    Gift
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, documentId, limit, getDocs } from 'firebase/firestore';
import type { Product, StoreCartItem, Coupon } from '@/lib/types';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { useToast } from '@/hooks/use-toast';
import { cn, convertToDateSafely } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { safeSessionStorage } from '@/lib/storage-utils';
import { useAds } from '@/contexts/ad-context';

interface CartViewProps {
    onNavigateToHome: () => void;
    onStartCheckout: () => void;
}

export function CartView({ onNavigateToHome, onStartCheckout }: CartViewProps) {
    const { cartCount, cartItems, updateQuantity, removeFromCart } = useCart();
    const { settings } = useSettings();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { activeAds, rewardAdClicked, setRewardAdClicked, applyRewardDiscount, recordAdClick } = useAds();
    
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [today, setToday] = useState<Date | null>(null);

    useEffect(() => {
        setToday(new Date());
        const saved = safeSessionStorage.getItem('appliedCoupon');
        if (saved) {
            try {
                setAppliedCoupon(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse coupon from sessionStorage", e);
                safeSessionStorage.removeItem('appliedCoupon');
            }
        }
    }, []);

    const currencySymbol = settings?.currency || '$';
    const defaultImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x500.png';

    // Optimized batch query for items in cart
    const productIds = useMemo(() => cartItems.map(item => item.id), [cartItems]);
    const productsQuery = useMemo(() => {
        if (!firestore || productIds.length === 0) return null;
        return query(collection(firestore, 'products'), where(documentId(), 'in', productIds.slice(0, 30)));
    }, [firestore, productIds]);

    const { data: dbProducts, isLoading: isLoadingInventory } = useCollection<Product>(productsQuery);

    const realTimeCartItems = useMemo(() => {
        if (!dbProducts) return cartItems;
        return cartItems.map(cartItem => {
            const dbProduct = dbProducts.find(p => p.id === cartItem.id);
            if (!dbProduct) return { ...cartItem, isUnavailable: true };
            return {
                ...cartItem,
                ...dbProduct,
                salePrice: calculateEffectivePrice(dbProduct as any, today),
                isUnavailable: dbProduct.isVisibleInPOS === false,
                isOutOfStock: dbProduct.stock <= 0,
                isLowStock: dbProduct.stock < cartItem.quantity && dbProduct.stock > 0
            };
        });
    }, [cartItems, dbProducts, today]);

    const subtotal = useMemo(() => {
        return realTimeCartItems.reduce((sum, item) => {
            if (item.isUnavailable || item.isOutOfStock) return sum;
            return sum + (item.salePrice * item.quantity);
        }, 0);
    }, [realTimeCartItems]);

    const discountAmount = useMemo(() => {
        if (!appliedCoupon || subtotal === 0) return 0;
        if (appliedCoupon.type === 'percentage') {
            return subtotal * (appliedCoupon.value / 100);
        }
        return Math.min(appliedCoupon.value, subtotal);
    }, [appliedCoupon, subtotal]);

    const activeRewardAd = useMemo(() => {
        const ad = activeAds.find(ad => ad.adType === 'reward' && ad.placement === 'reward_button');
        if (!ad) return null;

        // Check device targeting
        if (typeof window !== 'undefined') {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (ad.deviceTargeting === 'mobile_only' && !isMobile) return null;
            if (ad.deviceTargeting === 'desktop_only' && isMobile) return null;
        }

        return ad;
    }, [activeAds]);

    const rewardDiscountAmount = useMemo(() => {
        if (!rewardAdClicked || !activeRewardAd || subtotal === 0) return 0;
        const discountedPrice = applyRewardDiscount(subtotal, activeRewardAd);
        return subtotal - discountedPrice;
    }, [rewardAdClicked, activeRewardAd, subtotal, applyRewardDiscount]);

    const shipping = subtotal > 0 ? 10 : 0;
    const total = Math.max(0, subtotal - discountAmount - rewardDiscountAmount + shipping);

    const handleApplyCoupon = async () => {
        const code = couponCode.toUpperCase().trim();
        if (!code || !firestore) return;
        setIsValidatingCoupon(true);
        try {
            const q = query(collection(firestore, 'coupons'), where('code', '==', code), limit(1));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                toast({ variant: "destructive", title: "Invalid Protocol", description: "The provided promo code is not found in the registry." });
                setAppliedCoupon(null);
                return;
            }
            const coupon = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Coupon;
            const now = new Date();
            const end = convertToDateSafely(coupon.endDate);
            if (!coupon.isActive || (end && now > end)) {
                toast({ variant: "destructive", title: "Expired Code", description: "This promotion is no longer active." });
                return;
            }
            setAppliedCoupon(coupon);
            safeSessionStorage.setItem('appliedCoupon', JSON.stringify(coupon));
            toast({ title: "Protocol Verified", description: "Promotional discount successfully applied to subtotal." });
            setCouponCode('');
        } catch (e) {
            toast({ variant: "destructive", title: "Registry Error" });
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const handleRewardClick = () => {
        if (activeRewardAd) {
            recordAdClick(activeRewardAd.id);
            window.open(activeRewardAd.adLink, '_blank');
            setRewardAdClicked(true);
            toast({
                title: "Premium Reward Unlocked",
                description: "Your exclusive discount has been successfully applied.",
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-black animate-in slide-in-from-right-4 fade-in duration-500">
            <div className="px-6 pt-12 pb-8 space-y-6">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={onNavigateToHome} 
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-800 active:scale-90 transition-all"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <Badge variant="secondary" className="font-black h-8 px-4 rounded-full shadow-sm bg-primary/10 text-primary border-none">
                        {cartCount} Premium Items
                    </Badge>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Order Registry</p>
                    <h2 className="text-4xl font-black tracking-tighter uppercase">My Bag</h2>
                </div>
            </div>

            <ScrollArea className="flex-1 px-6 pb-40">
                {/* Critical Fix: Increased bottom padding from pb-20 to pb-96 to ensure Promo section is visible above fixed footer */}
                <div className="pb-96">
                    {cartItems.length === 0 ? (
                        <div className="py-24 text-center space-y-8 animate-in zoom-in-95 duration-700">
                            <div className="h-32 w-32 bg-slate-100 dark:bg-slate-800/50 rounded-[3rem] flex items-center justify-center mx-auto shadow-inner group">
                                <ShoppingBag className="h-14 w-14 text-slate-300 group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight uppercase leading-none">Bag Empty</h3>
                                <p className="text-sm font-medium text-slate-500 max-w-[220px] mx-auto leading-relaxed">Your curated essentials will appear here for final fulfillment.</p>
                            </div>
                            <Button onClick={onNavigateToHome} className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-10 h-14 shadow-xl active:scale-95 transition-all">Explore Collections</Button>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            <div className="space-y-4">
                                {realTimeCartItems.map((item) => (
                                    <div key={item.id} className={cn(
                                        "flex items-center gap-5 p-5 bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 group relative transition-all active:scale-[0.99]",
                                        (item.isUnavailable || item.isOutOfStock) && "opacity-60 grayscale-[0.5]"
                                    )}>
                                        <div className="relative h-24 w-24 rounded-2xl overflow-hidden shrink-0 bg-muted border shadow-sm">
                                            <Image src={item.imageUrl || defaultImageUrl} alt={item.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <p className="font-black text-sm truncate leading-tight uppercase tracking-tight text-slate-900 dark:text-white">{item.name}</p>
                                                <button 
                                                    onClick={() => removeFromCart(item.id)} 
                                                    className="text-slate-300 hover:text-destructive transition-all active:scale-90 p-1"
                                                >
                                                    <X className="h-4 w-4" strokeWidth={3} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-primary font-black text-lg tracking-tighter">{formatCurrency(item.salePrice, currencySymbol)}</p>
                                                {item.isOutOfStock && <Badge variant="destructive" className="text-[8px] h-4 font-black uppercase">Out of Stock</Badge>}
                                                {item.isLowStock && <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-100 text-[8px] h-4 font-black uppercase">Critical Stock</Badge>}
                                            </div>
                                            <div className="flex items-center justify-between mt-4">
                                                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"><Minus className="h-4 w-4" /></button>
                                                    <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm" disabled={item.quantity >= (item.stock || 0)}><Plus className="h-4 w-4" /></button>
                                                </div>
                                                <p className="font-black text-base tracking-tighter text-slate-900 dark:text-white">{formatCurrency(item.salePrice * item.quantity, currencySymbol)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-6 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Promotional Access</h4>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                        <Input 
                                            placeholder="ENTER PROMO CODE" 
                                            className="h-14 pl-11 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-xl uppercase font-black tracking-[0.1em] text-xs"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            disabled={!!appliedCoupon || isValidatingCoupon}
                                        />
                                        {appliedCoupon && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 animate-in zoom-in duration-300" />}
                                    </div>
                                    {!appliedCoupon ? (
                                        <LoadingButton 
                                            onClick={handleApplyCoupon} 
                                            disabled={!couponCode.trim()} 
                                            isLoading={isValidatingCoupon}
                                            variant="secondary" 
                                            className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest px-8 shadow-lg active:scale-95 transition-all"
                                            loadingText="Checking..."
                                        >
                                            Apply
                                        </LoadingButton>
                                    ) : (
                                        <Button 
                                            onClick={() => setAppliedCoupon(null)} 
                                            variant="ghost" 
                                            className="h-14 rounded-2xl text-destructive hover:bg-destructive/5 font-bold px-4 active:scale-90 transition-all"
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {cartItems.length > 0 && (
                <footer className="fixed bottom-[96px] left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-100 dark:border-slate-800 p-8 rounded-t-[3.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] z-50 pb-10 space-y-8">
                    <div className="space-y-4">
                        <div className="flex justify-between text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal, currencySymbol)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-xs font-black uppercase tracking-[0.2em] text-green-600 animate-in slide-in-from-right-2">
                                <span className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Offer Applied</span>
                                <span>-{formatCurrency(discountAmount, currencySymbol)}</span>
                            </div>
                        )}
                        {rewardDiscountAmount > 0 && (
                            <div className="flex justify-between text-xs font-black uppercase tracking-[0.2em] text-amber-600 animate-in slide-in-from-right-2">
                                <span className="flex items-center gap-2"><Sparkles className="h-3 w-3" /> Reward Applied</span>
                                <span>-{formatCurrency(rewardDiscountAmount, currencySymbol)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            <span>Estimated Shipping</span>
                            <span>{formatCurrency(shipping, currencySymbol)}</span>
                        </div>
                        <Separator className="my-2 border-slate-100 dark:border-slate-800" />
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm font-black uppercase tracking-[0.3em]">Total</span>
                            <span className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(total, currencySymbol)}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {activeRewardAd && !rewardAdClicked && (
                            <button 
                                onClick={handleRewardClick}
                                className="w-full relative group overflow-hidden h-14 rounded-[1.25rem] transition-all active:scale-[0.98] shadow-xl mb-2"
                            >
                                <div className="absolute inset-0 bg-slate-950 dark:bg-slate-900" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.15),transparent_70%)]" />
                                <div className="absolute inset-0 opacity-20 group-hover:opacity-100 transition-opacity duration-700 bg-[conic-gradient(from_0deg,transparent,rgba(251,191,36,0.3),transparent)] animate-[spin_4s_linear_infinite]" />
                                <div className="relative flex items-center justify-center gap-3">
                                    <Sparkles className="h-4 w-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                                        Unlock {activeRewardAd.rewardDiscountType === 'percentage' ? activeRewardAd.rewardDiscountValue + '%' : currencySymbol + activeRewardAd.rewardDiscountValue} Reward
                                    </span>
                                    <Sparkles className="h-4 w-4 text-amber-400 group-hover:-rotate-12 transition-transform" />
                                </div>
                            </button>
                        )}
                        <Button 
                            onClick={onStartCheckout} 
                            className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 group transition-all active:scale-[0.98]"
                        >
                            Proceed to Checkout <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={3} />
                        </Button>
                        <div className="flex items-center justify-center gap-3 text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 opacity-60">
                            <ShieldCheck className="h-3 w-3 text-green-500" /> Secure Transaction Encrypted
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}
