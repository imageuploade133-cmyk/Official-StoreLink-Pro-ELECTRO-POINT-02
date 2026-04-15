
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
    
    const form = useForm<SignupFormValues>({
      resolver: zodResolver(signupSchema),
      defaultValues: {
        name: '', email: '', storeName: '', databaseId: '(default)', password: '', confirmPassword: '',
      },
    });

    const { isSubmitting } = form.formState;

    useEffect(() => {
        if (!isUserLoading && user && !isAuthContextLoading) {
          if ((store || staffMember) && !form.formState.isSubmitSuccessful && !isSuccessfullySubmitted) {
            // Only redirect if they have a store and didn't just arrive from the "Create New Store" link with intent to create another
            // For now, let's allow them to stay if they want to create another store.
            // But if they have exactly one store and just logged in, they should probably go to dashboard.
            // This is tricky. Let's just allow them to stay on this page if they are already here.
          }
        }
    }, [user, isUserLoading, isAuthContextLoading, store, staffMember, router, form.formState.isSubmitSuccessful, isSuccessfullySubmitted]);

    const onSubmit = async (values: SignupFormValues) => {
        if (!firestore) return;
        try {
            let targetUser = user;

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

            // 1. Create User record
            batch.set(doc(firestore, 'users', targetUser.uid), {
                uid: targetUser.uid,
                email: values.email, // Use values.email to ensure consistency
                displayName: values.name,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // 2. Create Store record
            // Use the user's UID as the store ID for the primary store
            const storeId = `${targetUser.uid}_${Date.now()}`;
            batch.set(doc(firestore, 'stores', storeId), {
                id: storeId,
                owner_id: targetUser.uid,
                name: values.storeName,
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
                email: values.email, // Use values.email to ensure consistency
                role: 'admin',
                status: 'Active',
                permissions: {
                    pages: ['view_dashboard', 'view_inventory', 'add_products', 'edit_products', 'delete_products', 'view_categories', 'add_categories', 'edit_categories', 'delete_categories', 'view_staff', 'manage_staff', 'view_permissions', 'view_settings', 'manage_settings', 'manage_coupons', 'manage_website_content', 'canViewCustomers', 'canAddCustomers', 'canEditCustomers', 'canDeleteCustomers', 'canPrintBarcodes', 'view_stock_alerts', 'transfer_stock', 'canBulkRestock', 'canAccessPOS', 'view_my_sales', 'view_sales_history', 'canViewProductSales', 'canManageExpenses', 'canBulkAddProducts', 'canProcessReturns', 'canSendMarketingWhatsapp', 'manage_orders', 'view_online_customers', 'manage_flexible_payments', 'view_stock_audit', 'manage_ads']
                },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // 4. Create default settings for the store
            batch.set(doc(firestore, 'settings', storeId), {
                store_id: storeId,
                storeName: values.storeName,
                currency: '₦',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await batch.commit();

            // 4. Create default settings in the target database if it's different
            if (values.databaseId && values.databaseId !== '(default)') {
                try {
                    const targetFirestore = getFirestoreInstance(values.databaseId);
                    await setDoc(doc(targetFirestore, 'settings', storeId), {
                        store_id: storeId,
                        storeName: values.storeName,
                        currency: '₦',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                } catch (e) {
                    console.error("Failed to create settings in separate database:", e);
                    // Non-blocking error
                }
            }
            
            toast({ 
                title: "Store Created Successfully", 
                description: "Redirecting to your dashboard so you can start adding inventory..." 
            });
            setSelectedStoreId(storeId);
            
            // Explicitly set the store ID in localStorage to ensure it's picked up 
            // even if the context state update hasn't propagated before the redirect.
            if (typeof window !== 'undefined') {
                localStorage.setItem('selectedStoreId', storeId);
            }
            
            setIsSuccessfullySubmitted(true);
            
            // Use window.location.href for a clean transition, especially important for separate databases
            // to ensure the StoreFirestoreProvider re-initializes with the correct database instance.
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 500);
        } catch (error: any) {
            console.error("Signup error:", error);
            let description = "An unknown error occurred. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email is already registered.";
            } else if (error.code === 'auth/weak-password') {
                description = "The password must be at least 6 characters.";
            }
            toast({ variant: "destructive", title: "Signup Failed", description: description });
        }
    }

    if (isUserLoading || (user && isAuthContextLoading) || isSuccessfullySubmitted) {
        return <PageSpinner label="StoreLink Pro" subLabel="Preparing your workspace…" />;
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
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="m@example.com" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="storeName" render={({ field }) => (
                    <FormItem><FormLabel>Store Name</FormLabel><FormControl><Input placeholder="My Awesome Store" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="databaseId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Database ID (Optional)</FormLabel>
                        <FormControl><Input placeholder="(default)" {...field} disabled={isSubmitting} /></FormControl>
                        <p className="text-[10px] text-muted-foreground italic">Leave as <strong>(default)</strong> unless you have specifically created a separate Firestore database for this project.</p>
                        <FormMessage />
                    </FormItem>
                )}/>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel>Password</FormLabel>
                          <div className="relative">
                            <FormControl><Input type={showPassword ? 'text' : 'password'} placeholder="Min. 6 chars" {...field} disabled={isSubmitting} /></FormControl>
                             <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}><Eye className="h-4 w-4" /></Button>
                          </div>
                        <FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                        <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type={showPassword ? 'text' : 'password'} placeholder="Repeat password" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>

                <Button type="submit" className="w-full mt-2 h-12 font-bold" disabled={isSubmitting}>
                    {isSubmitting ? <><Spinner size="sm" className="mr-2" />Creating Store…</> : 'Create Store Account'}
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
