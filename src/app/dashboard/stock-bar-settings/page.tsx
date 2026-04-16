
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Activity, Loader2, Save, Info, Eye, EyeOff, CheckCircle2, AlertTriangle, PackageSearch, Palette } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { StockBar } from '@/components/store/StockBar';

const stockBarSchema = z.object({
  showStockBar: z.boolean().default(true),
  stockBarHealthyLabel: z.string().min(2, 'Healthy label is too short.').max(40, 'Healthy label is too long.'),
  stockBarLowLabel: z.string().min(2, 'Low stock label is too short.').max(40, 'Low stock label is too long.'),
  stockBarOutLabel: z.string().min(2, 'Out of stock label is too short.').max(40, 'Out of stock label is too long.'),
  stockBarHealthyColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#3b82f6'),
  stockBarLowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#f59e0b'),
  stockBarOutColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#ef4444'),
});

type FormValues = z.infer<typeof stockBarSchema>;

const ColorInput = ({ field, label }: { field: any; label: string }) => (
    <FormItem>
        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</FormLabel>
        <div className="relative flex items-center">
             <FormControl>
                <Input type="color" {...field} value={field.value || '#000000'} className="p-1 h-10 w-12 cursor-pointer rounded-lg border-2" />
            </FormControl>
            <span className="absolute left-14 text-sm text-muted-foreground font-mono">{field.value}</span>
        </div>
        <FormMessage />
    </FormItem>
);

export default function StockBarSettingsPage() {
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

  const form = useForm<FormValues>({
    resolver: zodResolver(stockBarSchema),
    defaultValues: {
      showStockBar: true,
      stockBarHealthyLabel: 'Stock Level: Healthy',
      stockBarLowLabel: 'Limited Availability',
      stockBarOutLabel: 'Currently Sold Out',
      stockBarHealthyColor: '#3b82f6',
      stockBarLowColor: '#f59e0b',
      stockBarOutColor: '#ef4444',
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        showStockBar: settingsData.showStockBar ?? true,
        stockBarHealthyLabel: settingsData.stockBarHealthyLabel || 'Stock Level: Healthy',
        stockBarLowLabel: settingsData.stockBarLowLabel || 'Limited Availability',
        stockBarOutLabel: settingsData.stockBarOutLabel || 'Currently Sold Out',
        stockBarHealthyColor: settingsData.stockBarHealthyColor || '#3b82f6',
        stockBarLowColor: settingsData.stockBarLowColor || '#f59e0b',
        stockBarOutColor: settingsData.stockBarOutColor || '#ef4444',
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
      toast({ title: 'Settings Saved', description: 'Stock bar configuration has been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingMainSettings || (currentStoreId ? isLoadingOldSettings : false);
  const isEnabled = form.watch('showStockBar');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Activity} title="Stock Bar Settings" description="Loading configuration..." />
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title="Stock Bar Management"
        description="Configure how inventory levels are visually communicated to your storefront visitors."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className={cn("shadow-xl border-none ring-1 ring-border overflow-hidden", !isEnabled && "opacity-60 grayscale-[0.5]")}>
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Visual Configuration</CardTitle>
                    <CardDescription>Customize labels and colors for the inventory bar.</CardDescription>
                  </div>
                  <FormField
                    control={form.control}
                    name="showStockBar"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0 rounded-full border px-4 py-2 bg-background shadow-lg">
                        <div className="flex items-center gap-2">
                            {field.value ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest">{field.value ? 'Visible' : 'Hidden'}</FormLabel>
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
                </CardHeader>
                <CardContent className="pt-8 space-y-10">
                  {/* Healthy State */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" /> Healthy Stock State
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="stockBarHealthyLabel"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs font-bold">Status Label</FormLabel>
                                <FormControl><Input placeholder="e.g., Stock Level: Healthy" {...field} className="h-11" /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="stockBarHealthyColor" render={({ field }) => <ColorInput field={field} label="Bar Color" />} />
                    </div>
                  </div>

                  <Separator className="border-dashed" />

                  {/* Low Stock State */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock State
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="stockBarLowLabel"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs font-bold">Status Label</FormLabel>
                                <FormControl><Input placeholder="e.g., Limited Availability" {...field} className="h-11" /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="stockBarLowColor" render={({ field }) => <ColorInput field={field} label="Bar Color" />} />
                    </div>
                  </div>

                  <Separator className="border-dashed" />

                  {/* Out of Stock State */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                        <PackageSearch className="h-4 w-4 text-destructive" /> Depleted Stock State
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="stockBarOutLabel"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs font-bold">Status Label</FormLabel>
                                <FormControl><Input placeholder="e.g., Currently Sold Out" {...field} className="h-11" /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="stockBarOutColor" render={({ field }) => <ColorInput field={field} label="Bar Color" />} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t p-6">
                  <Button type="submit" disabled={isSaving} className="font-black uppercase tracking-widest text-xs h-12 px-8 shadow-xl shadow-primary/20">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Sync Configuration
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="shadow-lg border-none ring-1 ring-border">
                <CardHeader className="bg-muted/10">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Live Simulation
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-10">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">State: Healthy</Label>
                        <StockBar 
                            stock={100} 
                            lowStockThreshold={10} 
                            forceVisible={true}
                            forceHealthyLabel={form.watch('stockBarHealthyLabel')}
                            forceHealthyColor={form.watch('stockBarHealthyColor')}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">State: Low</Label>
                        <StockBar 
                            stock={5} 
                            lowStockThreshold={10} 
                            forceVisible={true}
                            forceLowLabel={form.watch('stockBarLowLabel')}
                            forceLowColor={form.watch('stockBarLowColor')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">State: Empty</Label>
                        <StockBar 
                            stock={0} 
                            lowStockThreshold={10} 
                            forceVisible={true}
                            forceOutLabel={form.watch('stockBarOutLabel')}
                            forceOutColor={form.watch('stockBarOutColor')}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/10 flex gap-4 items-start">
                <Palette className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-2">
                    <p className="font-bold text-primary uppercase tracking-wider">Color Psychology</p>
                    <p className="text-muted-foreground leading-relaxed font-medium">
                        Custom colors can reinforce your brand identity. For example, using a gold tint for low stock 
                        creates a sense of "Luxury Exclusivity" rather than simple urgency.
                    </p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
