
'use client';

import Image from "next/image" 
import Link from "next/link";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ElysiumLogo } from "@/components/icons";
import { useState, useEffect } from "react";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
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
import { useAuth as useFirebaseAuthInstance, useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail, AuthError, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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
    const { user, isLoading: isUserLoading } = useUser();

    useEffect(() => {
        const checkForRedirect = async () => {
          if (!isUserLoading && user && firestore) {
            // Direct lookup by ID is faster and more secure for UID-based records
            const customerRef = doc(firestore, "customers", user.uid);
            const customerSnap = await getDoc(customerRef);
            
            if(!customerSnap.exists()) {
                router.replace('/dashboard');
            } else {
                // If a customer tries to access the admin portal, sign them out
                await signOut(auth);
                toast({
                    variant: "destructive",
                    title: "Access Denied",
                    description: "This portal is for authorized staff only.",
                });
            }
          }
        };
        checkForRedirect();
    }, [user, isUserLoading, router, firestore, auth, toast]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const email = (document.getElementById('email') as HTMLInputElement).value;
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

    if (isUserLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (user) {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

  return (
    <div className="w-full min-h-screen grid lg:grid-cols-2">
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
                                {isResetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground font-bold">
            Powered By Ads Developments Inc.
          </div>
        </div>
      </div>
    </div>
  )
}
