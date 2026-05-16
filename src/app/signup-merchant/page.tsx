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
    ShieldCheck,
    Sparkles,
    Gem,
    Crown
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
    const loginImage = "https://images.pexels.com/photos/14146828/pexels-photo-14146828.jpeg";

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

    const form = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            name: '',
            email: '',
            storeName: '',
            storeSlug: '',
            storeAddress: '',
            storePhone: '',
            databaseId: '(default)',
            password: '',
            confirmPassword: '',
        },
    });

    const storeSlug = useWatch({
        control: form.control,
        name: 'storeSlug',
    });

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
            if (currentStep < totalSteps) {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    useEffect(() => {
        const checkSlug = async () => {
            if (!storeSlug || storeSlug.length < 2) {
                setSlugStatus('idle');
                return;
            }

            if (reservedSlugs.includes(storeSlug)) {
                setSlugStatus('taken');
                return;
            }

            setSlugStatus('checking');
            try {
                const docRef = doc(firestore!, 'stores', storeSlug);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setSlugStatus('taken');
                } else {
                    setSlugStatus('available');
                }
            } catch (error) {
                console.error("Error checking slug:", error);
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
    <div className="flex min-h-screen w-full bg-[#fafaf9] dark:bg-[#09090b] selection:bg-[#C5A059]/30">
        {/* Left side - Luxury Branding */}
        <div className="hidden lg:flex lg:w-[40%] relative items-center justify-center overflow-hidden bg-[#1c1917] dark:bg-[#0c0a09]">
            {/* Refined background elements */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <Image
                    src={loginImage}
                    alt="Luxury Background"
                    fill
                    className="object-cover opacity-40 mix-blend-overlay scale-105"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] via-[#1c1917]/80 to-transparent"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#C5A059]/10 blur-[120px]"></div>
            </div>
            
            <div className="relative z-10 w-full max-w-lg px-12 flex flex-col items-start">
                <div className="flex items-center gap-3 mb-16">
                    <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/20">
                        <StoreLinkLogo className="h-6 w-6 text-[#C5A059]" />
                    </div>
                    <span className="font-semibold text-xl tracking-tight text-white italic">StoreLink <span className="font-light">Pro</span></span>
                </div>

                <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 ease-out">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] text-[10px] font-bold tracking-[0.2em] uppercase">
                        <Crown className="h-3 w-3" />
                        Premier Business Suite
                    </div>
                    
                    <h2 className="text-5xl font-light text-white leading-[1.1] tracking-tight">
                        Elevate your <br />
                        <span className="font-semibold text-[#C5A059]">Commercial Empire.</span>
                    </h2>
                    
                    <p className="text-stone-400 text-lg font-light leading-relaxed max-w-sm">
                        Experience the pinnacle of commerce management. Tailored for those who demand excellence in every transaction.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-8 pt-8">
                        <div>
                            <div className="text-2xl font-semibold text-white tracking-tight">Enterprise</div>
                            <div className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold mt-1">Infrastructure</div>
                        </div>
                        <div>
                            <div className="text-2xl font-semibold text-white tracking-tight">Global</div>
                            <div className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold mt-1">Ready</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Accent */}
            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-[10px] text-stone-500 uppercase tracking-[0.3em] font-medium border-t border-white/10 pt-8">
                <span>EST. MMXXIV</span>
                <span>Exclusive Access</span>
            </div>
        </div>

        {/* Right side - Action Area */}
        <div className="w-full lg:w-[60%] flex flex-col items-center justify-center p-6 sm:p-20 relative overflow-y-auto">
            <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-[540px] flex flex-col">
                <div className="mb-12">
                    <div className="flex items-center gap-2 mb-4 lg:hidden">
                        <StoreLinkLogo className="h-8 w-8 text-[#C5A059]" />
                        <span className="font-bold text-xl tracking-tight italic">StoreLink Pro</span>
                    </div>
                    <h1 className="text-3xl font-light tracking-tight text-stone-900 dark:text-stone-50 mb-2 uppercase">Create Your <span className="font-semibold">Venture</span></h1>
                    <div className="h-1 w-12 bg-[#C5A059] mb-6"></div>
                    <p className="text-stone-500 dark:text-stone-400 text-sm font-light">
                        {currentStep === 1 ? 'Step 1: Administrative Identity' : 
                        currentStep === 2 ? 'Step 2: Business Specifications' : 
                        'Step 3: Secure Finalization'}
                    </p>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white dark:bg-[#121212] rounded-sm p-8 sm:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-stone-100 dark:border-stone-800/50">
                        {/* Progress Line */}
                        <div className="relative h-[1px] w-full bg-stone-100 dark:bg-stone-800 mb-12">
                            <div 
                                className="absolute top-0 left-0 h-full bg-[#C5A059] transition-all duration-700 ease-in-out"
                                style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                            />
                            <div className="absolute -top-1.5 left-0 flex justify-between w-full">
                                {[1, 2, 3].map((s) => (
                                    <div 
                                        key={s}
                                        className={cn(
                                            "h-3 w-3 rounded-full border-2 transition-all duration-500",
                                            currentStep >= s ? "bg-[#C5A059] border-[#C5A059]" : "bg-white dark:bg-[#121212] border-stone-200 dark:border-stone-700"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                {currentStep === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em]">Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Julian Sterling" className="h-12 border-0 border-b border-stone-200 dark:border-stone-800 rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-[#C5A059] transition-all text-base font-light placeholder:text-stone-300 dark:placeholder:text-stone-700" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-[10px] font-medium" />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em]">Email Address</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="julian@excellence.com" className="h-12 border-0 border-b border-stone-200 dark:border-stone-800 rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-[#C5A059] transition-all text-base font-light placeholder:text-stone-300 dark:placeholder:text-stone-700" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-[10px] font-medium" />
                                        </FormItem>
                                    )}/>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <FormField control={form.control} name="password" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em]">Passphrase</FormLabel>
                                                <div className="relative">
                                                    <FormControl>
                                                        <Input type={showPassword ? 'text' : 'password'} className="h-12 border-0 border-b border-stone-200 dark:border-stone-800 rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-[#C5A059] transition-all text-base font-light placeholder:text-stone-300 dark:placeholder:text-stone-700" placeholder="••••••••" {...field} />
                                                    </FormControl>
                                                    <button type="button" className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-300 dark:text-stone-700 hover:text-[#C5A059]" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                                                </div>
                                                <FormMessage className="text-[10px] font-medium" />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em]">Confirm</FormLabel>
                                                <FormControl>
                                                    <Input type={showPassword ? 'text' : 'password'} className="h-12 border-0 border-b border-stone-200 dark:border-stone-800 rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-[#C5A059] transition-all text-base font-light placeholder:text-stone-300 dark:placeholder:text-stone-700" placeholder="••••••••" {...field} />
                                                </FormControl>
                                                <FormMessage className="text-[10px] font-medium" />
                                            </FormItem>
                                        )}/>
                                    </div>
                                </div>
                                )}

                                {currentStep === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <FormField control={form.control} name="storeName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em]">Business Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Maison de Luxe" className="h-12 border-0 border-b border-stone-200 dark:border-stone-800 rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-[#C5A059] transition-all text-base font-light placeholder:text-stone-300 dark:placeholder:text-stone-700" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-[10px] font-medium" />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="storeSlug" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em]">Vanity URL Slug</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-300 dark:text-stone-700 text-sm">/</span>
                                                    <Input
                                                        placeholder="maison-de-luxe"
                                                        className={cn(
                                                            "h-12 pl-4 border-0 border-b border-stone-200 dark:border-stone-800 rounded-none bg-transparent focus-visible:ring-0 transition-all text-base font-light placeholder:text-stone-300 dark:placeholder:text-stone-700",
                                                            slugStatus === 'available' && "focus-visible:border-emerald-500",
                                                            slugStatus === 'taken' && "focus-visible:border-rose-500",
                                                            slugStatus !== 'available' && slugStatus !== 'taken' && "focus-visible:border-[#C5A059]"
                                                        )}
                                                        {...field}
                                                    />
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                                                        {slugStatus === 'checking' && <Spinner size="sm" />}
                                                        {slugStatus === 'available' && <Check className="h-4 w-4 text-emerald-500" />}
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] font-medium" />
                                        </FormItem>
                                    )}/>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <FormField control={form.control} name="storePhone" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em]">Contact Line</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+234 ..." className="h-12 border-0 border-b border-stone-200 dark:border-stone-800 rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-[#C5A059] transition-all text-base font-light placeholder:text-stone-300 dark:placeholder:text-stone-700" {...field} />
                                                </FormControl>
                                                <FormMessage className="text-[10px] font-medium" />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="storeAddress" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em]">Headquarters Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Lagos, NG" className="h-12 border-0 border-b border-stone-200 dark:border-stone-800 rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-[#C5A059] transition-all text-base font-light placeholder:text-stone-300 dark:placeholder:text-stone-700" {...field} />
                                                </FormControl>
                                                <FormMessage className="text-[10px] font-medium" />
                                            </FormItem>
                                        )}/>
                                    </div>
                                </div>
                                )}

                                {currentStep === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="bg-stone-50 dark:bg-stone-900/30 p-8 rounded-sm border border-stone-100 dark:border-stone-800/50 space-y-6">
                                        <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-[0.3em] flex items-center gap-2">
                                            Verification Summary
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end border-b border-stone-100 dark:border-stone-800 pb-2">
                                                <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Principal</span>
                                                <span className="font-light text-stone-900 dark:text-stone-100">{form.getValues('name')}</span>
                                            </div>
                                            <div className="flex justify-between items-end border-b border-stone-100 dark:border-stone-800 pb-2">
                                                <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Corporation</span>
                                                <span className="font-light text-stone-900 dark:text-stone-100">{form.getValues('storeName')}</span>
                                            </div>
                                            <div className="flex justify-between items-end border-b border-stone-100 dark:border-stone-800 pb-2">
                                                <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Gateway</span>
                                                <span className="font-medium text-[#C5A059]">/{form.getValues('storeSlug')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[10px] text-stone-400 text-center px-4 leading-relaxed font-light italic">
                                        By inaugurating your store, you adhere to our <Link href="/home/terms-of-service" className="text-[#C5A059] font-medium hover:underline">Terms of Service</Link> and <Link href="/home/privacy-policy" className="text-[#C5A059] font-medium hover:underline">Privacy Policy</Link>.
                                    </p>
                                </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    {currentStep > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={prevStep} 
                                            className="flex-1 h-12 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-all" 
                                            disabled={isLoading}
                                        >
                                            Return
                                        </button>
                                    )}
                                    {currentStep < totalSteps ? (
                                        <Button 
                                            type="button" 
                                            onClick={nextStep} 
                                            className="flex-1 h-12 bg-stone-900 dark:bg-white dark:text-black text-white hover:bg-stone-800 dark:hover:bg-stone-200 rounded-none text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
                                        >
                                            Continue <ChevronRight className="ml-1 h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button 
                                            type="submit" 
                                            className="flex-1 h-12 bg-[#C5A059] hover:bg-[#B8860B] text-white rounded-none text-[10px] uppercase tracking-[0.2em] font-bold shadow-xl shadow-[#C5A059]/10 transition-all group" 
                                            disabled={isLoading}
                                        >
                                            {isLoading ? <Spinner size="sm" className="mr-2" /> : (
                                                <span className="flex items-center">
                                                    Inaugurate Venture
                                                    <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                                                </span>
                                            )}
                                        </Button>
                                    )}
                                </div>

                                {currentStep === 1 && (
                                <div className="text-center pt-8 border-t border-stone-100 dark:border-stone-800/50">
                                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Already Registered?</span>{" "}
                                    <Link href="/login" className="text-[#C5A059] text-[10px] font-bold uppercase tracking-widest hover:underline underline-offset-4 ml-2">Authenticate</Link>
                                </div>
                                )}
                            </form>
                        </Form>
                    </div>
                </div>
                
                <div className="mt-16 text-center">
                    <p className="text-[9px] text-stone-400 font-bold uppercase tracking-[0.4em]">
                        Secured by StoreLink <span className="text-stone-900 dark:text-stone-100">Imperial</span> Network
                    </p>
                </div>
            </div>
        </div>
    </div>
  )
}
