"use client";
import React from "react";
import Image from "next/image" 
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { StoreLinkLogo } from "@/components/icons";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Store as StoreIcon, Plus, ArrowRight, ChevronRight } from "lucide-react";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
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
        return <PageSpinner label="StoreLink Pro" subLabel="Verifying your credentials…" />;
    }

    const isSelectingStore = user && (stores.length === 0 || (stores.length > 1 && !store)) && !staffMember && !isCustomer;

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#fafafa] dark:bg-black selection:bg-blue-500/30 font-sans">
            <div className="absolute top-8 right-8">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-[400px] px-6 py-12">
                <div className="flex flex-col items-center mb-10">
                    <div className="mb-6 rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-sm border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-700">
                        <StoreLinkLogo className="h-10 w-10 text-[#0071e3]" />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {isSelectingStore ? "Welcome Back" : "Sign in to StoreLink"}
                    </h1>
                    <p className="mt-3 text-center text-zinc-500 dark:text-zinc-400 font-medium">
                        {isSelectingStore 
                            ? "Choose a workspace to continue." 
                            : "Enter your credentials to access your dashboard."}
                    </p>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    {isSelectingStore ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                {stores.map((s) => (
                                    <button 
                                        key={s.id} 
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#0071e3] hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group text-left" 
                                        onClick={() => setSelectedStoreId(s.id)}
                                    >
                                        <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-[#0071e3] transition-all duration-300">
                                            <StoreIcon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#0071e3] transition-colors">{s.name}</div>
                                            <div className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold mt-0.5">ID: {s.id.slice(0, 8)}</div>
                                        </div>
                                        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-[#0071e3] transition-all">
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="pt-4 space-y-3">
                                <Button asChild className="w-full h-12 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-black dark:hover:bg-white font-semibold transition-all">
                                    <Link href="/signup-merchant">
                                        <Plus className="mr-2 h-4 w-4" />
                                        New Workspace
                                    </Link>
                                </Button>
                                <Button variant="ghost" onClick={() => signOut(auth)} className="w-full h-12 text-zinc-500 hover:text-red-500 font-semibold rounded-xl transition-colors">
                                    Sign out of {user.email}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    required
                                    className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all bg-white dark:bg-zinc-900"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</Label>
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotPassOpen(true)}
                                        className="text-xs text-[#0071e3] hover:underline font-medium"
                                    >
                                        Forgot?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Input 
                                        id="password" 
                                        type={showPassword ? "text" : "password"} 
                                        required 
                                        placeholder="••••••••" 
                                        className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-[#0071e3]/20 focus:border-[#0071e3] transition-all bg-white dark:bg-zinc-900" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-1">
                                <Checkbox id="remember" className="rounded-md border-zinc-300 dark:border-zinc-700 data-[state=checked]:bg-[#0071e3] data-[state=checked]:border-[#0071e3]" />
                                <Label htmlFor="remember" className="text-sm text-zinc-500 dark:text-zinc-400 cursor-pointer">
                                    Keep me signed in
                                </Label>
                            </div>

                            <Button type="submit" className="w-full h-12 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold transition-all shadow-sm group mt-2" disabled={isLoading}>
                                {isLoading ? (
                                    <Spinner size="sm" className="text-white" />
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Sign In
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                    </span>
                                )}
                            </Button>

                            <div className="pt-6 text-center">
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Don&apos;t have a store?{" "}
                                    <Link href="/signup-merchant" className="text-[#0071e3] font-semibold hover:underline">Get started</Link>
                                </p>
                            </div>
                        </form>
                    )}
                </div>

                <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-900 text-center">
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 font-medium uppercase tracking-[0.1em]">
                        StoreLink Pro &bull; Institutional Grade Commerce
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
