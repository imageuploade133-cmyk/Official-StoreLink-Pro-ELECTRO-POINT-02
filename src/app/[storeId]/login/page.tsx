
'use client';

import Image from "next/image"
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ElysiumLogo } from "@/components/icons";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import placeholderImages from '@/lib/placeholder-images.json';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth as useFirebaseAuth, useUser } from "@/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail, AuthError } from "firebase/auth";
import { useSettings } from "@/contexts/settings-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreUrl } from "@/hooks/use-store-url";

export default function StoreLoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const loginImagePlaceholder = placeholderImages['login-background'];

    const [isResetLoading, setIsResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');
    const [isForgotPassOpen, setIsForgotPassOpen] = useState(false);
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
    }, [user, isAuthLoading, isCustomer, store, staffMember, router]);

    const handleLogin = (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const email = (document.getElementById('email') as HTMLInputElement).value.trim();
        const password = (document.getElementById('password') as HTMLInputElement).value;

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                toast({
                    title: "Login Successful",
                    description: "Redirecting to your account...",
                });
                // Redirection is handled by the useEffect watching the 'user' object
            })
            .catch((error: AuthError) => {
                let description = "An unknown error occurred. Please try again.";
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

    const handlePasswordReset = (e: FormEvent) => {
        e.preventDefault();
        setResetError('');
        setIsResetLoading(true);

        const email = (document.getElementById('reset-email') as HTMLInputElement).value;
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            setResetError('Please enter a valid email address.');
            setIsResetLoading(false);
            return;
        }

        sendPasswordResetEmail(auth, email)
            .then(() => {
                toast({
                    title: "Password Reset Link Sent",
                    description: `If an account with that email exists, a reset link has been sent.`,
                });
                setIsForgotPassOpen(false);
            })
            .catch((error: AuthError) => {
                setResetError(error.message);
            })
            .finally(() => {
                setIsResetLoading(false);
            });
    }

    const buttonStyle = useMemo(() => {
        const style = settings?.storeBtnStyle || 'standard';
        const primaryColor = settings?.storeBtnColor || '#3b82f6';
        
        if (style === 'gradient') {
          return {
            background: `linear-gradient(to right, ${settings?.storeBtnGradientStart || '#3b82f6'}, ${settings?.storeBtnGradientEnd || '#1d4ed8'})`,
            color: 'white',
            border: 'none'
          };
        }

        if (style === 'glass') {
          return {
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(12px)',
            color: primaryColor,
            border: '1px solid rgba(255, 255, 255, 0.5)'
          };
        }

        if (style === 'outline') {
          return {
            backgroundColor: 'transparent',
            color: primaryColor,
            border: `2px solid ${primaryColor}`
          };
        }

        if (style === 'ghost') {
          return {
            backgroundColor: 'transparent',
            color: primaryColor,
            border: 'none'
          };
        }

        return {
          backgroundColor: primaryColor,
          color: 'white',
          border: 'none'
        };
    }, [settings]);

    const buttonShapeClass = useMemo(() => {
        const shape = settings?.storeBtnShape || 'md';
        switch (shape) {
          case 'none': return 'rounded-none';
          case 'sm': return 'rounded-sm';
          case 'md': return 'rounded-md';
          case 'lg': return 'rounded-2xl';
          case 'full': return 'rounded-full';
          default: return 'rounded-md';
        }
    }, [settings?.storeBtnShape]);

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
                    <ElysiumLogo className="h-10 w-10 text-primary" />
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
                <Dialog open={isForgotPassOpen} onOpenChange={setIsForgotPassOpen}>
                  <DialogTrigger asChild>
                    <button
                        type="button"
                        onClick={() => setResetError('')}
                        className="ml-auto inline-block text-sm text-muted-foreground hover:underline"
                    >
                        Forgot your password?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <form onSubmit={handlePasswordReset}>
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                          <DialogDescription>
                            Enter your email and we'll send a link to get back into your account.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="reset-email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="reset-email"
                                        type="email"
                                        placeholder="name@example.com"
                                        required
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            {resetError && <p className="text-sm font-medium text-destructive">{resetError}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsForgotPassOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isResetLoading}>
                                {isResetLoading && <Spinner size="sm" className="mr-2 text-primary-foreground" />}
                                Send reset link
                            </Button>
                        </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
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
            <Button type="submit" style={buttonStyle} className={cn("w-full border-none font-bold", buttonShapeClass)} disabled={isLoading}>
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
    </div>
  )
}
