'use client';

import Image from "next/image"
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StoreLinkLogo } from "@/components/icons";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import placeholderImages from '@/lib/placeholder-images.json';
import { useAuth as useFirebaseAuth } from "@/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken, AuthError } from "firebase/auth";
import { useSettings } from "@/contexts/settings-context";
import { useStoreUrl } from "@/hooks/use-store-url";
import { ResetPasswordModal } from "@/components/auth/ResetPasswordModal";

export default function StoreLoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const loginImagePlaceholder = placeholderImages['login-background'];

    const searchParams = useSearchParams();
    const oobCode = searchParams.get('oobCode');
    const [isForgotPassOpen, setIsForgotPassOpen] = useState(!!oobCode);
    const [showPassword, setShowPassword] = useState(false);

    const auth = useFirebaseAuth();
    const router = useRouter();
    const { user, store, staffMember, isCustomer, isLoading: isAuthLoading } = useAuth();
    const { settings, isLoading: isLoadingSettings } = useSettings();
    const { getStoreUrl } = useStoreUrl();

    const storeName = settings?.storeName || 'Welcome';
    const storeLogo = settings?.invoiceLogoUrl;
    const storeDescription = settings?.footerDescription || 'The ultimate all-in-one solution for managing your e-commerce business with unparalleled efficiency and insight.';
    const loginImage = settings?.loginImageUrl || loginImagePlaceholder.src;
    useEffect(() => {
        // Handle redirect reactively based on auth state
        if (!isAuthLoading && user) {
          if (isCustomer) {
            router.replace(getStoreUrl('/store/account'));
          } else if (store || staffMember) {
            router.replace('/dashboard');
          } else {
            // Probably a new merchant
            router.replace('/signup-merchant');
          }
        }
    }, [user, isAuthLoading, isCustomer, store, staffMember, router, getStoreUrl]);

    const handleLogin = (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const email = (document.getElementById('email') as HTMLInputElement).value.trim();
        const password = (document.getElementById('password') as HTMLInputElement).value;

        fetch('/api/auth/customer/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                storeId: settings?.store_id || 'global',
            }),
        })
        .then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            return signInWithCustomToken(auth, data.customToken);
        })
        .then(() => {
            toast({
                title: "Login Successful",
                description: "Redirecting to your account...",
            });
        })
        .catch((error: any) => {
            let description = error.message || "An unknown error occurred. Please try again.";
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                description = "Invalid email or password. Please try again.";
            }
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: description,
            });
        })
        .finally(() => {
            setIsLoading(false);
        });
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

    if (isAuthLoading || isLoadingSettings) {
        return <PageSpinner label="Welcome Back" subLabel="Loading your store experience…" />;
    }

    if (user) {
        return <PageSpinner label="Welcome Back" subLabel="Redirecting to your account…" />;
    }

  return (
    <div className="w-full min-h-screen grid lg:grid-cols-2">
      <div className="hidden bg-muted lg:block relative">
        <Image
          src={loginImage}
          alt="A beautiful storefront"
          {...(loginImage === loginImagePlaceholder.src && { 'data-ai-hint': loginImagePlaceholder.hint })}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-10 left-10 text-white p-6">
            <h2 className="text-4xl font-bold font-headline break-words max-w-md leading-tight">{storeName}</h2>
            <p className="text-white/80 mt-2 max-w-lg">
                {storeDescription}
            </p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <div className="flex justify-center mb-4 h-10">
                {storeLogo ? (
                    <Image src={storeLogo} alt={storeName} width={40} height={40} className="h-10 w-auto object-contain" />
                ) : (
                    <StoreLinkLogo className="h-10 w-10 text-primary" />
                )}
            </div>
            <h1 className="text-4xl font-bold font-headline">Welcome Back</h1>
            <p className="text-balance text-muted-foreground">
              Sign in to your account to view your orders and manage your profile.
            </p>
          </div>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <button
                    type="button"
                    onClick={() => setIsForgotPassOpen(true)}
                    className="ml-auto inline-block text-sm text-muted-foreground hover:underline"
                >
                    Forgot your password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} required placeholder="Password" className="pl-10 pr-10" />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                </button>
              </div>
            </div>
            <Button type="submit" style={buttonStyle} className="w-full border-none font-bold" disabled={isLoading}>
                {isLoading && <Spinner size="sm" className="mr-2 text-primary-foreground" />}
              Login
            </Button>
            <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href={getStoreUrl('/store/signup')} className="underline text-primary">
                    Sign up
                </Link>
            </div>
          </form>
        </div>
      </div>
      <ResetPasswordModal 
        isOpen={isForgotPassOpen} 
        onOpenChange={setIsForgotPassOpen} 
        oobCode={oobCode}
      />
    </div>
  )
}
