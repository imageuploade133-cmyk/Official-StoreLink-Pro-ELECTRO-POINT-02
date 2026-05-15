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
  const watchConfirmPassword = resetForm.watch('confirmPassword');

  useEffect(() => {
    setPasswordStrength(calculateStrength(watchPassword || ''));
  }, [watchPassword]);

  const passwordsMatch = watchPassword && watchConfirmPassword && watchPassword === watchConfirmPassword;

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
    
    return (
      <div className="flex gap-1.5 mt-2 px-0.5">
        {bars.map((bar) => (
          <div 
            key={bar}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-500 ease-out",
              bar <= passwordStrength 
                ? passwordStrength <= 2 ? "bg-red-400" : passwordStrength <= 4 ? "bg-amber-400" : "bg-emerald-400"
                : "bg-muted/40"
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
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border border-black/5 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-[2rem] bg-background/80 backdrop-blur-2xl transition-all duration-500 animate-in fade-in zoom-in-95">
        <div className="relative p-8 pt-10 overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          
          <div className="flex justify-center mb-6 relative z-10">
            <div className="w-16 h-16 bg-primary/10 rounded-[1.25rem] flex items-center justify-center shadow-sm ring-1 ring-primary/20 transition-all duration-700 hover:rotate-[360deg]">
              {step === 'request' && <Mail className="w-7 h-7 text-primary" />}
              {step === 'sent' && <Mail className="w-7 h-7 text-primary" />}
              {step === 'reset' && <Lock className="w-7 h-7 text-primary" />}
              {step === 'success' && <CheckCircle2 className="w-7 h-7 text-emerald-500" />}
            </div>
          </div>

          <DialogHeader className="text-center relative z-10 space-y-2">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {step === 'request' && "Reset Password"}
              {step === 'sent' && "Check Email"}
              {step === 'reset' && "New Password"}
              {step === 'success' && "All Set!"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80 text-sm leading-relaxed px-2">
              {step === 'request' && "Enter your email to receive a secure reset link."}
              {step === 'sent' && `A secure link has been sent to ${emailForReset}.`}
              {step === 'reset' && "Choose a strong password for your account."}
              {step === 'success' && "Your password has been updated. You can now sign in."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-8 pb-10 relative">
          {step === 'request' && (
            <form onSubmit={forgotForm.handleSubmit(handleSendLink)} className="space-y-6">
              <div className="space-y-2">
                <div className="relative group">
                  <Input
                    {...forgotForm.register('email')}
                    id="email"
                    type="email"
                    placeholder="Email address"
                    className="h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all text-sm placeholder:text-muted-foreground/50"
                    disabled={isLoading}
                  />
                </div>
                {forgotForm.formState.errors.email && (
                  <p className="text-[11px] font-medium text-destructive px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                    {forgotForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl font-medium text-sm transition-all active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          )}

          {step === 'sent' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-secondary/20 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground/80">
                  Didn&apos;t get it? Check your spam or try again in a few minutes.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  className="w-full h-12 rounded-xl font-medium" 
                  onClick={() => onOpenChange(false)}
                >
                  Done
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-primary transition-colors" 
                  onClick={() => setStep('request')}
                >
                  Resend Link
                </Button>
              </div>
            </div>
          )}

          {step === 'reset' && (
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-5">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    {...resetForm.register('password')}
                    id="password-reset"
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    className="h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all text-sm pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {renderStrengthBar()}
                
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">Strength</span>
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    passwordStrength <= 2 ? "text-red-400" : 
                    passwordStrength <= 4 ? "text-amber-400" : "text-emerald-500"
                  )}>
                    {getStrengthText()}
                  </span>
                </div>

                {resetForm.formState.errors.password && (
                  <p className="text-[11px] font-medium text-destructive px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                    {resetForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    {...resetForm.register('confirmPassword')}
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    className={cn(
                      "h-12 rounded-xl bg-secondary/30 border-transparent focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all text-sm",
                      passwordsMatch && "border-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-500/5"
                    )}
                    disabled={isLoading}
                  />
                  {passwordsMatch && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500 animate-in zoom-in duration-300" />
                    </div>
                  )}
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-[11px] font-medium text-destructive px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl font-medium text-sm mt-4 transition-all active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl p-6 text-center border border-emerald-100 dark:border-emerald-500/10">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  Your security is our priority. Your password has been updated successfully.
                </p>
              </div>
              <Button 
                className="w-full h-12 rounded-xl font-medium transition-all active:scale-[0.98]" 
                onClick={() => onOpenChange(false)}
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
