'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { WhatsAppAlertSettings as WhatsAppAlertSettingsType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, MessageSquare, Send, CheckCircle2, XCircle, Eye, EyeOff, Info, Key, Smartphone } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { validateEBulkSMSAction, saveWhatsAppAlertSettingsAction, getDecryptedWhatsAppApiKeyAction } from '@/app/actions/orders';
import { useUser } from '@/firebase/auth/use-user';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const whatsappAlertSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  username: z.string().min(1, { message: "Username is required." }),
  apiKey: z.string().min(1, { message: "API Key is required." }),
  senderNumber: z.string().optional(),
});

type FormValues = z.infer<typeof whatsappAlertSettingsSchema>;

interface WhatsAppAlertSettingsProps {
  storeId?: string | null;
}

export function WhatsAppAlertSettings({ storeId }: WhatsAppAlertSettingsProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'failed'>('idle');

  const whatsappAlertsRef = React.useMemo(() => {
    if (!firestore) return null;
    if (storeId) {
        return doc(firestore, 'stores', storeId, 'settings', 'whatsappAlerts');
    }
    return doc(firestore, 'settings', 'whatsappAlerts');
  }, [firestore, storeId]);

  const { data: settingsData, isLoading } = useDoc<WhatsAppAlertSettingsType>(whatsappAlertsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(whatsappAlertSettingsSchema),
    defaultValues: {
      enabled: false,
      username: '',
      apiKey: '',
      senderNumber: '',
    },
  });

  useEffect(() => {
    const initForm = async () => {
      if (settingsData) {
        let apiKey = settingsData.apiKey || '';
        
        // If the API key is encrypted (contains a colon), decrypt it for the UI
        if (apiKey && apiKey.includes(':')) {
          try {
            const result = await getDecryptedWhatsAppApiKeyAction(storeId || 'global');
            if (result.success && result.apiKey) {
              apiKey = result.apiKey;
            }
          } catch (error) {
            console.error('Failed to decrypt API key for UI:', error);
          }
        }

        form.reset({
          enabled: settingsData.enabled || false,
          username: settingsData.username || '',
          apiKey: apiKey,
          senderNumber: settingsData.senderNumber || '',
        });
        
        if (settingsData.connected) {
            setConnectionStatus('connected');
        } else if (settingsData.username && settingsData.apiKey) {
            setConnectionStatus('failed');
        }
      }
    };

    initForm();
  }, [settingsData, form, storeId]);

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const result = await saveWhatsAppAlertSettingsAction(storeId || 'global', {
        ...values,
        connected: connectionStatus === 'connected',
      });

      if (result.success) {
        toast({ title: 'Success', description: 'WhatsApp alert settings have been updated.' });
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateConnection = async () => {
      const values = form.getValues();
      if (!values.username || !values.apiKey) {
          toast({ variant: 'destructive', title: 'Missing Credentials', description: 'Please enter your eBulkSMS Username and API Key.' });
          return;
      }

      setIsValidating(true);
      try {
          const result = await validateEBulkSMSAction(values.username, values.apiKey);
          if (result.success) {
              setConnectionStatus('connected');
              toast({ title: 'Connected', description: 'Successfully authenticated with eBulkSMS.' });
          } else {
              setConnectionStatus('failed');
              toast({ variant: 'destructive', title: 'Connection Failed', description: result.error || 'Failed to authenticate with eBulkSMS.' });
          }
      } catch (error) {
          setConnectionStatus('failed');
      } finally {
          setIsValidating(false);
      }
  };

  const handleSendTest = async () => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not Authenticated',
            description: 'You must be logged in to send a test message.',
        });
        return;
    }

    setIsSendingTest(true);
    try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/send-whatsapp-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
                storeId: storeId || 'global',
            }),
        });
        
        const testResult = await response.json();
        
        if (testResult.success) {
            toast({
                title: 'Test Message Sent',
                description: `A test WhatsApp notification has been sent.`,
            });
        } else {
            throw new Error(testResult.error || 'Failed to send test message');
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Test Failed',
            description: error.message || 'Failed to send test WhatsApp. Check your eBulkSMS credentials.',
        });
    } finally {
        setIsSendingTest(false);
    }
  };

  const maskedApiKey = (key: string) => {
    if (!key) return '';
    return '•'.repeat(Math.min(key.length, 12));
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
                        <MessageSquare className="h-6 w-6 text-[#25D366]"/> WhatsApp Alerts
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                        Configure eBulkSMS WhatsApp order notifications
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
                                        className="data-[state=checked]:bg-[#25D366]"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-8 px-8">
            <Alert className="bg-green-50/50 border-green-100 text-green-900 rounded-xl">
                <Info className="h-4 w-4 text-green-600" />
                <AlertTitle className="font-semibold">Setup Tip</AlertTitle>
                <AlertDescription className="text-xs text-green-700 mt-1">
                    To use WhatsApp Alerts, you need an account with <strong>eBulkSMS</strong>. Enter your username and API key from your eBulkSMS dashboard.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700 font-medium">eBulkSMS Username</FormLabel>
                            <FormControl>
                                <Input 
                                    {...field} 
                                    placeholder="yourname@example.com" 
                                    className="bg-gray-50 border-gray-200 focus:bg-white focus:ring-[#25D366]/20 rounded-xl transition-all"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center justify-between text-gray-700 font-medium">
                                <span>eBulkSMS API Key</span>
                                <Button 
                                    type="button" 
                                    variant="link" 
                                    className="h-auto p-0 text-xs text-[#25D366] font-semibold"
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
                                        type={showApiKey ? "text" : "password"}
                                        placeholder="Enter your API key" 
                                        autoComplete="off"
                                        className="bg-gray-50 border-gray-200 focus:bg-white focus:ring-[#25D366]/20 rounded-xl transition-all pr-10"
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
                                    onClick={() => setShowApiKey(!showApiKey)}
                                >
                                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <FormDescription className="text-[11px] text-gray-400">
                                {field.value && !showApiKey ? `Current: ${maskedApiKey(field.value)}` : "Your eBulkSMS API Key"}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="senderNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Sender WhatsApp Number (Optional)</FormLabel>
                            <FormControl>
                                <Input 
                                    {...field} 
                                    placeholder="234..." 
                                    className="bg-gray-50 border-gray-200 focus:bg-white focus:ring-[#25D366]/20 rounded-xl transition-all"
                                />
                            </FormControl>
                            <FormDescription className="text-[11px] text-gray-400">
                                Your registered WhatsApp number on eBulkSMS.
                            </FormDescription>
                            <FormMessage />
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
                Test Message
            </Button>
            <Button 
                type="submit" 
                disabled={isSaving} 
                className="rounded-xl px-8 font-semibold shadow-lg shadow-[#25D366]/20 transition-all hover:scale-[1.02] active:scale-[0.98] bg-[#25D366] hover:bg-[#128C7E] text-white"
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
