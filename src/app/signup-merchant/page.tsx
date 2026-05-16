'use client';

import Image from "next/image"
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StoreLinkLogo } from "@/components/icons";
import { useState, useEffect, useMemo } from "react";
import { 
    Mail, 
    Lock, 
    Unlock,
    Eye, 
    EyeOff, 
    User as UserIcon, 
    Phone, 
    Home,
    Store as StoreIcon,
    ArrowRight,
    Check,
    ChevronRight
} from "lucide-react";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import placeholderImages from '@/lib/placeholder-images.json';
import { useAuth as useFirebaseAuthInstance, useUser, useFirestore, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc, writeBatch, serverTimestamp, getDoc } from "firebase/firestore";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const reservedSlugs = [
  'dashboard', 'login', 'signup', 'signup-merchant', 'pos', 'api', 'actions', 
  'admin', 'store', 'store-app', 'public', 'static', 'favicon.ico', 's-logo.png', 
  'icon.svg', 'globals.css', 'favicon.png', 's-logo.svg', 'providers.tsx', 'layout.tsx', 'page.tsx'
];

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().trim().email('Invalid email address.'),
  storeName: z.string().min(2, 'Store name must be at least 2 characters.'),
  storeSlug: z.string()
    .min(2, 'Store slug must be at least 2 characters.')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed.')
    .refine(slug => !reservedSlugs.includes(slug), {
      message: 'This slug is reserved for system use.',
    }),
  storeAddress: z.string().min(5, 'Store address must be at least 5 characters.'),
  storePhone: z.string().min(5, 'Store phone number is required.'),
  databaseId: z.string().regex(/^(\(default\)|[a-z0-9-]+)$/, 'Only lowercase letters, numbers, and hyphens allowed.').optional().default('(default)'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ['confirmPassword'],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function MerchantSignupPage() {
    const { toast } = useToast();
    const [showPassword, setShowPassword] = useState(false);

    const auth = useFirebaseAuthInstance();
    const firestore = useFirestore();
    const { getFirestoreInstance } = useFirebase();
    const router = useRouter();
    const { user, isLoading: isUserLoading } = useUser();
    const { store, staffMember, isLoading: isAuthContextLoading } = useAuth();
    const [isSuccessfullySubmitted, setIsSuccessfullySubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDbIdUnlocked, setIsDbIdUnlocked] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [suggestedSlugs, setSuggestedSlugs] = useState<string[]>([]);

    const nextStep = async () => {
        let fieldsToValidate: (keyof SignupFormValues)[] = [];
        if (currentStep === 1) {
            fieldsToValidate = ['name', 'email', 'password', 'confirmPassword'];
        } else if (currentStep === 2) {
            fieldsToValidate = ['storeName', 'storeSlug', 'storePhone', 'storeAddress'];
            if (slugStatus === 'taken') {
                toast({
                    variant: "destructive",
                    title: "URL Taken",
                    description: "Please choose a different store URL slug."
                });
                return;
            }
        }
        
        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };
    
    const form = useForm<SignupFormValues>({
      resolver: zodResolver(signupSchema),
      defaultValues: {
        name: '', email: '', storeName: '', storeSlug: '', storeAddress: '', storePhone: '', databaseId: '(default)', password: '', confirmPassword: '',
      },
    });

    const storeSlug = useWatch({
        control: form.control,
        name: 'storeSlug',
    });

    useEffect(() => {
        const checkSlug = async () => {
            if (!storeSlug || storeSlug.length < 2) {
                setSlugStatus('idle');
                return;
            }
            if (reservedSlugs.includes(storeSlug)) {
                setSlugStatus('taken');
                setSuggestedSlugs([`${storeSlug}-shop`, `${storeSlug}-store`]);
                return;
            }

            setSlugStatus('checking');
            try {
                const docRef = doc(firestore!, 'stores', storeSlug);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSlugStatus('taken');
                    setSuggestedSlugs([`${storeSlug}-shop`, `${storeSlug}-${Math.floor(100 + Math.random() * 899)}`]);
                } else {
                    setSlugStatus('available');
                    setSuggestedSlugs([]);
                }
            } catch (error) {
                setSlugStatus('idle');
            }
        };

        const timer = setTimeout(() => {
            if (firestore) checkSlug();
        }, 500);

        return () => clearTimeout(timer);
    }, [storeSlug, firestore]);

    const onSubmit = async (values: SignupFormValues) => {
        if (!firestore) return;

        setIsLoading(true);
        try {
            let targetUser = auth.currentUser || user;

            if (targetUser && targetUser.email?.toLowerCase() !== values.email.toLowerCase()) {
                await signOut(auth);
                targetUser = null;
            }

            if (!targetUser) {
                const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
                targetUser = userCredential.user;
                await updateProfile(targetUser, { displayName: values.name });
            }

            const batch = writeBatch(firestore);
            const storeId = values.storeSlug;

            batch.set(doc(firestore, 'users', targetUser.uid), {
                uid: targetUser.uid,
                email: values.email, 
                displayName: values.name,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            batch.set(doc(firestore, 'stores', storeId), {
                id: storeId,
                slug: values.storeSlug,
                owner_id: targetUser.uid,
                name: values.storeName,
                address: values.storeAddress,
                phone: values.storePhone,
                databaseId: values.databaseId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const staffId = `${targetUser.uid}_${storeId}`;
            batch.set(doc(firestore, 'staff', staffId), {
                id: staffId,
                uid: targetUser.uid,
                store_id: storeId,
                name: values.name,
                email: values.email, 
                role: 'admin',
                status: 'Active',
                permissions: {
                    pages: ['view_dashboard', 'view_inventory', 'add_products', 'edit_products', 'delete_products', 'view_categories', 'add_categories', 'edit_categories', 'delete_categories', 'view_staff', 'manage_staff', 'view_permissions', 'view_settings', 'manage_settings', 'manage_coupons', 'manage_website_content', 'canViewCustomers', 'canAddCustomers', 'canEditCustomers', 'canDeleteCustomers', 'canPrintBarcodes', 'view_stock_alerts', 'transfer_stock', 'canBulkRestock', 'canAccessPOS', 'view_my_sales', 'view_sales_history', 'canViewProductSales', 'canManageExpenses', 'canBulkAddProducts', 'canProcessReturns', 'canSendMarketingWhatsapp', 'manage_orders', 'view_online_customers', 'manage_flexible_payments', 'view_stock_audit', 'manage_ads']
                },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const settingsData = {
                store_id: storeId,
                storeName: values.storeName,
                storeAddress: values.storeAddress,
                storePhone: values.storePhone,
                storeEmail: values.email,
                currency: '₦',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            batch.set(doc(firestore, 'settings', storeId), settingsData);
            batch.set(doc(firestore, 'stores', storeId, 'settings', 'config'), settingsData);

            await batch.commit();

            if (values.databaseId && values.databaseId !== '(default)') {
                try {
                    const targetFirestore = getFirestoreInstance(values.databaseId);
                    await setDoc(doc(targetFirestore, 'settings', storeId), settingsData);
                } catch (e) {
                    await setDoc(doc(firestore, 'stores', storeId), { databaseId: '(default)' }, { merge: true });
                }
            }
            
            toast({ title: "Welcome to StoreLink Pro", description: "Your account is ready." });
            await signOut(auth);
            setIsSuccessfullySubmitted(true);
            router.push('/login');

        } catch (error: any) {
            toast({ variant: "destructive", title: "Signup Failed", description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

    if (isUserLoading || (user && isAuthContextLoading) || isSuccessfullySubmitted) {
        return <PageSpinner label="StoreLink Pro" subLabel="Setting up your store…" />;
    }

  return (
    <div className="w-full min-h-screen bg-[#fbfbfd] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white dark:bg-[#1d1d1f] rounded-[2.5rem] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.1)] border border-[#d2d2d7]/30">
          <div className="text-center mb-10">
             <div className="flex justify-center mb-6">
                <StoreLinkLogo className="h-12 w-12 text-[#0071e3]" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white mb-2">Create a Store</h1>
            <p className="text-[#86868b] text-sm">
              {currentStep === 1 ? 'Start with your admin account.' : 
               currentStep === 2 ? 'Tell us about your business.' : 
               'Finalize your setup.'}
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-10">
            {[1, 2, 3].map((step) => (
              <div 
                key={step} 
                className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    currentStep === step ? "w-8 bg-[#0071e3]" : "w-1.5 bg-[#d2d2d7]"
                )}
              />
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-semibold text-[#86868b] uppercase tracking-wider ml-1">Full Name</FormLabel><FormControl><Input placeholder="John Doe" className="h-12 rounded-xl bg-[#f5f5f7] border-none focus-visible:ring-2 focus-visible:ring-[#0071e3]" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-semibold text-[#86868b] uppercase tracking-wider ml-1">Email Address</FormLabel><FormControl><Input type="email" placeholder="m@example.com" className="h-12 rounded-xl bg-[#f5f5f7] border-none focus-visible:ring-2 focus-visible:ring-[#0071e3]" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-semibold text-[#86868b] uppercase tracking-wider ml-1">Password</FormLabel>
                              <div className="relative">
                                <FormControl><Input type={showPassword ? 'text' : 'password'} className="h-12 rounded-xl bg-[#f5f5f7] border-none focus-visible:ring-2 focus-visible:ring-[#0071e3]" placeholder="••••••" {...field} /></FormControl>
                                 <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-[#d2d2d7]" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                              </div>
                            <FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-semibold text-[#86868b] uppercase tracking-wider ml-1">Confirm</FormLabel><FormControl><Input type={showPassword ? 'text' : 'password'} className="h-12 rounded-xl bg-[#f5f5f7] border-none focus-visible:ring-2 focus-visible:ring-[#0071e3]" placeholder="••••••" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    <FormField control={form.control} name="storeName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-semibold text-[#86868b] uppercase tracking-wider ml-1">Store Name</FormLabel><FormControl><Input placeholder="My Store" className="h-12 rounded-xl bg-[#f5f5f7] border-none focus-visible:ring-2 focus-visible:ring-[#0071e3]" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="storeSlug" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#86868b] uppercase tracking-wider ml-1">Store URL Slug</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d2d2d7] text-sm">/</span>
                                    <Input
                                        placeholder="my-store"
                                        className={cn(
                                            "h-12 pl-7 rounded-xl bg-[#f5f5f7] border-none focus-visible:ring-2 focus-visible:ring-[#0071e3]",
                                            slugStatus === 'available' && "focus-visible:ring-green-500",
                                            slugStatus === 'taken' && "focus-visible:ring-rose-500"
                                        )}
                                        {...field}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {slugStatus === 'checking' && <Spinner size="sm" />}
                                        {slugStatus === 'available' && <Check className="h-4 w-4 text-green-500" />}
                                    </div>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="storePhone" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-semibold text-[#86868b] uppercase tracking-wider ml-1">Phone</FormLabel><FormControl><Input placeholder="+234..." className="h-12 rounded-xl bg-[#f5f5f7] border-none focus-visible:ring-2 focus-visible:ring-[#0071e3]" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="storeAddress" render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-semibold text-[#86868b] uppercase tracking-wider ml-1">Address</FormLabel><FormControl><Input placeholder="Lagos, NG" className="h-12 rounded-xl bg-[#f5f5f7] border-none focus-visible:ring-2 focus-visible:ring-[#0071e3]" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-[#f5f5f7] p-6 rounded-[2rem] space-y-4">
                        <h3 className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                          <Check className="h-4 w-4 text-[#34c759]" />
                          Review Details
                        </h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between"><span className="text-[#86868b]">Admin</span><span className="font-semibold">{form.getValues('name')}</span></div>
                          <div className="flex justify-between"><span className="text-[#86868b]">Store</span><span className="font-semibold">{form.getValues('storeName')}</span></div>
                          <div className="flex justify-between"><span className="text-[#86868b]">URL</span><span className="font-semibold">/{form.getValues('storeSlug')}</span></div>
                        </div>
                    </div>
                    
                    <p className="text-[11px] text-[#86868b] text-center px-4">
                        By creating a store, you agree to our <Link href="/home/terms-of-service" className="text-[#0071e3] hover:underline">Terms of Service</Link> and <Link href="/home/privacy-policy" className="text-[#0071e3] hover:underline">Privacy Policy</Link>.
                    </p>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                    {currentStep > 1 && (
                        <Button type="button" variant="ghost" onClick={prevStep} className="flex-1 h-12 rounded-full font-semibold text-[#86868b]" disabled={isLoading}>
                            Back
                        </Button>
                    )}
                    {currentStep < totalSteps ? (
                        <Button type="button" onClick={nextStep} className="flex-1 h-12 rounded-full bg-[#1d1d1f] text-white hover:bg-[#2d2d2f] font-semibold">
                            Continue <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button type="submit" className="flex-1 h-12 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold" disabled={isLoading}>
                            {isLoading ? <Spinner size="sm" className="mr-2" /> : 'Launch Store'}
                        </Button>
                    )}
                </div>

                {currentStep === 1 && (
                  <div className="text-center text-sm pt-4">
                      Already have an account?{" "}
                      <Link href="/login" className="text-[#0071e3] font-semibold hover:underline">Sign in</Link>
                  </div>
                )}
            </form>
          </Form>
        </div>
        
        <p className="mt-8 text-center text-[11px] text-[#86868b] font-medium uppercase tracking-[0.2em]">
            Powered by StoreLink Pro
        </p>
      </div>
    </div>
  )
}
