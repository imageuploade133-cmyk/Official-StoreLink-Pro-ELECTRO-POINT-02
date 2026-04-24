'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
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
import { BellRing, Loader2, Save, Plus, Trash2, Smartphone, Info, Mail, CheckCircle2 } from 'lucide-react';
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
      <div className="space-y-8">
        <PageHeader icon={BellRing} title="Order Alerts" description="Configure notifications for new website orders." />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-[400px] w-full rounded-3xl" />
            <Skeleton className="h-[400px] w-full rounded-3xl" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-[300px] w-full rounded-3xl sticky top-6" />
          </div>
        </div>
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card className="border-none shadow-xl shadow-black/5 rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-muted/30 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">WhatsApp Alerts</CardTitle>
                      <CardDescription>Configure WhatsApp notifications for new orders.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <FormField
                    control={form.control}
                    name="enableOrderAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-muted-foreground/10 p-5 bg-muted/20 transition-all hover:bg-muted/30">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">Enable WhatsApp Alerts</FormLabel>
                          <FormDescription>
                            If on, WhatsApp messages will be sent to the numbers below.
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

                  <div className="space-y-4">
                    <Label>Notification Numbers</Label>
                    <div className="flex gap-2">
                      <div className="flex-grow">
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="e.g., +2348012345678" 
                            className="pl-10 h-11 rounded-xl border-muted-foreground/20 focus:ring-primary/20" 
                            value={newNumber} 
                            onChange={(e) => setNewNumber(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNumber())}
                          />
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleAddNumber} 
                        className="h-11 px-6 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {configuredNumbers.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-2xl text-muted-foreground bg-muted/5 transition-colors hover:bg-muted/10">
                          <p className="text-sm font-medium">No phone numbers configured.</p>
                          <p className="text-xs mt-1">Add a number above to start receiving alerts.</p>
                        </div>
                      ) : (
                        configuredNumbers.map((num, idx) => (
                          <div key={idx} className="group flex items-center justify-between p-4 border rounded-2xl bg-background transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Smartphone className="h-5 w-5" />
                              </div>
                              <span className="font-semibold text-sm tracking-wide">{num}</span>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9 rounded-xl transition-colors" 
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

              <Card className="border-none shadow-xl shadow-black/5 rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-muted/30 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Email Alerts</CardTitle>
                      <CardDescription>Configure Email notifications for new orders.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <FormField
                    control={form.control}
                    name="enableEmailAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-muted-foreground/10 p-5 bg-muted/20 transition-all hover:bg-muted/30">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">Enable Email Alerts</FormLabel>
                          <FormDescription>
                            If on, branded email notifications will be sent to the addresses below.
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

                  <div className="space-y-4">
                    <Label>Notification Emails</Label>
                    <div className="flex gap-2">
                      <div className="flex-grow">
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="e.g., admin@store.com" 
                            className="pl-10 h-11 rounded-xl border-muted-foreground/20 focus:ring-primary/20" 
                            value={newEmail} 
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                          />
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleAddEmail} 
                        className="h-11 px-6 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {configuredEmails.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-2xl text-muted-foreground bg-muted/5 transition-colors hover:bg-muted/10">
                          <p className="text-sm font-medium">No email addresses configured.</p>
                          <p className="text-xs mt-1">Add an email above to start receiving alerts.</p>
                        </div>
                      ) : (
                        configuredEmails.map((email, idx) => (
                          <div key={idx} className="group flex items-center justify-between p-4 border rounded-2xl bg-background transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Mail className="h-5 w-5" />
                              </div>
                              <span className="font-semibold text-sm tracking-wide">{email}</span>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9 rounded-xl transition-colors" 
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

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={isSaving} 
                  size="lg" 
                  className="min-w-[240px] h-14 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                >
                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Save All Alert Settings
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-primary/5 border-none shadow-xl shadow-primary/5 rounded-3xl sticky top-6 overflow-hidden">
            <div className="h-2 bg-primary" />
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-widest">
                <Info className="h-4 w-4" /> How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-6 text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground/80">When an order is placed, everyone on these lists will receive notifications containing:</p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  'Order ID Reference',
                  'Customer Name',
                  'Items & Quantities',
                  'Total Order Value',
                  'Payment Status',
                  'Delivery Address'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/50 p-2 rounded-xl border border-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-xs">{item}</span>
                  </div>
                ))}
              </div>
              <Separator className="bg-primary/10" />
              <div className="bg-white/50 p-4 rounded-2xl border border-primary/5">
                <p className="text-xs italic leading-normal">
                  <span className="font-bold text-primary not-italic">Pro Tip:</span> WhatsApp alerts are instant. Make sure your numbers include the country code (e.g. +234).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
