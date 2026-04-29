
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useSettings } from '@/contexts/settings-context';
import { doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft, CreditCard, User, Clock, CheckCircle2 } from 'lucide-react';
import type { Product, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useStoreUrl } from '@/hooks/use-store-url';
import { createInstallmentPlanAction } from '@/app/actions/installments';
import { format } from 'date-fns';

export default function InstallmentCheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const storeId = params?.storeId as string;
  const productId = searchParams.get('productId');
  const variantId = searchParams.get('variantId');
  const qty = parseInt(searchParams.get('qty') || '1');

  const { user, isLoading: isAuthLoading } = useUser();
  const { settings, isLoadingSettings } = useSettings();
  const { getStoreUrl } = useStoreUrl();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'success'>('details');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const productRef = useMemo(() => productId ? doc(firestore, 'products', productId) : null, [productId, firestore]);
  const { data: product, isLoading: isLoadingProduct } = useDoc<Product>(productRef);

  const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

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

  const currencySymbol = settings?.currency || '$';
  
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    if (variantId && product.variants) {
        const v = product.variants.find(v => v.id === variantId);
        if (v && v.sellingPrice) return v.sellingPrice;
    }
    return product.newPrice || product.sellingPrice;
  }, [product, variantId]);

  const totalAmount = currentPrice * qty;
  const downPaymentAmount = totalAmount * (product?.downPaymentPercentage || 0) / 100;
  const remainingBalance = totalAmount - downPaymentAmount;
  const installmentAmount = remainingBalance / (product?.numberOfPayments || 1);

  const nextDueDate = useMemo(() => {
      if (!product) return new Date();
      const d = new Date();
      if (product.paymentInterval === 'daily') d.setDate(d.getDate() + 1);
      else if (product.paymentInterval === 'weekly') d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
      return d;
  }, [product]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill in all required details.' });
      return;
    }
    setStep('payment');
  };

  const handleCompleteCheckout = async (paymentMethod: string, reference: string = 'MANUAL') => {
    setStep('processing');
    try {
      const result = await createInstallmentPlanAction({
        storeId,
        customerId: user?.uid || 'GUEST',
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        productId: product!.id,
        productName: product!.name,
        totalAmount,
        downPaymentAmount,
        numberOfPayments: product!.numberOfPayments || 1,
        paymentInterval: product!.paymentInterval || 'monthly',
        nextDueDate: nextDueDate,
        lateFee: product!.lateFee || 0,
        paymentMethod,
        paymentReference: reference
      });

      if (result.success) {
        setStep('success');
        toast({ title: 'Plan Created!', description: 'Your installment plan has been activated.' });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setStep('payment');
    }
  };

  if (isLoadingProduct || isAuthLoading || isLoadingSettings) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!product || !product.installmentEnabled) {
    return <div className="p-20 text-center">Invalid product for installments.</div>;
  }

  if (step === 'success') {
      return (
          <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="h-12 w-12" />
                </div>
              </div>
              <h1 className="text-4xl font-black">Plan Activated!</h1>
              <p className="text-muted-foreground text-lg">Thank you, {formData.name}. Your first payment of {formatCurrency(downPaymentAmount, currencySymbol)} has been recorded.</p>
              <div className="p-6 rounded-3xl bg-muted/50 border space-y-4 text-left">
                  <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Product</span>
                      <span className="font-bold">{product.name}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Remaining Balance</span>
                      <span className="font-bold">{formatCurrency(remainingBalance, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Next Due Date</span>
                      <span className="font-bold">{format(nextDueDate, 'PPP')}</span>
                  </div>
              </div>
              <Button asChild className="w-full h-14 rounded-2xl text-lg font-bold" size="lg">
                  <Link href={getStoreUrl('/')}>Return to Store</Link>
              </Button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black tracking-tight">Installment Checkout</h1>
          <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> 1. Your Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input id="address" name="address" value={formData.address} onChange={handleInputChange} />
                  </div>
                  {step === 'details' && (
                    <Button type="submit" className="md:col-span-2 h-12 rounded-xl mt-4">Proceed to Payment</Button>
                  )}
                </form>
              </CardContent>
            </Card>

            {step !== 'details' && (
              <Card className="animate-in fade-in slide-in-from-top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> 2. Down Payment</CardTitle>
                  <CardDescription>Pay your initial deposit to activate the plan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/10 text-center">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Amount to Pay Now</p>
                      <h2 className="text-4xl font-black text-primary">{formatCurrency(downPaymentAmount, currencySymbol)}</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                      <Button onClick={() => handleCompleteCheckout('Paystack')} className="h-14 rounded-2xl bg-[#09a5db] hover:bg-[#09a5db]/90 text-white font-bold text-lg">
                          Pay with Paystack
                      </Button>
                      <Button onClick={() => handleCompleteCheckout('Flutterwave')} className="h-14 rounded-2xl bg-[#f5a623] hover:bg-[#f5a623]/90 text-white font-bold text-lg">
                          Pay with Flutterwave
                      </Button>
                      <Button onClick={() => handleCompleteCheckout('Bank Transfer')} variant="outline" className="h-14 rounded-2xl font-bold">
                          Bank Transfer / Offline
                      </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Plan Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                    <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-muted border">
                        <Image src={product.imageUrl || ''} alt={product.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {qty}</p>
                    </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Total Product Value</span>
                        <span className="font-bold">{formatCurrency(totalAmount, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-primary font-bold">
                        <span>Down Payment ({product.downPaymentPercentage}%)</span>
                        <span>{formatCurrency(downPaymentAmount, currencySymbol)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm">
                        <span>Remaining Balance</span>
                        <span className="font-bold">{formatCurrency(remainingBalance, currencySymbol)}</span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/50 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold">
                        <Clock className="h-3 w-3 text-primary" />
                        Schedule: {product.numberOfPayments} {product.paymentInterval} payments
                    </div>
                    <div className="flex justify-between text-xs">
                        <span>Installment Amount</span>
                        <span className="font-black">{formatCurrency(installmentAmount, currencySymbol)}</span>
                    </div>
                    <Progress value={0} className="h-1" />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2 italic text-[10px] text-muted-foreground">
                <p>First payment of {formatCurrency(downPaymentAmount, currencySymbol)} due today.</p>
                <p>Next payment of {formatCurrency(installmentAmount, currencySymbol)} due on {format(nextDueDate, 'PP')}.</p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
