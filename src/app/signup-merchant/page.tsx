'use client';

import Image from "next/image"
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { V9Logo } from "@/components/icons";
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
    Check
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
    const loginImage = placeholderImages['login-background'];
    const [showPassword, setShowPassword] = useState(false);

    const auth = useFirebaseAuthInstance();
    const firestore = useFirestore();
    const { getFirestoreInstance } = useFirebase();
    const router = useRouter();
    const { user, isLoading: isUserLoading } = useUser();
    const { store, stores, setSelectedStoreId, staffMember, isLoading: isAuthContextLoading } = useAuth();
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
                    description: "Please choose a different store URL slug or select one from the suggestions."
                });
                return;
            }
            if (slugStatus === 'checking') {
                toast({
                    title: "Checking Availability",
                    description: "Please wait while we verify the store URL."
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
                setSuggestedSlugs([]);
                return;
            }

            // Client side check for reserved slugs
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
                    // Generate suggestions
                    const suggestions = [
                        `${storeSlug}-shop`,
                        `${storeSlug}-pos`,
                        `${storeSlug}-${Math.floor(100 + Math.random() * 899)}`,
                    ];
                    setSuggestedSlugs(suggestions);
                } else {
                    setSlugStatus('available');
                    setSuggestedSlugs([]);
                }
            } catch (error) {
                console.error("Error checking slug:", error);
                setSlugStatus('idle');
            }
        };

        const timer = setTimeout(() => {
            if (firestore) {
                checkSlug();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [storeSlug, firestore]);

    const { isSubmitting } = form.formState;

    useEffect(() => {
        if (!isUserLoading && user && !isAuthContextLoading) {
          if ((store || staffMember) && !form.formState.isSubmitSuccessful && !isSuccessfullySubmitted) {
            // Only redirect if they have a store and didn't just arrive from the "Create New Store" link with intent to create another
          }
        }
    }, [user, isUserLoading, isAuthContextLoading, store, staffMember, router, form.formState.isSubmitSuccessful, isSuccessfullySubmitted]);

    const onSubmit = async (values: SignupFormValues) => {
        console.log("onSubmit started with values:", { ...values, password: '[REDACTED]', confirmPassword: '[REDACTED]' });
        if (!firestore) {
            console.error("Firestore instance not found");
            toast({ variant: "destructive", title: "Configuration Error", description: "Database is not initialized. Please refresh the page." });
            return;
        }

        setIsLoading(true);
        try {
            let targetUser = auth.currentUser || user;
            console.log("Current user:", targetUser?.uid);

            if (targetUser && targetUser.email?.toLowerCase() !== values.email.toLowerCase()) {
                console.log("Signing out current user because email mismatch");
                await signOut(auth);
                targetUser = null;
            }

            if (!targetUser) {
                console.log("Creating new user with email:", values.email);
                const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
                targetUser = userCredential.user;
                console.log("New user created:", targetUser.uid);
                await updateProfile(targetUser, { displayName: values.name });
                
                await targetUser.reload();
                targetUser = auth.currentUser || userCredential.user;
                console.log("User reloaded after creation");
            }

            if (!targetUser) {
                throw new Error("Failed to create user account. Please try again.");
            }

            console.log("Building batch for store creation...");
            // Force token refresh to ensure Firestore has the latest auth state
            try {
                await targetUser.getIdToken(true);
                console.log("Auth token refreshed");
            } catch (e) {
                console.warn("Failed to refresh token, proceeding anyway:", e);
            }

            const batch = writeBatch(firestore);

            // 1. Create User record
            batch.set(doc(firestore, 'users', targetUser.uid), {
                uid: targetUser.uid,
                email: values.email, 
                displayName: values.name,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // 2. Create Store record
            const storeId = values.storeSlug; // Use slug as ID for easier routing
            console.log("New store ID:", storeId);
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

            // 3. Create Staff record (Admin)
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

            // 4. Create default settings for the store
            const settingsData = {
                store_id: storeId,
                storeName: values.storeName,
                storeAddress: values.storeAddress,
                storePhone: values.storePhone,
                storeEmail: values.email,
                currency: '₦',
                imgbbApiKey: '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            batch.set(doc(firestore, 'settings', storeId), settingsData);

            // 4b. Also store settings under /stores/{storeId}/settings/config (Recommended Refactor)
            const storeSettingsRef = doc(firestore, 'stores', storeId, 'settings', 'config');
            batch.set(storeSettingsRef, settingsData);

            console.log("Committing batch...");
            try {
                await batch.commit();
                console.log("Batch committed successfully");
            } catch (error) {
                console.error("Batch commit failed:", error);
                throw error;
            }

            // 5. Create settings in the separate database if specified
            if (values.databaseId && values.databaseId !== '(default)') {
                try {
                    console.log("Attempting to create settings in separate database:", values.databaseId);
                    const targetFirestore = getFirestoreInstance(values.databaseId);
                    
                    // Create a promise that writes to both settings locations in the separate database
                    // This ensures the new store is fully initialized in the target database
                    const separateDatabaseWrite = Promise.all([
                        setDoc(doc(targetFirestore, 'settings', storeId), settingsData),
                        setDoc(doc(targetFirestore, 'stores', storeId, 'settings', 'config'), settingsData)
                    ]);

                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout: Separate database write took too long. Check if the database ID is correct and provisioned correctly.')), 10000)
                    );

                    await Promise.race([
                        separateDatabaseWrite,
                        timeoutPromise
                    ]);
                    console.log("Settings created in separate database successfully");
                } catch (e) {
                    console.error("Separate database settings creation failed or timed out:", e);
                    
                    // Fallback: update the store record in the main database to use '(default)'
                    // This ensures the user can still use their store even if the separate database was invalid
                    try {
                        await setDoc(doc(firestore, 'stores', storeId), { databaseId: '(default)' }, { merge: true });
                        console.log("Successfully fell back to default databaseId");
                    } catch (fallbackError) {
                        console.warn("Failed to reset databaseId to (default):", fallbackError);
                    }

                    // Non-blocking error, but we should inform the user so they are not confused
                    toast({ 
                        variant: "destructive", 
                        title: "Separate Database Warning", 
                        description: "Your store was created, but we couldn't initialize the separate database. Your store will use the default database for now." 
                    });
                }
            }
            
            toast({ 
                title: "Account Created Successfully", 
                description: "Your store account has been created. Please log in with your credentials." 
            });

            // Sign out the user so they can log in again
            await signOut(auth);
            
            setIsSuccessfullySubmitted(true);
            
            console.log("Redirecting to login...");
            router.push('/login');

        } catch (error: any) {
            console.error("Signup error details:", error);
            let description = error.message || "An unknown error occurred. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email is already registered.";
            } else if (error.code === 'auth/weak-password') {
                description = "The password must be at least 6 characters.";
            }
            toast({ variant: "destructive", title: "Signup Failed", description: description });
        } finally {
            setIsLoading(false);
        }
    }

    if (isUserLoading || (user && isAuthContextLoading) || isSuccessfullySubmitted) {
        return (
            <div className="relative">
                <PageSpinner label="V9 POS System" subLabel={isSuccessfullySubmitted ? "Account created! Redirecting to login..." : "Preparing your workspace…"} />
                {isSuccessfullySubmitted && (
                    <div className="fixed bottom-10 left-0 right-0 z-[60] flex flex-col items-center gap-3">
                        <p className="text-slate-400 text-xs animate-pulse">If you are not redirected automatically, click the button below.</p>
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => router.push('/login')}
                        >
                            Continue to Login
                        </Button>
                    </div>
                )}
            </div>
        );
    }

  return (
    <div className="w-full min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[400px] gap-6 px-4">
          <div className="grid gap-2 text-center mb-4">
             <div className="flex justify-center mb-4 h-10">
                <V9Logo className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold font-headline">Create a Store</h1>
            <p className="text-balance text-muted-foreground text-sm">
              {currentStep === 1 ? 'First, let’s create your administrator account.' : 
               currentStep === 2 ? 'Tell us about your store details.' : 
               'Final touches for your store setup.'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-between mb-8 relative">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-0" />
            <div 
              className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500 -z-0" 
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex flex-col items-center gap-2 z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    currentStep > step ? 'bg-primary text-primary-foreground' : 
                    currentStep === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > step ? <Check className="h-4 w-4" /> : step}
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold transition-colors duration-300 ${currentStep === step ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step === 1 ? 'Account' : step === 2 ? 'Store' : 'Finish'}
                </span>
              </div>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                {currentStep === 1 && (
                  <div className="grid gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} disabled={isSubmitting || isLoading} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="m@example.com" {...field} disabled={isSubmitting || isLoading} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel>Password</FormLabel>
                              <div className="relative">
                                <FormControl><Input type={showPassword ? 'text' : 'password'} placeholder="Min. 6 chars" {...field} disabled={isSubmitting || isLoading} /></FormControl>
                                 <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}><Eye className="h-4 w-4" /></Button>
                              </div>
                            <FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type={showPassword ? 'text' : 'password'} placeholder="Repeat password" {...field} disabled={isSubmitting || isLoading} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="grid gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <FormField control={form.control} name="storeName" render={({ field }) => (
                        <FormItem><FormLabel>Store Name</FormLabel><FormControl><Input placeholder="My Awesome Store" {...field} disabled={isSubmitting || isLoading} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="storeSlug" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Store URL Slug</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/</span>
                                    <Input
                                        placeholder="my-awesome-store"
                                        className={cn(
                                            "pl-6",
                                            slugStatus === 'available' && "border-green-500 focus-visible:ring-green-500",
                                            slugStatus === 'taken' && "border-destructive focus-visible:ring-destructive"
                                        )}
                                        {...field}
                                        disabled={isSubmitting || isLoading}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {slugStatus === 'checking' && <Spinner size="sm" />}
                                        {slugStatus === 'available' && <Check className="h-4 w-4 text-green-500" />}
                                    </div>
                                </div>
                            </FormControl>
                            {slugStatus === 'taken' && (
                                <div className="mt-2 space-y-2">
                                    <p className="text-sm text-destructive font-medium">This URL is already taken.</p>
                                    {suggestedSlugs.length > 0 && (
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-xs text-muted-foreground">Suggestions:</span>
                                            {suggestedSlugs.map(suggestion => (
                                                <Button
                                                    key={suggestion}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                                                    onClick={() => form.setValue('storeSlug', suggestion, { shouldValidate: true })}
                                                >
                                                    {suggestion}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="storePhone" render={({ field }) => (
                            <FormItem><FormLabel>Store Phone Number</FormLabel><FormControl><Input placeholder="+234..." {...field} disabled={isSubmitting || isLoading} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="storeAddress" render={({ field }) => (
                            <FormItem><FormLabel>Store Address</FormLabel><FormControl><Input placeholder="123 Business St, Lagos" {...field} disabled={isSubmitting || isLoading} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="grid gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <FormField control={form.control} name="databaseId" render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center justify-between">
                                <FormLabel>Database ID (Optional)</FormLabel>
                                {!isDbIdUnlocked && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
                                        onClick={() => {
                                            const key = prompt("Enter unlock key:");
                                            if (key === "8888") {
                                                setIsDbIdUnlocked(true);
                                                toast({ title: "Unlocked", description: "You can now edit the Database ID." });
                                            } else if (key !== null) {
                                                toast({ variant: "destructive", title: "Invalid Key", description: "The unlock key is incorrect." });
                                            }
                                        }}
                                    >
                                        <Lock className="h-3 w-3 mr-1" /> Unlock
                                    </Button>
                                )}
                                {isDbIdUnlocked && (
                                    <div className="flex items-center text-[10px] text-green-500 font-bold">
                                        <Unlock className="h-3 w-3 mr-1" /> Unlocked
                                    </div>
                                )}
                            </div>
                            <FormControl>
                                <Input
                                    placeholder="(default)"
                                    {...field}
                                    disabled={!isDbIdUnlocked || isSubmitting || isLoading}
                                />
                            </FormControl>
                            <p className="text-[10px] text-muted-foreground italic">
                                Leave as <strong>(default)</strong> unless you have specifically created a separate database for this project.
                            </p>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <div className="bg-muted/50 p-4 rounded-lg border space-y-3 mt-2">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                          <StoreIcon className="h-4 w-4" />
                          Registration Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]">
                          <div className="text-muted-foreground">Administrator:</div>
                          <div className="font-medium truncate">{form.getValues('name')}</div>
                          <div className="text-muted-foreground">Email:</div>
                          <div className="font-medium truncate">{form.getValues('email')}</div>
                          <div className="text-muted-foreground">Store Name:</div>
                          <div className="font-medium truncate">{form.getValues('storeName')}</div>
                          <div className="text-muted-foreground">Store Slug:</div>
                          <div className="font-medium truncate">/{form.getValues('storeSlug')}</div>
                        </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 mt-4">
                    {currentStep > 1 && (
                        <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-12 font-bold" disabled={isSubmitting || isLoading}>
                            Back
                        </Button>
                    )}
                    {currentStep < totalSteps ? (
                        <Button type="button" onClick={nextStep} className="flex-1 h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button type="submit" className="flex-1 h-12 font-bold" disabled={isSubmitting || isLoading}>
                            {(isSubmitting || isLoading) ? <><Spinner size="sm" className="mr-2" />Creating Store…</> : 'Create Store Account'}
                        </Button>
                    )}
                </div>

                {currentStep === 1 && (
                  <div className="text-center text-sm mt-2">
                      Already have an account?{" "}
                      <Link href="/login" className="underline text-primary font-bold">Log in</Link>
                  </div>
                )}
            </form>
          </Form>
        </div>
      </div>
       <div className="hidden bg-muted lg:block relative">
        <Image
          src={loginImage.src}
          alt="Storefront"
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-10 left-10 text-white max-w-lg">
            <h2 className="text-4xl font-black tracking-tighter uppercase">V9 POS System</h2>
            <p className="text-white/80 mt-2 font-medium">The ultimate all-in-one solution for managing your e-commerce business with unparalleled efficiency and insight.</p>
        </div>
      </div>
    </div>
  )
}
