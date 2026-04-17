'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Truck, Loader2, Save, Plus, Trash2, MapPin } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const deliverySchema = z.object({
  enablePickUp: z.boolean().default(true),
  enableDelivery: z.boolean().default(true),
  deliveryLocations: z.array(z.object({
    id: z.string(),
    name: z.string().min(2, 'Location name is too short.'),
    price: z.coerce.number().min(0, 'Price must be 0 or more.'),
  })).default([]),
});

type FormValues = z.infer<typeof deliverySchema>;

export default function DeliverySettingsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);

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
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      enablePickUp: true,
      enableDelivery: true,
      deliveryLocations: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "deliveryLocations"
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        enablePickUp: settingsData.enablePickUp ?? true,
        enableDelivery: settingsData.enableDelivery ?? true,
        deliveryLocations: settingsData.deliveryLocations || [],
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
      toast({ title: 'Settings Saved', description: 'Your delivery settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingSettings;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Truck} title="Delivery Settings" description="Loading..." />
        <Skeleton className="h w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
            icon={Truck}
            title="Delivery Settings"
            description="Manage pickup and delivery options for your customers."
        />
        <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving}
            className="h-12 px-8 font-black uppercase tracking-widest   transition-all active:scale-95"
        >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Delivery Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Form {...form}>
            <form className="space-y-8">
              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-xl">Fulfillment Options</CardTitle>
                  <CardDescription>Enable or disable pickup and delivery services.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                  <FormField
                    control={form.control}
                    name="enablePickUp"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 ">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Pick Up</FormLabel>
                          <FormDescription>
                            Allow customers to pick up their orders from your store.
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
                  <FormField
                    control={form.control}
                    name="enableDelivery"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 ">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Delivery</FormLabel>
                          <FormDescription>
                            Allow customers to have their orders delivered to their address.
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

              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b flex flex-row justify-between items-center pr-6">
                    <div>
                        <CardTitle className="text-xl">Delivery Locations & Pricing</CardTitle>
                        <CardDescription>Set delivery prices for different locations.</CardDescription>
                    </div>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="rounded-full gap-2 font-bold text-xs"
                        onClick={() => append({ id: crypto.randomUUID(), name: '', price: 0 })}
                    >
                        <Plus className="h-4 w-4" /> Add Location
                    </Button>
                </CardHeader>
                <CardContent className="pt-8">
                    <div className="space-y-6">
                        {fields.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded bg-muted/5">
                                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No delivery locations yet</p>
                                <Button 
                                    type="button" 
                                    variant="link" 
                                    onClick={() => append({ id: crypto.randomUUID(), name: '', price: 0 })}
                                >
                                    Click here to add your first delivery location
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="p-6 border rounded bg-muted/10 space-y-4 relative group transition-all hover:border-primary/20">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name={`deliveryLocations.${index}.name`}
                                                render={({ field: nameField }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text font-black uppercase text-primary tracking">Location Name</FormLabel>
                                                        <FormControl><Input placeholder="e.g., Lagos Central" {...nameField} className="h-11 font-bold bg-background" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`deliveryLocations.${index}.price`}
                                                render={({ field: priceField }) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text font-black uppercase text-primary tracking">Delivery Price</FormLabel>
                                                        <FormControl><Input type="number" placeholder="0.00" {...priceField} className="h-11 font-bold bg-background" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
