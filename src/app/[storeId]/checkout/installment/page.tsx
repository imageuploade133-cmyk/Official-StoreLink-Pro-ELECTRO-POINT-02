
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
import { Badge } from '@/components/ui/badge';
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
  
  // Compute allowed payment methods based on product's installmentPaymentMethods setting
  const allowedPaymentMethods = useMemo(() => {
    if (!product) return [];
    const productPaymentMethods = product.installmentPaymentMethods || [];
    const storePaymentMethods = settings?.paymentMethods || [];
    
    // If product has specific payment methods set, filter by them
    if (productPaymentMethods.length > 0) {
      return storePaymentMethods.filter(m => productPaymentMethods.includes(m.id));
    }
    
    // If no specific methods set on product, return all store payment methods
    return storePaymentMethods;
  }, [product, settings?.paymentMethods]);
  
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
          <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-8 animate-in fade-in zoom-in duration-700">
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/20">
                    <CheckCircle2 className="h-14 w-14" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">Plan Activated!</h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Thank you, {formData.name}. Your journey to ownership has begun.</p>
              </div>
              
              <div className="overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
                  <div className="p-8 space-y-6 text-left">
                      <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-4">
                              <div className="relative h-16 w-16 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                                  <Image src={product.imageUrl || ''} alt={product.name} fill className="object-cover" unoptimized />
                              </div>
                              <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product</p>
                                  <p className="font-bold text-slate-900 dark:text-white leading-tight">{product.name}</p>
                              </div>
                          </div>
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Active Plan</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paid Today</p>
                              <p className="text-xl font-black text-emerald-600">{formatCurrency(downPaymentAmount, currencySymbol)}</p>
                          </div>
                          <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Balance</p>
                              <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(remainingBalance, currencySymbol)}</p>
                          </div>
                      </div>

                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-white/5 space-y-3">
                          <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest">
                              <Clock className="h-4 w-4" />
                              Next Due Date
                          </div>
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                              {format(nextDueDate, 'MMMM do, yyyy')}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                              We&apos;ll send you a reminder 3 days before your next payment of {formatCurrency(installmentAmount, currencySymbol)} is due.
                          </p>
                      </div>
                  </div>
              </div>

              <Button asChild className="w-full h-16 rounded-[2rem] text-lg font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all" size="lg">
                  <Link href={getStoreUrl('/store')}>Return to Store</Link>
              </Button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-black py-8 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:mb-12">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Installment Checkout</h1>
            <p className="text-slate-500 font-medium">Complete your details to activate your flexible payment plan.</p>
          </div>
          <Button variant="ghost" onClick={() => router.back()} className="w-fit h-12 px-6 rounded-2xl hover:bg-white dark:hover:bg-white/5 shadow-sm transition-all active:scale-95">
            <ArrowLeft className="mr-2 h-5 w-5" /> 
            <span className="font-bold">Back</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
          <div className="lg:col-span-7 space-y-8">
            <div className="overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-500">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">1. Your Identity</h2>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Personal Information</p>
                  </div>
                </div>

                <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest ml-1">Full Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-white/5 dark:border-white/10 focus:ring-primary/20 transition-all" placeholder="Enter your full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-1">Email Address</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-white/5 dark:border-white/10 focus:ring-primary/20 transition-all" placeholder="email@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest ml-1">Phone Number</Label>
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-white/5 dark:border-white/10 focus:ring-primary/20 transition-all" placeholder="+234 ..." />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest ml-1">Delivery Address</Label>
                    <Input id="address" name="address" value={formData.address} onChange={handleInputChange} className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 dark:bg-white/5 dark:border-white/10 focus:ring-primary/20 transition-all" placeholder="Your residential or work address" />
                  </div>
                  {step === 'details' && (
                    <Button type="submit" className="md:col-span-2 h-16 rounded-[2rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-lg font-black mt-4 shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all">
                      Continue to Payment
                    </Button>
                  )}
                </form>
              </div>
            </div>

            {step !== 'details' && (
              <div className="overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-500 animate-in fade-in slide-in-from-top-8">
                <div className="p-6 md:p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight">2. Down Payment</h2>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Initial Deposit</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paying Now</p>
                       <p className="text-2xl font-black text-primary">{formatCurrency(downPaymentAmount, currencySymbol)}</p>
                    </div>
                  </div>

                  {allowedPaymentMethods.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {allowedPaymentMethods.map((method) => (
                        <button 
                          key={method.id} 
                          onClick={() => handleCompleteCheckout(method.name)} 
                          className="group p-6 rounded-3xl border-2 border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-center space-y-3 active:scale-95"
                        >
                          <div className="h-12 w-12 rounded-2xl bg-white dark:bg-black shadow-sm flex items-center justify-center mx-auto group-hover:scale-110 transition-transform overflow-hidden">
                            {method.iconUrl ? (
                              <Image src={method.iconUrl} alt={method.name} width={24} height={24} className="object-contain" unoptimized />
                            ) : (
                              <CreditCard className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <p className="font-bold text-sm">{method.name}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button onClick={() => handleCompleteCheckout('Paystack')} className="group p-6 rounded-3xl border-2 border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-center space-y-3 active:scale-95">
                          <div className="h-12 w-12 rounded-2xl bg-white dark:bg-black shadow-sm flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                              <Image src="https://paystack.com/favicon.ico" alt="Paystack" width={24} height={24} className="rounded-full" />
                          </div>
                          <p className="font-bold text-sm">Paystack</p>
                      </button>
                      <button onClick={() => handleCompleteCheckout('Flutterwave')} className="group p-6 rounded-3xl border-2 border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-center space-y-3 active:scale-95">
                          <div className="h-12 w-12 rounded-2xl bg-white dark:bg-black shadow-sm flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                              <Image src="https://flutterwave.com/favicon.ico" alt="Flutterwave" width={24} height={24} className="rounded-full" />
                          </div>
                          <p className="font-bold text-sm">Flutterwave</p>
                      </button>
                      <button onClick={() => handleCompleteCheckout('Bank Transfer')} className="group p-6 rounded-3xl border-2 border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-center space-y-3 active:scale-95">
                          <div className="h-12 w-12 rounded-2xl bg-white dark:bg-black shadow-sm flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                              <ArrowLeft className="h-6 w-6 rotate-90 text-slate-400" />
                          </div>
                          <p className="font-bold text-sm">Transfer</p>
                      </button>
                    </div>
                  )}

                  <p className="text-[10px] text-center text-slate-400 font-medium italic">All payments are secured and encrypted. Your plan activates immediately after payment.</p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-24 overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
              <div className="p-8 space-y-8">
                <h3 className="text-2xl font-black tracking-tight">Plan Summary</h3>
                
                <div className="flex gap-6 items-center p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <div className="relative h-20 w-20 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                        <Image src={product.imageUrl || ''} alt={product.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 dark:text-white leading-tight mb-1">{product.name}</p>
                        <Badge variant="outline" className="bg-white dark:bg-black rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200">Qty: {qty}</Badge>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Total Value</span>
                        <span className="font-black text-slate-900 dark:text-white text-lg">{formatCurrency(totalAmount, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-primary font-black uppercase tracking-widest text-[10px]">Down Payment ({product.downPaymentPercentage}%)</span>
                        <span className="font-black text-primary text-lg">{formatCurrency(downPaymentAmount, currencySymbol)}</span>
                    </div>
                    <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800 my-2" />
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Balance to Spread</span>
                        <span className="font-black text-slate-900 dark:text-white text-lg">{formatCurrency(remainingBalance, currencySymbol)}</span>
                    </div>
                </div>

                <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                            <Clock className="h-4 w-4" />
                            Installment Plan
                        </div>
                        <Badge className="bg-primary text-white text-[9px] font-black rounded-full px-2">{product.numberOfPayments} Parts</Badge>
                    </div>
                    <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recurring Amount</p>
                           <p className="text-xl font-black text-primary">{formatCurrency(installmentAmount, currencySymbol)}</p>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 mb-1">{(product.paymentInterval || 'monthly').toUpperCase()}</p>
                    </div>
                    <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                       <div className="h-full bg-primary/30 w-1/4 rounded-full" />
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                       <span>Today</span>
                       <span>{product.paymentInterval}ly Payments</span>
                    </div>
                </div>
              </div>
              <div className="px-8 py-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                   First payment due today.
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                   Next payment due {format(nextDueDate, 'MMM do, yyyy')}.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
