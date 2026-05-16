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
    ChevronRight,
    ShieldCheck
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
import { ThemeToggle } from "@/components/theme-toggle";

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
    const loginImage = "https://emakemrnd.com.ng/storelink%20bg%20logo1.png";

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
    <div className="flex min-h-screen w-full bg-white dark:bg-[#09090b] selection:bg-[#0071e3]/30">
        {/* Left side - Luxury Branding */}
        <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center overflow-hidden bg-[#fbfbfd] dark:bg-[#09090b]">
            {/* Refined background elements */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#0071e3]/5 blur-[120px] dark:bg-[#0071e3]/10"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#0071e3]/5 blur-[120px] dark:bg-[#0071e3]/10"></div>
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>
            
            <div className="relative z-10 w-full max-w-4xl px-12 flex flex-col items-center justify-center">
                {/* Floating Navigation/Header on Left Side */}
                <div className="absolute top-12 left-12 flex items-center gap-3 group cursor-pointer">
                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-2xl shadow-xl shadow-black/5 border border-zinc-100 dark:border-zinc-800 transition-transform group-hover:scale-110 duration-500">
                        <StoreLinkLogo className="h-6 w-6 text-[#0071e3]" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-[#1d1d1f] dark:text-white">StoreLink Pro</span>
                </div>

                <div className="relative w-full aspect-square max-w-[540px] animate-in fade-in zoom-in duration-1000 ease-out">
                    <div className="absolute inset-0 bg-[#0071e3]/5 rounded-full blur-3xl opacity-50 scale-75 animate-pulse"></div>
                    <Image
                        src={loginImage}
                        alt="StoreLink Pro Branding"
                        fill
                        className="object-contain drop-shadow-[0_32px_64px_rgba(0,113,227,0.15)] z-10"
                        priority
                    />
                </div>

                <div className="mt-12 text-center space-y-6 max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] text-xs font-bold tracking-widest uppercase mb-2">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Enterprise Grade Solution
                    </div>
                    <h2 className="text-5xl font-extrabold text-[#1d1d1f] dark:text-white leading-[1.1] tracking-tight">
                        Launch Your <span className="text-[#0071e3] relative">Store.<span className="absolute -bottom-2 left-0 w-full h-1 bg-[#0071e3]/20 rounded-full"></span></span> Scale Your Vision.
                    </h2>
                    <p className="text-[#86868b] text-xl font-medium leading-relaxed">
                        Join thousands of merchants who trust StoreLink Pro for their business growth.
                    </p>
                    
                    <div className="flex items-center justify-center gap-8 pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[#1d1d1f] dark:text-white">99.9%</div>
                            <div className="text-[10px] uppercase tracking-widest text-[#86868b] font-bold">Uptime</div>
                        </div>
                        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[#1d1d1f] dark:text-white">24/7</div>
                            <div className="text-[10px] uppercase tracking-widest text-[#86868b] font-bold">Support</div>
                        </div>
                        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[#1d1d1f] dark:text-white">256-bit</div>
                            <div className="text-[10px] uppercase tracking-widest text-[#86868b] font-bold">Encryption</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Right side - Action Area */}
        <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-6 sm:p-12 relative bg-white dark:bg-[#09090b]">
            <div className="absolute top-8 right-8 z-50">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-[500px] flex flex-col">
                <div className="mb-8 text-center lg:text-left flex flex-col lg:items-start items-center">
                    <div className="flex justify-center mb-8 lg:hidden">
                        <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800">
                            <StoreLinkLogo className="h-10 w-10 text-[#0071e3]" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-[#1d1d1f] dark:text-white mb-3">Create a Store</h1>
                    <p className="text-[#86868b] text-base font-medium">
                        {currentStep === 1 ? 'Start with your admin account.' : 
                        currentStep === 2 ? 'Tell us about your business.' : 
                        'Finalize your setup.'}
                    </p>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.08)] border border-zinc-100 dark:border-zinc-800">
                        {/* Progress Dots */}
                        <div className="flex justify-center gap-2 mb-8">
                            {[1, 2, 3].map((step) => (
                            <div 
                                key={step} 
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-500",
                                    currentStep === step ? "w-8 bg-[#0071e3]" : "w-1.5 bg-zinc-200 dark:bg-zinc-800"
                                )}
                            />
                            ))}
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                {currentStep === 1 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold text-[#1d1d1f] dark:text-zinc-400 uppercase tracking-[0.15em] ml-1">Full Name</FormLabel><FormControl><Input placeholder="John Doe" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-[#0071e3] transition-all font-medium" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold text-[#1d1d1f] dark:text-zinc-400 uppercase tracking-[0.15em] ml-1">Email Identity</FormLabel><FormControl><Input type="email" placeholder="m@example.com" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-[#0071e3] transition-all font-medium" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="password" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs font-bold text-[#1d1d1f] dark:text-zinc-400 uppercase tracking-[0.15em] ml-1">Security Key</FormLabel>
                                            <div className="relative">
                                                <FormControl><Input type={showPassword ? 'text' : 'password'} className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-[#0071e3] transition-all font-medium" placeholder="••••••" {...field} /></FormControl>
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-[#d2d2d7] hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                                            </div>
                                            <FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs font-bold text-[#1d1d1f] dark:text-zinc-400 uppercase tracking-[0.15em] ml-1">Confirm Key</FormLabel><FormControl><Input type={showPassword ? 'text' : 'password'} className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-[#0071e3] transition-all font-medium" placeholder="••••••" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                </div>
                                )}

                                {currentStep === 2 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <FormField control={form.control} name="storeName" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-bold text-[#1d1d1f] dark:text-zinc-400 uppercase tracking-[0.15em] ml-1">Venture Name</FormLabel><FormControl><Input placeholder="My Store" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-[#0071e3] transition-all font-medium" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="storeSlug" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-[#1d1d1f] dark:text-zinc-400 uppercase tracking-[0.15em] ml-1">Exclusive URL Identity</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d2d2d7] text-sm">/</span>
                                                    <Input
                                                        placeholder="my-store"
                                                        className={cn(
                                                            "h-14 pl-7 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-[#0071e3] transition-all font-medium",
                                                            slugStatus === 'available' && "focus-visible:ring-emerald-500",
                                                            slugStatus === 'taken' && "focus-visible:ring-rose-500"
                                                        )}
                                                        {...field}
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                        {slugStatus === 'checking' && <Spinner size="sm" />}
                                                        {slugStatus === 'available' && <Check className="h-4 w-4 text-emerald-500" />}
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="storePhone" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs font-bold text-[#1d1d1f] dark:text-zinc-400 uppercase tracking-[0.15em] ml-1">Phone Line</FormLabel><FormControl><Input placeholder="+234..." className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-[#0071e3] transition-all font-medium" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="storeAddress" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs font-bold text-[#1d1d1f] dark:text-zinc-400 uppercase tracking-[0.15em] ml-1">Global Address</FormLabel><FormControl><Input placeholder="Lagos, NG" className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-[#0071e3] transition-all font-medium" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                </div>
                                )}

                                {currentStep === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 space-y-4">
                                        <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                                        <Check className="h-5 w-5 text-emerald-500" />
                                        Final Verification
                                        </h3>
                                        <div className="space-y-3 text-xs">
                                        <div className="flex justify-between items-center"><span className="text-zinc-400 font-bold uppercase tracking-wider">Executive</span><span className="font-bold text-[#1d1d1f] dark:text-white text-sm">{form.getValues('name')}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-400 font-bold uppercase tracking-wider">Entity</span><span className="font-bold text-[#1d1d1f] dark:text-white text-sm">{form.getValues('storeName')}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-zinc-400 font-bold uppercase tracking-wider">Gateway</span><span className="font-bold text-[#0071e3] text-sm">/{form.getValues('storeSlug')}</span></div>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[11px] text-[#86868b] text-center px-4 leading-relaxed font-medium">
                                        By launching your store, you agree to our <Link href="/home/terms-of-service" className="text-[#0071e3] font-bold hover:underline">Terms of Service</Link> and <Link href="/home/privacy-policy" className="text-[#0071e3] font-bold hover:underline">Privacy Policy</Link>.
                                    </p>
                                </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    {currentStep > 1 && (
                                        <button type="button" onClick={prevStep} className="flex-1 h-14 rounded-2xl font-bold text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all" disabled={isLoading}>
                                            Retreat
                                        </button>
                                    )}
                                    {currentStep < totalSteps ? (
                                        <Button type="button" onClick={nextStep} className="flex-1 h-14 rounded-2xl bg-[#1d1d1f] dark:bg-white dark:text-black text-white hover:bg-black dark:hover:bg-zinc-200 font-bold transition-all active:scale-[0.98] shadow-xl shadow-black/5">
                                            Proceed <ChevronRight className="ml-1 h-5 w-5" />
                                        </Button>
                                    ) : (
                                        <Button type="submit" className="flex-1 h-14 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold shadow-2xl shadow-[#0071e3]/20 transition-all active:scale-[0.98] group" disabled={isLoading}>
                                            {isLoading ? <Spinner size="sm" className="mr-2" /> : (
                                                <>
                                                    Launch Store
                                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>

                                {currentStep === 1 && (
                                <div className="text-center text-sm pt-4">
                                    <span className="text-zinc-400 font-medium">Existing member?</span>{" "}
                                    <Link href="/login" className="text-[#0066cc] font-bold hover:underline underline-offset-4">Authenticate</Link>
                                </div>
                                )}
                            </form>
                        </Form>
                    </div>
                </div>
                
                <div className="mt-16 flex flex-col items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800"></div>
                        <span className="text-[10px] text-[#86868b] font-bold uppercase tracking-[0.25em]">Network Secured</span>
                        <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800"></div>
                    </div>
                    <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-[0.2em] text-center">
                        Powered by <span className="text-[#1d1d1f] dark:text-white">StoreLink Pro</span> Global Systems
                    </p>
                </div>
            </div>
        </div>
    </div>
  )
}
