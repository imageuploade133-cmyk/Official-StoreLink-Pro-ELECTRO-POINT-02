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
import { Loader2, Mail, Send, CheckCircle2, XCircle, Eye, EyeOff, Info, Key } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { sendTestOrderEmailAction, validateGmailSmtpAction } from '@/app/actions/orders';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const emailAlertSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  gmailEmail: z.string().email({ message: "Please enter a valid Gmail address." }).refine(email => email.toLowerCase().endsWith('@gmail.com'), {
    message: "Must be a @gmail.com address."
  }),
  gmailAppPassword: z.string().min(8, { message: "App Password is required." }),
  notificationEmail: z.string().email({ message: "Please enter a valid notification email address." }),
  senderName: z.string().min(1, { message: "Sender name is required." }),
  customerConfirmation: z.boolean().default(false),
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
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'failed'>('idle');

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
      gmailEmail: '',
      gmailAppPassword: '',
      notificationEmail: '',
      senderName: '',
      customerConfirmation: false,
    },
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        enabled: settingsData.enabled || false,
        gmailEmail: settingsData.gmailEmail || '',
        gmailAppPassword: settingsData.gmailAppPassword || '',
        notificationEmail: settingsData.notificationEmail || '',
        senderName: settingsData.senderName || '',
        customerConfirmation: settingsData.customerConfirmation || false,
      });
      if (settingsData.connected) {
          setConnectionStatus('connected');
      }
    }
  }, [settingsData, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !emailAlertsRef) return;
    setIsSaving(true);
    try {
      const dataToSave = {
        ...values,
        provider: 'gmail',
        connected: connectionStatus === 'connected',
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

  const handleValidateConnection = async () => {
      const values = form.getValues();
      if (!values.gmailEmail || !values.gmailAppPassword) {
          toast({ variant: 'destructive', title: 'Missing Credentials', description: 'Please enter your Gmail address and App Password.' });
          return;
      }

      setIsValidating(true);
      try {
          const result = await validateGmailSmtpAction(values.gmailEmail, values.gmailAppPassword);
          if (result.success) {
              setConnectionStatus('connected');
              toast({ title: 'Connected', description: 'Successfully authenticated with Gmail SMTP.' });
          } else {
              setConnectionStatus('failed');
              toast({ variant: 'destructive', title: 'Connection Failed', description: result.error || 'Failed to authenticate with Gmail.' });
          }
      } catch (error) {
          setConnectionStatus('failed');
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
                provider: 'gmail',
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
            description: error.message || 'Failed to send test email. Check your Gmail credentials.',
        });
    } finally {
        setIsSendingTest(false);
    }
  };

  const maskedPassword = (pass: string) => {
    if (!pass) return '';
    return '•'.repeat(Math.min(pass.length, 12));
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const isConnected = connectionStatus === 'connected';

  return (
    <Card className="border-none shadow-lg rounded-2xl overflow-hidden bg-white">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="pb-8 border-b border-gray-50">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <Mail className="h-6 w-6 text-primary"/> Email Alerts
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                        Configure Gmail SMTP order notifications
                    </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                    {isConnected ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1 rounded-full text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Connected
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 gap-1 px-3 py-1 rounded-full text-xs font-medium">
                            <XCircle className="h-3 w-3" /> {form.watch('enabled') ? 'Not Connected' : 'Disabled'}
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
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-8 px-8">
            <Alert className="bg-blue-50/50 border-blue-100 text-blue-900 rounded-xl">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="font-semibold">Setup Tip</AlertTitle>
                <AlertDescription className="text-xs text-blue-700 mt-1">
                    To use Gmail SMTP, you must use an <strong>App Password</strong>, not your regular Gmail password. Enable 2FA in your Google Account settings, then search for "App Passwords".
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="gmailEmail"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Gmail Address</FormLabel>
                            <FormControl>
                                <Input 
                                    {...field} 
                                    placeholder="yourname@gmail.com" 
                                    className="bg-gray-50 border-gray-200 focus:bg-white focus:ring-primary/20 rounded-xl transition-all"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="gmailAppPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center justify-between text-gray-700 font-medium">
                                <span>Gmail App Password</span>
                                <Button 
                                    type="button" 
                                    variant="link" 
                                    className="h-auto p-0 text-xs text-primary font-semibold"
                                    onClick={handleValidateConnection}
                                    disabled={isValidating}
                                >
                                    {isValidating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Key className="h-3 w-3 mr-1" />}
                                    Test Connection
                                </Button>
                            </FormLabel>
                            <div className="relative">
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        type={showAppPassword ? "text" : "password"}
                                        placeholder="abcd efgh ijkl mnop" 
                                        autoComplete="off"
                                        className="bg-gray-50 border-gray-200 focus:bg-white focus:ring-primary/20 rounded-xl transition-all pr-10"
                                        onChange={(e) => {
                                            field.onChange(e);
                                            setConnectionStatus('idle');
                                        }}
                                    />
                                </FormControl>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowAppPassword(!showAppPassword)}
                                >
                                    {showAppPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <FormDescription className="text-[11px] text-gray-400">
                                {field.value && !showAppPassword ? `Current: ${maskedPassword(field.value)}` : "16-character code from Google account"}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="senderName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Sender Name (Store Name)</FormLabel>
                            <FormControl>
                                <Input 
                                    {...field} 
                                    placeholder="My Awesome Store" 
                                    className="bg-gray-50 border-gray-200 focus:bg-white focus:ring-primary/20 rounded-xl transition-all"
                                />
                            </FormControl>
                            <FormDescription className="text-[11px] text-gray-400">
                                This will appear as the sender in your customers' inboxes.
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
                            <FormLabel className="text-gray-700 font-medium">Notification Email</FormLabel>
                            <FormControl>
                                <Input 
                                    {...field} 
                                    placeholder="admin@example.com" 
                                    className="bg-gray-50 border-gray-200 focus:bg-white focus:ring-primary/20 rounded-xl transition-all"
                                />
                            </FormControl>
                            <FormDescription className="text-[11px] text-gray-400">
                                Where you'll receive new order alerts.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="customerConfirmation"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-gray-100 p-6 col-span-1 md:col-span-2 bg-gray-50/30">
                            <div className="space-y-1">
                                <FormLabel className="text-base font-semibold text-gray-900">Send Customer Confirmation Email</FormLabel>
                                <FormDescription className="text-xs text-gray-500">
                                    Automatically send a receipt to customers after they place an order.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="data-[state=checked]:bg-primary"
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
          </CardContent>
          <CardFooter className="px-8 py-6 flex items-center justify-between mt-4">
            <Button 
                type="button" 
                variant="outline" 
                className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-medium"
                onClick={handleSendTest}
                disabled={isSendingTest || !form.watch('enabled')}
            >
                {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                Test Email
            </Button>
            <Button 
                type="submit" 
                disabled={isSaving} 
                className="rounded-xl px-8 font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
