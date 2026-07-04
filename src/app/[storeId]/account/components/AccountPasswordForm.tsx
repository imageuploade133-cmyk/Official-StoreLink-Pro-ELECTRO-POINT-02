'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, type User } from 'firebase/auth';
import { Loader2, Eye, EyeOff, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/firebase';
import { cn } from '@/lib/utils';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface PasswordChangeFormProps {
  user: User;
}

export function AccountPasswordForm({ user }: PasswordChangeFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { toast } = useToast();
  const auth = useAuth();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const calculateStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 6) strength += 1;
    if (pass.length >= 10) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    return strength;
  };

  const watchNewPassword = form.watch('newPassword');
  useEffect(() => {
    setPasswordStrength(calculateStrength(watchNewPassword || ''));
  }, [watchNewPassword]);

  const onSubmit = async (values: PasswordFormValues) => {
    setIsSaving(true);
    if (!user.email) {
        toast({ variant: 'destructive', title: 'Error', description: 'User email not found.' });
        setIsSaving(false);
        return;
    }
    const credential = EmailAuthProvider.credential(user.email, values.currentPassword);

    try {
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, values.newPassword);
      toast({ title: 'Success', description: 'Your password has been changed.' });
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.code === 'auth/wrong-password' ? 'The current password you entered is incorrect.' : error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStrengthBar = () => {
    const bars = [1, 2, 3, 4, 5];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
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
    <Card className="border-none shadow-lg ring-1 ring-border overflow-hidden">
      <CardHeader className="bg-muted/10 border-b">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account security credentials.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold ml-1">Current Password</FormLabel>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <FormControl>
                        <Input 
                            type={showPassword ? "text" : "password"} 
                            {...field} 
                            disabled={isSaving} 
                            className="pl-11 h-12 rounded-xl bg-muted/30 border-transparent focus:bg-background transition-all"
                            placeholder="Current password"
                        />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4 pt-2">
                <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="font-semibold ml-1">New Password</FormLabel>
                    <div className="relative group">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <FormControl>
                            <Input 
                                type={showPassword ? "text" : "password"} 
                                {...field} 
                                disabled={isSaving} 
                                className="pl-11 pr-11 h-12 rounded-xl bg-muted/30 border-transparent focus:bg-background transition-all"
                                placeholder="Min. 6 characters"
                            />
                        </FormControl>
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="font-semibold ml-1">Confirm New Password</FormLabel>
                    <div className="relative group">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <FormControl>
                            <Input 
                                type={showPassword ? "text" : "password"} 
                                {...field} 
                                disabled={isSaving} 
                                className="pl-11 h-12 rounded-xl bg-muted/30 border-transparent focus:bg-background transition-all"
                                placeholder="Repeat new password"
                            />
                        </FormControl>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-4">
            <Button type="submit" loading={isSaving} className="w-full sm:w-auto h-11 px-8 rounded-xl font-bold shadow-md shadow-primary/10 active:scale-95 transition-all">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Update Password
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
