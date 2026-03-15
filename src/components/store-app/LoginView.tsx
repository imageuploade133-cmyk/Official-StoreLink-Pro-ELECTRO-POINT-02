'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    ArrowLeft, 
    Loader2, 
    CheckCircle2, 
    ChevronRight,
    ShoppingBag
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/settings-context';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email('Enter a valid registry email.'),
  password: z.string().min(1, 'Security code required.'),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginViewProps {
    onClose: () => void;
    onNavigate: (tab: string) => void;
}

export function LoginView({ onClose, onNavigate }: LoginViewProps) {
    const auth = useFirebaseAuth();
    const { toast } = useToast();
    const { settings } = useSettings();
    const [showPassword, setShowPassword] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' }
    });

    const onSubmit = async (values: LoginValues) => {
        setIsProcessing(true);
        try {
            await signInWithEmailAndPassword(auth, values.email, values.password);
            toast({ title: 'Authentication Successful', description: 'Welcome back to the collection.' });
            onNavigate('home');
        } catch (error: any) {
            let msg = 'Internal security protocol failed.';
            if (error.code === 'auth/invalid-credential') msg = 'Email or security code invalid.';
            toast({ variant: 'destructive', title: 'Access Denied', description: msg });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-6 pt-12 pb-8 space-y-10">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={onClose} 
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-800 active:scale-90 transition-all"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div className="bg-primary/5 p-2 rounded-xl">
                        <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                </div>

                <div className="space-y-3 text-center">
                    <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Welcome Back</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Access your curated registry and orders.</p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-primary tracking-[0.2em] ml-1">Registry Email</FormLabel>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input {...field} type="email" placeholder="name@example.com" className="h-14 pl-12 rounded-2xl border-none shadow-xl font-bold bg-white dark:bg-slate-800 focus-visible:ring-primary/20" />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <FormLabel className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Security Code</FormLabel>
                                    <button type="button" className="text-[8px] font-black uppercase text-slate-400 tracking-widest hover:text-primary">Recovery?</button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input 
                                        {...field} 
                                        type={showPassword ? 'text' : 'password'} 
                                        placeholder="Enter your password" 
                                        className="h-14 pl-12 pr-12 rounded-2xl border-none shadow-xl font-bold bg-white dark:bg-slate-800 focus-visible:ring-primary/20" 
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                                    </button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="pt-4 space-y-6">
                            <Button 
                                type="submit" 
                                disabled={isProcessing} 
                                className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 group active:scale-[0.98] transition-all"
                            >
                                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Authorize Session'}
                                {!isProcessing && <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={3} />}
                            </Button>

                            <div className="flex items-center gap-4 py-4">
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">or Join Now</span>
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                            </div>

                            <Button 
                                type="button" 
                                onClick={() => onNavigate('signup')} 
                                variant="outline" 
                                className="w-full h-14 rounded-2xl border-2 border-primary/10 bg-white dark:bg-slate-800 font-black uppercase text-[10px] tracking-[0.25em] transition-all active:scale-[0.98]"
                            >
                                Create Digital Profile
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}
