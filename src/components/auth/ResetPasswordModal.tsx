'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  confirmPassword: z.string().min(6, 'Please confirm your password.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  oobCode?: string | null; // Out of band code from email link
}

export function ResetPasswordModal({
  isOpen,
  onOpenChange,
  initialEmail = '',
  oobCode = null,
}: ResetPasswordModalProps) {
  const auth = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'sent' | 'reset' | 'success'>(oobCode ? 'reset' : 'request');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailForReset, setEmailForReset] = useState(initialEmail);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const forgotForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: initialEmail },
  });

  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (isOpen) {
      if (oobCode) {
        setStep('reset');
      } else {
        setStep('request');
        forgotForm.reset({ email: initialEmail });
      }
      resetForm.reset();
      setIsLoading(false);
    }
  }, [isOpen, oobCode, initialEmail, forgotForm, resetForm]);

  const calculateStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 6) strength += 1;
    if (pass.length >= 10) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    return strength;
  };

  const watchPassword = resetForm.watch('password');
  useEffect(() => {
    setPasswordStrength(calculateStrength(watchPassword || ''));
  }, [watchPassword]);

  const handleSendLink = async (values: ForgotPasswordValues) => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setEmailForReset(values.email);
      setStep('sent');
      toast({
        title: "Reset link sent",
        description: "Check your email for instructions to reset your password.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset email.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (values: ResetPasswordValues) => {
    if (!oobCode) return;
    setIsLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, values.password);
      setStep('success');
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error.message || "Failed to reset password. The link may have expired.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStrengthBar = () => {
    const bars = [1, 2, 3, 4, 5];
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-blue-500',
      'bg-green-500'
    ];
    
    return (
      <div className="flex gap-1 mt-2">
        {bars.map((bar) => (
          <div 
            key={bar}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              bar <= passwordStrength ? colors[passwordStrength - 1] : "bg-muted"
            )}
          />
        ))}
      </div>
    );
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    if (passwordStrength <= 4) return 'Strong';
    return 'Very Strong';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border border-border/50 shadow-2xl rounded-[2.5rem] bg-background/95 backdrop-blur-xl">
        <div className="relative p-8 pt-10 border-b border-border/50 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          
          <div className="flex justify-center mb-6 relative z-10">
            <div className="p-4 bg-primary/10 rounded-3xl ring-8 ring-primary/5 shadow-xl transition-transform hover:scale-110 duration-500">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogHeader className="text-center relative z-10">
            <DialogTitle className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
              {step === 'request' && "Forgot Password?"}
              {step === 'sent' && "Check Your Email"}
              {step === 'reset' && "Reset Password"}
              {step === 'success' && "All Set!"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-3 text-base leading-relaxed">
              {step === 'request' && "Enter your email address and we'll send you a link to reset your password."}
              {step === 'sent' && `We've sent a password reset link to ${emailForReset}.`}
              {step === 'reset' && "Create a new strong password for your account."}
              {step === 'success' && "Your password has been successfully reset. You can now sign in to your account."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8 relative">
          {step === 'request' && (
            <form onSubmit={forgotForm.handleSubmit(handleSendLink)} className="space-y-6">
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-semibold ml-1 text-foreground/80">Email Address</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <Input
                    {...forgotForm.register('email')}
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-12 h-14 rounded-2xl bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-base"
                    disabled={isLoading}
                  />
                </div>
                {forgotForm.formState.errors.email && (
                  <p className="text-xs font-medium text-destructive mt-1.5 flex items-center gap-1.5 ml-1 animate-in slide-in-from-left-2 duration-300">
                    <AlertCircle className="h-3.5 w-3.5" /> {forgotForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] bg-primary hover:bg-primary/90 text-white" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>Send Reset Link <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" /></>
                )}
              </Button>
            </form>
          )}

          {step === 'sent' && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-500">
              <div className="py-4 flex justify-center">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-[2rem] flex items-center justify-center shadow-inner ring-8 ring-green-500/5">
                  <Mail className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed px-4">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 h-14 rounded-2xl border-border/50 hover:bg-muted/50 font-semibold" 
                  onClick={() => setStep('request')}
                >
                  Try again
                </Button>
                <Button 
                  className="flex-1 h-14 rounded-2xl font-bold" 
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {step === 'reset' && (
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="password-reset" className="text-sm font-semibold ml-1 text-foreground/80">New Password</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors flex items-center justify-center">
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    {...resetForm.register('password')}
                    id="password-reset"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-12 pr-12 h-14 rounded-2xl bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-base"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {renderStrengthBar()}
                <div className="flex justify-between items-center mt-2 px-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Security Strength</p>
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    passwordStrength <= 2 ? "text-red-500" : 
                    passwordStrength <= 4 ? "text-blue-500" : "text-green-500"
                  )}>
                    {getStrengthText()}
                  </p>
                </div>
                {resetForm.formState.errors.password && (
                  <p className="text-xs font-medium text-destructive mt-1.5 flex items-center gap-1.5 ml-1 animate-in slide-in-from-left-2 duration-300">
                    <AlertCircle className="h-3.5 w-3.5" /> {resetForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold ml-1 text-foreground/80">Confirm New Password</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <Input
                    {...resetForm.register('confirmPassword')}
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-12 h-14 rounded-2xl bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-base"
                    disabled={isLoading}
                  />
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-xs font-medium text-destructive mt-1.5 flex items-center gap-1.5 ml-1 animate-in slide-in-from-left-2 duration-300">
                    <AlertCircle className="h-3.5 w-3.5" /> {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl font-bold text-lg mt-4 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] bg-primary hover:bg-primary/90 text-white" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-500">
              <div className="py-4 flex justify-center">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-[2rem] flex items-center justify-center shadow-inner ring-8 ring-green-500/5">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <Button 
                className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all" 
                onClick={() => onOpenChange(false)}
              >
                Back to Login
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
