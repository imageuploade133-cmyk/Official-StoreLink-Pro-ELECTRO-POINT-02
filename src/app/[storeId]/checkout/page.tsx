'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useCart } from '@/contexts/cart-context';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useSettings } from '@/contexts/settings-context';
import { doc, collection, runTransaction, serverTimestamp, addDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatUtils';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Truck, 
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
  Copy,
  Info,
  Tag,
  AlertTriangle,
  Sparkles,
  Store,
  X,
  Wallet,
  Smartphone,
  Coins,
  Upload,
} from 'lucide-react';
import type { UserProfile, Order, BankAccount, WhatsappMessageLog, Coupon } from '@/lib/types';
import { cn } from '@/lib/utils';
import { sendWhatsAppReceipt } from '@/lib/whatsapp';
import { formatPhoneNumberForWhatsapp } from '@/lib/phone-utils';
import { safeSessionStorage } from '@/lib/storage-utils';
import { useAds } from '@/contexts/ad-context';
import { placeOrderAction, logWhatsAppMessageAction } from '@/app/actions/orders';
import { useStoreUrl } from '@/hooks/use-store-url';

import { uploadImage } from '@/ai/flows/image-upload-flow';
import { FastCheckoutButtons } from '@/components/store/FastCheckoutButtons';

type CheckoutStep = 'details' | 'payment' | 'processing';

