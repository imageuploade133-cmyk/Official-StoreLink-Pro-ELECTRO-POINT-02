
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings, BankAccount } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Landmark, Info, PlusCircle, Trash2, Edit, Upload, Coins, AlertTriangle, CreditCard, Globe, Wallet, Smartphone, Zap, Truck, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { uploadImage } from '@/ai/flows/image-upload-flow';

const bankAccountSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required.'),
  accountNumber: z.string().min(5, 'Valid account number is required.'),
  accountName: z.string().min(2, 'Account holder name is required.'),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const instructionsSchema = z.object({
  bankTransferInstructions: z.string().min(10, 'Please provide clear instructions for customers.'),
});

type AccountFormValues = z.infer<typeof bankAccountSchema>;
type InstructionsFormValues = z.infer<typeof instructionsSchema>;

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import regions from '@/lib/regions.json';

const paystackSchema = z.object({
  testPublicKey: z.string().optional(),
  testSecretKey: z.string().optional(),
  livePublicKey: z.string().optional(),
  liveSecretKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const flutterwaveSchema = z.object({
  testPublicKey: z.string().optional(),
  testSecretKey: z.string().optional(),
  testEncryptionKey: z.string().optional(),
  livePublicKey: z.string().optional(),
  liveSecretKey: z.string().optional(),
  liveEncryptionKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const stripeSchema = z.object({
  testPublicKey: z.string().optional(),
  testSecretKey: z.string().optional(),
  livePublicKey: z.string().optional(),
  liveSecretKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const opaySchema = z.object({
  merchantId: z.string().optional(),
  testPublicKey: z.string().optional(),
  testSecretKey: z.string().optional(),
  livePublicKey: z.string().optional(),
  liveSecretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const palmpaySchema = z.object({
  merchantId: z.string().optional(),
  testAppId: z.string().optional(),
  testSecretKey: z.string().optional(),
  liveAppId: z.string().optional(),
  liveSecretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const paypalSchema = z.object({
  clientId: z.string().optional(),
  secretKey: z.string().optional(),
  liveClientId: z.string().optional(),
  liveSecretKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const payOnDeliverySchema = z.object({
  instructions: z.string().optional(),
  isActive: z.boolean().default(false),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const fastCheckoutSchema = z.object({
  enableApplePay: z.boolean().default(false),
  enableGooglePay: z.boolean().default(false),
  enableExpress: z.boolean().default(false),
  enableQuickPayButtons: z.boolean().default(false),
  isActive: z.boolean().default(false),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const nowpaymentsSchema = z.object({
  apiKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  acceptedCoins: z.array(z.string()).default(['btc', 'usdt', 'eth']),
});

const monnifySchema = z.object({
  testApiKey: z.string().optional(),
  testSecretKey: z.string().optional(),
  testContractCode: z.string().optional(),
  liveApiKey: z.string().optional(),
  liveSecretKey: z.string().optional(),
  liveContractCode: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const adyenSchema = z.object({
  apiKey: z.string().optional(),
  merchantAccount: z.string().optional(),
  clientKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  allowedLocations: z.array(z.string()).default([]),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

type PaystackFormValues = z.infer<typeof paystackSchema>;
type FlutterwaveFormValues = z.infer<typeof flutterwaveSchema>;
type StripeFormValues = z.infer<typeof stripeSchema>;
type OpayFormValues = z.infer<typeof opaySchema>;
type PalmPayFormValues = z.infer<typeof palmpaySchema>;
type PayPalFormValues = z.infer<typeof paypalSchema>;
type PayOnDeliveryFormValues = z.infer<typeof payOnDeliverySchema>;
type FastCheckoutFormValues = z.infer<typeof fastCheckoutSchema>;
type NowPaymentsFormValues = z.infer<typeof nowpaymentsSchema>;
type MonnifyFormValues = z.infer<typeof monnifySchema>;
type AdyenFormValues = z.infer<typeof adyenSchema>;

export default function WebsitePaymentSettings() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember, user } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRegion, setIsSavingRegion] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const handleRegionChange = async (value: string) => {
    if (!firestore || !currentStoreId) return;
    setIsSavingRegion(true);
    try {
      if (currentStoreId) {
        await saveStoreSettings(firestore, currentStoreId, { paymentRegion: value });
      } else {
        await saveGlobalSettings(firestore, { paymentRegion: value });
      }
      toast({ title: "Success", description: `Payment region updated to ${value}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update payment region." });
    } finally {
      setIsSavingRegion(false);
    }
  };
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchProviders = async () => {
    if (!user) return;
    setAuthError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/payment/settings?storeId=${currentStoreId || 'global'}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setProviders(data);
      } else if (data.error) {
        if (data.error.includes('FIREBASE_SERVICE_ACCOUNT_KEY')) {
            setAuthError(data.error);
        }
        console.error('API Error:', data.error);
      }
    } catch (e) {
      console.error('Failed to fetch providers', e);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (currentStoreId) {
      fetchProviders();
    }
  }, [currentStoreId]);

  const paystackProvider = providers.find(p => p.providerName === 'paystack');
  const flutterwaveProvider = providers.find(p => p.providerName === 'flutterwave');
  const stripeProvider = providers.find(p => p.providerName === 'stripe');
  const opayProvider = providers.find(p => p.providerName === 'opay');
  const palmpayProvider = providers.find(p => p.providerName === 'palmpay');
  const paypalProvider = providers.find(p => p.providerName === 'paypal');
  const manualProvider = providers.find(p => p.providerName === 'manual');
  const payOnDeliveryProvider = providers.find(p => p.providerName === 'pay_on_delivery');
  const fastCheckoutProvider = providers.find(p => p.providerName === 'fast_checkout');
  const nowpaymentsProvider = providers.find(p => p.providerName === 'nowpayments');
  const monnifyProvider = providers.find(p => p.providerName === "monnify");
  const adyenProvider = providers.find(p => p.providerName === "adyen");

  const isProviderActive = (name: string) => { 
    if (name === "paystack") return paystackProvider?.isActive; 
    if (name === "flutterwave") return flutterwaveProvider?.isActive; 
    if (name === "stripe") return stripeProvider?.isActive; 
    if (name === "paypal") return paypalProvider?.isActive; 
    if (name === "opay") return opayProvider?.isActive; 
    if (name === "palmpay") return palmpayProvider?.isActive; 
    if (name === "nowpayments") return nowpaymentsProvider?.isActive; 
    if (name === "monnify") return monnifyProvider?.isActive;
    if (name === "adyen") return adyenProvider?.isActive;
    if (name === "fast_checkout") return fastCheckoutProvider?.isActive; 
    if (name === "manual") return manualProvider?.isActive; 
    if (name === "pay_on_delivery") return payOnDeliveryProvider?.isActive; 
    return false; 
  }; 

  const paymentMethods = [ 
    { id: "paystack", name: "Paystack", icon: CreditCard, color: "text-blue-500" }, 
    { id: "flutterwave", name: "Flutterwave", icon: Globe, color: "text-orange-500" }, 
    { id: "stripe", name: "Stripe", icon: CreditCard, color: "text-indigo-600" }, 
    { id: "paypal", name: "PayPal", icon: Wallet, color: "text-blue-700" }, 
    { id: "opay", name: "OPay", icon: Smartphone, color: "text-green-600" }, 
    { id: "palmpay", name: "PalmPay", icon: Smartphone, color: "text-purple-600" }, 
    { id: "nowpayments", name: "NOWPayments", icon: Coins, color: "text-yellow-500" }, 
    { id: "monnify", name: "Monnify", icon: CreditCard, color: "text-blue-600" },
    { id: "adyen", name: "Adyen", icon: ShieldCheck, color: "text-green-600" },
    { id: "fast_checkout", name: "Fast Checkout", icon: Zap, color: "text-yellow-400" }, 
    { id: "manual", name: "Manual Transfer", icon: Landmark, color: "text-gray-600" }, 
    { id: "pay_on_delivery", name: "Pay on Delivery", icon: Truck, color: "text-red-500" }, 
  ];

  const paystackForm = useForm<PaystackFormValues>({
    resolver: zodResolver(paystackSchema),
    defaultValues: {
      testPublicKey: paystackProvider?.config?.testPublicKey || '',
      testSecretKey: paystackProvider?.config?.testSecretKey || '',
      livePublicKey: paystackProvider?.config?.livePublicKey || '',
      liveSecretKey: paystackProvider?.config?.liveSecretKey || '',
      isActive: paystackProvider?.isActive || false,
      allowedLocations: paystackProvider?.allowedLocations || [],
      mode: paystackProvider?.mode || 'test',
      logoUrl: paystackProvider?.config?.logoUrl || '',
    },
  });

  const flutterwaveForm = useForm<FlutterwaveFormValues>({
    resolver: zodResolver(flutterwaveSchema),
    defaultValues: {
      testPublicKey: flutterwaveProvider?.config?.testPublicKey || '',
      testSecretKey: flutterwaveProvider?.config?.testSecretKey || '',
      testEncryptionKey: flutterwaveProvider?.config?.testEncryptionKey || '',
      livePublicKey: flutterwaveProvider?.config?.livePublicKey || '',
      liveSecretKey: flutterwaveProvider?.config?.liveSecretKey || '',
      liveEncryptionKey: flutterwaveProvider?.config?.liveEncryptionKey || '',
      isActive: flutterwaveProvider?.isActive || false,
      allowedLocations: flutterwaveProvider?.allowedLocations || [],
      mode: flutterwaveProvider?.mode || 'test',
      logoUrl: flutterwaveProvider?.config?.logoUrl || '',
    },
  });

  const stripeForm = useForm<StripeFormValues>({
    resolver: zodResolver(stripeSchema),
    defaultValues: {
      testPublicKey: stripeProvider?.config?.testPublicKey || '',
      testSecretKey: stripeProvider?.config?.testSecretKey || '',
      livePublicKey: stripeProvider?.config?.livePublicKey || '',
      liveSecretKey: stripeProvider?.config?.liveSecretKey || '',
      isActive: stripeProvider?.isActive || false,
      allowedLocations: stripeProvider?.allowedLocations || [],
      mode: stripeProvider?.mode || 'test',
      logoUrl: stripeProvider?.config?.logoUrl || '',
    },
  });

  const opayForm = useForm<OpayFormValues>({
    resolver: zodResolver(opaySchema),
    defaultValues: {
      merchantId: opayProvider?.config?.merchantId || '',
      testPublicKey: opayProvider?.config?.testPublicKey || '',
      testSecretKey: opayProvider?.config?.testSecretKey || '',
      livePublicKey: opayProvider?.config?.livePublicKey || '',
      liveSecretKey: opayProvider?.config?.liveSecretKey || '',
      webhookSecret: opayProvider?.config?.webhookSecret || '',
      isActive: opayProvider?.isActive || false,
      allowedLocations: opayProvider?.allowedLocations || [],
      mode: opayProvider?.mode || 'test',
      logoUrl: opayProvider?.config?.logoUrl || '',
    },
  });

  const palmpayForm = useForm<PalmPayFormValues>({
    resolver: zodResolver(palmpaySchema),
    defaultValues: {
      merchantId: palmpayProvider?.config?.merchantId || '',
      testAppId: palmpayProvider?.config?.testAppId || '',
      testSecretKey: palmpayProvider?.config?.testSecretKey || '',
      liveAppId: palmpayProvider?.config?.liveAppId || '',
      liveSecretKey: palmpayProvider?.config?.liveSecretKey || '',
      webhookSecret: palmpayProvider?.config?.webhookSecret || '',
      isActive: palmpayProvider?.isActive || false,
      allowedLocations: palmpayProvider?.allowedLocations || [],
      mode: palmpayProvider?.mode || 'test',
      logoUrl: palmpayProvider?.config?.logoUrl || '',
    },
  });

  const paypalForm = useForm<PayPalFormValues>({
    resolver: zodResolver(paypalSchema),
    defaultValues: {
      clientId: paypalProvider?.config?.clientId || '',
      secretKey: paypalProvider?.config?.secretKey || '',
      liveClientId: paypalProvider?.config?.liveClientId || '',
      liveSecretKey: paypalProvider?.config?.liveSecretKey || '',
      isActive: paypalProvider?.isActive || false,
      allowedLocations: paypalProvider?.allowedLocations || [],
      mode: paypalProvider?.mode || 'test',
      logoUrl: paypalProvider?.config?.logoUrl || '',
    },
  });

  const payOnDeliveryForm = useForm<PayOnDeliveryFormValues>({
    resolver: zodResolver(payOnDeliverySchema),
    defaultValues: {
      instructions: payOnDeliveryProvider?.config?.instructions || 'Pay with cash or card upon delivery.',
      isActive: payOnDeliveryProvider?.isActive || false,
      allowedLocations: payOnDeliveryProvider?.allowedLocations || [],
      logoUrl: payOnDeliveryProvider?.config?.logoUrl || '',
    },
  });

  const fastCheckoutForm = useForm<FastCheckoutFormValues>({
    resolver: zodResolver(fastCheckoutSchema),
    defaultValues: {
      enableApplePay: fastCheckoutProvider?.config?.enableApplePay || false,
      enableGooglePay: fastCheckoutProvider?.config?.enableGooglePay || false,
      enableExpress: fastCheckoutProvider?.config?.enableExpress || false,
      enableQuickPayButtons: fastCheckoutProvider?.config?.enableQuickPayButtons || false,
      isActive: fastCheckoutProvider?.isActive || false,
      allowedLocations: fastCheckoutProvider?.allowedLocations || [],
      logoUrl: fastCheckoutProvider?.config?.logoUrl || '',
    },
  });

  const nowpaymentsForm = useForm<NowPaymentsFormValues>({
    resolver: zodResolver(nowpaymentsSchema),
    defaultValues: {
      apiKey: nowpaymentsProvider?.config?.apiKey || '',
      isActive: nowpaymentsProvider?.isActive || false,
      allowedLocations: nowpaymentsProvider?.allowedLocations || [],
      mode: nowpaymentsProvider?.mode || 'test',
      logoUrl: nowpaymentsProvider?.config?.logoUrl || '',
      acceptedCoins: nowpaymentsProvider?.config?.acceptedCoins || ['btc', 'usdt', 'eth'],
    },
  });

  const monnifyForm = useForm<MonnifyFormValues>({
    resolver: zodResolver(monnifySchema),
    defaultValues: {
      testApiKey: monnifyProvider?.config?.testApiKey || '',
      testSecretKey: monnifyProvider?.config?.testSecretKey || '',
      testContractCode: monnifyProvider?.config?.testContractCode || '',
      liveApiKey: monnifyProvider?.config?.liveApiKey || '',
      liveSecretKey: monnifyProvider?.config?.liveSecretKey || '',
      liveContractCode: monnifyProvider?.config?.liveContractCode || '',
      isActive: monnifyProvider?.isActive || false,
      allowedLocations: monnifyProvider?.allowedLocations || [],
      mode: monnifyProvider?.mode || 'test',
      logoUrl: monnifyProvider?.config?.logoUrl || '',
    },
  });
  const adyenForm = useForm<AdyenFormValues>({
    resolver: zodResolver(adyenSchema),
    defaultValues: {
      apiKey: adyenProvider?.config?.apiKey || "",
      merchantAccount: adyenProvider?.config?.merchantAccount || "",
      clientKey: adyenProvider?.config?.clientKey || "",
      isActive: adyenProvider?.isActive || false,
      allowedLocations: adyenProvider?.allowedLocations || [],
      mode: adyenProvider?.mode || "test",
    },
  });

  useEffect(() => {
    if (paystackProvider) {
      paystackForm.reset({
        testPublicKey: paystackProvider.config?.testPublicKey || '',
        testSecretKey: paystackProvider.config?.testSecretKey || '',
        livePublicKey: paystackProvider.config?.livePublicKey || '',
        liveSecretKey: paystackProvider.config?.liveSecretKey || '',
        isActive: paystackProvider.isActive || false,
        allowedLocations: paystackProvider.allowedLocations || [],
        mode: paystackProvider.mode || 'test',
        logoUrl: paystackProvider.config?.logoUrl || '',
      });
    }
    if (flutterwaveProvider) {
      flutterwaveForm.reset({
        testPublicKey: flutterwaveProvider.config?.testPublicKey || '',
        testSecretKey: flutterwaveProvider.config?.testSecretKey || '',
        testEncryptionKey: flutterwaveProvider.config?.testEncryptionKey || '',
        livePublicKey: flutterwaveProvider.config?.livePublicKey || '',
        liveSecretKey: flutterwaveProvider.config?.liveSecretKey || '',
        liveEncryptionKey: flutterwaveProvider.config?.liveEncryptionKey || '',
        isActive: flutterwaveProvider.isActive || false,
        allowedLocations: flutterwaveProvider.allowedLocations || [],
        mode: flutterwaveProvider.mode || 'test',
        logoUrl: flutterwaveProvider.config?.logoUrl || '',
      });
    }
    if (stripeProvider) {
      stripeForm.reset({
        testPublicKey: stripeProvider.config?.testPublicKey || '',
        testSecretKey: stripeProvider.config?.testSecretKey || '',
        livePublicKey: stripeProvider.config?.livePublicKey || '',
        liveSecretKey: stripeProvider.config?.liveSecretKey || '',
        isActive: stripeProvider.isActive || false,
        allowedLocations: stripeProvider.allowedLocations || [],
        mode: stripeProvider.mode || 'test',
        logoUrl: stripeProvider.config?.logoUrl || '',
      });
    }
    if (opayProvider) {
      opayForm.reset({
        merchantId: opayProvider.config?.merchantId || '',
        testPublicKey: opayProvider.config?.testPublicKey || '',
        testSecretKey: opayProvider.config?.testSecretKey || '',
        livePublicKey: opayProvider.config?.livePublicKey || '',
        liveSecretKey: opayProvider.config?.liveSecretKey || '',
        webhookSecret: opayProvider.config?.webhookSecret || '',
        isActive: opayProvider.isActive || false,
        allowedLocations: opayProvider.allowedLocations || [],
        mode: opayProvider.mode || 'test',
        logoUrl: opayProvider.config?.logoUrl || '',
      });
    }
    if (palmpayProvider) {
      palmpayForm.reset({
        merchantId: palmpayProvider.config?.merchantId || '',
        testAppId: palmpayProvider.config?.testAppId || '',
        testSecretKey: palmpayProvider.config?.testSecretKey || '',
        liveAppId: palmpayProvider.config?.liveAppId || '',
        liveSecretKey: palmpayProvider.config?.liveSecretKey || '',
        webhookSecret: palmpayProvider.config?.webhookSecret || '',
        isActive: palmpayProvider.isActive || false,
        allowedLocations: palmpayProvider.allowedLocations || [],
        mode: palmpayProvider.mode || 'test',
        logoUrl: palmpayProvider.config?.logoUrl || '',
      });
    }
    if (paypalProvider) {
      paypalForm.reset({
        clientId: paypalProvider.config?.clientId || '',
        secretKey: paypalProvider.config?.secretKey || '',
        liveClientId: paypalProvider.config?.liveClientId || '',
        liveSecretKey: paypalProvider.config?.liveSecretKey || '',
        isActive: paypalProvider.isActive || false,
        allowedLocations: paypalProvider.allowedLocations || [],
        mode: paypalProvider.mode || 'test',
        logoUrl: paypalProvider.config?.logoUrl || '',
      });
    }
    if (payOnDeliveryProvider) {
      payOnDeliveryForm.reset({
        instructions: payOnDeliveryProvider.config?.instructions || 'Pay with cash or card upon delivery.',
        isActive: payOnDeliveryProvider.isActive || false,
        allowedLocations: payOnDeliveryProvider.allowedLocations || [],
        logoUrl: payOnDeliveryProvider.config?.logoUrl || '',
      });
    }
    if (fastCheckoutProvider) {
      fastCheckoutForm.reset({
        enableApplePay: fastCheckoutProvider.config?.enableApplePay || false,
        enableGooglePay: fastCheckoutProvider.config?.enableGooglePay || false,
        enableExpress: fastCheckoutProvider.config?.enableExpress || false,
        enableQuickPayButtons: fastCheckoutProvider.config?.enableQuickPayButtons || false,
        isActive: fastCheckoutProvider.isActive || false,
        allowedLocations: fastCheckoutProvider.allowedLocations || [],
        logoUrl: fastCheckoutProvider.config?.logoUrl || '',
      });
    }
    if (nowpaymentsProvider) {
      nowpaymentsForm.reset({
        apiKey: nowpaymentsProvider.config?.apiKey || '',
        isActive: nowpaymentsProvider.isActive || false,
        allowedLocations: nowpaymentsProvider.allowedLocations || [],
        mode: nowpaymentsProvider.mode || 'test',
        logoUrl: nowpaymentsProvider.config?.logoUrl || '',
        acceptedCoins: nowpaymentsProvider.config?.acceptedCoins || ['btc', 'usdt', 'eth'],
      });

    if (monnifyProvider) {
      monnifyForm.reset({
        testApiKey: monnifyProvider.config?.testApiKey || '',
        testSecretKey: monnifyProvider.config?.testSecretKey || '',
        testContractCode: monnifyProvider.config?.testContractCode || '',
        liveApiKey: monnifyProvider.config?.liveApiKey || '',
        liveSecretKey: monnifyProvider.config?.liveSecretKey || '',
        liveContractCode: monnifyProvider.config?.liveContractCode || '',
        isActive: monnifyProvider.isActive || false,
        allowedLocations: monnifyProvider.allowedLocations || [],
        mode: monnifyProvider.mode || 'test',
        logoUrl: monnifyProvider.config?.logoUrl || '',
      });
    if (adyenProvider) {
      adyenForm.reset({
        apiKey: adyenProvider.config?.apiKey || "",
        merchantAccount: adyenProvider.config?.merchantAccount || "",
        clientKey: adyenProvider.config?.clientKey || "",
        isActive: adyenProvider.isActive || false,
        allowedLocations: adyenProvider.allowedLocations || [],
        mode: adyenProvider.mode || "test",
        logoUrl: adyenProvider.config?.logoUrl || '',
      });
    }
    }
    }
  }, [paystackProvider, flutterwaveProvider, stripeProvider, opayProvider, palmpayProvider, paypalProvider, payOnDeliveryProvider, fastCheckoutProvider, nowpaymentsProvider, monnifyProvider, paystackForm, flutterwaveForm, stripeForm, opayForm, palmpayForm, paypalForm, payOnDeliveryForm, fastCheckoutForm, nowpaymentsForm, monnifyForm, adyenProvider, adyenForm]);

  const saveProviderSettings = async (providerName: string, values: any) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { isActive, mode, allowedLocations, ...config } = values;
      
      // Filter out masked keys before saving if they haven't been changed
      Object.keys(config).forEach(key => {
        if (typeof config[key] === 'string' && config[key].startsWith('********')) {
          delete config[key];
        }
      });

      const token = await user.getIdToken();
      const res = await fetch('/api/payment/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          providerName,
          isActive,
          mode,
          allowedLocations,
          config,
          storeId: currentStoreId || 'global',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }
      
      toast({ title: 'Success', description: `${providerName} settings saved.` });
      fetchProviders();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (providerName: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/payment/test-connection?provider=${providerName}&storeId=${currentStoreId || 'global'}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: `${providerName} connection is valid.` });
      } else {
        throw new Error(data.error || 'Connection failed');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Invalid Connection', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const settingsRef = useMemo(
    () => {
        if (!firestore) return null;
        if (currentStoreId) {
            return doc(firestore, 'stores', currentStoreId, 'settings', 'config');
        }
        return doc(firestore, 'settings', 'global');
    },
    [firestore, currentStoreId]
  );

  // Fallback for old stores
  const oldSettingsRef = useMemo(
    () => (firestore && currentStoreId) ? doc(firestore, 'settings', currentStoreId) : null,
    [firestore, currentStoreId]
  );

  const { data: mainSettingsData, isLoading: isLoadingMainSettings } = useDoc<AppSettings>(settingsRef);
  const { data: oldSettingsData, isLoading: isLoadingOldSettings } = useDoc<AppSettings>(oldSettingsRef);

  const settingsData = mainSettingsData || oldSettingsData;
  const isLoadingSettings = isLoadingMainSettings && (currentStoreId ? isLoadingOldSettings : true);

  const bankAccounts = settingsData?.bankAccounts || [];
  const deliveryLocations = settingsData?.deliveryLocations || [];

  const instructionsForm = useForm<InstructionsFormValues>({
    resolver: zodResolver(instructionsSchema),
    defaultValues: {
      bankTransferInstructions: 'Please transfer the exact total amount to one of the bank accounts below. Use the generated Payment Reference Code as your transaction narration so we can match your payment quickly.',
    },
  });

  useEffect(() => {
    if (settingsData) {
      instructionsForm.reset({
        bankTransferInstructions: settingsData.bankTransferInstructions || 'Please transfer the exact total amount to one of the bank accounts below. Use the generated Payment Reference Code as your transaction narration so we can match your payment quickly.',
      });
    }
  }, [settingsData, instructionsForm]);

  const manualForm = useForm({
    defaultValues: {
      isActive: manualProvider?.isActive ?? true,
      allowedLocations: manualProvider?.allowedLocations || [],
      logoUrl: manualProvider?.config?.logoUrl || '',
    }
  });

  useEffect(() => {
    if (manualProvider) {
      manualForm.reset({
        isActive: manualProvider.isActive,
        allowedLocations: manualProvider.allowedLocations || [],
        logoUrl: manualProvider.config?.logoUrl || '',
      });
    }
  }, [manualProvider, manualForm]);

  const onSaveInstructions = async (data: InstructionsFormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (currentStoreId) {
          await saveStoreSettings(firestore, currentStoreId, data);
      } else {
          await saveGlobalSettings(firestore, data);
      }
      toast({ title: 'Success', description: 'Transfer instructions updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update instructions.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAccount = () => {
    setEditingAccount(null);
    setIsAccountModalOpen(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  const onAccountFormSubmit = async (values: AccountFormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      let updatedAccounts: BankAccount[];
      if (editingAccount) {
        updatedAccounts = bankAccounts.map((acc) =>
          acc.id === editingAccount.id ? { ...acc, ...values } : acc
        );
      } else {
        const newAccount: BankAccount = {
          ...values,
          id: Math.random().toString(36).substring(2, 9),
        };
        updatedAccounts = [...bankAccounts, newAccount];
      }

      if (currentStoreId) {
          await saveStoreSettings(firestore, currentStoreId, { bankAccounts: updatedAccounts });
      } else {
          await saveGlobalSettings(firestore, { bankAccounts: updatedAccounts });
      }
      toast({
        title: 'Success',
        description: `Bank account ${editingAccount ? 'updated' : 'added'} successfully.`,
      });
      setIsAccountModalOpen(false);
      setEditingAccount(null);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save bank account.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!firestore || !accountToDelete) return;
    setIsSaving(true);
    try {
      const updatedAccounts = bankAccounts.filter((acc) => acc.id !== accountToDelete.id);
      if (currentStoreId) {
          await saveStoreSettings(firestore, currentStoreId, { bankAccounts: updatedAccounts });
      } else {
          await saveGlobalSettings(firestore, { bankAccounts: updatedAccounts });
      }
      toast({
        title: 'Success',
        description: 'Bank account removed.',
      });
      setAccountToDelete(null);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete bank account.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoadingSettings || isLoadingProviders) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Landmark} title="Website Payment Method" description="Configure payment options for your public store." />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title="Website Payment Method"
        description="Configure how your customers pay for orders on your online store."
      />

      {authError && (
        <Alert variant="destructive" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Missing Server Credentials</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{authError}</p>
            <p className="text-xs">
                To fix this, you need to generate a Service Account Key in Firebase Console (Settings &gt; Service Accounts), 
                and add it to your environment variables as <strong>FIREBASE_SERVICE_ACCOUNT_KEY</strong>. 
                For Vercel, you can encode the JSON as Base64 to avoid formatting issues.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-none shadow-md bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Payment Region
          </CardTitle>
          <CardDescription>
            Select your primary country/region for payments. This helps customize the payment experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Select 
              value={settingsData?.paymentRegion || settingsData?.country || ""} 
              onValueChange={handleRegionChange}
              disabled={isSavingRegion}
            >
              <SelectTrigger className="w-full sm:w-[300px] h-11 bg-background">
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.code} value={region.name}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSavingRegion && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Saving region...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="paystack" className="space-y-6">
        <TabsList className="bg-muted/50 p-1.5 h-auto flex-wrap justify-start gap-1.5 shadow-sm border border-border/50"> 
          {paymentMethods.map((method) => { 
            const active = isProviderActive(method.id); 
            return ( 
              <TabsTrigger  
                key={method.id}  
                value={method.id}  
                className={cn( 
                  "flex items-center gap-2.5 px-4 py-2.5 transition-all duration-200", 
                  "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-primary/20", 
                  "hover:bg-background/60" 
                )} 
              > 
                <div className={cn( 
                  "p-1 rounded-md transition-colors", 
                  active ? "bg-primary/10" : "bg-muted" 
                )}> 
                  <method.icon className={cn("h-4 w-4", active ? method.color : "text-muted-foreground")} /> 
                </div> 
                <span className="font-medium text-xs md:text-sm">{method.name}</span> 
                {active && ( 
                  <div className="ml-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" /> 
                )} 
              </TabsTrigger> 
            ); 
          })} 
        </TabsList>

        <TabsContent value="paystack" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...paystackForm}>
                <form onSubmit={paystackForm.handleSubmit((values) => saveProviderSettings('paystack', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-blue-500" />Paystack Settings</CardTitle>
                        <CardDescription>Accept payments via cards, bank transfers, and USSD.</CardDescription>
                      </div>
                      <FormField
                        control={paystackForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={paystackForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Transaction Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="test" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Test Mode</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="live" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Live Mode</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={paystackForm.control}
                          name="testPublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Public Key</FormLabel>
                              <FormControl><Input placeholder="pk_test_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={paystackForm.control}
                          name="testSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="sk_test_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={paystackForm.control}
                          name="livePublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Public Key</FormLabel>
                              <FormControl><Input placeholder="pk_live_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={paystackForm.control}
                          name="liveSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="sk_live_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-2 pt-4">
                        <Label className="text-sm font-medium">Webhook URL</Label>
                        <div className="flex items-center gap-2">
                          <Input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payment/webhook?provider=paystack&storeId=${currentStoreId || 'global'}`} className="bg-muted" />
                          <Button variant="outline" size="sm" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/payment/webhook?provider=paystack&storeId=${currentStoreId || 'global'}`);
                            toast({ title: 'Copied', description: 'Webhook URL copied to clipboard.' });
                          }}>Copy</Button>
                        </div>
                        <p className="text-[0.8rem] text-muted-foreground">
                          Set this in your Paystack dashboard to receive payment notifications.
                        </p>
                      </div>
                      <PaymentMethodLogoUpload form={paystackForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={paystackForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Paystack Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('paystack')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> About Paystack
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>Paystack allows you to accept payments from customers using various methods.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Supports Card, Bank, Transfer, USSD, and Mobile Money.</li>
                    <li>Highly secure and widely used in Africa.</li>
                    <li>Real-time transaction monitoring.</li>
                  </ul>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Ensure you use the correct keys for Test and Live modes.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="flutterwave" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...flutterwaveForm}>
                <form onSubmit={flutterwaveForm.handleSubmit((values) => saveProviderSettings('flutterwave', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-orange-500" />Flutterwave Settings</CardTitle>
                        <CardDescription>Global payment gateway for businesses.</CardDescription>
                      </div>
                      <FormField
                        control={flutterwaveForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={flutterwaveForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Transaction Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="test" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Test Mode</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="live" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Live Mode</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={flutterwaveForm.control}
                          name="testPublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Public Key</FormLabel>
                              <FormControl><Input placeholder="FLWPUBK_TEST-..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flutterwaveForm.control}
                          name="testSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="FLWSECK_TEST-..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={flutterwaveForm.control}
                        name="testEncryptionKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Test Encryption Key</FormLabel>
                            <FormControl><Input type="password" placeholder="FLWSECK_TEST_ENCRY..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={flutterwaveForm.control}
                          name="livePublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Public Key</FormLabel>
                              <FormControl><Input placeholder="FLWPUBK-..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flutterwaveForm.control}
                          name="liveSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="FLWSECK-..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={flutterwaveForm.control}
                        name="liveEncryptionKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Live Encryption Key</FormLabel>
                            <FormControl><Input type="password" placeholder="FLWSECK_ENCRY..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <PaymentMethodLogoUpload form={flutterwaveForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={flutterwaveForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Flutterwave Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('flutterwave')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> About Flutterwave
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>Flutterwave provides a seamless way to accept payments globally.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Accept payments in multiple currencies.</li>
                    <li>Supports cards, mobile money, and bank transfers.</li>
                    <li>Advanced fraud protection.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stripe" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...stripeForm}>
                <form onSubmit={stripeForm.handleSubmit((values) => saveProviderSettings('stripe', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-indigo-600" />Stripe Settings</CardTitle>
                        <CardDescription>Accept global payments via cards and digital wallets.</CardDescription>
                      </div>
                      <FormField
                        control={stripeForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={stripeForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Transaction Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="test" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Test Mode</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="live" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Live Mode</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={stripeForm.control}
                          name="testPublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Publishable Key</FormLabel>
                              <FormControl><Input placeholder="pk_test_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={stripeForm.control}
                          name="testSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="sk_test_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={stripeForm.control}
                          name="livePublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Publishable Key</FormLabel>
                              <FormControl><Input placeholder="pk_live_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={stripeForm.control}
                          name="liveSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="sk_live_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <PaymentMethodLogoUpload form={stripeForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={stripeForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Stripe Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('stripe')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> About Stripe
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>Stripe is a global leader in payment processing.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Accepts Apple Pay, Google Pay, and cards.</li>
                    <li>Supports over 135 currencies.</li>
                    <li>Best-in-class checkout experience.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="paypal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...paypalForm}>
                <form onSubmit={paypalForm.handleSubmit((values) => saveProviderSettings('paypal', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-blue-700" />PayPal Settings</CardTitle>
                        <CardDescription>Accept global payments via PayPal.</CardDescription>
                      </div>
                      <FormField
                        control={paypalForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={paypalForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Transaction Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="test" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Sandbox Mode</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="live" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Live Mode</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={paypalForm.control}
                          name="clientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sandbox Client ID</FormLabel>
                              <FormControl><Input placeholder="Client ID" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={paypalForm.control}
                          name="secretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sandbox Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="Secret Key" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={paypalForm.control}
                          name="liveClientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Client ID</FormLabel>
                              <FormControl><Input placeholder="Client ID" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={paypalForm.control}
                          name="liveSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="Secret Key" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <PaymentMethodLogoUpload form={paypalForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={paypalForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save PayPal Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('paypal')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> About PayPal
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>PayPal is a globally recognized payment platform.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Accept payments from over 200 countries.</li>
                    <li>Supports multiple currencies.</li>
                    <li>Trusted by millions of customers worldwide.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="opay" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...opayForm}>
                <form onSubmit={opayForm.handleSubmit((values) => saveProviderSettings('opay', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-green-600" />OPay Settings</CardTitle>
                        <CardDescription>Accept payments via OPay Checkout.</CardDescription>
                      </div>
                      <FormField
                        control={opayForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={opayForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Transaction Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="test" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Test Mode</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="live" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Live Mode</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={opayForm.control}
                        name="merchantId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Merchant ID</FormLabel>
                            <FormControl><Input placeholder="256..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={opayForm.control}
                          name="testPublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Public Key</FormLabel>
                              <FormControl><Input placeholder="OPAYPUB..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={opayForm.control}
                          name="testSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="OPAYSEC..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={opayForm.control}
                          name="livePublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Public Key</FormLabel>
                              <FormControl><Input placeholder="OPAYPUB..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={opayForm.control}
                          name="liveSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="OPAYSEC..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={opayForm.control}
                        name="webhookSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Webhook Secret</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <PaymentMethodLogoUpload form={opayForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={opayForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save OPay Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('opay')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> About OPay
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>OPay Checkout provides a fast and secure way for customers in Nigeria to pay.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Supports OPay Wallet, Cards, and Bank Transfers.</li>
                    <li>Optimized for mobile payments.</li>
                    <li>Highly reliable for local transactions.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="palmpay" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...palmpayForm}>
                <form onSubmit={palmpayForm.handleSubmit((values) => saveProviderSettings('palmpay', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-purple-600" />PalmPay Settings</CardTitle>
                        <CardDescription>Accept payments via PalmPay.</CardDescription>
                      </div>
                      <FormField
                        control={palmpayForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={palmpayForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Transaction Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="test" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Test Mode</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="live" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Live Mode</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={palmpayForm.control}
                        name="merchantId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Merchant ID</FormLabel>
                            <FormControl><Input placeholder="Merchant ID" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={palmpayForm.control}
                          name="testAppId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test App ID / Public Key</FormLabel>
                              <FormControl><Input placeholder="App ID" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={palmpayForm.control}
                          name="testSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="Secret Key" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={palmpayForm.control}
                          name="liveAppId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live App ID / Public Key</FormLabel>
                              <FormControl><Input placeholder="App ID" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={palmpayForm.control}
                          name="liveSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="Secret Key" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={palmpayForm.control}
                        name="webhookSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Webhook Secret</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <PaymentMethodLogoUpload form={palmpayForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={palmpayForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save PalmPay Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('palmpay')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> About PalmPay
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>PalmPay is a leading digital payment service provider in Africa.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Secure and rapid transaction processing.</li>
                    <li>Popular among mobile users.</li>
                    <li>Competitive transaction rates.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pay_on_delivery" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...payOnDeliveryForm}>
                <form onSubmit={payOnDeliveryForm.handleSubmit((values) => saveProviderSettings('pay_on_delivery', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-red-500" />Pay on Delivery</CardTitle>
                        <CardDescription>Allow customers to pay when they receive their order.</CardDescription>
                      </div>
                      <FormField
                        control={payOnDeliveryForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={payOnDeliveryForm.control}
                        name="instructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instructions for Customer</FormLabel>
                            <FormControl><Textarea rows={4} placeholder="e.g., Please have the exact amount ready..." {...field} /></FormControl>
                            <FormDescription>Shown at checkout when this method is selected.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <PaymentMethodLogoUpload form={payOnDeliveryForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={payOnDeliveryForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Settings
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> Cash on Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>Pay on Delivery (POD) is popular for building customer trust.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Recommended for local deliveries.</li>
                    <li>Ensures customers are happy before they pay.</li>
                    <li>No online transaction fees.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="nowpayments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...nowpaymentsForm}>
                <form onSubmit={nowpaymentsForm.handleSubmit((values) => saveProviderSettings('nowpayments', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-yellow-500" />NOWPayments Settings</CardTitle>
                        <CardDescription>Accept cryptocurrency payments globally.</CardDescription>
                      </div>
                      <FormField
                        control={nowpaymentsForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={nowpaymentsForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Transaction Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="test" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Sandbox Mode</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="live" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Live Mode</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={nowpaymentsForm.control}
                        name="apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl><Input type="password" placeholder="NOWPayments API Key" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={nowpaymentsForm.control}
                        name="acceptedCoins"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accepted Coins</FormLabel>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {['btc', 'eth', 'usdttrc20', 'usdterc20', 'ltc', 'doge'].map((coin) => (
                                <div key={coin} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`coin-${coin}`} 
                                    checked={field.value?.includes(coin)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, coin]);
                                      } else {
                                        field.onChange(current.filter((c: string) => c !== coin));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`coin-${coin}`} className="text-sm uppercase">{coin}</Label>
                                </div>
                              ))}
                            </div>
                            <FormDescription>Select the coins you want to accept during checkout.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2 pt-4">
                        <Label className="text-sm font-medium">IPN Callback URL</Label>
                        <div className="flex items-center gap-2">
                          <Input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payment/webhook?provider=nowpayments&storeId=${currentStoreId || 'global'}`} className="bg-muted" />
                          <Button variant="outline" size="sm" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/payment/webhook?provider=nowpayments&storeId=${currentStoreId || 'global'}`);
                            toast({ title: 'Copied', description: 'Webhook URL copied to clipboard.' });
                          }}>Copy</Button>
                        </div>
                        <p className="text-[0.8rem] text-muted-foreground">
                          Set this in your NOWPayments dashboard to receive payment notifications.
                        </p>
                      </div>
                      <PaymentMethodLogoUpload form={nowpaymentsForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={nowpaymentsForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save NOWPayments Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('nowpayments')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Coins className="h-4 w-4" /> About NOWPayments
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>NOWPayments is a non-custodial crypto payment gateway.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Accept 50+ cryptocurrencies.</li>
                    <li>Non-custodial: funds go directly to your wallet.</li>
                    <li>Low transaction fees.</li>
                    <li>Non-reversible transactions.</li>
                  </ul>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Wallet Required</AlertTitle>
                    <AlertDescription>
                      Make sure you have added your outcome wallets in the NOWPayments dashboard.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="monnify" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...monnifyForm}>
                <form onSubmit={monnifyForm.handleSubmit((values) => saveProviderSettings('monnify', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-blue-600" />Monnify Settings</CardTitle>
                        <CardDescription>Accept payments via cards and bank transfers using Monnify.</CardDescription>
                      </div>
                      <FormField
                        control={monnifyForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={monnifyForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Transaction Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="test" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Test Mode</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="live" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Live Mode</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={monnifyForm.control}
                          name="testApiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test API Key</FormLabel>
                              <FormControl><Input placeholder="MK_TEST_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={monnifyForm.control}
                          name="testSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="Test Secret Key" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={monnifyForm.control}
                        name="testContractCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Test Contract Code</FormLabel>
                            <FormControl><Input placeholder="Test Contract Code" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                        <FormField
                          control={monnifyForm.control}
                          name="liveApiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live API Key</FormLabel>
                              <FormControl><Input placeholder="MK_PROD_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={monnifyForm.control}
                          name="liveSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="Live Secret Key" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={monnifyForm.control}
                        name="liveContractCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Live Contract Code</FormLabel>
                            <FormControl><Input placeholder="Live Contract Code" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2 pt-4">
                        <Label className="text-sm font-medium">Webhook URL</Label>
                        <div className="flex items-center gap-2">
                          <Input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payment/webhook?provider=monnify&storeId=${currentStoreId || 'global'}`} className="bg-muted" />
                          <Button variant="outline" size="sm" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/payment/webhook?provider=monnify&storeId=${currentStoreId || 'global'}`);
                            toast({ title: 'Copied', description: 'Webhook URL copied to clipboard.' });
                          }}>Copy</Button>
                        </div>
                        <p className="text-[0.8rem] text-muted-foreground">
                          Set this in your Monnify dashboard to receive payment notifications.
                        </p>
                      </div>
                      <PaymentMethodLogoUpload form={monnifyForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={monnifyForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Monnify Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('monnify')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> About Monnify
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>Monnify is a payment gateway that allows businesses to accept payments from customers via several payment channels.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Accept payments via Bank Transfer, Card, and USSD.</li>
                    <li>Low transaction fees.</li>
                    <li>Trusted by thousands of businesses in Nigeria.</li>
                  </ul>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Note</AlertTitle>
                    <AlertDescription>
                      You can find your API Key, Secret Key and Contract Code on your Monnify dashboard under Settings.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="adyen" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...adyenForm}>
                <form onSubmit={adyenForm.handleSubmit((values) => saveProviderSettings('adyen', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-600" />Adyen Settings</CardTitle>
                        <CardDescription>Accept global payments securely using Adyen.</CardDescription>
                      </div>
                      <FormField
                        control={adyenForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Active</FormLabel>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={adyenForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Gateway Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="test" />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    Test
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="live" />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    Live
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={adyenForm.control}
                          name="merchantAccount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Merchant Account</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Your Adyen Merchant Account" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={adyenForm.control}
                          name="clientKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client Key</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="test_..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={adyenForm.control}
                        name="apiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="AQEy..." />
                            </FormControl>
                            <FormDescription>
                              Your Adyen API Key for checkout service.
                      <PaymentMethodLogoUpload form={adyenForm} isSaving={isSaving} />
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={adyenForm.control}
                        name="allowedLocations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allowed Delivery Locations</FormLabel>
                            <FormDescription>
                              If selected, this method will only be available for these locations. Leave empty for all locations.
                            </FormDescription>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              {deliveryLocations.map((loc) => (
                                <div key={loc.id} className="flex items-center space-x-2 p-2 rounded border">
                                  <Checkbox
                                    id={`adyen-loc-${loc.id}`}
                                    checked={field.value?.includes(loc.id)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      const next = checked
                                        ? [...current, loc.id]
                                        : current.filter((id) => id !== loc.id);
                                      field.onChange(next);
                                    }}
                                  />
                                  <label htmlFor={`adyen-loc-${loc.id}`} className="text-sm cursor-pointer truncate">
                                    {loc.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="flex gap-2 border-t pt-6">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Adyen Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('adyen')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-4 w-4" /> About Adyen
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>Adyen is a leading global payment platform providing end-to-end infrastructure.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Accept payments globally with all major methods.</li>
                    <li>Unified commerce across all channels.</li>
                    <li>Advanced fraud protection.</li>
                    <li>Direct access to card networks.</li>
                  </ul>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Adyen Portal</AlertTitle>
                    <AlertDescription>
                      Find your credentials in the Adyen Customer Area under Developers &gt; API credentials.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
 
        <TabsContent value="fast_checkout" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...fastCheckoutForm}>
                <form onSubmit={fastCheckoutForm.handleSubmit((values) => saveProviderSettings('fast_checkout', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-400" />Fast Checkout Settings</CardTitle>
                        <CardDescription>Enable Apple Pay, Google Pay and other express options.</CardDescription>
                      </div>
                      <FormField
                        control={fastCheckoutForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={fastCheckoutForm.control}
                          name="enableApplePay"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Apple Pay</FormLabel>
                                <FormDescription>Allow customers to pay with Apple Pay.</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={fastCheckoutForm.control}
                          name="enableGooglePay"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Google Pay</FormLabel>
                                <FormDescription>Allow customers to pay with Google Pay.</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={fastCheckoutForm.control}
                          name="enableExpress"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Express Checkout</FormLabel>
                                <FormDescription>Enable PayPal Express or similar one-tap flows.</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={fastCheckoutForm.control}
                          name="enableQuickPayButtons"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Quick Pay Buttons</FormLabel>
                                <FormDescription>Show payment buttons directly on product/cart pages.</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <PaymentMethodLogoUpload form={fastCheckoutForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={fastCheckoutForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Fast Checkout Settings
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> About Fast Checkout
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>Fast checkout options improve conversion rates by reducing the number of steps to complete a purchase.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Apple/Google Pay:</strong> Seamless one-tap mobile payments.</li>
                    <li><strong>Express Checkout:</strong> Skip traditional forms using saved gateway data.</li>
                    <li><strong>Quick Pay:</strong> Immediate purchase from product cards.</li>
                  </ul>
                  <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Requirement</AlertTitle>
                    <AlertDescription className="text-xs">
                      Stripe or PayPal must be active and configured for these options to appear during checkout.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Form {...manualForm}>
                <form onSubmit={manualForm.handleSubmit((values) => saveProviderSettings('manual', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-gray-600" />Manual Payment</CardTitle>
                        <CardDescription>Enable or disable manual bank transfers.</CardDescription>
                      </div>
                      <FormField
                        control={manualForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent>
                      <PaymentMethodLogoUpload form={manualForm} isSaving={isSaving} />
                      <LocationVisibilitySelector deliveryLocations={deliveryLocations} control={manualForm.control} name="allowedLocations" />
                    </CardContent>
                    <CardFooter className="border-t pt-6">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Manual Payment Settings
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" />Bank Accounts</CardTitle>
                    <CardDescription>Add the accounts where customers should send payments.</CardDescription>
                  </div>
                  <Button onClick={handleAddAccount} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Account
                  </Button>
                </CardHeader>
                <CardContent>
                  {bankAccounts.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                      <Landmark className="mx-auto h-12 w-12 mb-4 opacity-20" />
                      <p>No bank accounts added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bankAccounts.map((acc) => (
                        <div key={acc.id} className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
                          <div className="flex items-center gap-4">
                            {acc.logoUrl ? (
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden border bg-white">
                                <Image src={acc.logoUrl} alt={acc.bankName} fill className="object-contain p-1" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground">
                                <Landmark className="h-6 w-6" />
                              </div>
                            )}
                            <div className="space-y-1">
                              <p className="font-bold text-lg leading-tight">{acc.bankName}</p>
                              <p className="text-sm font-medium">{acc.accountName}</p>
                              <p className="text-sm font-mono tracking-wider">{acc.accountNumber}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditAccount(acc)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setAccountToDelete(acc)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Form {...instructionsForm}>
                <form onSubmit={instructionsForm.handleSubmit(onSaveInstructions)}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" />Customer Instructions</CardTitle>
                      <CardDescription>Tell customers what to do after choosing bank transfer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={instructionsForm.control}
                        name="bankTransferInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl><Textarea rows={4} placeholder="e.g., Please transfer the exact amount..." {...field} /></FormControl>
                            <FormDescription>These instructions are shown during checkout.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="border-t pt-6">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Instructions
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>

            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> Professional Transfers
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>When a customer chooses <strong>Bank Transfer</strong>:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>They see your list of accounts and pick one.</li>
                    <li>The system generates a unique <strong>5-digit tracking code</strong>.</li>
                    <li>Customers are told to use this code as their reference.</li>
                    <li>This allows you to match payments to orders instantly.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Account Dialog */}
      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            <DialogDescription>
              {editingAccount ? 'Update your bank account details.' : 'Provide details for a new bank account to accept manual transfers.'}
            </DialogDescription>
          </DialogHeader>
          <AccountForm onSubmit={onAccountFormSubmit} isSaving={isSaving} defaultValues={editingAccount || undefined} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog 
        isOpen={!!accountToDelete} 
        onOpenChange={() => setAccountToDelete(null)} 
        onConfirm={confirmDeleteAccount} 
        isDeleting={isSaving} 
        itemName={accountToDelete?.bankName || ''} 
        itemType="bank account" 
      />
    </div>
  );
}

function AccountForm({ onSubmit, isSaving, defaultValues }: { onSubmit: (values: AccountFormValues) => Promise<void>, isSaving: boolean, defaultValues?: AccountFormValues }) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: defaultValues || { bankName: '', accountNumber: '', accountName: '', logoUrl: '' }
  });

  const logoUrl = form.watch('logoUrl');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Logo image should be smaller than 1MB." });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('logoUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Logo Uploaded", description: "Bank logo has been updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload logo." });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Error", description: "Could not read the selected file."});
        setIsUploading(false);
    };
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField control={form.control} name="logoUrl" render={({ field }) => (
          <FormItem>
            <FormLabel>Bank Logo (Optional)</FormLabel>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" /> : <Landmark className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="flex-grow space-y-2">
                <div className="flex items-center gap-2">
                  <FormControl><Input placeholder="https://example.com/logo.png" {...field} value={field.value || ''} disabled={isSaving || isUploading} /></FormControl>
                  <Button asChild variant="outline" size="icon" disabled={isSaving || isUploading}>
                    <label htmlFor="bank-logo-upload" className="cursor-pointer">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                    </label>
                  </Button>
                  <Input id="bank-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving || isUploading} />
                </div>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="bankName" render={({ field }) => (
          <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g., First National Bank" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="accountName" render={({ field }) => (
          <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="e.g., StoreLink Pro Ltd" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="accountNumber" render={({ field }) => (
          <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="e.g., 1234567890" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <DialogFooter className="pt-4">
          <DialogClose asChild><Button variant="outline" disabled={isSaving || isUploading}>Cancel</Button></DialogClose>
          <Button type="submit" disabled={isSaving || isUploading}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Account</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function LocationVisibilitySelector({ 
  deliveryLocations, 
  control, 
  name 
}: { 
  deliveryLocations: any[], 
  control: any, 
  name: string 
}) {
  return (
    <div className="space-y-3 pt-6 border-t mt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <FormLabel className="text-base font-semibold">Location Visibility</FormLabel>
          <FormDescription className="text-xs">Select specific delivery locations where this payment method will be active. If none are selected, it will be visible for all locations.</FormDescription>
        </div>
      </div>
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {deliveryLocations.map((loc) => (
              <div key={loc.id} className="flex items-center space-x-2 p-3 rounded-xl border bg-background/50 transition-colors hover:bg-muted/50">
                <Checkbox
                  id={`${name}-${loc.id}`}
                  checked={field.value?.includes(loc.id)}
                  onCheckedChange={(checked) => {
                    const current = field.value || [];
                    if (checked) {
                      field.onChange([...current, loc.id]);
                    } else {
                      field.onChange(current.filter((id: string) => id !== loc.id));
                    }
                  }}
                />
                <label
                  htmlFor={`${name}-${loc.id}`}
                  className="text-sm font-medium leading-none cursor-pointer flex-grow"
                >
                  {loc.name}
                </label>
              </div>
            ))}
            {deliveryLocations.length === 0 && (
              <div className="col-span-full p-4 border border-dashed rounded-xl bg-muted/20 text-center">
                 <p className="text-xs text-muted-foreground">No delivery locations configured. Go to <strong>Delivery Settings</strong> to add locations.</p>
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}

function PaymentMethodLogoUpload({ form, isSaving, label = "Payment Method Logo" }: { form: any, isSaving: boolean, label?: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const logoUrl = form.watch('logoUrl');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Logo image should be smaller than 1MB." });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('logoUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Logo Uploaded", description: "Logo has been updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload logo." });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Error", description: "Could not read the selected file."});
        setIsUploading(false);
    };
  };

  return (
    <FormField control={form.control} name="logoUrl" render={({ field }) => (
      <FormItem className="pt-4 border-t mt-4">
        <FormLabel>{label} (Optional)</FormLabel>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
            {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
          </div>
          <div className="flex-grow space-y-2">
            <div className="flex items-center gap-2">
              <FormControl><Input placeholder="https://example.com/logo.png" {...field} value={field.value || ''} disabled={isSaving || isUploading} /></FormControl>
              <Button asChild variant="outline" size="icon" disabled={isSaving || isUploading}>
                <label className="cursor-pointer">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving || isUploading} />
                </label>
              </Button>
            </div>
            <FormDescription>Shown at checkout instead of the default icon.</FormDescription>
          </div>
        </div>
        <FormMessage />
      </FormItem>
    )} />
  );
}
