
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/contexts/cart-context';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, ArrowLeft, Tag, AlertTriangle, Loader2, CheckCircle2, X, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, documentId, getDocs, limit } from 'firebase/firestore';
import type { Product, StoreCartItem, Coupon } from '@/lib/types';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { Badge } from '@/components/ui/badge';
import { cn, convertToDateSafely } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { safeSessionStorage } from '@/lib/storage-utils';
import { useAds } from '@/contexts/ad-context';

import { FastCheckoutButtons } from '@/components/store/FastCheckoutButtons';

import { useParams, useRouter } from 'next/navigation';
import { useStoreUrl } from '@/hooks/use-store-url';

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const { cartItems, updateQuantity, removeFromCart, cartCount } = useCart();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { getStoreUrl } = useStoreUrl();
  const { activeAds, rewardAdClicked, setRewardAdClicked, applyRewardDiscount, recordAdClick } = useAds();
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<StoreCartItem | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
    if (!params?.storeId) return;
    const fetchMethods = async () => {
      try {
        const res = await fetch(`/api/payment/methods?storeId=${params.storeId}`);
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
  }, [params?.storeId]);

  useEffect(() => {
    setToday(new Date());
    // Restore coupon from session if exists
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

  // Real-time fetching of products in the cart
  const productIds = useMemo(() => cartItems.map(item => item.id), [cartItems]);
  
  const productsQuery = useMemo(() => {
    if (!firestore || productIds.length === 0) return null;
    const cappedIds = productIds.slice(0, 30);
    return query(collection(firestore, 'products'), where(documentId(), 'in', cappedIds));
  }, [firestore, productIds]);

  const { data: dbProducts, isLoading: isLoadingInventory } = useCollection<Product>(productsQuery);

  const realTimeCartItems = useMemo(() => {
    if (!dbProducts) return cartItems;

    return cartItems.map(cartItem => {
      const dbProduct = dbProducts.find(p => p.id === cartItem.id);
      if (!dbProduct) return { ...cartItem, isUnavailable: true };

      const currentPrice = calculateEffectivePrice(dbProduct as any, today);
      
      return {
        ...cartItem,
        ...dbProduct,
        salePrice: currentPrice,
        isUnavailable: dbProduct.isVisibleInPOS === false,
        isLowStock: dbProduct.stock < cartItem.quantity && dbProduct.stock > 0,
        isOutOfStock: dbProduct.stock <= 0
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

  const hasIssues = useMemo(() => {
    return realTimeCartItems.some(item => item.isUnavailable || item.isOutOfStock || item.isLowStock);
  }, [realTimeCartItems]);

  const handleApplyCoupon = async () => {
    const code = couponCode.toUpperCase().trim();
    if (!code || !firestore) return;

    setIsValidatingCoupon(true);
    try {
        const q = query(collection(firestore, 'coupons'), where('code', '==', code), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            toast({ variant: "destructive", title: "Invalid Promo Code", description: "The code you entered does not exist." });
            setAppliedCoupon(null);
            return;
        }

        const coupon = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Coupon;
        const now = new Date();
        const start = convertToDateSafely(coupon.startDate);
        const end = convertToDateSafely(coupon.endDate);

        const isExpired = end && now > end;
        const isNotStarted = start && now < start;

        if (!coupon.isActive || isExpired || isNotStarted) {
            toast({ variant: "destructive", title: "Coupon Inactive", description: "This promo code is no longer active." });
            return;
        }

        setAppliedCoupon(coupon);
        safeSessionStorage.setItem('appliedCoupon', JSON.stringify(coupon));
        toast({ title: "Promo Code Applied!", description: `You saved ${coupon.type === 'percentage' ? coupon.value + '%' : formatCurrency(coupon.value, currencySymbol)}.` });
        setCouponCode('');
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: "Failed to validate promo code." });
    } finally {
        setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    safeSessionStorage.removeItem('appliedCoupon');
    toast({ title: "Promo Code Removed" });
  };

  const handleConfirmRemove = () => {
    if (itemToRemove) {
      removeFromCart(itemToRemove.id);
      setItemToRemove(null);
    }
  };

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

  const shippingCost = subtotal > 0 ? 10 : 0;
  const total = Math.max(0, subtotal - discountAmount - rewardDiscountAmount + shippingCost);

  const handleRewardClick = () => {
    if (activeRewardAd) {
      recordAdClick(activeRewardAd.id);
      window.open(activeRewardAd.adLink, '_blank');
      setRewardAdClicked(true);
      toast({
        title: "Premium Reward Unlocked",
        description: "Your exclusive discount has been successfully applied to your shopping bag.",
      });
    }
  };

  const buttonStyle = useMemo(() => {
    const style = settings?.storeBtnStyle || 'standard';
    if (style === 'gradient') {
      return {
        background: `linear-gradient(to right, ${settings?.storeBtnGradientStart || '#3b82f6'}, ${settings?.storeBtnGradientEnd || '#1d4ed8'})`,
        color: 'white',
        border: 'none'
      };
    }
    return {
      backgroundColor: settings?.storeBtnColor || '#3b82f6',
      color: 'white',
      border: 'none'
    };
  }, [settings]);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-4 text-center">
        <ShoppingCart className="mx-auto h-24 w-24 text-muted-foreground" />
        <h1 className="mt-8 text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-lg text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
        <Button asChild className="mt-8">
          <Link href={getStoreUrl('/store/shop')}>Start Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Shopping Bag</h1>
              <Button variant="ghost" asChild className="mb-8">
                <Link href={getStoreUrl('/store/shop')} className="flex items-center">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Continue Shopping
                </Link>
              </Button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
                  <div className="lg:col-span-2 space-y-6">
                      {hasIssues && (
                          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3 text-orange-800">
                              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                              <div className="text-sm">
                                  <p className="font-bold">Some items in your cart need attention.</p>
                                  <p>Stock levels or availability have changed. Please review the items marked in red below.</p>
                              </div>
                          </div>
                      )}

                      <Card className="shadow-sm overflow-hidden">
                          <CardHeader className="bg-muted/20 border-b">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-lg">Cart Items ({cartCount})</CardTitle>
                                {isLoadingInventory && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                              </div>
                          </CardHeader>
                          <CardContent className="p-0">
                              <ScrollArea className="h-auto max-h-[600px]">
                                  <div className="divide-y">
                                      {realTimeCartItems.map(item => (
                                          <div key={item.id} className={cn("flex flex-col sm:flex-row sm:items-center p-6 gap-6", (item.isUnavailable || item.isOutOfStock) && "bg-destructive/5")}>
                                              <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border">
                                                  <Image
                                                      src={item.imageUrl || `https://placehold.co/100x100?text=${item.name.charAt(0)}`}
                                                      alt={item.name}
                                                      fill
                                                      className="object-cover"
                                                  />
                                              </div>
                                              <div className="flex-grow space-y-1">
                                                  <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                                                  <div className="flex flex-wrap gap-2 items-center">
                                                    <p className="text-sm text-muted-foreground font-medium">{formatCurrency(item.salePrice, currencySymbol)}</p>
                                                    {item.isOutOfStock && <Badge variant="destructive">Out of Stock</Badge>}
                                                    {item.isLowStock && <Badge variant="outline" className="border-orange-500 text-orange-600">Only {item.stock} left</Badge>}
                                                    {item.isUnavailable && <Badge variant="destructive">Unavailable</Badge>}
                                                  </div>
                                              </div>
                                              <div className="flex items-center justify-between sm:justify-end gap-6">
                                                  <div className="flex items-center gap-3 bg-muted/50 p-1 rounded-lg">
                                                      <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 rounded-md" 
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        disabled={item.isUnavailable}
                                                      >
                                                          <Minus className="h-4 w-4" />
                                                      </Button>
                                                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                                                      <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 rounded-md" 
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                                                        disabled={item.quantity >= (item.stock || 0) || item.isUnavailable}
                                                      >
                                                          <Plus className="h-4 w-4" />
                                                      </Button>
                                                  </div>
                                                  <div className="w-24 text-right font-black text-lg">
                                                      {formatCurrency(item.salePrice * item.quantity, currencySymbol)}
                                                  </div>
                                                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setItemToRemove(item)}>
                                                      <Trash2 className="h-5 w-5" />
                                                  </Button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </ScrollArea>
                          </CardContent>
                      </Card>
                  </div>

                  <div className="lg:col-span-1 sticky top-32">
                      <div className="bg-card p-8 rounded-2xl shadow-xl border space-y-8">
                          <h2 className="text-2xl font-black tracking-tight">Summary</h2>
                          
                          <div className="space-y-4 text-base">
                              <div className="flex justify-between">
                                  <span className="text-muted-foreground font-medium">Subtotal</span>
                                  <span className="font-bold">{formatCurrency(subtotal, currencySymbol)}</span>
                              </div>
                              {discountAmount > 0 && (
                                <div className="flex justify-between text-green-600 animate-in fade-in slide-in-from-right-2">
                                    <span className="font-medium flex items-center gap-1"><Tag className="h-3 w-3" /> Discount</span>
                                    <span className="font-bold">-{formatCurrency(discountAmount, currencySymbol)}</span>
                                </div>
                              )}
                              {rewardDiscountAmount > 0 && (
                                <div className="flex justify-between text-amber-600 animate-in fade-in slide-in-from-right-2">
                                    <span className="font-medium flex items-center gap-1"><Sparkles className="h-3 w-3" /> Reward</span>
                                    <span className="font-bold">-{formatCurrency(rewardDiscountAmount, currencySymbol)}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                  <span className="text-muted-foreground font-medium">Shipping</span>
                                  <span className="font-bold">{formatCurrency(shippingCost, currencySymbol)}</span>
                              </div>
                          </div>


                           <Separator />

                           <div className="space-y-3">
                              <Label htmlFor="coupon-code" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex justify-between">
                                  Promo Code
                                  {appliedCoupon && (
                                    <button onClick={removeCoupon} className="text-destructive hover:underline flex items-center gap-1">
                                        <X className="h-3 w-3" /> Remove
                                    </button>
                                  )}
                              </Label>
                              <div className="flex gap-2">
                                  <div className="relative flex-grow">
                                    <Input 
                                        id="coupon-code"
                                        placeholder={appliedCoupon ? appliedCoupon.code : "SAVE10"}
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        className={cn("h-11 uppercase font-bold", appliedCoupon && "border-green-500 bg-green-50 pr-10")}
                                        disabled={!!appliedCoupon || isValidatingCoupon}
                                    />
                                    {appliedCoupon && (
                                        <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-600" />
                                    )}
                                  </div>
                                  {!appliedCoupon && (
                                    <LoadingButton 
                                        variant="outline" 
                                        className="h-11" 
                                        onClick={handleApplyCoupon}
                                        isLoading={isValidatingCoupon}
                                        disabled={!couponCode.trim()}
                                        loadingText="Validating..."
                                    >
                                        Apply
                                    </LoadingButton>
                                  )}
                              </div>
                              {appliedCoupon && (
                                <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">
                                    Coupon Applied Successfully
                                </p>
                              )}
                           </div>
                          
                          <Separator />

                          <div className="flex justify-between items-baseline">
                              <span className="text-lg font-bold">Total</span>
                              <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(total, currencySymbol)}</span>
                          </div>

                          {activeRewardAd && !rewardAdClicked && (
                            <button
                                onClick={handleRewardClick}
                                className="w-full relative group overflow-hidden h-14 rounded-[1.25rem] transition-all active:scale-[0.98] shadow-xl mb-4"
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
                          
                          {filteredPaymentMethods.find(m => m.id === 'fast_checkout')?.config?.enableQuickPayButtons && (
                            <FastCheckoutButtons 
                              storeId={params?.storeId as string}
                              amount={total}
                              currency={settings?.currency || 'NGN'}
                              availableMethods={filteredPaymentMethods}
                              onSuccess={(orderId) => {}}
                              onBeforeCheckout={async () => {
                                // For cart page, we might not have user info if not logged in
                                // Redirect to checkout is safer if we want full info, 
                                // but we can create a skeleton order
                                try {
                                  const result = await fetch('/api/internal/create-express-order', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      storeId: params?.storeId,
                                      items: realTimeCartItems.map(item => ({
                                        productId: item.id,
                                        quantity: item.quantity,
                                        price: item.salePrice
                                      })),
                                      totalAmount: total,
                                      totalCost: realTimeCartItems.reduce((sum, item) => sum + ((item.purchasePrice || 0) * item.quantity), 0),
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
                          )}

                          <LoadingButton 
                            size="lg" 
                            style={buttonStyle} 
                            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 border-none" 
                            disabled={hasIssues || subtotal === 0}
                            isLoading={isCheckingOut}
                            onClick={() => {
                              setIsCheckingOut(true);
                              router.push(getStoreUrl('/store/checkout'));
                            }}
                            loadingText="Processing..."
                          >
                             Checkout Now <ArrowRight className="ml-2 h-5 w-5" />
                          </LoadingButton>

                          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-4">
                              <ShoppingCart className="h-3 w-3" /> Secure Checkout Powered by StoreLink
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
      <DeleteConfirmationDialog
        isOpen={!!itemToRemove}
        onOpenChange={() => setItemToRemove(null)}
        onConfirm={handleConfirmRemove}
        isDeleting={false}
        itemName={itemToRemove?.name || ''}
        itemType="item"
        dialogTitle="Remove from Cart?"
        dialogDescription={`Are you sure you want to remove <strong>${itemToRemove?.name || ''}</strong>?`}
        confirmButtonText="Remove Item"
      />
    </>
  );
}
