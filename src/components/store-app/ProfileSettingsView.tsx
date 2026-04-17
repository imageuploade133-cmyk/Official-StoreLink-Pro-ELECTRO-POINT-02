'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    UserCircle, 
    ArrowLeft, 
    Save, 
    Loader2, 
    Lock, 
    ShieldCheck, 
    Phone, 
    MapPin, 
    Mail,
    CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { UserProfile } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const profileSchema = z.object({
  name: z.string().min(2, 'Identity requires a longer name.'),
  email: z.string().email(),
  deliveryAddress: z.string().min(10, 'Full address protocol required.'),
  alternativePhoneNumber: z.string().min(5, 'Valid contact number required.'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Verification required.'),
  newPassword: z.string().min(6, 'Security requires 6+ characters.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Confirmation mismatch.",
  path: ['confirmPassword'],
});

interface ProfileSettingsViewProps {
    onClose: () => void;
}

export function ProfileSettingsView({ onClose }: ProfileSettingsViewProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const userProfileRef = React.useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const profileForm = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: { name: '', email: '', deliveryAddress: '', alternativePhoneNumber: '' }
    });

    const passForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
    });

    useEffect(() => {
        if (user && userProfile) {
            profileForm.reset({
                name: user.displayName || userProfile.displayName || '',
                email: user.email || '',
                deliveryAddress: userProfile.deliveryAddress || '',
                alternativePhoneNumber: userProfile.alternativePhoneNumber || '',
            });
        }
    }, [user, userProfile, profileForm]);

    const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
        if (!user || !firestore) return;
        setIsSavingProfile(true);
        try {
            const profileUpdates: Partial<UserProfile> = {};
            if (user.displayName !== values.name) {
                await updateProfile(user, { displayName: values.name });
                profileUpdates.displayName = values.name;
            }
            if (userProfile?.deliveryAddress !== values.deliveryAddress) profileUpdates.deliveryAddress = values.deliveryAddress;
            if (userProfile?.alternativePhoneNumber !== values.alternativePhoneNumber) profileUpdates.alternativePhoneNumber = values.alternativePhoneNumber;

            if (Object.keys(profileUpdates).length > 0) {
                await setDoc(doc(firestore, 'users', user.uid), profileUpdates, { merge: true });
                toast({ title: 'Profile Synchronized' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
        if (!user || !user.email) return;
        setIsSavingPassword(true);
        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
        try {
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, values.newPassword);
            toast({ title: 'Security Protocol Updated' });
            passForm.reset();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Verification Failed', description: 'Current credentials invalid.' });
        } finally {
            setIsSavingPassword(false);
        }
    };

    if (isProfileLoading) return <div className="p-10 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>;

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
                    <h1 className="text-xl font-black leading-tight tracking-tighter uppercase">Identity</h1>
                </div>
            </header>

            <ScrollArea className="flex-1 px-6 pb-32">
                <div className="py-8 space-y-10">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Account Profile</h2>
                        <p className="text-sm font-medium text-slate-500">Manage your digital identity and delivery protocols.</p>
                    </div>

                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                            <Card className="rounded-[2.5rem]  border-none ring-1 ring-slate-100 dark:ring-slate-800">
                                <CardHeader className="bg-muted/20 pb-6">
                                    <CardTitle className="text-lg uppercase font-black tracking-tight flex items-center gap-3">
                                        <UserCircle className="h-5 w-5 text-primary" /> Basic Identity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-8 space-y-6">
                                    <FormField control={profileForm.control} name="name" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Legal Name</FormLabel>
                                            <FormControl><Input {...field} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={profileForm.control} name="email" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Registry Email</FormLabel>
                                            <FormControl><Input {...field} disabled className="h-14 rounded-2xl bg-muted/50 border-none shadow-none font-bold opacity-60" /></FormControl>
                                            <FormDescription className="text-[8px] font-bold uppercase tracking-widest px-1">Email changes require support validation.</FormDescription>
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <Card className="rounded-[2.5rem]  border-none ring-1 ring-slate-100 dark:ring-slate-800">
                                <CardHeader className="bg-muted/20 pb-6">
                                    <CardTitle className="text-lg uppercase font-black tracking-tight flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-primary" /> Delivery Logistics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-8 space-y-6">
                                    <FormField control={profileForm.control} name="alternativePhoneNumber" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contact Protocol</FormLabel>
                                            <FormControl><Input type="tel" {...field} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold" placeholder="+1..." /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={profileForm.control} name="deliveryAddress" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Master Fulfillment Address</FormLabel>
                                            <FormControl><Textarea {...field} className="min-h-[120px] rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold resize-none py-4" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                                <CardFooter className="pb-8 px-8">
                                    <Button type="submit" disabled={isSavingProfile} className="w-full h-14 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] ">
                                        {isSavingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 mr-3" />}
                                        Synchronize Profile
                                    </Button>
                                </CardFooter>
                            </Card>
                        </form>
                    </Form>

                    <Separator className="border-dashed" />

                    <Form {...passForm}>
                        <form onSubmit={passForm.handleSubmit(onPasswordSubmit)}>
                            <Card className="rounded-[2.5rem]  border-none ring-1 ring-slate-100 dark:ring-slate-800">
                                <CardHeader className="bg-muted/20 pb-6">
                                    <CardTitle className="text-lg uppercase font-black tracking-tight flex items-center gap-3">
                                        <Lock className="h-5 w-5 text-primary" /> Security Layer
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-8 space-y-6">
                                    <FormField control={passForm.control} name="currentPassword" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Current Verification</FormLabel>
                                            <FormControl><Input type="password" {...field} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={passForm.control} name="newPassword" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">New Security Phrase</FormLabel>
                                            <FormControl><Input type="password" {...field} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={passForm.control} name="confirmPassword" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Confirm Shift</FormLabel>
                                            <FormControl><Input type="password" {...field} className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                                <CardFooter className="pb-8 px-8">
                                    <Button type="submit" disabled={isSavingPassword} variant="secondary" className="w-full h-14 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] ">
                                        {isSavingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5 mr-3" />}
                                        Update Credentials
                                    </Button>
                                </CardFooter>
                            </Card>
                        </form>
                    </Form>
                </div>
            </ScrollArea>
        </div>
    );
}
