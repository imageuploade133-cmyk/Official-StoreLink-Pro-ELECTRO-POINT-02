'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useCart } from '@/contexts/cart-context';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useSettings } from '@/contexts/settings-context';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatUtils';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  User, 
  MapPin, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  ShoppingBag,
  ShieldCheck,
  Phone,
  Mail,
  Landmark,
  Banknote,
  Wallet,
  Copy,
  Info,
  Tag,
  ChevronRight,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Truck,
  Store,
  Map as MapIcon,
  Upload,
  X
} from 'lucide-react';
import type { UserProfile, Order, BankAccount, Coupon } from '@/lib/types';
import { cn } from '@/lib/utils';
import { sendWhatsAppReceipt } from '@/lib/whatsapp';
import { formatPhoneNumberForWhatsapp } from '@/lib/phone-utils';
import { safeSessionStorage } from '@/lib/storage-utils';
import { useAds } from '@/contexts/ad-context';
import { placeOrderAction } from '@/app/actions/orders';
import { uploadImage } from '@/ai/flows/image-upload-flow';

type CheckoutStep = 'details' | 'payment' | 'processing' | 'success';
type FulfillmentType = 'delivery' | 'pickup';

const generatePaymentReference = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TR-${result}`;
};

interface CheckoutViewProps {
    onClose: () => void;
}

export function CheckoutView({ onClose }: CheckoutViewProps) {
  const { cartItems, clearCart, cartCount } = useCart();
  const { user, isLoading: isAuthLoading } = useUser();
  const { settings, isLoadingSettings } = useSettings();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { rewardAdClicked, activeAds, applyRewardDiscount } = useAds();
  const params = useParams();
  const storeId = params?.storeId as string;

  const [step, setStep] = useState<CheckoutStep>('details');
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('delivery');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [paymentReference] = useState(generatePaymentReference());
  const [hasConfirmedTransfer, setHasConfirmedTransfer] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const currencySymbol = settings?.currency || '$';
  const subtotal = cartItems.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);

  // Delivery settings
  const enableDelivery = settings?.enableDelivery !== false;
  const enablePickUp = settings?.enablePickUp !== false;
  const deliveryLocations = settings?.deliveryLocations || [];

  // Initialize fulfillment type based on settings
  useEffect(() => {
    if (settings) {
        if (settings.enableDelivery === false && settings.enablePickUp !== false) {
            setFulfillmentType('pickup');
        } else if (settings.enablePickUp === false && settings.enableDelivery !== false) {
            setFulfillmentType('delivery');
        }
    }
  }, [settings]);

  // Initialize delivery location if available
  useEffect(() => {
    if (deliveryLocations.length > 0 && !selectedLocationId) {
        setSelectedLocationId(deliveryLocations[0].id);
    }
  }, [deliveryLocations, selectedLocationId]);

  const selectedLocation = useMemo(() => 
    deliveryLocations.find(loc => loc.id === selectedLocationId),
  [deliveryLocations, selectedLocationId]);

  const shipping = useMemo(() => {
    if (fulfillmentType === 'pickup') return 0;
    return selectedLocation?.price ?? 0;
  }, [fulfillmentType, selectedLocation]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon || subtotal === 0) return 0;
    if (appliedCoupon.type === 'percentage') {
        return subtotal * (appliedCoupon.value / 100);
    }
    return Math.min(appliedCoupon.value, subtotal);
  }, [appliedCoupon, subtotal]);

  const activeRewardAd = useMemo(() => {
    return activeAds.find(ad => ad.adType === 'reward' && ad.placement === 'reward_button');
  }, [activeAds]);

  const rewardDiscountAmount = useMemo(() => {
    if (!rewardAdClicked || !activeRewardAd || subtotal === 0) return 0;
    const discountedPrice = applyRewardDiscount(subtotal, activeRewardAd);
    return subtotal - discountedPrice;
  }, [rewardAdClicked, activeRewardAd, subtotal, applyRewardDiscount]);

  const taxAmount = useMemo(() => {
    if (!settings?.enableTax || !settings?.taxRate) return 0;
    const afterDiscount = subtotal - discountAmount - rewardDiscountAmount;
    return (afterDiscount * settings.taxRate) / 100;
  }, [settings, subtotal, discountAmount, rewardDiscountAmount]);

  const total = Math.max(0, subtotal - discountAmount - rewardDiscountAmount + shipping + taxAmount);
  const bankAccounts = settings?.bankAccounts || [];

  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  const filteredPaymentMethods = useMemo(() => {
    return availablePaymentMethods.filter(method => {
      // 1. Filter by Method-specific Region
      if (method.paymentRegion && settings?.paymentRegion) {
        if (method.paymentRegion !== settings.paymentRegion) {
          return false;
        }
      }

      // 2. Legacy/Automatic Nigeria-specific filtering
      if (settings?.paymentRegion) {
        const isNigeriaSpecific = ['paystack', 'flutterwave', 'opay', 'palmpay', 'monnify'].includes(method.provider);
        if (settings.paymentRegion !== 'Nigeria' && isNigeriaSpecific && !method.paymentRegion) {
          return false;
        }
      }

      // If fulfillment is pickup, we show all methods
      if (fulfillmentType === 'pickup') return true;
      
      // If no locations are specified for the method, it's visible for all locations
      if (!method.allowedLocations || method.allowedLocations.length === 0) return true;
      
      // If there are specified locations, check if the selected location is in the list
      return method.allowedLocations.includes(selectedLocationId);
    });
  }, [availablePaymentMethods, fulfillmentType, selectedLocationId, settings?.paymentRegion]);

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

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: user?.displayName || userProfile.displayName || '',
        email: user?.email || userProfile.email || '',
        phone: userProfile.alternativePhoneNumber || '',
        address: userProfile.deliveryAddress || '',
      });
    }
  }, [userProfile, user]);

  useEffect(() => {
    if (filteredPaymentMethods.length > 0 && !paymentMethod) {
      setPaymentMethod(filteredPaymentMethods[0].name);
    }
  }, [filteredPaymentMethods, paymentMethod]);

  useEffect(() => {
    if (paymentMethod === 'Bank Transfer' && bankAccounts.length > 0 && !selectedBankId) {
        setSelectedBankId(bankAccounts[0].id);
    }
  }, [paymentMethod, bankAccounts, selectedBankId]);

  const selectedBankAccount = useMemo(() => 
    bankAccounts.find(acc => acc.id === selectedBankId), 
  [bankAccounts, selectedBankId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Receipt image should be smaller than 2MB." });
      return;
    }

    setIsUploadingReceipt(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri, storeId });
        setReceiptUrl(result.display_url);
        toast({ title: "Receipt Uploaded", description: "Your payment receipt has been attached." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload receipt." });
      } finally {
        setIsUploadingReceipt(false);
      }
    };
  };

  const validateDetails = () => {
    if (!formData.name || !formData.email || !formData.phone) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill in your name, email, and phone.' });
        return false;
    }
    if (fulfillmentType === 'delivery') {
        if (deliveryLocations.length > 0 && !selectedLocationId) {
            toast({ variant: 'destructive', title: 'Location Required', description: 'Please select a delivery location.' });
            return false;
        }
        if (!formData.address) {
            toast({ variant: 'destructive', title: 'Address Required', description: 'Please provide a delivery address.' });
            return false;
        }
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!firestore) return;
    if (paymentMethod === 'Bank Transfer' && (!selectedBankAccount || !hasConfirmedTransfer)) {
        toast({ variant: 'destructive', title: 'Action Required', description: 'Please confirm the bank transfer.' });
        return;
    }

    setStep('processing');

    try {
      let finalOrderId = '';
      const selectedMethod = filteredPaymentMethods.find(m => m.name === paymentMethod || m.id === paymentMethod);
      const isOnlinePayment = selectedMethod && 
                             selectedMethod.provider !== 'manual' && 
                             selectedMethod.provider !== 'pay_on_delivery';

      const result = await placeOrderAction({
        userId: user?.uid || 'GUEST',
        storeId: storeId,
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.salePrice
        })),
        totalAmount: total,
        totalCost: cartItems.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0),
        paymentMethod: paymentMethod,
        paymentReference: paymentMethod === 'Bank Transfer' ? paymentReference : null,
        paymentReceiptUrl: paymentMethod === 'Bank Transfer' ? receiptUrl : null,
        couponCode: appliedCoupon?.code || null,
        appliedCouponId: appliedCoupon?.id || null,
        selectedBankAccount: paymentMethod === 'Bank Transfer' ? selectedBankAccount : null,
        fulfillmentType: fulfillmentType,
        deliveryLocationId: fulfillmentType === 'delivery' ? selectedLocationId : null,
        deliveryPrice: shipping,
        guestInfo: formData,
        taxRate: settings?.taxRate || 0,
        taxAmountCalculated: taxAmount,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      finalOrderId = result.orderId;

      if (isOnlinePayment) {
        // Initialize payment
        const initRes = await fetch('/api/payment/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: finalOrderId,
            amount: total,
            currency: settings?.currency || 'NGN',
            email: formData.email,
            providerName: selectedMethod.provider,
            userId: user?.uid || 'GUEST',
            storeId: storeId,
          }),
        });
        const initData = await initRes.json();
        if (initData.success && initData.authorization_url) {
          window.location.href = initData.authorization_url;
          return;
        } else {
          throw new Error(initData.error || 'Failed to initialize payment');
        }
      }

      // --- WhatsApp Notifications are now handled server-side in placeOrderAction ---
      
      setStep('success');
      clearCart();
      safeSessionStorage.removeItem('appliedCoupon');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Order Failed', description: error.message });
      setStep('payment');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  if (isAuthLoading || isLoadingSettings || isProfileLoading || isLoadingMethods) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in zoom-in-95 duration-500 bg-white dark:bg-slate-900">
        <div className="w-24 h-24 rounded-[3rem] bg-primary/10 flex items-center justify-center text-primary shadow-2xl">
          <CheckCircle2 className="h-12 w-12" strokeWidth={3} />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter uppercase">Order Received</h2>
          <p className="text-slate-500 font-medium">Your premium essentials are being prepared.</p>
        </div>
        {paymentMethod === 'Bank Transfer' && (
            <Card className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-[2rem] p-6 shadow-inner">
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Verification Pending</p>
                    <p className="text-sm font-bold leading-relaxed">Please ensure you used reference <span className="text-primary font-black">{paymentReference}</span> in your transfer to expedite verification.</p>
                </div>
            </Card>
        )}
        <Button onClick={onClose} size="lg" className="w-full h-16 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl">Back to Store</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-black animate-in slide-in-from-right-4 fade-in duration-500">
        <header className="sticky top-0 z-50 flex flex-col bg-background-light/80 dark:bg-black/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-6">
                <button 
                  onClick={step === 'details' ? onClose : () => setStep('details')} 
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-800 active:scale-90 transition-transform"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-black tracking-tighter uppercase">Checkout</h1>
                <Badge variant="secondary" className="font-black h-8 px-4 rounded-full shadow-sm">{cartCount} items</Badge>
            </div>
            
            {/* Step Indicator */}
            <div className="flex px-6 pb-4 gap-2">
              <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", step === 'details' ? "bg-primary" : "bg-primary/20")} />
              <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", step === 'payment' ? "bg-primary" : "bg-primary/20")} />
            </div>
        </header>

        <ScrollArea className="flex-1 px-6 pb-40">
            <div className="space-y-8 py-6">
                
                {step === 'payment' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                        <button 
                            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                            className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                                    <ShoppingBag className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review Summary</p>
                                    <p className="text-lg font-black tracking-tighter">{formatCurrency(total, currencySymbol)}</p>
                                </div>
                            </div>
                            {isSummaryExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                        
                        {isSummaryExpanded && (
                            <div className="mt-2 p-6 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-4 animate-in zoom-in-95 duration-300">
                                <div className="space-y-3">
                                    {cartItems.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-medium truncate pr-4">{item.name} <span className="text-[10px] font-black text-primary/60 ml-1">x{item.quantity}</span></span>
                                            <span className="font-bold shrink-0">{formatCurrency(item.salePrice * item.quantity, currencySymbol)}</span>
                                        </div>
                                    ))}
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(subtotal, currencySymbol)}</span>
                                    </div>
                                    {fulfillmentType === 'delivery' && (
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                            <span>Shipping ({selectedLocation?.name || 'Standard'})</span>
                                            <span>{formatCurrency(shipping, currencySymbol)}</span>
                                        </div>
                                    )}
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-green-600">
                                            <span>Promo Savings</span>
                                            <span>-{formatCurrency(discountAmount, currencySymbol)}</span>
                                        </div>
                                    )}
                                    {rewardDiscountAmount > 0 && (
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-amber-600">
                                            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Reward Savings</span>
                                            <span>-{formatCurrency(rewardDiscountAmount, currencySymbol)}</span>
                                        </div>
                                    )}
                                    {taxAmount > 0 && (
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                                            <span>{settings?.taxName || 'Tax'} ({settings?.taxRate}%)</span>
                                            <span>{formatCurrency(taxAmount, currencySymbol)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 'details' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">Customer Identity</h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tell us who is receiving this order.</p>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Full Identity</Label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Recipient Name" className="h-14 pl-12 rounded-2xl border-none shadow-xl font-bold bg-white dark:bg-slate-800 focus-visible:ring-primary/20" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Communication</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <Input name="email" value={formData.email} onChange={handleInputChange} type="email" placeholder="email@example.com" className="h-14 pl-12 rounded-2xl border-none shadow-xl font-bold bg-white dark:bg-slate-800 focus-visible:ring-primary/20" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Phone Protocol (Required for WhatsApp Updates)</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <Input 
                                            name="phone" 
                                            value={formData.phone} 
                                            onChange={handleInputChange} 
                                            onBlur={() => {
                                                const formatted = formatPhoneNumberForWhatsapp(formData.phone, settings?.countryCode || '234');
                                                if (formatted) {
                                                    setFormData(prev => ({ ...prev, phone: formatted }));
                                                }
                                            }}
                                            type="tel" 
                                            placeholder="e.g. 08012345678" 
                                            className="h-14 pl-12 rounded-2xl border-none shadow-xl font-bold bg-white dark:bg-slate-800 focus-visible:ring-primary/20" 
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2 ml-1 flex items-center gap-1.5">
                                        <Info className="h-3 w-3 text-primary" />
                                        Auto-formatted for WhatsApp (e.g. 23480...)
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">Fulfillment Mode</h3>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Choose how you want to receive your items.</p>
                                </div>

                                <RadioGroup 
                                    value={fulfillmentType} 
                                    onValueChange={(val) => setFulfillmentType(val as FulfillmentType)}
                                    className="grid grid-cols-2 gap-4"
                                >
                                    {enableDelivery && (
                                        <Label className={cn(
                                            "flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 cursor-pointer transition-all active:scale-95 shadow-lg",
                                            fulfillmentType === 'delivery' ? "bg-primary/5 border-primary" : "bg-white dark:bg-slate-800 border-transparent"
                                        )}>
                                            <RadioGroupItem value="delivery" className="sr-only" />
                                            <Truck className={cn("h-8 w-8 mb-2", fulfillmentType === 'delivery' ? "text-primary" : "text-slate-400")} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Delivery</span>
                                        </Label>
                                    )}
                                    {enablePickUp && (
                                        <Label className={cn(
                                            "flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 cursor-pointer transition-all active:scale-95 shadow-lg",
                                            fulfillmentType === 'pickup' ? "bg-primary/5 border-primary" : "bg-white dark:bg-slate-800 border-transparent"
                                        )}>
                                            <RadioGroupItem value="pickup" className="sr-only" />
                                            <Store className={cn("h-8 w-8 mb-2", fulfillmentType === 'pickup' ? "text-primary" : "text-slate-400")} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Pick Up</span>
                                        </Label>
                                    )}
                                </RadioGroup>

                                {fulfillmentType === 'delivery' && (
                                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                        {deliveryLocations.length > 0 && (
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Delivery Zone</Label>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {deliveryLocations.map((loc) => (
                                                        <button
                                                            key={loc.id}
                                                            onClick={() => setSelectedLocationId(loc.id)}
                                                            className={cn(
                                                                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                                                                selectedLocationId === loc.id 
                                                                    ? "bg-primary/5 border-primary shadow-md" 
                                                                    : "bg-white dark:bg-slate-800 border-transparent"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <MapIcon className={cn("h-5 w-5", selectedLocationId === loc.id ? "text-primary" : "text-slate-400")} />
                                                                <span className="font-bold text-sm">{loc.name}</span>
                                                            </div>
                                                            <span className="font-black text-sm">{formatCurrency(loc.price, currencySymbol)}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Detailed Address</Label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                                                <Textarea 
                                                    name="address" 
                                                    value={formData.address} 
                                                    onChange={handleInputChange} 
                                                    placeholder="Enter your full street address, house number, and city..." 
                                                    className="min-h-[120px] pl-12 pt-4 rounded-[2rem] border-none shadow-xl font-bold bg-white dark:bg-slate-800 resize-none focus-visible:ring-primary/20" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {fulfillmentType === 'pickup' && (
                                    <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 animate-in zoom-in-95 duration-500">
                                        <div className="flex items-start gap-4">
                                            <Info className="h-6 w-6 text-primary shrink-0" />
                                            <div className="space-y-1">
                                                <p className="text-xs font-black uppercase tracking-widest text-primary">Pickup Protocol</p>
                                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    You can pick up your order at our store location once it's marked as ready. We'll send you a notification.
                                                </p>
                                                {settings?.storeAddress && (
                                                    <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-xl border border-primary/10">
                                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Store Location</p>
                                                        <p className="text-xs font-bold mt-1">{settings.storeAddress}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {step === 'payment' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">Settlement Protocol</h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Select your preferred transaction method.</p>
                        </div>

                        {filteredPaymentMethods.length > 0 ? (
                            <div className="space-y-8">
                                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 gap-4">
                                    {filteredPaymentMethods.map((method) => (
                                        <div key={method.id} className="relative">
                                            <RadioGroupItem value={method.name} id={method.id} className="peer sr-only" />
                                            <Label htmlFor={method.id} className="flex items-center gap-4 p-6 bg-white dark:bg-slate-800 rounded-[2rem] border-2 border-transparent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 shadow-lg cursor-pointer transition-all active:scale-[0.98]">
                                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative overflow-hidden">
                                                    {method.logoUrl ? (
                                                        <Image src={method.logoUrl} alt="" fill className="object-contain p-2" />
                                                    ) : (
                                                        <>
                                                            {method.provider === 'manual' ? <Landmark className="h-7 w-7" /> : 
                                                             method.provider === 'pay_on_delivery' ? <Truck className="h-7 w-7" /> :
                                                             <CreditCard className="h-7 w-7" />}
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="font-black text-sm uppercase tracking-widest">{method.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 line-clamp-2">
                                                        {method.instructions || (method.name === 'Bank Transfer' ? 'Manual verification required' : 
                                                         method.name.toLowerCase().includes('delivery') ? 'Pay upon receipt' : 'Instant secure payment')}
                                                    </p>
                                                </div>
                                                {paymentMethod === method.name && <CheckCircle2 className="h-7 w-7 text-primary fill-current" />}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>

                                {paymentMethod !== 'Bank Transfer' && paymentMethod !== '' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="p-6 border-2 border-primary/20 bg-primary/5 rounded-[2rem] space-y-4 shadow-lg">
                                            <div className="flex items-center gap-3 text-primary">
                                                {paymentMethod.toLowerCase().includes('delivery') ? <Truck className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                                                <h3 className="font-black text-sm uppercase tracking-widest">{paymentMethod}</h3>
                                            </div>
                                            <p className="text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-400">
                                                {filteredPaymentMethods.find(m => m.name === paymentMethod)?.instructions || 
                                                 (paymentMethod.toLowerCase().includes('delivery') ? "You will pay for your order when it is delivered to you." : "Follow the on-screen instructions to complete your payment.")}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'Bank Transfer' && (
                                    <div className="space-y-8 animate-in zoom-in-95 duration-500">
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Authorized Receiving Banks</Label>
                                            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2">
                                                {bankAccounts.map(acc => (
                                                    <button 
                                                        key={acc.id}
                                                        onClick={() => setSelectedBankId(acc.id)}
                                                        className={cn(
                                                            "shrink-0 w-44 p-5 rounded-[2rem] border-2 transition-all text-left space-y-4 shadow-xl",
                                                            selectedBankId === acc.id 
                                                                ? "bg-slate-900 text-white border-primary ring-4 ring-primary/10" 
                                                                : "bg-white dark:bg-slate-800 border-transparent text-slate-900 dark:text-white"
                                                        )}
                                                    >
                                                        <div className="relative h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                                                            {acc.logoUrl ? (
                                                                <Image src={acc.logoUrl} alt="" fill className="object-contain p-1" unoptimized />
                                                            ) : (
                                                                <Landmark className="h-6 w-6" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black truncate">{acc.bankName}</p>
                                                            <p className={cn("text-[9px] font-bold uppercase tracking-widest truncate mt-1", selectedBankId === acc.id ? "text-primary" : "text-slate-400")}>{acc.accountName}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {selectedBankAccount && (
                                            <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl space-y-8 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                                    <Landmark className="h-48 w-48 -mr-16 -mt-16" />
                                                </div>
                                                <div className="grid grid-cols-1 gap-8 relative z-10">
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Transfer Destination</p>
                                                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                                                            <p className="text-2xl font-black tracking-tighter">{selectedBankAccount.accountNumber}</p>
                                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-white/40 hover:text-white bg-white/5" onClick={() => copyToClipboard(selectedBankAccount.accountNumber)}><Copy className="h-4 w-4"/></Button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Narration Reference</p>
                                                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                                                            <p className="text-3xl font-black tracking-widest text-white">{paymentReference}</p>
                                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-white/40 hover:text-white bg-white/5" onClick={() => copyToClipboard(paymentReference)}><Copy className="h-4 w-4"/></Button>
                                                        </div>
                                                        <div className="mt-3 space-y-2">
                                                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                                                <AlertTriangle className="h-3.5 w-3.5" /> CRITICAL PROTOCOL
                                                            </p>
                                                            <p className="text-[11px] text-white/70 leading-relaxed font-medium">
                                                                You <span className="text-white font-bold underline">MUST</span> enter this code in your bank app's <strong>Remark</strong> or <strong>Narration</strong> field for automated verification.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Upload Receipt (Optional)</p>
                                                        <div className="flex flex-col gap-3">
                                                            {receiptUrl ? (
                                                                <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                                                                    <Image src={receiptUrl} alt="Receipt" fill className="object-cover" />
                                                                    <Button 
                                                                        variant="destructive" 
                                                                        size="icon" 
                                                                        className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg"
                                                                        onClick={() => setReceiptUrl('')}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button asChild variant="outline" className="w-full h-14 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold" disabled={isUploadingReceipt}>
                                                                    <label className="cursor-pointer">
                                                                        {isUploadingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                                        {isUploadingReceipt ? 'Uploading...' : 'Upload Payment Receipt'}
                                                                        <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} disabled={isUploadingReceipt} />
                                                                    </label>
                                                                </Button>
                                                            )}
                                                            <p className="text-[9px] text-white/40 font-medium uppercase tracking-widest text-center">Attach a screenshot of your successful transfer</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-8 border-t border-white/10 flex items-center gap-5">
                                                    <button 
                                                        onClick={() => setHasConfirmedTransfer(!hasConfirmedTransfer)}
                                                        className={cn(
                                                            "h-14 w-14 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 group relative overflow-hidden",
                                                            hasConfirmedTransfer ? "bg-primary text-white shadow-2xl shadow-primary/40 border-primary" : "bg-white/5 border-2 border-white/20 text-white/40 hover:border-white/40 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {hasConfirmedTransfer ? (
                                                            <CheckCircle2 className="h-8 w-8 animate-in zoom-in duration-300" strokeWidth={3} />
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-ping" />
                                                                <span className="text-[8px] font-black mt-1">TAP</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/90 leading-relaxed">Payment Confirmation Protocol</p>
                                                        <p className="text-[9px] font-bold text-white/40 uppercase">I have successfully finalized the transfer of {formatCurrency(total, currencySymbol)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-24 text-center space-y-6 opacity-40 bg-muted/20 rounded-[3rem] border-2 border-dashed">
                                <AlertTriangle className="h-16 w-16 mx-auto" strokeWidth={1} />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Channel Maintenance active</p>
                            </div>
                        )}
                    </div>
                )}

                {step === 'processing' && (
                    <div className="h-full flex flex-col items-center justify-center py-32 space-y-10 animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="h-32 w-32 rounded-[3.5rem] border-4 border-primary/10 border-t-primary animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ShieldCheck className="h-10 w-10 text-primary" strokeWidth={3} />
                            </div>
                        </div>
                        <div className="text-center space-y-3">
                            <h3 className="text-3xl font-black tracking-tighter uppercase leading-none">Security Check</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Processing Order...</p>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>

        {step !== 'processing' && (
            <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-100 dark:border-slate-800 p-8 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-50 pb-10">
                <div className="mb-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Settlement</p>
                    <p className="text-2xl font-black tracking-tighter">{formatCurrency(total, currencySymbol)}</p>
                  </div>
                  {step === 'details' && (
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase tracking-widest text-primary">Next Step</p>
                       <p className="text-xs font-bold">Payment</p>
                    </div>
                  )}
                </div>

                {step === 'details' ? (
                    <Button 
                        onClick={() => {
                          if (validateDetails()) setStep('payment');
                        }}
                        className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 group transition-all active:scale-[0.98]"
                    >
                        Proceed to Payment
                        <ChevronRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={3} />
                    </Button>
                ) : (
                    <LoadingButton 
                        onClick={handlePlaceOrder}
                        isLoading={step === 'processing'}
                        disabled={(paymentMethod === 'Bank Transfer' && !hasConfirmedTransfer) || filteredPaymentMethods.length === 0}
                        loadingText="Processing..."
                        className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 group transition-all active:scale-[0.98]"
                    >
                        Complete Purchase
                        <ChevronRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={3} />
                    </LoadingButton>
                )}
            </footer>
        )}
    </div>
  );
}