const generatePaymentReference = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TR-${result}`;
};

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params?.storeId as string;
  const { cartItems, clearCart } = useCart();
  const { user, isLoading: isAuthLoading } = useUser();
  const { settings, isLoadingSettings } = useSettings();
  const { getStoreUrl } = useStoreUrl();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { triggerAd, rewardAdClicked, activeAds, applyRewardDiscount } = useAds();

  const [step, setStep] = useState<CheckoutStep>('details');

  useEffect(() => {
    triggerAd('checkout_start');
  }, [triggerAd]);

  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [selectedCoin, setSelectedCoin] = useState<string>('btc');
  const [paymentReference] = useState(generatePaymentReference());
  const [hasConfirmedTransfer, setHasConfirmedTransfer] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>('delivery');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // Fetch registered user profile
  const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const currencySymbol = settings?.currency || '$';
  const subtotal = cartItems.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);

  const deliveryLocations = useMemo(() => settings?.deliveryLocations || [], [settings]);
  const selectedLocation = useMemo(() => 
    deliveryLocations.find(loc => loc.id === selectedLocationId),
  [deliveryLocations, selectedLocationId]);

  const shipping = useMemo(() => {
    if (subtotal === 0) return 0;
    if (fulfillmentType === 'pickup') return 0;
    return selectedLocation?.price || 0;
  }, [subtotal, fulfillmentType, selectedLocation]);

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
    if (settings) {
      if (settings.enableDelivery === false && settings.enablePickUp !== false) {
        setFulfillmentType('pickup');
      } else if (settings.enablePickUp === false && settings.enableDelivery !== false) {
        setFulfillmentType('delivery');
      }
    }
  }, [settings]);

  useEffect(() => {
    if (deliveryLocations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(deliveryLocations[0].id);
    }
  }, [deliveryLocations, selectedLocationId]);

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
    if (filteredPaymentMethods.length > 0) {
      const isStillAvailable = filteredPaymentMethods.some(m => m.name === paymentMethod || m.id === paymentMethod);
      if (!isStillAvailable || !paymentMethod) {
        setPaymentMethod(filteredPaymentMethods[0].name);
      }
    } else if (!isLoadingMethods) {
      setPaymentMethod('');
    }
  }, [filteredPaymentMethods, paymentMethod, isLoadingMethods]);

  const bankAccounts = settings?.bankAccounts || [];
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
        const result = await uploadImage({ imageDataUri, storeId: params.storeId as string });
        setReceiptUrl(result.display_url);
        toast({ title: "Receipt Uploaded", description: "Your payment receipt has been attached." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload receipt." });
      } finally {
        setIsUploadingReceipt(false);
      }
    };
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || (fulfillmentType === 'delivery' && !formData.address)) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill in all required delivery details.' });
      return;
    }
    if (fulfillmentType === 'delivery' && deliveryLocations.length > 0 && !selectedLocationId) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a delivery location.' });
      return;
    }
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    if (!firestore || step === 'processing') return;
    
    if (paymentMethod === 'Bank Transfer' && (!selectedBankAccount || !hasConfirmedTransfer)) {
        toast({ variant: 'destructive', title: 'Action Required', description: 'Please select a bank and confirm the transfer.' });
        return;
    }

    if (!paymentMethod) {
        toast({ variant: 'destructive', title: 'Action Required', description: 'Please select a payment method.' });
        return;
    }

    setStep('processing');

    try {
      let finalOrderId = '';
      
      const selectedMethod = filteredPaymentMethods.find(m => m.name === paymentMethod || m.id === paymentMethod);
      const isOnlinePayment = selectedMethod && 
                             selectedMethod.provider !== 'manual' && 
                             selectedMethod.provider !== 'pay_on_delivery';

      // Use the server action to place the order
      const result = await placeOrderAction({
        userId: user?.uid || 'GUEST',
        storeId: storeId,
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.salePrice,
          variantId: item.selectedVariantId,
          selectedOptions: item.selectedOptions,
        })),
        totalAmount: total,
        totalCost: cartItems.reduce((sum, item) => sum + ((item.purchasePrice || item.salePrice || 0) * item.quantity), 0),
        paymentMethod: paymentMethod,
        paymentReference: paymentMethod === 'Bank Transfer' ? paymentReference : null,
        paymentReceiptUrl: paymentMethod === 'Bank Transfer' ? receiptUrl : null,
        couponCode: appliedCoupon?.code || null,
        appliedCouponId: appliedCoupon?.id || null,
        selectedBankAccount: paymentMethod === 'Bank Transfer' ? selectedBankAccount : null,
        fulfillmentType,
        deliveryLocationId: fulfillmentType === 'delivery' ? selectedLocationId : null,
        deliveryPrice: shipping,
        guestInfo: formData,
        payCurrency: selectedMethod?.provider === 'nowpayments' ? selectedCoin : null,
        gateway: selectedMethod?.provider === 'nowpayments' ? 'NOWPayments' : selectedMethod?.provider,
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
            payCurrency: selectedMethod.provider === 'nowpayments' ? selectedCoin : undefined,
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
      
      toast({ title: 'Order Placed!', description: 'Your order has been received successfully.' });
      clearCart();
      safeSessionStorage.removeItem('appliedCoupon');
      router.push(getStoreUrl(`/store/checkout/success?orderId=${finalOrderId}`));
    } catch (error: any) {
      console.error('Order error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Order Failed', 
        description: error.message || 'There was a problem processing your order.' 
      });
      setStep('payment');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard.` });
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

  if (isAuthLoading || isLoadingSettings || isProfileLoading || isLoadingMethods) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Checkout</h1>
            <p className="text-muted-foreground mt-2">Complete your purchase securely.</p>
          </div>
          <Button variant="ghost" asChild><Link href={getStoreUrl("/store/cart")}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Cart</Link></Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Card className={cn(step !== 'details' && "opacity-60")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> 1. Delivery Details</CardTitle>
                <CardDescription>{user ? "Confirm your account delivery information." : "Provide your details for guest checkout."}</CardDescription>
              </CardHeader>
              <CardContent>
                {step === 'details' && (
                  <FastCheckoutButtons 
                    storeId={storeId}
                    amount={total}
                    currency={settings?.currency || 'NGN'}
                    availableMethods={filteredPaymentMethods}
                    onSuccess={(orderId) => {
                      // Handle success
                    }}
                    onBeforeCheckout={async () => {
                      // Validate basic info
                      if (!formData.email || !formData.phone) {
                          toast({ variant: 'destructive', title: 'Information Required', description: 'Please enter your email and phone number.' });
                          return null;
                      }

                      // Create order using placeOrderAction
                      try {
                        const result = await placeOrderAction({
                            userId: user?.uid || 'GUEST',
                            storeId: storeId,
                            items: cartItems.map(item => ({
                                productId: item.id,
                                quantity: item.quantity,
                                price: item.salePrice
                            })),
                            totalAmount: total,
                            totalCost: cartItems.reduce((sum, item) => sum + ((item.purchasePrice || item.salePrice || 0) * item.quantity), 0),
                            paymentMethod: 'Express Checkout',
                            fulfillmentType,
                            deliveryLocationId: fulfillmentType === 'delivery' ? selectedLocationId : null,
                            deliveryPrice: shipping,
                            guestInfo: formData,
                            taxRate: settings?.taxRate || 0,
                            taxAmountCalculated: taxAmount,
                        });
                        
                        if (result.success) return result.orderId;
                        throw new Error(result.error);
                      } catch (e: any) {
                        toast({ variant: 'destructive', title: 'Order Failed', description: e.message });
                        return null;
                      }
                    }}
                    customerEmail={formData.email}
                  />
                )}
                <form onSubmit={handleProceedToPayment} className="space-y-6">
                  <div className="space-y-4">
                    <Label>Fulfillment Method</Label>
                    <RadioGroup 
                      value={fulfillmentType} 
                      onValueChange={(val) => setFulfillmentType(val as 'pickup' | 'delivery')}
                      className="grid grid-cols-2 gap-4"
                    >
                      {settings?.enablePickUp !== false && (
                        <div>
                          <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
                          <Label htmlFor="pickup" className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all">
                            <Store className="mb-2 h-6 w-6" />
                            <span className="text-sm font-bold uppercase">Store Pickup</span>
                          </Label>
                        </div>
                      )}
                      {settings?.enableDelivery !== false && (
                        <div>
                          <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
                          <Label htmlFor="delivery" className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all">
                            <Truck className="mb-2 h-6 w-6" />
                            <span className="text-sm font-bold uppercase">Home Delivery</span>
                          </Label>
                        </div>
                      )}
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative"><User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="name" name="name" placeholder="John Doe" className="pl-10" value={formData.name} onChange={handleInputChange} required disabled={step !== 'details'} /></div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="email" name="email" type="email" placeholder="john@example.com" className="pl-10" value={formData.email} onChange={handleInputChange} required disabled={step !== 'details'} /></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Required for WhatsApp Updates)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="phone" 
                        name="phone" 
                        type="tel" 
                        placeholder="e.g. 08012345678" 
                        className="pl-10" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                        onBlur={() => {
                          const formatted = formatPhoneNumberForWhatsapp(formData.phone, settings?.countryCode || '234');
                          if (formatted) {
                            setFormData(prev => ({ ...prev, phone: formatted }));
                          }
                        }}
                        required 
                        disabled={step !== 'details'} 
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 px-1 mt-1">
                      <Info className="h-3 w-3 text-primary" />
                      We&apos;ll automatically format your number for WhatsApp alerts (e.g. 23480...).
                    </p>
                  </div>

                  {fulfillmentType === 'delivery' && (
                    <>
                      {deliveryLocations.length > 0 && (
                        <div className="space-y-2">
                          <Label>Select Delivery Location</Label>
                          <Select value={selectedLocationId} onValueChange={setSelectedLocationId} disabled={step !== 'details'}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                            <SelectContent>
                              {deliveryLocations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name} (+{formatCurrency(loc.price, currencySymbol)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="address">Delivery Address</Label>
                        <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Textarea id="address" name="address" placeholder="Enter your full street address..." className="pl-10 min-h-[100px]" value={formData.address} onChange={handleInputChange} required disabled={step !== 'details'} /></div>
                      </div>
                    </>
                  )}

                  {step === 'details' && <Button type="submit" style={buttonStyle} className="border-none font-bold w-full h-12">Continue to Payment</Button>}
                </form>
              </CardContent>
            </Card>

            <Card className={cn(step === 'details' && "opacity-40 pointer-events-none")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> 2. Payment Method</CardTitle>
                <CardDescription>Select how you'd like to pay.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {filteredPaymentMethods.length > 0 ? (
                    <>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPaymentMethods.map((method) => (
                        <div key={method.id}>
                        <RadioGroupItem value={method.name} id={method.id} className="peer sr-only" />
                        <Label htmlFor={method.id} className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full text-center">
                            {method.logoUrl ? (
                                <div className="relative w-12 h-12 mb-3">
                                    <Image src={method.logoUrl} alt={method.name} fill className="object-contain" />
                                </div>
                            ) : (
                                <>
                                    {method.provider === 'manual' ? <Landmark className="mb-3 h-8 w-8" /> :
                                     method.provider === 'pay_on_delivery' ? <Truck className="mb-3 h-8 w-8" /> :
                                     method.provider === 'opay' ? <Wallet className="mb-3 h-8 w-8" /> :
                                     method.provider === 'palmpay' ? <Smartphone className="mb-3 h-8 w-8" /> :
                                     method.provider === 'paypal' ? <Wallet className="mb-3 h-8 w-8 text-blue-600" /> :
                                     method.provider === 'nowpayments' ? <Coins className="mb-3 h-8 w-8 text-amber-500" /> :
                                     method.provider === 'monnify' ? <CreditCard className="mb-3 h-8 w-8 text-blue-500" /> :
                                     <CreditCard className="mb-3 h-8 w-8" />}
                                </>
                            )}
                            
                            <span className="font-bold text-sm mb-1">{method.name}</span>
                            <p className="text-[10px] text-muted-foreground line-clamp-2">
                                {method.instructions || 
                                 (method.provider === 'pay_on_delivery' ? 'Pay when you receive your order' : 
                                  method.provider === 'manual' ? 'Transfer to our bank account' : 
                                  'Secure online payment')}
                            </p>
                        </Label>
                        </div>
                    ))}
                    </RadioGroup>

                    {paymentMethod === 'Pay on Delivery' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="p-6 border-2 border-primary/20 bg-primary/5 rounded-2xl space-y-4">
                                <div className="flex items-center gap-3 text-primary"><Truck className="h-5 w-5" /><h3 className="font-bold text-lg">Pay on Delivery</h3></div>
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                    {filteredPaymentMethods.find(m => m.name === 'Pay on Delivery')?.instructions || "You will pay for your order when it is delivered to you."}
                                </p>
                                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-700 dark:text-amber-400 text-xs">
                                    <Info className="h-4 w-4 shrink-0" />
                                    <p>Please ensure you are available at the delivery address to receive and pay for your order.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {paymentMethod === 'Bank Transfer' && bankAccounts.length > 0 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="p-6 border-2 border-primary/20 bg-primary/5 rounded-2xl space-y-6">
                                <div className="flex items-center gap-3 text-primary"><Info className="h-5 w-5" /><h3 className="font-bold text-lg">Bank Transfer Instructions</h3></div>
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{settings?.bankTransferInstructions}</p>

                                <RadioGroup className="space-y-3">
                                    {bankAccounts.map((acc) => (
                                        <div key={acc.id} className="flex items-center space-x-3 p-4 rounded-xl border-2 border-muted hover:border-primary/30 cursor-pointer transition-colors" onClick={() => setSelectedBankId(acc.id)}>
                                            <RadioGroupItem value={acc.id} id={acc.id} className="peer sr-only" />
                                            <Label htmlFor={acc.id} className="flex items-center gap-4 cursor-pointer flex-1">
                                                <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                                                    <Landmark className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-bold block truncate">{acc.bankName}</span>
                                                    <span className="text-[10px] text-muted-foreground block truncate">{acc.accountName}</span>
                                                </div>
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>

                                {selectedBankAccount && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-background p-6 rounded-xl border shadow-sm">
                                        <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-muted-foreground">Bank Name</Label><p className="font-bold text-lg">{selectedBankAccount.bankName}</p></div>
                                        <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-muted-foreground">Account Name</Label><p className="font-bold text-lg">{selectedBankAccount.accountName}</p></div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Account Number</Label>
                                            <div className="flex items-center gap-2"><p className="font-black text-xl tracking-tighter">{selectedBankAccount.accountNumber}</p><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(selectedBankAccount.accountNumber, 'Account Number')}><Copy className="h-4 w-4" /></Button></div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Payment Reference</Label>
                                            <div className="flex items-center gap-2"><p className="font-black text-2xl text-primary tracking-widest">{paymentReference}</p><Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => copyToClipboard(paymentReference, 'Reference Code')}><Copy className="h-4 w-4"/></Button></div>
                                            <p className="text-[10px] text-orange-600 font-bold">Enter this code in your transfer description.</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Upload Receipt (Optional)</Label>
                                            <div className="flex flex-col gap-2">
                                                {receiptUrl ? (
                                                    <div className="relative w-full h-32 rounded-xl overflow-hidden border">
                                                        <Image src={receiptUrl} alt="Receipt" fill className="object-cover" />
                                                        <Button 
                                                            variant="destructive" 
                                                            size="icon" 
                                                            className="absolute top-2 right-2 h-8 w-8"
                                                            onClick={() => setReceiptUrl('')}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Button asChild variant="outline" className="w-full h-12" disabled={isUploadingReceipt}>
                                                            <label className="cursor-pointer">
                                                                {isUploadingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                                {isUploadingReceipt ? 'Uploading...' : 'Upload Payment Receipt'}
                                                                <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} disabled={isUploadingReceipt} />
                                                            </label>
                                                        </Button>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-muted-foreground">Attach a screenshot of your successful transfer.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Confirm Transfer</Label>
                                            <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all">
                                                <Checkbox 
                                                    checked={hasConfirmedTransfer}
                                                    onCheckedChange={(checked) => setHasConfirmedTransfer(!!checked)}
                                                    className="h-5 w-5"
                                                />
                                                <span className="text-sm font-bold">I've successfully transferred the funds</span>
                                            </label>
                                        </div>
                                        </div>
                                        )}
                                        </div>
                                        </div>
                                        )}

                                        {filteredPaymentMethods.find(m => m.name === paymentMethod || m.id === paymentMethod)?.provider === 'nowpayments' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="p-6 border-2 border-primary/20 bg-primary/5 rounded-2xl space-y-4">
                                        <div className="flex items-center gap-3 text-primary"><Coins className="h-5 w-5" /><h3 className="font-bold text-lg">Pay with Cryptocurrency</h3></div>
                                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                        Select your preferred cryptocurrency to pay with. You will be redirected to NOWPayments to complete the transaction.
                                        </p>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {(filteredPaymentMethods.find(m => m.name === paymentMethod || m.id === paymentMethod)?.config?.acceptedCoins || ['btc', 'eth', 'usdttrc20']).map((coin: string) => (
                                            <div
                                                key={coin}
                                                onClick={() => setSelectedCoin(coin)}
                                                className={cn(
                                                    "flex items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer font-bold uppercase text-sm",
                                                    selectedCoin === coin
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-muted bg-background hover:border-primary/30"
                                                )}
                                            >
                                                {coin}
                                            </div>
                                        ))}
                                        </div>
                                        </div>
                                        </div>
                                        )}
                                        </>
                ) : (
                    <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/20">
                        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground opacity-30 mb-4" />
                        <p className="text-muted-foreground">Online payments are currently unavailable. Please contact the store to complete your purchase.</p>
                    </div>
                )}
              </CardContent>
              {step === 'payment' && (
                <CardFooter className="flex justify-between border-t pt-6">
                  <Button variant="ghost" onClick={() => setStep('details')}>Back to Details</Button>
                  <LoadingButton 
                    onClick={handlePlaceOrder} 
                    isLoading={step as string === 'processing'}
                    disabled={(paymentMethod === 'Bank Transfer' && !hasConfirmedTransfer) || filteredPaymentMethods.length === 0 || step as string === 'processing'}
                    size="lg" 
                    style={buttonStyle}
                    className="px-10 border-none font-bold"
                    loadingText="Processing..."
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {paymentMethod === 'Bank Transfer' ? 'Submit Order' : 'Complete Purchase'}
                  </LoadingButton>
                </CardFooter>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1 sticky top-32">
            <Card className="shadow-lg border-none ring-1 ring-border">
              <CardHeader className="bg-muted/50"><CardTitle className="flex items-center gap-2 text-lg"><ShoppingBag className="h-5 w-5" /> Order Summary</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[300px]">
                  <div className="p-6 divide-y">
                    {cartItems.map((item, idx) => (
                      <div key={`${item.id}-${idx}`} className="py-3 flex justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          {item.selectedOptions && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {Object.entries(item.selectedOptions).map(([key, val]) => (
                                <span 
                                  key={key} 
                                  className={cn(
                                    "text-[9px] uppercase font-bold px-1 border rounded",
                                    key.toLowerCase().includes('size') ? "bg-white text-black border-black/10 shadow-sm" : "text-muted-foreground"
                                  )}
                                >
                                  {key}: {val}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-sm shrink-0">{formatCurrency(item.salePrice * item.quantity, currencySymbol)}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-6 bg-muted/20 border-t space-y-4">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatCurrency(subtotal, currencySymbol)}</span></div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                        <span className="font-medium flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Promo Discount</span>
                        <span className="font-bold">-{formatCurrency(discountAmount, currencySymbol)}</span>
                    </div>
                  )}
                  {rewardDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-amber-600">
                        <span className="font-medium flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Reward Discount</span>
                        <span className="font-bold">-{formatCurrency(rewardDiscountAmount, currencySymbol)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {fulfillmentType === 'pickup' ? 'Store Pickup' : 'Delivery'}
                    </span>
                    <span className="font-medium">
                      {shipping === 0 ? 'Free' : formatCurrency(shipping, currencySymbol)}
                    </span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{settings?.taxName || 'Tax'} ({settings?.taxRate}%)</span>
                      <span className="font-medium">{formatCurrency(taxAmount, currencySymbol)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-baseline pt-2"><span className="text-lg font-bold">Total</span><span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(total, currencySymbol)}</span></div>
                </div>
              </CardContent>
              <CardFooter className="p-6 bg-slate-50 dark:bg-slate-900 rounded-b-lg"><div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none"><ShieldCheck className="h-4 w-4 text-green-600" /> Secure Transaction Protected</div></CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {step === 'processing' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 text-center">
          <div className="max-w-md w-full space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <ShoppingBag className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Processing Your Order</h2>
              <p className="text-muted-foreground text-lg">
                We're finalizing your purchase. This will only take a moment.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-amber-600 font-medium bg-amber-50 dark:bg-amber-950/30 py-2 px-4 rounded-full w-fit mx-auto mt-4">
                <Info className="h-4 w-4" />
                Please do not refresh or close this page.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
