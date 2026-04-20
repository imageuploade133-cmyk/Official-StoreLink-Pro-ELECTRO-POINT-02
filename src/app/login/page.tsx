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

import "./../auth.css";
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
            <div className="auth-page-wrapper">
                <div className="auth-wrapper">
                    <div className="auth-card">
                        <div className="logo">
                            <ElysiumLogo className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="auth-title">
                            {stores.length > 0 ? "Select a Store" : "No Store Found"}
                        </h1>
                        <p className="auth-subtitle">
                            {stores.length > 0 
                                ? "You have multiple stores under this account." 
                                : "You are logged in as " + (user.email || "your account") + " but don't have a store yet."}
                        </p>
                        <div className="social-grid">
                            {stores.map((s) => (
                                <button 
                                    key={s.id} 
                                    className="btn-social !h-auto !py-4 flex items-center justify-start px-6" 
                                    onClick={() => setSelectedStoreId(s.id)}
                                >
                                    <StoreIcon className="mr-4 h-5 w-5 text-primary" />
                                    <div className="text-left">
                                        <div className="font-bold">{s.name}</div>
                                        <div className="text-[10px] uppercase tracking-wider opacity-70">DB: {s.databaseId || '(default)'}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        {stores.length > 0 && (
                            <div className="divider">or</div>
                        )}
                        <Button asChild className="btn-primary flex items-center justify-center">
                            <Link href="/signup-merchant">
                                <Plus className="mr-2 h-4 w-4" />
                                Create a New Store
                            </Link>
                        </Button>
                        <div className="footer-note">
                             <button onClick={() => signOut(auth)} className="hover:underline text-muted-foreground">
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
    <div className="auth-page-wrapper">
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="logo">
             <ElysiumLogo className="h-8 w-8 text-white" />
          </div>
          <h1 className="auth-title">Staff Portal</h1>
          <p className="auth-subtitle">Sign in to access the dashboard</p>
          
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

            <button type="submit" className="btn-primary" disabled={isLoading}>
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
            Don&apos;t have a store yet?{" "}
            <Link href="/signup-merchant">Create one now</Link>
          </div>
          <div className="mt-8 text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Powered By Ads Developments Inc.
          </div>
        </div>
      </div>
    </div>
  )
}
