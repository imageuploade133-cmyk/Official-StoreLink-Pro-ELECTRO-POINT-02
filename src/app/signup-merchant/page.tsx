'use client';

import Image from "next/image"
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox";
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
  acceptedTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions.',
  }),
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
    const [currentStep, setCurrentStep] = useState(1); // Start with step 1 (Account Details)
    const [invitationCode, setInvitationCode] = useState('');
    const [isValidatingCode, setIsValidatingCode] = useState(false);
    const totalSteps = 3;

    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [suggestions, setSuggestions] = useState<string[]>([]);

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
            acceptedTerms: false,
        },
    });

    const storeSlug = useWatch({
        control: form.control,
        name: 'storeSlug',
    });

    const nextStep = async () => {
        let fieldsToValidate: (keyof SignupFormValues)[] = [];
        if (currentStep === 1) {
            fieldsToValidate = ['name', 'email', 'password', 'confirmPassword', 'acceptedTerms'];
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
                setSuggestions([]);
                return;
            }

            if (reservedSlugs.includes(storeSlug)) {
                setSlugStatus('taken');
                generateSuggestions(storeSlug);
                return;
            }

            setSlugStatus('checking');
            try {
                const docRef = doc(firestore!, 'stores', storeSlug);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setSlugStatus('taken');
                    generateSuggestions(storeSlug);
                } else {
                    setSlugStatus('available');
                    setSuggestions([]);
                }
            } catch (error) {
                console.error("Error checking slug:", error);
                setSlugStatus('idle');
            }
        };

        const generateSuggestions = async (baseSlug: string) => {
            const variants = [
                `${baseSlug}-shop`,
                `${baseSlug}-store`,
                `${baseSlug}-hub`,
                `${baseSlug}24`,
                `${baseSlug}-official`
            ];
            
            const results = await Promise.all(variants.map(async (v) => {
                if (reservedSlugs.includes(v)) return null;
                const docRef = doc(firestore!, 'stores', v);
                const docSnap = await getDoc(docRef);
                return docSnap.exists() ? null : v;
            }));

            setSuggestions(results.filter((r): r is string => r !== null).slice(0, 3));
        };

        const timer = setTimeout(() => {
            if (firestore) checkSlug();
        }, 500);

        return () => clearTimeout(timer);
    }, [storeSlug, firestore]);

    const onSubmit = async (values: SignupFormValues) => {
        setIsLoading(true);
        try {
            // Call the secure merchant signup API which handles invitation validation and account creation atomically
            const response = await fetch('/api/auth/merchant/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...values,
                    invitationCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            toast({ title: "Welcome to StoreLink Pro", description: "Your account is ready." });
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
        <div className="hidden lg:block lg:w-[45%] xl:w-[50%] relative overflow-hidden">
            <Image 
                src={signupImage}
                alt="Signup Background"
                fill
                className="object-cover"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-12 left-12 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30">
                        <StoreLinkLogo className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight">StoreLink Pro</span>
                </div>
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
                         currentStep === 2 ? 'Create workspace / store' :
                         'Confirm details'}
                    </h1>
                    <p className="mt-3 text-zinc-500 dark:text-zinc-400 font-medium">
                        {currentStep === 1 ? 'Tell us who you are to get started.' :
                         currentStep === 2 ? 'Provide details about your business or workspace.' :
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

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {currentStep === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all bg-white dark:bg-zinc-900" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Email Address</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="john@example.com" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all bg-white dark:bg-zinc-900" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}/>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="password" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Password</FormLabel>
                                            <div className="relative">
                                                <FormControl>
                                                    <Input type={showPassword ? 'text' : 'password'} className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all pr-10 bg-white dark:bg-zinc-900" placeholder="••••••••" {...field} />
                                                </FormControl>
                                                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                                            </div>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Confirm</FormLabel>
                                            <FormControl>
                                                <Input type={showPassword ? 'text' : 'password'} className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all bg-white dark:bg-zinc-900" placeholder="••••••••" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}/>
                                    </div>
                                    <FormField control={form.control} name="acceptedTerms" render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                className="mt-1"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                                I accept the <Link href="/home/terms-of-service" target="_blank" className="text-[#0071e3] hover:underline">Terms of Service</Link> and <Link href="/home/privacy-policy" target="_blank" className="text-[#0071e3] hover:underline">Privacy Policy</Link>
                                            </FormLabel>
                                            <FormMessage className="text-xs" />
                                        </div>
                                    </FormItem>
                                    )}/>
                                    </div>
                                    )}

                            {currentStep === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                <FormField control={form.control} name="storeName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Store Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="My Awesome Store" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all bg-white dark:bg-zinc-900" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="storeSlug" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Store URL</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">storelink.pro/</span>
                                                <Input
                                                    placeholder="my-store"
                                                    className={cn(
                                                        "h-12 pl-[104px] rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 transition-all bg-white dark:bg-zinc-900",
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
                                        {slugStatus === 'taken' && suggestions.length > 0 && (
                                            <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Suggested URLs:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {suggestions.map((suggestion) => (
                                                        <button
                                                            key={suggestion}
                                                            type="button"
                                                            onClick={() => form.setValue('storeSlug', suggestion, { shouldValidate: true })}
                                                            className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-[#0071e3] hover:text-white transition-all border border-zinc-200 dark:border-zinc-700 hover:border-[#0071e3]"
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}/>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="storePhone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Phone Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+1 234 567 890" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all bg-white dark:bg-zinc-900" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="storeAddress" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123 Street, City" className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all bg-white dark:bg-zinc-900" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>
                            )}

                            {currentStep === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
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
                                    By creating your store, you agree to our <Link href="/home/terms-of-service" target="_blank" className="text-[#0071e3] hover:underline">Terms of Service</Link> and <Link href="/home/privacy-policy" target="_blank" className="text-[#0071e3] hover:underline">Privacy Policy</Link>.
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
                                        loading={isLoading}
                                    >
                                        <span className="flex items-center">
                                            Create My Store
                                            <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                                        </span>
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Form>

                    <div className="pt-6 text-center lg:text-left">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Already have a store?{" "}
                            <Link href="/login" className="text-[#0071e3] font-semibold hover:underline">Sign in</Link>
                        </p>
                    </div>
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
