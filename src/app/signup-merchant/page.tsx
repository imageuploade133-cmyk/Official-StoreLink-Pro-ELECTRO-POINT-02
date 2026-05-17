'use client';

import Image from "next/image"
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StoreLinkLogo } from "@/components/icons";
import { useState, useEffect } from "react";
import { 
    Eye, 
    EyeOff, 
    ArrowRight,
    Check,
    ChevronRight,
    Sparkles,
    ChevronLeft
} from "lucide-react";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
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
    const signupImage = "https://images.pexels.com/photos/135620/pexels-photo-135620.jpeg";

    const auth = useFirebaseAuthInstance();
    const firestore = useFirestore();
    const { getFirestoreInstance } = useFirebase();
    const router = useRouter();
    const { user, isLoading: isUserLoading } = useUser();
    const { store, staffMember, isLoading: isAuthContextLoading } = useAuth();
    const [isSuccessfullySubmitted, setIsSuccessfullySubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

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
    <div className="flex min-h-screen w-full bg-[#fafafa] dark:bg-black selection:bg-blue-500/30 font-sans">
        {/* Left Side - Image */}
        <div className="hidden lg:block lg:w-[40%] xl:w-[45%] relative overflow-hidden">
            <Image 
                src={signupImage}
                alt="Signup Background"
                fill
                className="object-cover"
                priority
            />
            <div className="absolute inset-0 bg-black/10 dark:bg-black/40" />
            <div className="absolute top-12 left-12 z-10">
                <Link href="/login" className="flex items-center gap-2">
                    <StoreLinkLogo className="h-6 w-6 text-white" />
                    <span className="font-semibold text-lg tracking-tight text-white">StoreLink <span className="text-white/60 font-normal">Pro</span></span>
                </Link>
            </div>
            <div className="absolute bottom-12 left-12 z-10">
                <h2 className="text-white font-bold text-3xl tracking-tight mb-4">Start your journey.</h2>
                <p className="text-white/80 max-w-sm font-medium text-lg leading-relaxed">
                    Join thousands of merchants who trust StoreLink Pro to power their commerce empires.
                </p>
            </div>
        </div>

        {/* Right Side - Form Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
            <header className="absolute top-0 w-full z-50 lg:hidden px-6 h-16 flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-black/80 backdrop-blur-md">
                <Link href="/login" className="flex items-center gap-2">
                    <StoreLinkLogo className="h-6 w-6 text-[#0071e3]" />
                    <span className="font-semibold text-lg tracking-tight">StoreLink <span className="text-zinc-400 dark:text-zinc-600 font-normal">Pro</span></span>
                </Link>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </header>

            <div className="absolute top-8 right-8 hidden lg:block">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-[500px] py-12">
                <div className="mb-10 text-center lg:text-left">
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
                        {currentStep === 1 ? 'Create your account' : 
                         currentStep === 2 ? 'Create store' : 
                         'Confirm details'}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                        {currentStep === 1 ? 'Tell us who you are to get started.' : 
                         currentStep === 2 ? 'Provide details about your business.' : 
                         'Review everything before we launch.'}
                    </p>
                </div>

                {/* Progress Stages */}
                <div className="flex justify-center lg:justify-start gap-2 sm:gap-4 mb-8">
                    {[
                        { id: 1, label: 'Account' },
                        { id: 2, label: 'Store' },
                        { id: 3, label: 'Confirm' }
                    ].map((s, idx, arr) => (
                        <div key={s.id} className="flex items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-2">
                                <div 
                                    className={cn(
                                        "flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 transition-all duration-300 text-xs sm:text-sm font-bold",
                                        currentStep === s.id 
                                            ? "bg-[#0071e3] border-[#0071e3] text-white shadow-[0_0_15px_rgba(0,113,227,0.3)]" 
                                            : currentStep > s.id 
                                                ? "bg-emerald-500 border-emerald-500 text-white" 
                                                : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600"
                                    )}
                                >
                                    {currentStep > s.id ? <Check className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={3} /> : s.id}
                                </div>
                                <span className={cn(
                                    "text-[10px] sm:text-xs font-semibold uppercase tracking-wider hidden xs:block",
                                    currentStep === s.id ? "text-[#0071e3]" : "text-zinc-400"
                                )}>
                                    {s.label}
                                </span>
                            </div>
                            {idx < arr.length - 1 && (
                                <div className={cn(
                                    "h-[2px] w-3 sm:w-6 rounded-full transition-all duration-300",
                                    currentStep > s.id ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 sm:p-10 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_10px_20px_rgba(0,0,0,0.03)] border border-zinc-200/50 dark:border-zinc-800/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {currentStep === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium">Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="john@example.com" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}/>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="password" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">Password</FormLabel>
                                            <div className="relative">
                                                <FormControl>
                                                    <Input type={showPassword ? 'text' : 'password'} className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all pr-10" placeholder="••••••••" {...field} />
                                                </FormControl>
                                                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                                            </div>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">Confirm</FormLabel>
                                            <FormControl>
                                                <Input type={showPassword ? 'text' : 'password'} className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all" placeholder="••••••••" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>
                            )}

                            {currentStep === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <FormField control={form.control} name="storeName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium">Store Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="My Awesome Store" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="storeSlug" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium">Store URL</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">storelink.pro/</span>
                                                <Input
                                                    placeholder="my-store"
                                                    className={cn(
                                                        "h-12 pl-[104px] rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 transition-all",
                                                        slugStatus === 'available' && "focus:border-emerald-500",
                                                        slugStatus === 'taken' && "focus:border-rose-500",
                                                        slugStatus !== 'available' && slugStatus !== 'taken' && "focus:border-[#0071e3]"
                                                    )}
                                                    {...field}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    {slugStatus === 'checking' && <Spinner size="sm" />}
                                                    {slugStatus === 'available' && <Check className="h-4 w-4 text-emerald-500" />}
                                                </div>
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}/>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="storePhone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">Phone Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+1 234 567 890" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="storeAddress" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium">Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123 Street, City" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>
                            )}

                            {currentStep === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-zinc-200/50 dark:border-zinc-700/50">
                                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Owner</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{form.getValues('name')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-zinc-200/50 dark:border-zinc-700/50">
                                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Store</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{form.getValues('storeName')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">URL</span>
                                        <span className="font-medium text-[#0071e3]">storelink.pro/{form.getValues('storeSlug')}</span>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-zinc-400 text-center px-4 leading-relaxed font-medium">
                                    By creating your store, you agree to our <Link href="#" className="text-[#0071e3] hover:underline">Terms of Service</Link> and <Link href="#" className="text-[#0071e3] hover:underline">Privacy Policy</Link>.
                                </p>
                            </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                {currentStep > 1 && (
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        onClick={prevStep} 
                                        className="flex-1 h-12 rounded-xl border-zinc-200 dark:border-zinc-800 font-semibold" 
                                        disabled={isLoading}
                                    >
                                        <ChevronLeft className="mr-2 h-4 w-4" /> Back
                                    </Button>
                                )}
                                {currentStep < totalSteps ? (
                                    <Button 
                                        type="button" 
                                        onClick={nextStep} 
                                        className="flex-1 h-12 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-semibold transition-all group"
                                    >
                                        Continue <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                    </Button>
                                ) : (
                                    <Button 
                                        type="submit" 
                                        className="flex-1 h-12 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-semibold shadow-sm transition-all group" 
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Spinner size="sm" className="mr-2" /> : (
                                            <span className="flex items-center">
                                                Create My Store
                                                <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                                            </span>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Form>
                </div>

                <div className="mt-12 text-center lg:text-left">
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 font-medium uppercase tracking-[0.2em]">
                        &copy; {new Date().getFullYear()} StoreLink Pro &bull; Global E-commerce Solutions
                    </p>
                </div>
            </div>
        </div>
    </div>
  )
}
