'use client';

import Image from "next/image"
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ElysiumLogo } from "@/components/icons";
import { useState, useEffect, useMemo } from "react";
import { 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    User as UserIcon, 
    Phone, 
    Home,
    Store as StoreIcon,
    ArrowRight
} from "lucide-react";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import placeholderImages from '@/lib/placeholder-images.json';
import { useAuth as useFirebaseAuthInstance, useUser, useFirestore, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/auth-context";

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().trim().email('Invalid email address.'),
  storeName: z.string().min(2, 'Store name must be at least 2 characters.'),
  storeSlug: z.string().min(2, 'Store slug must be at least 2 characters.').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed.'),
  storeAddress: z.string().min(5, 'Store address must be at least 5 characters.'),
  storePhone: z.string().min(5, 'Store phone number is required.'),
  databaseId: z.string().min(1, 'Database ID is required.').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed.').default('(default)'),
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
    
    const form = useForm<SignupFormValues>({
      resolver: zodResolver(signupSchema),
      defaultValues: {
        name: '', email: '', storeName: '', storeSlug: '', storeAddress: '', storePhone: '', databaseId: '(default)', password: '', confirmPassword: '',
      },
    });

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
            toast({ variant: "destructive", title: "Configuration Error", description: "Firestore is not initialized. Please refresh the page." });
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
                    
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout: Separate database write took too long')), 5000)
                    );

                    await Promise.race([
                        setDoc(doc(targetFirestore, 'settings', storeId), settingsData),
                        timeoutPromise
                    ]);
                    console.log("Settings created in separate database successfully");
                } catch (e) {
                    console.error("Separate database settings creation failed or timed out:", e);
                    // Non-blocking error
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
                <PageSpinner label="StoreLink Pro" subLabel={isSuccessfullySubmitted ? "Account created! Redirecting to login..." : "Preparing your workspace…"} />
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
          <div className="grid gap-2 text-center">
             <div className="flex justify-center mb-4 h-10">
                <ElysiumLogo className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold font-headline">Create a Store</h1>
            <p className="text-balance text-muted-foreground">
              Start managing your business with StoreLink Pro.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} disabled={isSubmitting || isLoading} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="m@example.com" {...field} disabled={isSubmitting || isLoading} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="storeName" render={({ field }) => (
                    <FormItem><FormLabel>Store Name</FormLabel><FormControl><Input placeholder="My Awesome Store" {...field} disabled={isSubmitting || isLoading} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="storeSlug" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Store URL Slug</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/store/</span>
                                <Input placeholder="my-awesome-store" className="pl-16" {...field} disabled={isSubmitting || isLoading} />
                            </div>
                        </FormControl>
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
                <FormField control={form.control} name="databaseId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Database ID (Optional)</FormLabel>
                        <FormControl><Input placeholder="(default)" {...field} disabled={isSubmitting || isLoading} /></FormControl>
                        <p className="text-[10px] text-muted-foreground italic">Leave as <strong>(default)</strong> unless you have specifically created a separate Firestore database for this project.</p>
                        <FormMessage />
                    </FormItem>
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

                <Button type="submit" className="w-full mt-2 h-12 font-bold" disabled={isSubmitting || isLoading}>
                    {(isSubmitting || isLoading) ? <><Spinner size="sm" className="mr-2" />Creating Store…</> : 'Create Store Account'}
                </Button>
                <div className="text-center text-sm">
                    Already have an account?{" "}
                    <Link href="/login" className="underline text-primary font-bold">Log in</Link>
                </div>
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
            <h2 className="text-4xl font-black tracking-tighter uppercase">StoreLink Pro</h2>
            <p className="text-white/80 mt-2 font-medium">The ultimate all-in-one solution for managing your e-commerce business with unparalleled efficiency and insight.</p>
        </div>
      </div>
    </div>
  )
}
