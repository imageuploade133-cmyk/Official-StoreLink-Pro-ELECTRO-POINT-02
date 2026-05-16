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
import { Mail, Lock, Eye, EyeOff, Store as StoreIcon, Plus, ChevronRight, ArrowRight, ShieldCheck, CheckCircle2, Globe, Sparkles } from "lucide-react";
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
        <div className="flex min-h-screen w-full bg-slate-50 dark:bg-[#09090b] selection:bg-blue-500/30 font-sans">
            {/* Left side - Luxury Branding Area */}
            <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative overflow-hidden bg-[#050505]">
                {/* Dynamic Background */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[100px]"></div>
                    <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[80px]"></div>
                    
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, #ffffff10 1px, transparent 0)`, backgroundSize: '32px 32px' }}></div>
                </div>

                <div className="relative z-10 flex flex-col justify-between w-full h-full p-16 text-white">
                    {/* Header */}
                    <div className="flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl">
                            <StoreLinkLogo className="h-7 w-7 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tight text-white/90">StoreLink Pro</span>
                    </div>

                    {/* Content */}
                    <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 delay-200">
                        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs font-bold tracking-widest uppercase mb-4">
                            <Sparkles className="h-4 w-4" />
                            The Future of Retail
                        </div>
                        <h2 className="text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight text-white">
                            Elevate your <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400">commerce</span> to art.
                        </h2>
                        <p className="text-white/50 text-xl xl:text-2xl font-medium leading-relaxed max-w-lg">
                            Empowering the world&apos;s most ambitious merchants with a masterfully crafted ecosystem.
                        </p>
                        
                        <div className="flex items-center gap-10 pt-8 border-t border-white/5">
                            <div className="space-y-1">
                                <div className="text-3xl font-bold text-white">99.9%</div>
                                <div className="text-xs text-white/30 font-bold uppercase tracking-widest">Uptime Guarantee</div>
                            </div>
                            <div className="w-px h-10 bg-white/10"></div>
                            <div className="space-y-1">
                                <div className="text-3xl font-bold text-white">256-bit</div>
                                <div className="text-xs text-white/30 font-bold uppercase tracking-widest">AES Encryption</div>
                            </div>
                        </div>
                    </div>

                    {/* Trust Elements */}
                    <div className="flex items-center gap-6 text-white/20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                        <Globe className="h-6 w-6" />
                        <ShieldCheck className="h-6 w-6" />
                        <CheckCircle2 className="h-6 w-6" />
                        <span className="text-xs font-bold tracking-[0.2em] uppercase">Verified Enterprise Platform</span>
                    </div>
                </div>

                {/* Background Branding Image */}
                <div className="absolute -right-20 bottom-10 w-[65%] h-[65%] opacity-20 blur-[2px] pointer-events-none select-none">
                     <Image
                        src={loginImage}
                        alt="Branding"
                        fill
                        className="object-contain"
                    />
                </div>
            </div>

            {/* Right side - Form Area */}
            <div className="w-full lg:w-[50%] xl:w-[45%] flex flex-col items-center justify-center p-8 sm:p-12 xl:p-20 relative bg-white dark:bg-[#09090b]">
                <div className="absolute top-8 right-8 z-50">
                    <ThemeToggle />
                </div>

                <div className="w-full max-w-[420px] space-y-10">
                    <div className="text-center lg:text-left space-y-3">
                        <div className="flex lg:hidden justify-center mb-10">
                            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-[2rem] border border-slate-100 dark:border-zinc-800 shadow-xl">
                                <StoreLinkLogo className="h-10 w-10 text-blue-600" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {isSelectingStore ? "Welcome Home" : "Staff Portal"}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                            {isSelectingStore 
                                ? "Choose your workspace to begin." 
                                : "Sign in to manage your commerce empire."}
                        </p>
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {isSelectingStore ? (
                            <div className="space-y-6">
                                <div className="grid gap-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                                    {stores.map((s, index) => (
                                        <button 
                                            key={s.id} 
                                            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800 hover:border-blue-500/40 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300 group text-left relative overflow-hidden" 
                                            onClick={() => setSelectedStoreId(s.id)}
                                        >
                                            <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-all duration-500">
                                                <StoreIcon className="h-7 w-7" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-900 dark:text-white text-lg truncate group-hover:text-blue-600 transition-colors">{s.name}</div>
                                                <div className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 mt-1 font-bold">Workspace ID: {s.id.slice(0, 8)}...</div>
                                            </div>
                                            <div className="h-10 w-10 rounded-full flex items-center justify-center text-slate-300 dark:text-zinc-700 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-all">
                                                <ArrowRight className="h-5 w-5" />
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="pt-6 space-y-4">
                                    <Button asChild className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 font-bold transition-all shadow-xl shadow-black/5 active:scale-[0.98]">
                                        <Link href="/signup-merchant">
                                            <Plus className="mr-2 h-5 w-5" />
                                            New Workspace
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" onClick={() => signOut(auth)} className="w-full h-12 text-slate-400 hover:text-red-500 font-bold rounded-2xl transition-colors">
                                        Sign out of {user.email}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-2.5">
                                    <Label htmlFor="email" className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest ml-1">Account Identity</Label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                        </div>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="identity@storelink.pro"
                                            required
                                            className="h-14 pl-12 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-100 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between ml-1">
                                        <Label htmlFor="password" className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Security Key</Label>
                                        <button
                                            type="button"
                                            onClick={() => setIsForgotPassOpen(true)}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors"
                                        >
                                            Reset Key?
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                        </div>
                                        <Input 
                                            id="password" 
                                            type={showPassword ? "text" : "password"} 
                                            required 
                                            placeholder="••••••••" 
                                            className="h-14 pl-12 pr-12 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/50 border-slate-100 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 dark:text-white" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between ml-1">
                                    <div className="flex items-center space-x-3">
                                        <Checkbox id="remember" className="h-5 w-5 rounded-md border-slate-200 dark:border-zinc-800 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                                        <Label htmlFor="remember" className="text-sm font-semibold text-slate-500 dark:text-zinc-400 cursor-pointer">
                                            Remember me
                                        </Label>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all active:scale-[0.98] shadow-2xl shadow-blue-500/20 group" disabled={isLoading}>
                                    {isLoading ? (
                                        <Spinner size="sm" className="text-white" />
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            Enter Dashboard
                                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    )}
                                </Button>

                                <div className="pt-8 text-center">
                                    <p className="text-sm text-slate-400 dark:text-zinc-500 font-medium">
                                        New to the ecosystem?{" "}
                                        <Link href="/signup-merchant" className="text-blue-600 font-bold hover:underline underline-offset-8">Join the network</Link>
                                    </p>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="pt-12 flex flex-col items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-px w-10 bg-slate-100 dark:bg-zinc-800"></div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-600 font-black uppercase tracking-[0.3em]">Institutional Grade</span>
                            <div className="h-px w-10 bg-slate-100 dark:bg-zinc-800"></div>
                        </div>
                        <p className="text-[10px] text-slate-300 dark:text-zinc-700 font-bold uppercase tracking-[0.15em] text-center max-w-[200px] leading-relaxed">
                            Secured by StoreLink Pro Global Infrastructure
                        </p>
                    </div>
                </div>
            </div>

            <ResetPasswordModal 
                isOpen={isForgotPassOpen} 
                onOpenChange={setIsForgotPassOpen} 
                oobCode={oobCode}
            />

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1f2937;
                }
            ` }} />
        </div>
    );
}
