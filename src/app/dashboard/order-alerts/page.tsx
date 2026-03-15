'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
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
import { BellRing, Loader2, Save, Plus, Trash2, Smartphone, Info } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';

const orderAlertsSchema = z.object({
  enableOrderAlerts: z.boolean().default(false),
  orderNotificationNumbers: z.array(z.string().min(5, 'Invalid phone number.')).default([]),
});

type FormValues = z.infer<typeof orderAlertsSchema>;

export default function OrderAlertsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [newNumber, setNewNumber] = useState('');

  const settingsRef = useMemo(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  );

  const { data: settingsData, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(orderAlertsSchema),
    defaultValues: {
      enableOrderAlerts: false,
      orderNotificationNumbers: [],
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        enableOrderAlerts: settingsData.enableOrderAlerts || false,
        orderNotificationNumbers: settingsData.orderNotificationNumbers || [],
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
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

  const isLoading = isAuthLoading || isLoadingSettings;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={BellRing} title="Order Alerts" description="Configure WhatsApp notifications for new website orders." />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  const configuredNumbers = form.watch('orderNotificationNumbers') || [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BellRing}
        title="Order Alerts"
        description="Stay notified. Set up multiple WhatsApp numbers to receive alerts whenever a customer places an order."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alert Preferences</CardTitle>
                  <CardDescription>Toggle the global order alert system.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="enableOrderAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-muted/30">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Order Alerts</FormLabel>
                          <FormDescription>
                            If on, WhatsApp messages will be sent to the numbers below for every new order.
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Numbers</CardTitle>
                  <CardDescription>Staff numbers that will receive the order details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-2">
                    <div className="flex-grow">
                      <Label htmlFor="new-phone" className="sr-only">New Phone Number</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="new-phone"
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
                      <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/10">
                        <Smartphone className="mx-auto h-12 w-12 mb-4 opacity-20" />
                        <p>No alert numbers configured yet.</p>
                      </div>
                    ) : (
                      configuredNumbers.map((num, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-xl bg-background shadow-sm animate-in fade-in slide-in-from-top-1">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <Smartphone className="h-4 w-4" />
                            </div>
                            <span className="font-black tracking-wider text-sm">{num}</span>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10" 
                            onClick={() => handleRemoveNumber(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-6">
                  <Button type="submit" disabled={isSaving} size="lg" className="min-w-[200px] font-bold">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Alert Settings
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-widest">
                <Info className="h-4 w-4" /> Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
              <p>When an order is placed, everyone on this list will receive a WhatsApp message containing:</p>
              <ul className="list-disc pl-5 space-y-2 font-medium">
                <li>Order ID Reference</li>
                <li>Customer Name</li>
                <li>Total Order Value</li>
                <li>Payment Method used</li>
              </ul>
              <Separator className="bg-primary/10" />
              <p className="text-xs italic">
                Note: Ensure you include the full international country code (e.g., +234...) for all numbers to ensure message delivery.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
