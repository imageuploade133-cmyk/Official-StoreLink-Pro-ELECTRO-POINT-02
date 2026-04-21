'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { BellRing, Loader2, Save, Plus, Trash2, Smartphone, Info, Mail } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';

const orderAlertsSchema = z.object({
  enableOrderAlerts: z.boolean().default(false),
  orderNotificationNumbers: z.array(z.string().min(5, 'Invalid phone number.')).default([]),
  enableEmailAlerts: z.boolean().default(false),
  orderNotificationEmails: z.array(z.string().email('Invalid email address.')).default([]),
});

type FormValues = z.infer<typeof orderAlertsSchema>;

export default function OrderAlertsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const settingsRef = useMemo(
    () => {
        if (!firestore) return null;
        if (currentStoreId) {
            return doc(firestore, 'stores', currentStoreId, 'settings', 'config');
        }
        return doc(firestore, 'settings', 'global');
    },
    [firestore, currentStoreId]
  );

  // Fallback for old stores
  const oldSettingsRef = useMemo(
    () => (firestore && currentStoreId) ? doc(firestore, 'settings', currentStoreId) : null,
    [firestore, currentStoreId]
  );

  const { data: mainSettingsData, isLoading: isLoadingMainSettings } = useDoc<AppSettings>(settingsRef);
  const { data: oldSettingsData, isLoading: isLoadingOldSettings } = useDoc<AppSettings>(oldSettingsRef);

  const settingsData = mainSettingsData || oldSettingsData;
  const isLoadingSettings = isLoadingMainSettings && (currentStoreId ? isLoadingOldSettings : true);

  const form = useForm<FormValues>({
    resolver: zodResolver(orderAlertsSchema),
    defaultValues: {
      enableOrderAlerts: false,
      orderNotificationNumbers: [],
      enableEmailAlerts: false,
      orderNotificationEmails: [],
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        enableOrderAlerts: settingsData.enableOrderAlerts || false,
        orderNotificationNumbers: settingsData.orderNotificationNumbers || [],
        enableEmailAlerts: settingsData.enableEmailAlerts || false,
        orderNotificationEmails: settingsData.orderNotificationEmails || [],
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (currentStoreId) {
        await saveStoreSettings(firestore, currentStoreId, data);
      } else {
        await saveGlobalSettings(firestore, data);
      }
      toast({ title: 'Settings Saved', description: 'Your order alert preferences have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update alert settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNumber = () => {
    const trimmed = newNumber.trim();
    if (!trimmed) return;
    
    const currentNumbers = form.getValues('orderNotificationNumbers') || [];
    if (currentNumbers.includes(trimmed)) {
        toast({ variant: 'destructive', title: 'Duplicate Number', description: 'This number is already in the alert list.' });
        return;
    }

    form.setValue('orderNotificationNumbers', [...currentNumbers, trimmed], { shouldValidate: true });
    setNewNumber('');
  };

  const handleRemoveNumber = (index: number) => {
    const currentNumbers = form.getValues('orderNotificationNumbers') || [];
    const updated = currentNumbers.filter((_, i) => i !== index);
    form.setValue('orderNotificationNumbers', updated, { shouldValidate: true });
  };

  const handleAddEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please enter a valid email address.' });
        return;
    }
    
    const currentEmails = form.getValues('orderNotificationEmails') || [];
    if (currentEmails.includes(trimmed)) {
        toast({ variant: 'destructive', title: 'Duplicate Email', description: 'This email is already in the alert list.' });
        return;
    }

    form.setValue('orderNotificationEmails', [...currentEmails, trimmed], { shouldValidate: true });
    setNewEmail('');
  };

  const handleRemoveEmail = (index: number) => {
    const currentEmails = form.getValues('orderNotificationEmails') || [];
    const updated = currentEmails.filter((_, i) => i !== index);
    form.setValue('orderNotificationEmails', updated, { shouldValidate: true });
  };

  const isLoading = isAuthLoading || isLoadingSettings;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={BellRing} title="Order Alerts" description="Configure notifications for new website orders." />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  const configuredNumbers = form.watch('orderNotificationNumbers') || [];
  const configuredEmails = form.watch('orderNotificationEmails') || [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BellRing}
        title="Order Alerts"
        description="Stay notified. Set up multiple WhatsApp numbers and Email addresses to receive alerts whenever a customer places an order."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Alerts</CardTitle>
                  <CardDescription>Configure WhatsApp notifications for new orders.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="enableOrderAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-muted/30">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable WhatsApp Alerts</FormLabel>
                          <FormDescription>
                            If on, WhatsApp messages will be sent to the numbers below.
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

                  <div className="space-y-4">
                    <Label>Notification Numbers</Label>
                    <div className="flex gap-2">
                      <div className="flex-grow">
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="e.g., +2348012345678" 
                            className="pl-10" 
                            value={newNumber} 
                            onChange={(e) => setNewNumber(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNumber())}
                          />
                        </div>
                      </div>
                      <Button type="button" onClick={handleAddNumber} variant="secondary">
                        <Plus className="mr-2 h-4 w-4" /> Add
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {configuredNumbers.length === 0 ? (
                        <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/5">
                          <p className="text-sm">No phone numbers configured.</p>
                        </div>
                      ) : (
                        configuredNumbers.map((num, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded-xl bg-background">
                            <div className="flex items-center gap-3">
                              <Smartphone className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{num}</span>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive h-8 w-8" 
                              onClick={() => handleRemoveNumber(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Alerts</CardTitle>
                  <CardDescription>Configure Email notifications for new orders (Powered by Resend).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="enableEmailAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-muted/30">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Email Alerts</FormLabel>
                          <FormDescription>
                            If on, branded email notifications will be sent to the addresses below.
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

                  <div className="space-y-4">
                    <Label>Notification Emails</Label>
                    <div className="flex gap-2">
                      <div className="flex-grow">
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="e.g., admin@store.com" 
                            className="pl-10" 
                            value={newEmail} 
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                          />
                        </div>
                      </div>
                      <Button type="button" onClick={handleAddEmail} variant="secondary">
                        <Plus className="mr-2 h-4 w-4" /> Add
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {configuredEmails.length === 0 ? (
                        <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/5">
                          <p className="text-sm">No email addresses configured.</p>
                        </div>
                      ) : (
                        configuredEmails.map((email, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded-xl bg-background">
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{email}</span>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive h-8 w-8" 
                              onClick={() => handleRemoveEmail(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving} size="lg" className="min-w-[200px] font-bold">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save All Alert Settings
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-widest">
                <Info className="h-4 w-4" /> How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
              <p>When an order is placed, everyone on these lists will receive notifications containing:</p>
              <ul className="list-disc pl-5 space-y-2 font-medium">
                <li>Order ID Reference</li>
                <li>Customer Name</li>
                <li>Items & Quantities</li>
                <li>Total Order Value</li>
                <li>Payment Status</li>
                <li>Delivery Address</li>
              </ul>
              <Separator className="bg-primary/10" />
              <p className="text-xs italic">
                Note: Emails are sent via Resend. Customers also receive an automatic confirmation email if their address is provided.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
