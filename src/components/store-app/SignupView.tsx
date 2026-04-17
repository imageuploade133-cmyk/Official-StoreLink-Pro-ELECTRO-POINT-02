
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { 
    User as UserIcon, 
    Mail, 
    Lock, 
    Phone, 
    MapPin, 
    Globe, 
    Users, 
    ArrowLeft, 
    Loader2, 
    CheckCircle2, 
    X,
    Eye,
    EyeOff,
    ChevronRight,
    ShieldCheck,
    PartyPopper,
    Sparkles,
    Gift,
    Heart,
    Star,
    Zap,
    Coins,
    Trophy,
    ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, writeBatch, serverTimestamp, getDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/settings-context';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import regions from '@/lib/regions.json';
import type { AppSettings, WhatsappMessageLog } from '@/lib/types';
import { formatCurrency } from '@/lib/formatUtils';

import { useStoreUrl } from '@/hooks/use-store-url';

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
  email: z.string().trim().email('Invalid email protocol.'),
  password: z.string().min(6, 'Minimum 6 characters required.'),
  confirmPassword: z.string(),
  phone: z.string().min(1, 'Contact number is required.'),
  address: z.string().min(10, 'Full fulfillment address required.'),
  gender: z.string().min(1, 'Please select a gender.'),
  country: z.string().min(1, 'Please select a territory.'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Security codes do not match.",
  path: ['confirmPassword'],
});

type SignupValues = z.infer<typeof signupSchema>;

interface SignupViewProps {
    onClose: () => void;
    onNavigate: (tab: string) => void;
}

