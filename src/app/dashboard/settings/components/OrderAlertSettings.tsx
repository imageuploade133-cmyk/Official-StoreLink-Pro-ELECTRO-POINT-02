'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { EmailAlertSettings as EmailAlertSettingsType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Mail, Send, CheckCircle2, XCircle, Eye, EyeOff, Info, AlertTriangle } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { sendTestOrderEmailAction, getResendUsageAction } from '@/app/actions/orders';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const emailAlertSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  resendApiKey: z.string().optional().or(z.literal('')),
  senderEmail: z.string().optional().or(z.literal('')),
  notificationEmail: z.string().email({ message: "Please enter a valid notification email address." }),
  customerConfirmation: z.boolean().default(false),
}).superRefine((data, ctx) => {
    if (data.resendApiKey && data.resendApiKey.trim() !== '') {
        if (!/^re_[a-zA-Z0-9]+$/.test(data.resendApiKey)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid Resend API Key format. Should start with 're_'",
                path: ['resendApiKey'],
            });
        }
        if (!data.senderEmail || data.senderEmail.trim() === '') {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Sender Email is required when using a custom API Key",
                path: ['senderEmail'],
            });
        } else if (!z.string().email().safeParse(data.senderEmail).success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please enter a valid sender email address",
                path: ['senderEmail'],
            });
        }
    }
});

type FormValues = z.infer<typeof emailAlertSettingsSchema>;

interface OrderAlertSettingsProps {
  storeId?: string | null;
}

