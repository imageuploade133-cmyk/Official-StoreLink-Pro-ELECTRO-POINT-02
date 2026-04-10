
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
    CheckCircle2,
    PartyPopper,
    Sparkles,
    Gift,
    Heart,
    Star,
    Zap,
    Coins,
    Trophy,
    ArrowRight
} from "lucide-react";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import placeholderImages from '@/lib/placeholder-images.json';
import { useAuth, useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, AuthError } from "firebase/auth";
import { doc, setDoc, collection, writeBatch, serverTimestamp, getDoc } from "firebase/firestore";
import { useSettings } from "@/contexts/settings-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import regions from '@/lib/regions.json';
import type { AppSettings } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatUtils";

const iconMap = {
  PartyPopper,
  Sparkles,
  Gift,
  Heart,
  Star,
  CheckCircle2,
  Zap,
  Coins,
  Trophy,
};

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  confirmPassword: z.string(),
  phone: z.string().min(1, 'Phone number is required.'),
  address: z.string().min(1, 'Address is required.'),
  gender: z.string().min(1, 'Please select a gender.'),
  country: z.string().min(1, 'Please select a country.'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ['confirmPassword'],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function StoreSignupPage() {
    const { toast } = useToast();
    const loginImagePlaceholder = placeholderImages['login-background'];
    const [showPassword, setShowPassword] = useState(false);
    const [isCongratulationOpen, setIsCongratulationOpen] = useState(false);
    const [activeBonus, setActiveBonus] = useState(0);

    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { user, isLoading: isUserLoading } = useUser();
    const { settings, isLoading: isLoadingSettings } = useSettings();
    
    const form = useForm<SignupFormValues>({
      resolver: zodResolver(signupSchema),
      defaultValues: {
        name: '', email: '', password: '', confirmPassword: '',
        phone: '', address: '', gender: '', country: '',
      },
    });

    const { isSubmitting } = form.formState;

    const storeName = settings?.storeName || 'Welcome';
    const storeLogo = settings?.invoiceLogoUrl;
    const storeDescription = settings?.footerDescription || 'The ultimate all-in-one solution for managing your e-commerce business with unparalleled efficiency and insight.';
    const loginImage = settings?.loginImageUrl || loginImagePlaceholder.src;

    useEffect(() => {
        if (!isUserLoading && user && !isCongratulationOpen) {
          router.replace('/store/account');
        }
    }, [user, isUserLoading, router, isCongratulationOpen]);

    const onSubmit = async (values: SignupFormValues) => {
        if (!firestore) return;
        try {
            const settingsRef = doc(firestore, 'settings', 'global');
            const settingsSnap = await getDoc(settingsRef);
            const activeSettings = settingsSnap.exists() ? settingsSnap.data() as AppSettings : null;
            
            const welcomeCreditAmount = (activeSettings?.enableWelcomeCredit && activeSettings?.welcomeCreditAmount) 
                ? activeSettings.welcomeCreditAmount 
                : 0;

            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const newUser = userCredential.user;

            await updateProfile(newUser, { displayName: values.name });

            const batch = writeBatch(firestore);

            batch.set(doc(firestore, 'users', newUser.uid), {
                uid: newUser.uid,
                email: newUser.email,
                displayName: values.name,
                photoURL: '',
            });

            const customerRef = doc(firestore, 'customers', newUser.uid);
            batch.set(customerRef, {
                uid: newUser.uid,
                name: values.name,
                email: values.email,
                phone: values.phone || null,
                address: values.address || null,
                gender: values.gender || null,
                country: values.country || null,
                status: 'active',
                totalSpent: 0,
                outstandingCredit: 0,
                creditBalance: welcomeCreditAmount,
                allowSms: true,
                allowWhatsapp: true,
                branchId: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            if (welcomeCreditAmount > 0) {
                const paymentLogRef = doc(collection(firestore, "creditPayments"));
                batch.set(paymentLogRef, {
                    customerId: newUser.uid,
                    customerName: values.name,
                    amount: welcomeCreditAmount,
                    paymentDate: serverTimestamp(),
                    paymentMethod: 'System Bonus',
                    notes: 'Welcome Bonus - Automated Registry Credit',
                    staffId: 'SYSTEM',
                    isDeposit: true,
                    creditAdded: welcomeCreditAmount
                });
            }

            await batch.commit();
            setActiveBonus(welcomeCreditAmount);
            
            if (settings?.showWelcomePopup) {
                setIsCongratulationOpen(true);
            } else {
                toast({ title: "Account Created", description: "Welcome to the collection." });
                router.replace('/store/account');
            }
        } catch (error: any) {
            let description = "An unknown error occurred. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email is already registered.";
            } else if (error.code === 'auth/weak-password') {
                description = "The password must be at least 6 characters.";
            }
            toast({ variant: "destructive", title: "Signup Failed", description: description });
        }
    }

    const buttonStyle = useMemo(() => {
        const style = settings?.storeBtnStyle || 'standard';
        if (style === 'gradient') {
          return {
            background: `linear-gradient(to right, ${settings?.storeBtnGradientStart || '#3b82f6'}, ${settings?.storeBtnGradientEnd || '#1d4ed8'})`,
            color: 'white',
            border: 'none'
          };
        }
        return {
          backgroundColor: settings?.storeBtnColor || '#3b82f6',
          color: 'white',
          border: 'none'
        };
    }, [settings]);

    const CongratulationModal = () => {
        if (!settings) return null;
        const SelectedIcon = iconMap[settings.welcomePopupIcon as keyof typeof iconMap] || PartyPopper;
        const bgColor = settings.welcomePopupBgColor || '#ffffff';
        const textColor = settings.welcomePopupTextColor || '#000000';
        const iconColor = settings.welcomePopupIconColor || '#3b82f6';

        return (
            <Dialog open={isCongratulationOpen} onOpenChange={(open) => {
                setIsCongratulationOpen(open);
                if (!open) router.replace('/store/account');
            }}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[3rem]" style={{ backgroundColor: bgColor }}>
                    <DialogHeader className="sr-only">
                        <DialogTitle>Congratulations</DialogTitle>
                        <DialogDescription>Welcome to our store</DialogDescription>
                    </DialogHeader>
                    
                    {settings.welcomePopupImageUrl && (
                        <div className="relative aspect-video w-full">
                            <Image src={settings.welcomePopupImageUrl} alt="" fill className="object-cover" unoptimized />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                    )}

                    <div className="p-10 flex flex-col items-center text-center space-y-6" style={{ color: textColor }}>
                        <div className="size-20 rounded-[2rem] flex items-center justify-center mb-2 animate-bounce shadow-inner" style={{ backgroundColor: `${iconColor}15` }}>
                            <SelectedIcon className="size-10" style={{ color: iconColor }} strokeWidth={3} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">
                                {settings.welcomePopupTitle || 'Welcome!'}
                            </h2>
                            <p className="text-sm font-medium opacity-80 leading-relaxed max-w-xs mx-auto">
                                {settings.welcomePopupMessage}
                            </p>
                        </div>

                        {activeBonus > 0 && (
                            <div className="w-full pt-4">
                                <div className="p-6 rounded-[2.5rem] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-2">Initial Credit Verified</p>
                                    <p className="text-4xl font-black tracking-tighter" style={{ color: iconColor }}>
                                        {formatCurrency(activeBonus, settings.currency || '$')}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-6 w-full">
                            <Button 
                                onClick={() => {
                                    setIsCongratulationOpen(false);
                                    router.replace('/store/account');
                                }}
                                className="w-full h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-xl transition-all active:scale-95"
                            >
                                Start Discovery <ArrowRight className="ml-3 h-4 w-4" strokeWidth={3} />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    if (isUserLoading || isLoadingSettings) {
        return <PageSpinner label="Create Account" subLabel="Setting up registration…" />;
    }

    if (user && !isCongratulationOpen) {
        return <PageSpinner label="Account Created!" subLabel="Taking you to your account…" />;
    }

  return (
    <div className="w-full min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[400px] gap-6 px-4">
          <div className="grid gap-2 text-center">
             <div className="flex justify-center mb-4 h-10">
                {storeLogo ? (
                    <Image src={storeLogo} alt={storeName} width={40} height={40} className="h-10 w-auto object-contain" unoptimized />
                ) : (
                    <ElysiumLogo className="h-10 w-10 text-primary" />
                )}
            </div>
            <h1 className="text-4xl font-bold font-headline">Create an Account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your details below to join the elite collection.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="m@example.com" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="+1..." {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem><FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem><SelectItem value="Prefer not to say">Private</SelectItem></SelectContent>
                        </Select>
                      <FormMessage /></FormItem>
                  )}/>
                </div>
                <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem><FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select country..." /></SelectTrigger></FormControl>
                          <SelectContent><ScrollArea className="h-72">{regions.map(r => <SelectItem key={r.code} value={r.name}>{r.name}</SelectItem>)}</ScrollArea></SelectContent>
                        </Select>
                      <FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Delivery Address</FormLabel><FormControl><Textarea placeholder="Full street address..." {...field} disabled={isSubmitting} className="min-h-[100px]" /></FormControl><FormMessage /></FormItem>
                )}/>

                <Button type="submit" style={buttonStyle} className="w-full mt-2 h-12 font-bold border-none" disabled={isSubmitting}>
                    {isSubmitting ? <><Spinner size="sm" className="mr-2 text-primary-foreground" />Creating Account…</> : 'Create Account'}
                </Button>
                <div className="text-center text-sm">
                    Already have an account?{" "}
                    <Link href="/store/login" className="underline text-primary font-bold">Log in</Link>
                </div>
            </form>
          </Form>
        </div>
      </div>
       <div className="hidden bg-muted lg:block relative">
        <Image
          src={loginImage}
          alt="Storefront"
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-10 left-10 text-white max-w-lg">
            <h2 className="text-4xl font-black tracking-tighter uppercase">{storeName}</h2>
            <p className="text-white/80 mt-2 font-medium">{storeDescription}</p>
        </div>
      </div>
      <CongratulationModal />
    </div>
  )
}
