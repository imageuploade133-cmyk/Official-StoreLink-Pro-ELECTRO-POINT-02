"use client";
import React from "react";

import Image from "next/image" 
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StoreLinkLogo } from "@/components/icons";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Store as StoreIcon, Plus, ChevronRight } from "lucide-react";
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
        <div className="flex min-h-screen w-full bg-[#fbfbfd] dark:bg-[#121214]">
            {/* Left side - Branding & Image */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-[#0071e3]/5 items-center justify-center overflow-hidden border-r border-[#d2d2d7]/30">
                <div className="absolute inset-0 z-0 opacity-40 dark:opacity-20 bg-[radial-gradient(#0071e3_1px,transparent_1px)] [background-size:32px_32px]"></div>
                
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-12 text-center">
                    <div className="absolute top-12 left-12 flex items-center gap-2">
                        <StoreLinkLogo className="h-8 w-8 text-[#0071e3]" />
                        <span className="font-bold text-xl tracking-tight text-[#1d1d1f] dark:text-white">StoreLink Pro</span>
                    </div>

                    <div className="relative w-full aspect-square max-w-[500px] animate-in fade-in zoom-in duration-1000">
                        <Image
                            src={loginImage}
                            alt="StoreLink Pro Branding"
                            fill
                            className="object-contain drop-shadow-2xl"
                            priority
                        />
                    </div>

                    <div className="mt-8 max-w-md">
                        <h2 className="text-3xl font-bold text-[#1d1d1f] dark:text-white mb-4">
                            One Platform. <br/>
                            <span className="text-[#0071e3]">Infinite Possibilities.</span>
                        </h2>
                        <p className="text-[#86868b] text-lg">
                            The ultimate POS and e-commerce solution for modern merchants.
                        </p>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#0071e3] rounded-full blur-[120px] opacity-20"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#0071e3] rounded-full blur-[120px] opacity-10"></div>
            </div>

            {/* Right side - Action Area */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 relative">
                <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
                    <ThemeToggle />
                </div>

                <div className="w-full max-w-[460px] animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {isSelectingStore ? (
                        <div className="bg-white dark:bg-[#1d1d1f] rounded-[2.5rem] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.08)] border border-[#d2d2d7]/30">
                            <div className="text-center mb-10">
                                <div className="flex justify-center mb-6 lg:hidden">
                                    <StoreLinkLogo className="h-12 w-12 text-[#0071e3]" />
                                </div>
                                <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white mb-2">
                                    {stores.length > 0 ? "Select a Store" : "No Store Found"}
                                </h1>
                                <p className="text-[#86868b] text-sm">
                                    {stores.length > 0 
                                        ? "Choose the store you want to manage today." 
                                        : "You don't have any stores yet. Create your first one to get started."}
                                </p>
                            </div>

                            <div className="space-y-3">
                                {stores.map((s) => (
                                    <button 
                                        key={s.id} 
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#2d2d2f] hover:bg-[#f0f0f2] dark:hover:bg-[#3d3d3f] transition-all duration-300 group text-left border border-transparent hover:border-[#0071e3]/20" 
                                        onClick={() => setSelectedStoreId(s.id)}
                                    >
                                        <div className="h-10 w-10 rounded-xl bg-white dark:bg-[#1d1d1f] flex items-center justify-center shadow-sm text-[#0071e3]">
                                            <StoreIcon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-[#1d1d1f] dark:text-white truncate">{s.name}</div>
                                            <div className="text-[10px] uppercase tracking-widest text-[#86868b]">Store ID: {s.id}</div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-[#d2d2d7] group-hover:text-[#0071e3] transition-colors" />
                                    </button>
                                ))}

                                <div className="pt-4 space-y-3">
                                    <Button asChild variant="outline" className="w-full h-12 rounded-full font-semibold border-[#d2d2d7] hover:bg-[#f5f5f7]">
                                        <Link href="/signup-merchant">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create New Store
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => signOut(auth)} className="w-full text-[#86868b] hover:text-[#0071e3]">
                                        Sign out of {user.email}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#1d1d1f] rounded-[2.5rem] p-10 shadow-[0_20px_80px_rgba(0,0,0,0.08)] border border-[#d2d2d7]/30">
                            <div className="text-center mb-10">
                                <div className="flex justify-center mb-6 lg:hidden">
                                    <StoreLinkLogo className="h-12 w-12 text-[#0071e3]" />
                                </div>
                                <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white mb-2">Staff Portal</h1>
                                <p className="text-[#86868b] text-sm">Sign in to manage your commerce empire.</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-semibold text-[#86868b] uppercase tracking-wider ml-1">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d2d2d7]" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="email@example.com"
                                            required
                                            className="h-12 pl-11 rounded-xl bg-[#f5f5f7] dark:bg-[#2d2d2f] border-none focus-visible:ring-2 focus-visible:ring-[#0071e3] transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <Label htmlFor="password" className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">Password</Label>
                                        <button
                                            type="button"
                                            onClick={() => setIsForgotPassOpen(true)}
                                            className="text-xs text-[#0066cc] hover:underline font-medium"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d2d2d7]" />
                                        <Input 
                                            id="password" 
                                            type={showPassword ? "text" : "password"} 
                                            required 
                                            placeholder="Required" 
                                            className="h-12 pl-11 pr-11 rounded-xl bg-[#f5f5f7] dark:bg-[#2d2d2f] border-none focus-visible:ring-2 focus-visible:ring-[#0071e3] transition-all" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#d2d2d7] hover:text-[#86868b] transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full h-12 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold transition-all active:scale-95 shadow-lg shadow-[#0071e3]/20" disabled={isLoading}>
                                    {isLoading ? <Spinner size="sm" className="mr-2" /> : "Sign In"}
                                </Button>
                            </form>

                            <div className="mt-10 text-center">
                                <p className="text-sm text-[#86868b]">
                                    Don&apos;t have a store?{" "}
                                    <Link href="/signup-merchant" className="text-[#0066cc] font-semibold hover:underline">Start for free</Link>
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <p className="mt-8 text-center text-[11px] text-[#86868b] font-medium uppercase tracking-[0.2em]">
                        Powered by StoreLink Pro
                    </p>
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
