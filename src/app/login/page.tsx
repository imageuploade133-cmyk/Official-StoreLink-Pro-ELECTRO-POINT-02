"use client";
import React from "react";


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
import "../auth-custom.css";
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
    const [mascotIndex, setMascotIndex] = useState(0);
    const mascotMessages = ['👋', '✨', '🎉', '💪', '🌟'];

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
            // Break the redirect loop from signup page
            // If user is logged in but has no stores/staff record, let them stay on this page 
            // to either sign out or click the 'Create a New Store' button.
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

    if (user && (stores.length === 0 || (stores.length > 1 && !store)) && !staffMember && !isCustomer) {
        return (
            <div className="login-body">
                <div className="bg-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                </div>

                <div className="login-container-custom">
                    <div className="login-card-custom">
                        <div 
                            className="mascot-custom" 
                            title="Hi there! 👋"
                            onClick={() => setMascotIndex((mascotIndex + 1) % mascotMessages.length)}
                        >
                            {mascotMessages[mascotIndex]}
                        </div>

                        <div className="brand-custom">
                            <div className="logo-container-custom">
                                <div className="logo-custom">
                                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="white"/>
                                    </svg>
                                </div>
                                <span className="sparkle sparkle-1">✨</span>
                                <span className="sparkle sparkle-2">⭐</span>
                            </div>
                            <h1>
                                {stores.length > 0 ? "Select a Store" : "No Store Found"}
                            </h1>
                            <p>
                                {stores.length > 0 
                                    ? "You have multiple stores under this account." 
                                    : "You are logged in as " + (user.email || "your account") + " but don't have a store yet."}
                            </p>
                        </div>
                        <div className="grid gap-3">
                            {stores.map((s) => (
                                <button 
                                    key={s.id} 
                                    className="social-btn-custom w-full justify-start px-6" 
                                    onClick={() => setSelectedStoreId(s.id)}
                                >
                                    <StoreIcon className="mr-4 h-5 w-5 text-primary" />
                                    <div className="text-left">
                                        <div className="font-bold">{s.name}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground opacity-70">DB: {s.databaseId || '(default)'}</div>
                                    </div>
                                </button>
                            ))}
                            {stores.length > 0 && (
                                <div className="divider-custom">
                                    <span>Or</span>
                                </div>
                            )}
                            <Link href="/signup-merchant" className="btn-login-custom flex items-center justify-center no-underline">
                                <Plus className="mr-2 h-4 w-4" />
                                Create a New Store
                            </Link>
                            <button onClick={() => signOut(auth)} className="social-btn-custom w-full">
                                Sign out of {user.email || "account"}
                            </button>
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
    <div className="login-body">
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="login-container-custom">
        <div className="login-card-custom">
          <div 
            className="mascot-custom" 
            title="Hi there! 👋"
            onClick={() => setMascotIndex((mascotIndex + 1) % mascotMessages.length)}
          >
            {mascotMessages[mascotIndex]}
          </div>

          <div className="brand-custom">
            <div className="logo-container-custom">
              <div className="logo-custom">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="white"/>
                </svg>
              </div>
              <span className="sparkle sparkle-1">✨</span>
              <span className="sparkle sparkle-2">⭐</span>
            </div>
            <h1>Welcome back! 👋</h1>
            <p>We're so happy to see you again. Let's get you signed in.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group-custom">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper-custom">
                <Mail className="input-icon-custom" size={20} />
                <input 
                  type="email" 
                  id="email" 
                  placeholder="you@example.com" 
                  required 
                  autoComplete="email" 
                />
                <span className="validation-icon-custom valid">✓</span>
                <span className="validation-icon-custom invalid">✕</span>
              </div>
            </div>

            <div className="form-group-custom">
              <div className="flex items-center justify-between">
                <label htmlFor="password">Password</label>
              </div>
              <div className="input-wrapper-custom">
                <Lock className="input-icon-custom" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  placeholder="Enter your password" 
                  required 
                  autoComplete="current-password" 
                  minLength={6} 
                />
                <button 
                  type="button" 
                  className="password-toggle-custom" 
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="options-custom">
              <label className="remember-custom">
                <input type="checkbox" defaultChecked />
                <span className="custom-checkbox-custom"></span>
                <span>Remember me</span>
              </label>
              
              <Dialog open={isForgotPassOpen} onOpenChange={setIsForgotPassOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setResetError('')}
                    className="forgot-custom"
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

            <button 
              type="submit" 
              className={`btn-login-custom ${isLoading ? 'loading' : ''}`} 
              disabled={isLoading}
            >
              Sign In
            </button>
          </form>

          <div className="divider-custom">
            <span>or continue with</span>
          </div>

          <div className="social-login-custom">
            <button className="social-btn-custom" onClick={() => toast({ title: "Connecting to Google..." })} type="button">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button className="social-btn-custom" onClick={() => toast({ title: "Connecting to Apple..." })} type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Apple
            </button>
          </div>

          <div className="signup-link-custom">
            New here? <Link href="/signup-merchant">Create an account</Link>
          </div>
          <div className="mt-8 text-center text-xs text-muted-foreground font-bold">
            Powered By Ads Developments Inc.
          </div>
        </div>
      </div>
    </div>
  )
}
