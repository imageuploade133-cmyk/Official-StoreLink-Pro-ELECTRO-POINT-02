
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

import "../../auth.css";

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
    <div className="auth-page-wrapper">
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="logo overflow-hidden bg-white">
             {storeLogo ? (
                <Image src={storeLogo} alt={storeName} width={54} height={54} className="h-full w-full object-contain" />
             ) : (
                <div className="h-full w-full bg-[#111] flex items-center justify-center text-white">
                   <ElysiumLogo className="h-8 w-8" />
                </div>
             )}
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to {storeName}</p>
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <div className="input-wrap">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  required
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-group">
              <div className="input-wrap">
                <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    placeholder="Password" 
                    className="form-input" 
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="eye-btn"
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                </button>
              </div>
            </div>

            <div className="row">
              <label className="check">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <Dialog open={isForgotPassOpen} onOpenChange={setIsForgotPassOpen}>
                <DialogTrigger asChild>
                  <button
                      type="button"
                      onClick={() => setResetError('')}
                      className="link"
                  >
                      Forgot password?
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

            <button type="submit" className="btn-primary" style={buttonStyle} disabled={isLoading}>
                {isLoading && <Spinner size="sm" className="mr-2 text-white" />}
                Sign In
            </button>
          </form>

          <div className="divider">or</div>

          <div className="social-grid">
            <button className="btn-social" type="button">
                Continue with Google
            </button>
          </div>

          <div className="footer-note">
            Don&apos;t have an account?{" "}
            <Link href={getStoreUrl('/store/signup')}>Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
