'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, MessageSquare, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const messagingSettingsSchema = z.object({
  enableSms: z.boolean().optional(),
  enableWhatsapp: z.boolean().optional(),
  smsSenderId: z.string().optional(),
  smsWebhookUrl: z.string().url().or(z.literal('')).optional(),
  whatsappWebhookUrl: z.string().url().or(z.literal('')).optional(),
  whatsappMarketingGreeting: z.string().optional(),
  whatsappMarketingFooter: z.string().optional(),
  eBulkUsername: z.string().optional(),
  eBulkApiKey: z.string().optional(),
});

type FormValues = z.infer<typeof messagingSettingsSchema>;

interface MessagingSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
}

export function MessagingSettings({ settingsData, isLoading }: MessagingSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(messagingSettingsSchema),
    defaultValues: {
      enableSms: false,
      enableWhatsapp: false,
      smsSenderId: '',
      smsWebhookUrl: '',
      whatsappWebhookUrl: '',
      whatsappMarketingGreeting: '',
      whatsappMarketingFooter: '',
      eBulkUsername: '',
      eBulkApiKey: '',
    },
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        enableSms: settingsData.enableSms || false,
        enableWhatsapp: settingsData.enableWhatsapp || false,
        smsSenderId: settingsData.smsSenderId || '',
        smsWebhookUrl: settingsData.smsWebhookUrl || '',
        whatsappWebhookUrl: settingsData.whatsappWebhookUrl || '',
        whatsappMarketingGreeting: settingsData.whatsappMarketingGreeting || '',
        whatsappMarketingFooter: settingsData.whatsappMarketingFooter || '',
        eBulkUsername: settingsData.eBulkUsername || '',
        eBulkApiKey: settingsData.eBulkApiKey || '',
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Success', description: 'Messaging settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5"/> Messaging & Webhooks</CardTitle>
            <CardDescription>Configure SMS and WhatsApp notifications and API connections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="enableSms"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="font-semibold">Enable SMS</FormLabel>
                      <p className="text-xs text-muted-foreground">Master switch for all SMS.</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enableWhatsapp"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="font-semibold">Enable WhatsApp</FormLabel>
                      <p className="text-xs text-muted-foreground">Master switch for all WhatsApp.</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Separator />
             <h4 className="font-semibold text-base flex items-center gap-2"><KeyRound className="h-4 w-4"/> eBulkSMS Credentials</h4>
            <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                <p className="text-xs text-muted-foreground">Enter your eBulkSMS username and API key for sending WhatsApp messages.</p>
                <FormField
                control={form.control}
                name="eBulkUsername"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>eBulkSMS Username</FormLabel>
                    <FormControl><Input {...field} placeholder="Your eBulkSMS Username" /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="eBulkApiKey"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>eBulkSMS API Key</FormLabel>
                    <div className="relative">
                        <FormControl><Input type={showApiKey ? 'text' : 'password'} {...field} placeholder="Your eBulkSMS API Key" /></FormControl>
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowApiKey(!showApiKey)}>
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smsSenderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMS Sender ID</FormLabel>
                    <FormControl><Input {...field} placeholder="Max 11 characters" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smsWebhookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMS Webhook URL</FormLabel>
                    <FormControl><Input {...field} placeholder="https://api.example.com/webhook" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="whatsappWebhookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Webhook URL</FormLabel>
                  <FormControl><Input {...field} placeholder="https://api.example.com/webhook" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator/>
            <h4 className="font-semibold text-base">WhatsApp Message Templates</h4>
            <div className="p-4 border rounded-md space-y-4">
              <p className="text-xs text-muted-foreground">Use {'{customerName}'} for customer's name and {'{storeName}'} for your store's name.</p>
              <FormField
                control={form.control}
                name="whatsappMarketingGreeting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketing Greeting</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g., A special message from {storeName}:" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsappMarketingFooter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketing Message Footer</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g., To unsubscribe, reply STOP." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Messaging Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
