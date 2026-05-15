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
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem]">
        <div className="bg-primary/5 p-8 border-b border-primary/10">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {step === 'request' && "Forgot Password?"}
              {step === 'sent' && "Check Your Email"}
              {step === 'reset' && "Reset Password"}
              {step === 'success' && "All Set!"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              {step === 'request' && "Enter your email address and we'll send you a link to reset your password."}
              {step === 'sent' && `We've sent a password reset link to ${emailForReset}.`}
              {step === 'reset' && "Create a new strong password for your account."}
              {step === 'success' && "Your password has been successfully reset. You can now sign in to your account."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8">
          {step === 'request' && (
            <form onSubmit={forgotForm.handleSubmit(handleSendLink)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold ml-1">Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    {...forgotForm.register('email')}
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-12 h-14 rounded-2xl bg-muted/50 border-transparent focus:bg-background transition-all"
                    disabled={isLoading}
                  />
                </div>
                {forgotForm.formState.errors.email && (
                  <p className="text-xs font-medium text-destructive mt-1 flex items-center gap-1 ml-1">
                    <AlertCircle className="h-3 w-3" /> {forgotForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Send Reset Link <ArrowRight className="ml-2 h-5 w-5" /></>
                )}
              </Button>
            </form>
          )}

          {step === 'sent' && (
            <div className="space-y-6 text-center">
              <div className="py-4 flex justify-center">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                  <Mail className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl" 
                  onClick={() => setStep('request')}
                >
                  Try again
                </Button>
                <Button 
                  className="flex-1 h-12 rounded-xl" 
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {step === 'reset' && (
            <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password-reset" className="text-sm font-semibold ml-1">New Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    {...resetForm.register('password')}
                    id="password-reset"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-12 pr-12 h-14 rounded-2xl bg-muted/50 border-transparent focus:bg-background transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {renderStrengthBar()}
                <div className="flex justify-between items-center mt-1 px-1">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Strength</p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    passwordStrength <= 2 ? "text-red-500" : 
                    passwordStrength <= 4 ? "text-blue-500" : "text-green-500"
                  )}>
                    {getStrengthText()}
                  </p>
                </div>
                {resetForm.formState.errors.password && (
                  <p className="text-xs font-medium text-destructive mt-1 flex items-center gap-1 ml-1">
                    <AlertCircle className="h-3 w-3" /> {resetForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold ml-1">Confirm New Password</Label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    {...resetForm.register('confirmPassword')}
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-12 h-14 rounded-2xl bg-muted/50 border-transparent focus:bg-background transition-all"
                    disabled={isLoading}
                  />
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-xs font-medium text-destructive mt-1 flex items-center gap-1 ml-1">
                    <AlertCircle className="h-3 w-3" /> {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl font-bold text-base mt-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="py-4 flex justify-center">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <Button 
                className="w-full h-14 rounded-2xl font-bold text-base" 
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
