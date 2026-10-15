'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
import { doc } from 'firebase/firestore';
import type { EmailProviderSettings as EmailProviderSettingsType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Mail, Send, Eye, EyeOff, Info, ShieldCheck } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const emailProviderSchema = z.object({
  provider: z.enum(['brevo', 'resend', 'smtp', 'email_gateway']),
  apiKey: z.string().min(1, { message: "API Key or Config is required." }),
  senderName: z.string().min(1, { message: "Sender name is required." }),
  senderEmail: z.string().email({ message: "Please enter a valid sender email." }),
  apiBaseUrl: z.string().url({ message: "Please enter a valid API URL." }).optional().or(z.literal('')),
  testEmail: z.string().email({ message: "Please enter a valid test email." }).optional().or(z.literal('')),
  enabled: z.boolean().default(false),
});

type FormValues = z.infer<typeof emailProviderSchema>;

interface EmailProviderSettingsProps {
  storeId?: string | null;
}

export function EmailProviderSettings({ storeId }: EmailProviderSettingsProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const notificationsRef = React.useMemo(() => {
    if (!firestore) return null;
    if (!storeId || storeId === 'global') {
        return doc(firestore, 'settings', 'notifications');
    }
    return doc(firestore, 'stores', storeId, 'settings', 'notifications');
  }, [firestore, storeId]);

  const { data: settingsData, isLoading } = useDoc<EmailProviderSettingsType>(notificationsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(emailProviderSchema),
    defaultValues: {
      provider: 'email_gateway',
      apiKey: '',
      senderName: '',
      senderEmail: '',
      apiBaseUrl: 'https://whatsapp-b5os.onrender.com',
      testEmail: '',
      enabled: false,
    },
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        provider: settingsData.provider || 'email_gateway',
        apiKey: settingsData.maskedKey || '',
        senderName: settingsData.senderName || '',
        senderEmail: settingsData.senderEmail || '',
        apiBaseUrl: settingsData.apiBaseUrl || 'https://whatsapp-b5os.onrender.com',
        testEmail: form.getValues('testEmail') || '',
        enabled: settingsData.enabled || false,
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to save settings.' });
      return;
    }

    const targetStoreId = storeId || 'global';
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/settings/email/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ ...values, storeId: targetStoreId }),
      });
      const result = await response.json();
      if (response.ok) {
        toast({ title: 'Saved Successfully', description: 'Your email provider settings have been updated.' });
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send a test email.' });
      return;
    }

    const values = form.getValues();
    if (!values.testEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a test email address.' });
      return;
    }
    
    const targetStoreId = storeId || 'global';
    setIsSendingTest(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ ...values, storeId: targetStoreId }),
      });
      const result = await response.json();
      if (response.ok) {
        toast({ title: 'Test Email Sent', description: `A test email has been sent to ${values.testEmail}.` });
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Email Delivery Failed', 
          description: result.error || 'Failed to send test email. Please check your settings.' 
        });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-3xl" />;
  }

  const isConfigured = !!settingsData?.apiKeyEncrypted;

  return (
    <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-white dark:bg-card">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="pb-6 border-b border-gray-100 dark:border-border/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                          <Mail className="h-6 w-6 text-blue-500"/> Email Channel Setup
                      </CardTitle>
                      <Badge className="bg-blue-600 text-white font-bold text-xs rounded-full px-3">
                        Global Email API
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                        Select your preferred email service provider to send customer order receipts, notifications, and marketing broadcasts.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-4 bg-white dark:bg-card p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-border/50">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold">Enable Email Channel</p>
                      <p className="text-[10px] text-muted-foreground">{form.watch('enabled') ? 'Active globally' : 'Disabled'}</p>
                    </div>
                    <FormField
                        control={form.control}
                        name="enabled"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Switch 
                                        checked={field.value} 
                                        onCheckedChange={field.onChange} 
                                        className="data-[state=checked]:bg-blue-600"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-8 px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-semibold">Email Provider</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="rounded-2xl h-12 bg-gray-50/50 dark:bg-muted/50 border-gray-100 dark:border-border/50">
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="email_gateway">WhatsAPI Hub REST Email Gateway</SelectItem>
                                    <SelectItem value="brevo">Brevo (Sendinblue)</SelectItem>
                                    <SelectItem value="resend">Resend</SelectItem>
                                    <SelectItem value="smtp">Custom SMTP</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-semibold">
                                {form.watch('provider') === 'smtp' ? 'SMTP Config (JSON)' : 'API Key (x-api-key)'}
                            </FormLabel>
                            <div className="relative flex items-center w-full">
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        type={showApiKey ? "text" : "password"}
                                        placeholder={form.watch('provider') === 'smtp' ? '{"host":"...","port":465,...}' : "Enter your x-api-key"}
                                        className="rounded-2xl h-12 bg-gray-50/50 dark:bg-muted/50 border-gray-100 dark:border-border/50 pr-12 w-full"
                                    />
                                </FormControl>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-600 focus:outline-none z-10"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                >
                                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <FormDescription className="text-xs">
                                {form.watch('provider') === 'smtp' 
                                    ? 'JSON: {"host":"...","port":465,"user":"...","pass":"..."}' 
                                    : 'Your secret API key will be encrypted and sent as x-api-key header.'}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {form.watch('provider') === 'email_gateway' && (
                    <FormField
                        control={form.control}
                        name="apiBaseUrl"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel className="font-semibold">Email API Gateway Base URL</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="https://whatsapp-b5os.onrender.com"
                                        className="rounded-2xl h-12 bg-gray-50/50 dark:bg-muted/50 border-gray-100 dark:border-border/50"
                                    />
                                </FormControl>
                                <FormDescription className="text-xs">
                                    Base REST Endpoint URL for dispatching /api/email/send, /api/email/send-template, and /api/email/otp
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                    control={form.control}
                    name="senderName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-semibold">Sender Name</FormLabel>
                            <FormControl>
                                <Input 
                                    {...field} 
                                    placeholder="Your Store Name" 
                                    className="rounded-2xl h-12 bg-gray-50/50 dark:bg-muted/50 border-gray-100 dark:border-border/50"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="senderEmail"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-semibold">Sender Email</FormLabel>
                            <FormControl>
                                <Input 
                                    {...field} 
                                    placeholder="noreply@yourdomain.com" 
                                    className="rounded-2xl h-12 bg-gray-50/50 dark:bg-muted/50 border-gray-100 dark:border-border/50"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="md:col-span-2 pt-4">
                    <Separator className="opacity-50" />
                </div>

                <FormField
                    control={form.control}
                    name="testEmail"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-semibold">Test Email Address</FormLabel>
                            <div className="flex gap-2">
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        placeholder="test@example.com" 
                                        className="rounded-2xl h-12 bg-gray-50/50 dark:bg-muted/50 border-gray-100 dark:border-border/50"
                                    />
                                </FormControl>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="rounded-2xl h-12 px-6 border-gray-200 hover:bg-gray-50 transition-all"
                                    onClick={handleSendTest}
                                    loading={isSendingTest}
                                >
                                    <Send className="h-4 w-4 mr-2"/>
                                    Send Test
                                </Button>
                            </div>
                            <FormDescription className="text-xs">
                                Verify your settings before saving.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
          </CardContent>
          <CardFooter className="px-8 py-8 border-t border-gray-50 dark:border-border/50 bg-gray-50/30 dark:bg-muted/10">
            <Button 
                type="submit" 
                loading={isSaving}
                className="w-full md:w-auto ml-auto rounded-2xl h-12 px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98]"
            >

              Save Email Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