export function SignupView({ onClose, onNavigate }: SignupViewProps) {
    const auth = useFirebaseAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { settings } = useSettings();
    const { storeId } = useStoreUrl();
    const [showPassword, setShowPassword] = useState(false);
    const [isCongratulationActive, setIsCongratulationActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeBonus, setActiveBonus] = useState(0);

    const form = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            name: '', email: '', password: '', confirmPassword: '',
            phone: '', address: '', gender: '', country: '',
        }
    });

    const onSubmit = async (values: SignupValues) => {
        if (!firestore || !storeId) return;
        setIsProcessing(true);
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
                photoURL: null,
            });

            batch.set(doc(firestore, 'customers', newUser.uid), {
                uid: newUser.uid,
                store_id: storeId,
                name: values.name,
                email: values.email,
                phone: values.phone,
                address: values.address,
                gender: values.gender,
                country: values.country,
                status: 'active',
                totalSpent: 0,
                outstandingCredit: 0,
                creditBalance: welcomeCreditAmount,
                allowSms: true,
                allowWhatsapp: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            if (welcomeCreditAmount > 0) {
                const paymentLogRef = doc(collection(firestore, "creditPayments"));
                batch.set(paymentLogRef, {
                    customerId: newUser.uid,
                    store_id: storeId,
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
                setIsCongratulationActive(true);
            } else {
                toast({ title: 'Account Initialized' });
                onNavigate('home');
            }
        } catch (error: any) {
            let msg = 'Registry creation failed.';
            if (error.code === 'auth/email-already-in-use') msg = 'Email already in use.';
            toast({ variant: 'destructive', title: 'Initialization Error', description: msg });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isCongratulationActive && settings) {
        const SelectedIcon = iconMap[settings.welcomePopupIcon as keyof typeof iconMap] || PartyPopper;
        const bgColor = settings.welcomePopupBgColor || '#ffffff';
        const textColor = settings.welcomePopupTextColor || '#000000';
        const iconColor = settings.welcomePopupIconColor || '#3b82f6';

        return (
            <div 
                className="fixed inset-0 z flex flex-col items-center justify-center animate-in fade-in duration-500" 
                style={{ backgroundColor: bgColor }}
            >
                {settings.welcomePopupImageUrl && (
                    <div className="absolute top-0 left-0 w-full h-1/3 overflow-hidden">
                        <Image src={settings.welcomePopupImageUrl} alt="" fill className="object-cover" unoptimized />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                )}

                <div className="relative px-8 flex flex-col items-center text-center space-y-8 max-w-sm" style={{ color: textColor }}>
                    <div className="size-24 rounded flex items-center justify-center  animate-bounce border-4 border-white/10" style={{ backgroundColor: `${iconColor}15` }}>
                        <SelectedIcon className="size-12" style={{ color: iconColor }} strokeWidth={3} />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">
                            {settings.welcomePopupTitle || 'Welcome!'}
                        </h2>
                        <p className="text-base font-medium opacity-80 leading-relaxed px-2">
                            {settings.welcomePopupMessage}
                        </p>
                    </div>

                    {activeBonus > 0 && (
                        <div className="w-full pt-4">
                            <div className="p-8 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md">
                                <p className="text font-black uppercase tracking opacity-50 mb-2">Initial Credit Verified</p>
                                <p className="text-5xl font-black tracking-tighter" style={{ color: iconColor }}>
                                    {formatCurrency(activeBonus, settings.currency || '$')}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="pt-8 w-full">
                        <Button 
                            onClick={() => onNavigate('home')} 
                            className="w-full h-18 rounded font-black uppercase text-xs tracking  transition-all active:scale-95"
                        >
                            Enter Storefront <ArrowRight className="ml-3 h-5 w-5" strokeWidth={3} />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-black animate-in slide-in-from-right-4 duration-500">
            <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-black/80 backdrop-blur-md px-4 py-6 justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-slate-800  border border-slate-100 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                    >
                        <ArrowLeft className="h-5 w-5" strokeWidth={3} />
                    </button>
                    <h1 className="text-xl font-black leading-tight tracking-tighter uppercase">Registration</h1>
                </div>
            </header>

            <ScrollArea className="flex-1">
                <div className="px-6 pt-12 pb-32 space-y-10">
                    <div className="space-y-3 text-center">
                        <div className="inline-flex items-center gap-2 font-black text uppercase tracking text-primary bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Secure Registry
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Join Now</h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w mx-auto">Create your digital profile to unlock global discovery.</p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            <div className="space-y-6">
                                <h3 className="text font-black uppercase text-primary tracking ml-1">Identity Protocol</h3>
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text font-black uppercase text-slate-400 tracking-widest ml-1">Full Name</FormLabel>
                                        <div className="relative">
                                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <Input {...field} placeholder="Legal Identity" className="h-14 pl-12 rounded-2xl border-none  font-bold bg-white dark:bg-slate-800 focus-visible:ring-primary/20" />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text font-black uppercase text-slate-400 tracking-widest ml-1">Registry Email</FormLabel>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <Input {...field} type="email" placeholder="name@example.com" className="h-14 pl-12 rounded-2xl border-none  font-bold bg-white dark:bg-slate-800 focus-visible:ring-primary/20" />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="space-y-6">
                                <h3 className="text font-black uppercase text-primary tracking ml-1">Security Protocol</h3>
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text font-black uppercase text-slate-400 tracking-widest ml-1">Master Passcode</FormLabel>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Secure Code" className="h-14 pl-12 pr-12 rounded-2xl border-none  font-bold bg-white dark:bg-slate-800 focus-visible:ring-primary/20" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text font-black uppercase text-slate-400 tracking-widest ml-1">Confirm Protocol</FormLabel>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Repeat Code" className="h-14 pl-12 rounded-2xl border-none  font-bold bg-white dark:bg-slate-800 focus-visible:ring-primary/20" />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="space-y-6">
                                <h3 className="text font-black uppercase text-primary tracking ml-1">Logistics & Regional</h3>
                                <div className="grid grid-cols-1 gap-6">
                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text font-black uppercase text-slate-400 tracking-widest ml-1">Phone String</FormLabel>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                                <Input {...field} type="tel" placeholder="+1..." className="h-14 pl-12 rounded-2xl border-none  font-bold bg-white dark:bg-slate-800 focus-visible:ring-primary/20" />
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="gender" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text font-black uppercase text-slate-400 tracking-widest ml-1">Identify As</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-14 rounded-2xl border-none  font-bold bg-white dark:bg-slate-800 focus:ring-primary/20">
                                                        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" /><SelectValue placeholder="Select Gender" /></div>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Male">Male</SelectItem>
                                                    <SelectItem value="Female">Female</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                    <SelectItem value="Prefer not to say">Private</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <FormField control={form.control} name="country" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text font-black uppercase text-slate-400 tracking-widest ml-1">Territory</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-14 rounded-2xl border-none  font-bold bg-white dark:bg-slate-800 focus:ring-primary/20">
                                                    <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-slate-400" /><SelectValue placeholder="Select Country" /></div>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <ScrollArea className="h-72">
                                                    {regions.map(r => <SelectItem key={r.code} value={r.name}>{r.name}</SelectItem>)}
                                                </ScrollArea>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text font-black uppercase text-slate-400 tracking-widest ml-1">Default Fulfillment Destination</FormLabel>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                                            <Textarea {...field} placeholder="Full street address..." className="min-h pl-12 pt-4 rounded border-none  font-bold bg-white dark:bg-slate-800 resize-none focus-visible:ring-primary/20" />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="pt-6">
                                <Button 
                                    type="submit" 
                                    disabled={isProcessing} 
                                    className="w-full h-16 rounded bg-primary text-white font-black uppercase text-xs tracking   group active:scale transition-all"
                                >
                                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Authorize Initialization'}
                                    {!isProcessing && <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={3} />}
                                </Button>
                                
                                <div className="pt-8 text-center">
                                    <p className="text font-bold text-slate-400 uppercase tracking-widest">
                                        Already a member? 
                                        <button onClick={() => onNavigate('login')} type="button" className="text-primary font-black ml-2 hover:underline">Log In</button>
                                    </p>
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>
            </ScrollArea>
        </div>
    );
}
