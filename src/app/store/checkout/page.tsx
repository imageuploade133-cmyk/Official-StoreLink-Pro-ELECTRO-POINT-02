'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import type { UserProfile, Order, BankAccount, WhatsappMessageLog, Coupon } from '@/lib/types';
import { cn } from '@/lib/utils';
import { sendWhatsAppReceipt } from '@/lib/whatsapp';
import { formatPhoneNumberForWhatsapp } from '@/lib/phone-utils';
import { safeSessionStorage } from '@/lib/storage-utils';
import { useAds } from '@/contexts/ad-context';

import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Upload } from 'lucide-react';

type CheckoutStep = 'details' | 'payment' | 'processing' | 'success';

const generatePaymentReference = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TR-${result}`;
};

export default function CheckoutPage() {
  const { cartItems, clearCart } = useCart();
  const { user, isLoading: isAuthLoading } = useUser();
  const { settings, isLoadingSettings } = useSettings();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { triggerAd, rewardAdClicked, activeAds, applyRewardDiscount } = useAds();

  const [step, setStep] = useState<CheckoutStep>('details');

  useEffect(() => {
    triggerAd('checkout_start');
  }, [triggerAd]);

  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
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

  const total = Math.max(0, subtotal - discountAmount - rewardDiscountAmount + shipping);

  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const res = await fetch('/api/payment/methods');
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
  }, []);

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
    if (availablePaymentMethods.length > 0 && !paymentMethod) {
      setPaymentMethod(availablePaymentMethods[0].name);
    }
  }, [availablePaymentMethods, paymentMethod]);

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
        const result = await uploadImage({ imageDataUri });
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
    if (!formData.name || !formData.email || (fulfillmentType === 'delivery' && !formData.address)) {
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
    if (!firestore) return;
    
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
      const orderRef = doc(collection(firestore, 'orders'));
      finalOrderId = orderRef.id;

      // For online payments, we initialize first, then save the order
      // But actually, we should probably save the order as 'pending' first.
      
      const selectedMethod = availablePaymentMethods.find(m => m.name === paymentMethod);
      const isOnlinePayment = selectedMethod && selectedMethod.provider !== 'manual';

      await runTransaction(firestore, async (transaction) => {
        // --- 1. GATHER ALL READS FIRST ---
        const productRefs = cartItems.map(item => doc(firestore, 'products', item.id));
        const productSnapshots = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        // --- 2. VALIDATIONS AND LOGIC ---
        for (let i = 0; i < cartItems.length; i++) {
          const item = cartItems[i];
          const productDoc = productSnapshots[i];
          
          if (!productDoc.exists()) {
            throw new Error(`Product "${item.name}" no longer exists.`);
          }
          
          const currentStock = productDoc.data().stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(`Insufficient stock for "${item.name}". Only ${currentStock} left.`);
          }
          
          // --- 3. QUEUE WRITES ---
          transaction.update(productRefs[i], { stock: currentStock - item.quantity });
        }

        const firstProduct = productSnapshots[0]?.data();
        const orderStoreId = firstProduct?.store_id || null;

        if (appliedCoupon) {
            const couponRef = doc(firestore, 'coupons', appliedCoupon.id);
            transaction.update(couponRef, { usageCount: increment(1) });
        }

        const orderData: any = {
          user_id: user?.uid || 'GUEST',
          store_id: orderStoreId,
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
          selectedBankAccount: paymentMethod === 'Bank Transfer' ? selectedBankAccount : null,
          fulfillmentType,
          deliveryLocationId: fulfillmentType === 'delivery' ? selectedLocationId : null,
          deliveryPrice: shipping,
          status: 'pending',
          isPaid: false,
          createdAt: serverTimestamp(),
          guestInfo: user ? null : formData,
        };

        transaction.set(orderRef, orderData);
      });

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

      // --- WhatsApp Notifications ---
      if (settings?.enableWhatsapp) {
          // 1. Notification to CUSTOMER
          if (formData.phone) {
              const formattedPhone = formatPhoneNumberForWhatsapp(formData.phone, settings.countryCode);
              if (formattedPhone) {
                  try {
                      const extraMsg = paymentMethod === 'Bank Transfer' 
                        ? `Payment Ref: ${paymentReference}\nPlease complete your transfer to ${selectedBankAccount?.bankName}.`
                        : '';

                      await sendWhatsAppReceipt({
                          eventType: 'order_placed',
                          phone: formattedPhone,
                          customerName: formData.name,
                          orderId: finalOrderId,
                          items: cartItems.map(i => ({ name: i.name, qty: i.quantity, price: i.salePrice })),
                          total: total,
                          paymentMethod: paymentMethod,
                          storeName: settings.storeName,
                          currencySymbol: settings.currency,
                          fulfillmentType: fulfillmentType,
                          message: extraMsg
                          });

                      await addDoc(collection(firestore, 'whatsappMessageLogs'), {
                          timestamp: serverTimestamp(),
                          eventType: 'order_placed',
                          messageContent: `Order Confirmation sent to Customer for #${finalOrderId}`,
                          recipientPhone: formData.phone,
                          customerName: formData.name,
                          status: 'sent',
                          unitsCharged: 3.1,
                          userId: user?.uid || 'GUEST',
                          userName: user?.email || 'Guest Checkout'
                      } as WhatsappMessageLog);
                  } catch (waError) {
                      console.error("Failed to send Customer WhatsApp notification:", waError);
                  }
              }
          }

          // 2. Notifications to STAFF (Order Alerts)
          if (settings.enableOrderAlerts && settings.orderNotificationNumbers && settings.orderNotificationNumbers.length > 0) {
              const staffAlertPromises = settings.orderNotificationNumbers.map(async (alertNum) => {
                  const formattedAlertPhone = formatPhoneNumberForWhatsapp(alertNum, settings.countryCode);
                  if (!formattedAlertPhone) return;

                  try {
                      await sendWhatsAppReceipt({
                          eventType: 'staff_order_alert',
                          phone: formattedAlertPhone,
                          customerName: formData.name,
                          orderId: finalOrderId,
                          total: total,
                          paymentMethod: paymentMethod,
                          storeName: settings.storeName,
                          currencySymbol: settings.currency,
                          fulfillmentType: fulfillmentType,
                          });

                      await addDoc(collection(firestore, 'whatsappMessageLogs'), {
                          timestamp: serverTimestamp(),
                          eventType: 'staff_order_alert',
                          messageContent: `Staff Order Alert sent for #${finalOrderId}`,
                          recipientPhone: alertNum,
                          customerName: 'Staff Member',
                          status: 'sent',
                          unitsCharged: 3.1,
                          userId: 'SYSTEM',
                          userName: 'Order Alert Service'
                      } as WhatsappMessageLog);
                  } catch (staffWaError) {
                      console.error(`Failed to send Staff WhatsApp alert to ${alertNum}:`, staffWaError);
                  }
              });
              
              Promise.all(staffAlertPromises);
          }
      }

      toast({ title: 'Order Placed!', description: 'Your order has been received successfully.' });
      setStep('success');
      clearCart();
      safeSessionStorage.removeItem('appliedCoupon');
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

  if (isAuthLoading || isLoadingSettings || isProfileLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center">
        <div className="bg-green-100 dark:bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="text-4xl font-extrabold mb-4">Order Received!</h1>
        <p className="text-xl text-muted-foreground mb-4">Your purchase has been placed successfully.</p>
        {paymentMethod === 'Bank Transfer' && (
            <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 mb-8 max-w-md mx-auto">
                <CardContent className="pt-6 space-y-3">
                    <p className="font-bold text-orange-700 dark:text-orange-400">Payment Pending Verification</p>
                    <p className="text-sm">Please ensure you used reference <strong>{paymentReference}</strong> in your transfer. We will process your order once funds are confirmed.</p>
                </CardContent>
            </Card>
        )}
        <Button asChild size="lg"><Link href="/store/shop">Return to Shop</Link></Button>
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
          <Button variant="ghost" asChild><Link href="/store/cart"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Cart</Link></Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Card className={cn(step !== 'details' && "opacity-60")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> 1. Delivery Details</CardTitle>
                <CardDescription>{user ? "Confirm your account delivery information." : "Provide your details for guest checkout."}</CardDescription>
              </CardHeader>
              <CardContent>
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
                    <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" className="pl-10" value={formData.phone} onChange={handleInputChange} required disabled={step !== 'details'} /></div>
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
                {availablePaymentMethods.length > 0 ? (
                    <>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availablePaymentMethods.map((method) => (
                        <div key={method.id}>
                        <RadioGroupItem value={method.name} id={method.id} className="peer sr-only" />
                        <Label htmlFor={method.id} className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full text-center">
                            {method.name === 'Bank Transfer' ? <Landmark className="mb-3 h-8 w-8" /> : <CreditCard className="mb-3 h-8 w-8" />}
                            <span className="text-xs font-black uppercase tracking-widest">{method.name}</span>
                        </Label>
                        </div>
                    ))}
                    </RadioGroup>

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
                    isLoading={step === 'processing'}
                    disabled={(paymentMethod === 'Bank Transfer' && !hasConfirmedTransfer) || availablePaymentMethods.length === 0}
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
                    {cartItems.map((item) => (
                      <div key={item.id} className="py-3 flex justify-between gap-4">
                        <div className="min-w-0"><p className="font-medium text-sm truncate">{item.name}</p><p className="text-xs text-muted-foreground">Qty: {item.quantity}</p></div>
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
                  <Separator />
                  <div className="flex justify-between items-baseline pt-2"><span className="text-lg font-bold">Total</span><span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(total, currencySymbol)}</span></div>
                </div>
              </CardContent>
              <CardFooter className="p-6 bg-slate-50 dark:bg-slate-900 rounded-b-lg"><div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none"><ShieldCheck className="h-4 w-4 text-green-600" /> Secure Transaction Protected</div></CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
