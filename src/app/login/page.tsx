
'use client';

import Image from "next/image" 
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ElysiumLogo } from "@/components/icons";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Store as StoreIcon, Plus } from "lucide-react";
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
import { useAuth as useFirebaseAuthInstance, useFirestore } from "@/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail, AuthError, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminLoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const loginImage = placeholderImages['login-background'];

    const [isResetLoading, setIsResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');
    const [isForgotPassOpen, setIsForgotPassOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const auth = useFirebaseAuthInstance();
    const firestore = useFirestore();
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
          } else {
            router.replace('/signup-merchant');
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
                title: "Login Successful",
                description: "Redirecting to the dashboard...",
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

    const handlePasswordReset = (e: React.FormEvent) => {
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

    if (isAuthLoading) {
        return <PageSpinner label="Staff Portal" subLabel="Verifying your credentials…" />;
    }

    if (user && stores.length > 1 && !store) {
        return (
            <div className="w-full min-h-screen grid lg:grid-cols-2 relative">
                <div className="absolute top-4 right-4 z-50">
                    <ThemeToggle />
                </div>
                <div className="hidden bg-muted lg:block relative">
                    <Image
                        src={loginImage.src}
                        alt="A beautiful storefront"
                        fill
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-10 left-10 text-white">
                        <h2 className="text-4xl font-bold font-headline">StoreLink-Pro</h2>
                        <p className="text-white/80 mt-2 max-w-lg">
                            Select the store you want to manage.
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-center py-12 px-4">
                    <div className="mx-auto grid w-[350px] gap-6">
                        <div className="grid gap-2 text-center">
                            <div className="flex justify-center mb-4">
                                <ElysiumLogo className="h-10 w-10 text-primary" />
                            </div>
                            <h1 className="text-4xl font-bold font-headline">Select a Store</h1>
                            <p className="text-balance text-muted-foreground text-sm">
                                You have multiple stores under this account.
                            </p>
                        </div>
                        <div className="grid gap-3">
                            {stores.map((s) => (
                                <Button 
                                    key={s.id} 
                                    variant="outline" 
                                    className="h-auto py-4 justify-start px-6 border-2 hover:border-primary/50 transition-all" 
                                    onClick={() => setSelectedStoreId(s.id)}
                                >
                                    <StoreIcon className="mr-4 h-5 w-5 text-primary" />
                                    <div className="text-left">
                                        <div className="font-bold">{s.name}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground opacity-70">DB: {s.databaseId || '(default)'}</div>
                                    </div>
                                </Button>
                            ))}
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                                </div>
                            </div>
                            <Button asChild variant="secondary" className="h-12 border-2">
                                <Link href="/signup-merchant">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create a New Store
                                </Link>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => signOut(auth)} className="mt-4 text-muted-foreground">
                                Sign out of {user.email}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (user && store) {
        return <PageSpinner label="Staff Portal" subLabel="Redirecting to dashboard…" />;
    }

  return (
    <div className="w-full min-h-screen grid lg:grid-cols-2 relative">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="hidden bg-muted lg:block relative">
        <Image
          src={loginImage.src}
          alt="A beautiful storefront"
          data-ai-hint={loginImage.hint}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-10 left-10 text-white">
            <h2 className="text-4xl font-bold font-headline">StoreLink-Pro</h2>
            <p className="text-white/80 mt-2 max-w-lg">
                The ultimate all-in-one solution for managing your e-commerce business with unparalleled efficiency and insight.
            </p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <div className="flex justify-center mb-4">
                <ElysiumLogo className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold font-headline">Staff Portal</h1>
            <p className="text-balance text-muted-foreground">
              Please sign in to access the dashboard.
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
            <Button type="submit" className="w-full border-2 border-border dark:border-border hover:border-primary/75" disabled={isLoading}>
                {isLoading && <Spinner size="sm" className="mr-2 text-primary-foreground" />}
              Login
            </Button>
          </form>
          <div className="text-center text-sm">
            Don&apos;t have a store yet?{" "}
            <Link href="/signup-merchant" className="underline text-primary font-bold">Create one now</Link>
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground font-bold">
            Powered By Ads Developments Inc.
          </div>
        </div>
      </div>
    </div>
  )
}
