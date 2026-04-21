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
import { Loader2, Mail, Send, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { sendTestOrderEmailAction } from '@/app/actions/orders';

const emailAlertSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  resendApiKey: z.string().min(1, { message: "Resend API Key is required" }).regex(/^re_[a-zA-Z0-9]+$/, { message: "Invalid Resend API Key format. Should start with 're_'" }),
  senderEmail: z.string().email({ message: "Please enter a valid sender email address." }),
  notificationEmail: z.string().email({ message: "Please enter a valid notification email address." }),
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
  const [showApiKey, setShowApiKey] = useState(false);

  const emailAlertsRef = React.useMemo(() => {
    if (!firestore || !storeId) return null;
    return doc(firestore, 'stores', storeId, 'settings', 'emailAlerts');
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
    }
  }, [settingsData, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !storeId || !emailAlertsRef) return;
    setIsSaving(true);
    try {
      const dataToSave = {
        ...values,
        connected: true, // Assuming if they save a valid-looking key, we mark as connected. 
        // Real validation happens on test email or we could do a verify call here.
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

  if (!storeId) {
      return null; // Email alerts are store-specific in this implementation
  }

  const isConnected = settingsData?.connected && settingsData?.resendApiKey;

  return (
    <Card className="border-primary/20 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <Mail className="h-5 w-5 text-primary"/> Email Alerts
                    </CardTitle>
                    <CardDescription>
                        Configure order email notifications with Resend
                    </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                    {isConnected ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                            <CheckCircle2 className="h-3 w-3" /> Connected
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 gap-1 px-3 py-1">
                            <XCircle className="h-3 w-3" /> Not Connected
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
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="resendApiKey"
                    render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                            <FormLabel>Resend API Key</FormLabel>
                            <div className="relative">
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        type={showApiKey ? "text" : "password"}
                                        placeholder="re_123456789..." 
                                        autoComplete="off"
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
                            <FormDescription>
                                {field.value && !showApiKey ? `Current key: ${maskedApiKey(field.value)}` : "Enter your Resend API key starting with 're_'"}
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
                            <FormLabel>Sender Email</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder="orders@yourdomain.com" />
                            </FormControl>
                            <FormDescription>
                                This email must be verified in your Resend account.
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
                            <FormLabel>Notification Email</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder="admin@example.com" />
                            </FormControl>
                            <FormDescription>
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
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-1 md:col-span-2">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Send Customer Confirmation Email</FormLabel>
                                <FormDescription>
                                    Automatically send a confirmation email to customers after they place an order.
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
          </CardContent>
          <CardFooter className="bg-muted/50 border-t px-6 py-4 flex items-center justify-between">
            <Button 
                type="button" 
                variant="outline" 
                onClick={handleSendTest}
                disabled={isSendingTest}
            >
                {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                Test Email
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
