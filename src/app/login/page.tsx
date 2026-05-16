"use client";
import React from "react";

import Image from "next/image" 
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StoreLinkLogo } from "@/components/icons";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Store as StoreIcon, Plus, ChevronRight, ArrowRight, ShieldCheck } from "lucide-react";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import placeholderImages from '@/lib/placeholder-images.json';
import { useAuth as useFirebaseAuthInstance } from "@/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

import { ThemeToggle } from "@/components/theme-toggle";
import { ResetPasswordModal } from "@/components/auth/ResetPasswordModal";
import { cn } from "@/lib/utils";

export default function AdminLoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const loginImage = "https://emakemrnd.com.ng/storelink%20bg%20logo1.png";

    const searchParams = useSearchParams();
    const oobCode = searchParams.get('oobCode');
    const [isForgotPassOpen, setIsForgotPassOpen] = useState(!!oobCode);
    const [showPassword, setShowPassword] = useState(false);

    const auth = useFirebaseAuthInstance();
    const router = useRouter();
    const { user, store, stores, setSelectedStoreId, staffMember, isCustomer, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && user) {
          if (stores.length > 1 && !store) {
            // Stay here to select store
          } else if (store || staffMember) {
            router.replace('/dashboard');
          } else if (isCustomer) {
            router.replace('/store/account');
          } else if (stores.length === 1) {
             setSelectedStoreId(stores[0].id);
             router.replace('/dashboard');
          }
        }
    }, [user, isAuthLoading, store, stores, staffMember, isCustomer, router, setSelectedStoreId]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const email = (document.getElementById('email') as HTMLInputElement).value.trim();
        const password = (document.getElementById('password') as HTMLInputElement).value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast({
                title: "Welcome back",
                description: "Opening your dashboard...",
            });
        } catch (error: any) {
            let description = "An unknown error occurred. Please try again.";
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                description = "Invalid email or password. Please try again.";
            } else if (error.message) {
                 description = error.message;
            }
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: description,
            });
            setIsLoading(false);
        }
    }

    if (isAuthLoading) {
        return <PageSpinner label="Staff Portal" subLabel="Verifying your credentials…" />;
    }

    const isSelectingStore = user && (stores.length === 0 || (stores.length > 1 && !store)) && !staffMember && !isCustomer;

    return (
        <div className="flex min-h-screen w-full bg-white dark:bg-[#09090b] selection:bg-[#0071e3]/30">
            {/* Left side - Luxury Branding */}
            <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center overflow-hidden bg-[#fbfbfd] dark:bg-[#09090b]">
                {/* Refined background elements */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#0071e3]/5 blur-[120px] dark:bg-[#0071e3]/10"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#0071e3]/5 blur-[120px] dark:bg-[#0071e3]/10"></div>
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                </div>
                
                <div className="relative z-10 w-full max-w-4xl px-12 flex flex-col items-center justify-center">
                    {/* Floating Navigation/Header on Left Side */}
                    <div className="absolute top-12 left-12 flex items-center gap-3 group cursor-pointer">
                        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-2xl shadow-xl shadow-black/5 border border-zinc-100 dark:border-zinc-800 transition-transform group-hover:scale-110 duration-500">
                            <StoreLinkLogo className="h-6 w-6 text-[#0071e3]" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-[#1d1d1f] dark:text-white">StoreLink Pro</span>
                    </div>

                    <div className="relative w-full aspect-square max-w-[540px] animate-in fade-in zoom-in duration-1000 ease-out">
                        <div className="absolute inset-0 bg-[#0071e3]/5 rounded-full blur-3xl opacity-50 scale-75 animate-pulse"></div>
                        <Image
                            src={loginImage}
                            alt="StoreLink Pro Branding"
                            fill
                            className="object-contain drop-shadow-[0_32px_64px_rgba(0,113,227,0.15)] z-10"
                            priority
                        />
                    </div>

                    <div className="mt-12 text-center space-y-6 max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 text-[#0071e3] text-xs font-bold tracking-widest uppercase mb-2">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Enterprise Grade Solution
                        </div>
                        <h2 className="text-5xl font-extrabold text-[#1d1d1f] dark:text-white leading-[1.1] tracking-tight">
                            Elevate Your <span className="text-[#0071e3] relative">Commerce<span className="absolute -bottom-2 left-0 w-full h-1 bg-[#0071e3]/20 rounded-full"></span></span> Experience.
                        </h2>
                        <p className="text-[#86868b] text-xl font-medium leading-relaxed">
                            A masterfully crafted ecosystem for modern merchants to thrive in a digital world.
                        </p>
                        
                        <div className="flex items-center justify-center gap-8 pt-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#1d1d1f] dark:text-white">99.9%</div>
                                <div className="text-[10px] uppercase tracking-widest text-[#86868b] font-bold">Uptime</div>
                            </div>
                            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#1d1d1f] dark:text-white">24/7</div>
                                <div className="text-[10px] uppercase tracking-widest text-[#86868b] font-bold">Support</div>
                            </div>
                            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#1d1d1f] dark:text-white">256-bit</div>
                                <div className="text-[10px] uppercase tracking-widest text-[#86868b] font-bold">Encryption</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Action Area */}
            <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-6 sm:p-12 relative bg-white dark:bg-[#09090b]">
                <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
                    <ThemeToggle />
                </div>

                <div className="w-full max-w-[440px] flex flex-col">
                    <div className="mb-10 text-center lg:text-left flex flex-col lg:items-start items-center">
                        <div className="flex justify-center mb-8 lg:hidden">
                            <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800">
                                <StoreLinkLogo className="h-10 w-10 text-[#0071e3]" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-[#1d1d1f] dark:text-white mb-3">
                            {isSelectingStore ? "Welcome Home" : "Staff Portal"}
                        </h1>
                        <p className="text-[#86868b] text-base font-medium">
                            {isSelectingStore 
                                ? "Select your workspace to begin your session." 
                                : "Enter your credentials to access your control panel."}
                        </p>
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {isSelectingStore ? (
                            <div className="space-y-4">
                                <div className="grid gap-3">
                                    {stores.map((s, index) => (
                                        <button 
                                            key={s.id} 
                                            className="w-full flex items-center gap-4 p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-[#0071e3]/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] dark:hover:shadow-none transition-all duration-500 group relative overflow-hidden" 
                                            style={{ animationDelay: `${index * 100}ms` }}
                                            onClick={() => setSelectedStoreId(s.id)}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#0071e3]/0 via-[#0071e3]/5 to-[#0071e3]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                                            <div className="h-12 w-12 rounded-2xl bg-[#0071e3]/5 dark:bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3] transition-transform group-hover:scale-110 duration-500">
                                                <StoreIcon className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-[#1d1d1f] dark:text-white text-lg leading-tight truncate">{s.name}</div>
                                                <div className="text-[10px] uppercase tracking-[0.15em] text-[#86868b] mt-1 font-bold">Store ID: {s.id}</div>
                                            </div>
                                            <div className="h-10 w-10 rounded-full flex items-center justify-center text-zinc-300 dark:text-zinc-600 group-hover:text-[#0071e3] group-hover:bg-[#0071e3]/10 transition-all duration-300">
                                                <ArrowRight className="h-5 w-5" />
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8 space-y-4">
                                    <Button asChild className="w-full h-14 rounded-2xl bg-[#1d1d1f] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 font-bold transition-all active:scale-[0.98] shadow-xl shadow-black/5">
                                        <Link href="/signup-merchant">
                                            <Plus className="mr-2 h-5 w-5" />
                                            Register New Store
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => signOut(auth)} className="w-full h-12 text-[#86868b] hover:text-[#0071e3] font-bold hover:bg-[#0071e3]/5 rounded-2xl">
                                        Sign out of {user.email}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-bold text-[#1d1d1f] dark:text-zinc-400 uppercase tracking-[0.15em] ml-1">Email Identity</Label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-zinc-400 group-focus-within:text-[#0071e3] transition-colors duration-300" />
                                        </div>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="identity@storelink.pro"
                                            required
                                            className="h-14 pl-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:border-transparent transition-all duration-300 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <Label htmlFor="password" className="text-xs font-bold text-[#1d1d1f] dark:text-zinc-400 uppercase tracking-[0.15em]">Security Key</Label>
                                        <button
                                            type="button"
                                            onClick={() => setIsForgotPassOpen(true)}
                                            className="text-xs text-[#0066cc] hover:text-[#0071e3] font-bold transition-colors"
                                        >
                                            Reset Key?
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-zinc-400 group-focus-within:text-[#0071e3] transition-colors duration-300" />
                                        </div>
                                        <Input 
                                            id="password" 
                                            type={showPassword ? "text" : "password"} 
                                            required 
                                            placeholder="••••••••" 
                                            className="h-14 pl-12 pr-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:border-transparent transition-all duration-300 font-medium" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full h-14 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold transition-all active:scale-[0.98] shadow-2xl shadow-[#0071e3]/20 group" disabled={isLoading}>
                                    {isLoading ? (
                                        <Spinner size="sm" className="mr-2" />
                                    ) : (
                                        <>
                                            Sign In
                                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>

                                <div className="mt-12 text-center">
                                    <p className="text-sm text-[#86868b] font-medium">
                                        New to the platform?{" "}
                                        <Link href="/signup-merchant" className="text-[#0066cc] font-bold hover:underline underline-offset-4">Join our network</Link>
                                    </p>
                                </div>
                            </form>
                        )}
                        
                        <div className="mt-16 flex flex-col items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800"></div>
                                <span className="text-[10px] text-[#86868b] font-bold uppercase tracking-[0.25em]">Security Verified</span>
                                <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800"></div>
                            </div>
                            <p className="text-[10px] text-[#86868b] font-bold uppercase tracking-[0.2em] text-center">
                                Powered by <span className="text-[#1d1d1f] dark:text-white">StoreLink Pro</span> Global Systems
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <ResetPasswordModal 
                isOpen={isForgotPassOpen} 
                onOpenChange={setIsForgotPassOpen} 
                oobCode={oobCode}
            />
        </div>
    );
}