export function OrderAlertSettings({ storeId }: OrderAlertSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const emailAlertsRef = React.useMemo(() => {
    if (!firestore) return null;
    if (storeId) {
        return doc(firestore, 'stores', storeId, 'settings', 'emailAlerts');
    }
    return doc(firestore, 'settings', 'emailAlerts');
  }, [firestore, storeId]);

  const { data: settingsData, isLoading } = useDoc<EmailAlertSettingsType>(emailAlertsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(emailAlertSettingsSchema),
    defaultValues: {
      enabled: false,
      resendApiKey: '',
      senderEmail: '',
      notificationEmail: '',
      customerConfirmation: false,
    },
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        enabled: settingsData.enabled || false,
        resendApiKey: settingsData.resendApiKey || '',
        senderEmail: settingsData.senderEmail || '',
        notificationEmail: settingsData.notificationEmail || '',
        customerConfirmation: settingsData.customerConfirmation || false,
      });
      if (settingsData.resendApiKey) {
          setKeyStatus('valid'); // Assume valid if already saved and connected
      }
    }
  }, [settingsData, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !emailAlertsRef) return;
    setIsSaving(true);
    try {
      const dataToSave = {
        ...values,
        connected: !!values.resendApiKey,
        updatedAt: serverTimestamp(),
      };

      await setDoc(emailAlertsRef, dataToSave, { merge: true });
      toast({ title: 'Success', description: 'Email alert settings have been updated.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateKey = async () => {
      const apiKey = form.getValues('resendApiKey');
      if (!apiKey || !apiKey.startsWith('re_')) {
          toast({ variant: 'destructive', title: 'Invalid Key', description: 'Please enter a valid Resend API key.' });
          return;
      }

      setIsValidating(true);
      try {
          const result = await getResendUsageAction(apiKey);
          if (result.success) {
              setKeyStatus('valid');
              toast({ title: 'Key Valid', description: 'Your Resend API key is working correctly.' });
          } else {
              setKeyStatus('invalid');
              toast({ variant: 'destructive', title: 'Invalid Key', description: result.error || 'Failed to validate API key.' });
          }
      } catch (error) {
          setKeyStatus('invalid');
      } finally {
          setIsValidating(false);
      }
  };

  const handleSendTest = async () => {
    const values = form.getValues();
    
    // Validate current form values before sending test
    const result = emailAlertSettingsSchema.safeParse(values);
    if (!result.success) {
        toast({
            variant: 'destructive',
            title: 'Invalid Settings',
            description: 'Please fill in all required fields correctly before sending a test.',
        });
        return;
    }

    setIsSendingTest(true);
    try {
        const testResult = await sendTestOrderEmailAction(
            [values.notificationEmail], 
            storeId || 'global', 
            '$', // Default currency for test
            {
                ...values,
                resendApiKey: values.resendApiKey,
                senderEmail: values.senderEmail,
            }
        );
        
        if (testResult.success) {
            toast({
                title: 'Test Email Sent',
                description: `A test order notification has been sent to ${values.notificationEmail}.`,
            });
        } else {
            throw new Error(testResult.error);
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Test Failed',
            description: error.message || 'Failed to send test email. Check your API key and sender email.',
        });
    } finally {
        setIsSendingTest(false);
    }
  };

  const maskedApiKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return `re_••••••••${key.slice(-4)}`;
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const isUsingCustom = !!form.watch('resendApiKey');
  const isConnected = isUsingCustom ? keyStatus === 'valid' : settingsData?.enabled;

  return (
    <Card className="border-primary/20 shadow-md overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="bg-primary/5 pb-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <Mail className="h-5 w-5 text-primary"/> Email Alerts
                    </CardTitle>
                    <CardDescription>
                        Configure how you receive order notifications
                    </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                    {isConnected ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                            <CheckCircle2 className="h-3 w-3" /> {isUsingCustom ? 'Custom Connected' : 'System Ready'}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 gap-1 px-3 py-1">
                            <XCircle className="h-3 w-3" /> {form.watch('enabled') ? 'Not Configured' : 'Disabled'}
                        </Badge>
                    )}
                    <FormField
                        control={form.control}
                        name="enabled"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Switch 
                                        checked={field.value} 
                                        onCheckedChange={field.onChange} 
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {!isUsingCustom && (
                <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Using System Default</AlertTitle>
                    <AlertDescription className="text-xs">
                        You are currently using the platform's default email service. Notifications will be sent from <strong>notifications@storelink-pro.com</strong>. Enter your own Resend API key below to use your own domain and branding.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="resendApiKey"
                    render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                            <FormLabel className="flex items-center justify-between">
                                <span>Resend API Key (Optional)</span>
                                {field.value && (
                                    <Button 
                                        type="button" 
                                        variant="link" 
                                        className="h-auto p-0 text-xs"
                                        onClick={handleValidateKey}
                                        disabled={isValidating}
                                    >
                                        {isValidating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                        Validate Key
                                    </Button>
                                )}
                            </FormLabel>
                            <div className="relative">
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        type={showApiKey ? "text" : "password"}
                                        placeholder="re_123456789... (Leave empty to use global default)" 
                                        autoComplete="off"
                                        onChange={(e) => {
                                            field.onChange(e);
                                            setKeyStatus('idle');
                                        }}
                                    />
                                </FormControl>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                >
                                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <FormDescription className="text-[11px]">
                                {field.value && !showApiKey ? `Current key: ${maskedApiKey(field.value)}` : "Get your API key from resend.com"}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="senderEmail"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sender Email {isUsingCustom && <span className="text-destructive">*</span>}</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder={isUsingCustom ? "orders@yourdomain.com" : "Using system default"} disabled={!isUsingCustom} />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                                {isUsingCustom ? "Must be verified in your Resend account. Use 'onboarding@resend.dev' for testing." : "Managed by platform."}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="notificationEmail"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notification Recipient Email</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder="admin@example.com" />
                            </FormControl>
                            <FormDescription className="text-[11px]">
                                Where you want to receive new order alerts.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="customerConfirmation"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-1 md:col-span-2 bg-muted/20">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Send Customer Confirmation</FormLabel>
                                <FormDescription className="text-xs">
                                    Automatically send a receipt to customers.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            {isUsingCustom && !form.watch('senderEmail')?.includes('@') && form.watch('senderEmail') !== 'onboarding@resend.dev' && (
                <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription className="text-xs">
                        When using a custom API Key, you must provide a sender email that you've verified in Resend. If you're just starting, use <strong>onboarding@resend.dev</strong>.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
          <CardFooter className="bg-muted/50 border-t px-6 py-4 flex items-center justify-between">
            <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleSendTest}
                disabled={isSendingTest || !form.watch('enabled')}
            >
                {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                Send Test Email
            </Button>
            <Button type="submit" disabled={isSaving} size="sm">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Email Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
