
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
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MousePointerClick, 
  Loader2, 
  Save, 
  ShoppingCart, 
  ShoppingBag, 
  Plus, 
  Check, 
  Zap, 
  CreditCard, 
  ArrowRight,
  Package,
  CheckCircle2,
  Info
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';

const iconOptions = [
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Plus', icon: Plus },
  { name: 'Check', icon: Check },
  { name: 'CheckCircle2', icon: CheckCircle2 },
  { name: 'Zap', icon: Zap },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'ArrowRight', icon: ArrowRight },
  { name: 'Package', icon: Package },
];

const shoppingExpSchema = z.object({
  storeAddToCartText: z.string().min(2, 'Label too short.').max(30, 'Label too long.'),
  storeAddToCartIcon: z.string().default('ShoppingCart'),
  storeGridCartText: z.string().min(2, 'Label too short.').max(20, 'Label too long.'),
  storeGridCartIcon: z.string().default('ShoppingCart'),
  storeHeroBtnText: z.string().min(2, 'Label too short.').max(30, 'Label too long.'),
  storeHeroBtnIcon: z.string().default('ArrowRight'),
});

type FormValues = z.infer<typeof shoppingExpSchema>;

export default function ShoppingExperienceSettingsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const settingsRef = useMemo(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  );

  const { data: settingsData, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(shoppingExpSchema),
    defaultValues: {
      storeAddToCartText: 'Secure Purchase',
      storeAddToCartIcon: 'ShoppingCart',
      storeGridCartText: 'Add to Bag',
      storeGridCartIcon: 'ShoppingCart',
      storeHeroBtnText: 'Shop Collection',
      storeHeroBtnIcon: 'ArrowRight',
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        storeAddToCartText: settingsData.storeAddToCartText || 'Secure Purchase',
        storeAddToCartIcon: settingsData.storeAddToCartIcon || 'ShoppingCart',
        storeGridCartText: settingsData.storeGridCartText || 'Add to Bag',
        storeGridCartIcon: settingsData.storeGridCartIcon || 'ShoppingCart',
        storeHeroBtnText: settingsData.storeHeroBtnText || 'Shop Collection',
        storeHeroBtnIcon: settingsData.storeHeroBtnIcon || 'ArrowRight',
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Experience Updated', description: 'Shopping button settings have been saved.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update shopping settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoadingSettings) {
    return (
      <div className="space-y-6">
        <PageHeader icon={MousePointerClick} title="Shopping Experience" description="Loading..." />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  const renderIconItem = (iconName: string) => {
    const IconComp = iconOptions.find(i => i.name === iconName)?.icon || ShoppingCart;
    return (
      <div className="flex items-center gap-2">
        <IconComp className="h-4 w-4" />
        <span>{iconName}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MousePointerClick}
        title="Shopping Buttons & CTAs"
        description="Customize the labels and icons for all purchase-related buttons on your public website."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Product Details Button */}
              <Card className="shadow-lg border-none ring-1 ring-border">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="text-lg">Product Details CTA</CardTitle>
                  <CardDescription>The main button found on individual product pages.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="storeAddToCartText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Button Label</FormLabel>
                          <FormControl><Input placeholder="Secure Purchase" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="storeAddToCartIcon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Button Icon</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {iconOptions.map(opt => (
                                <SelectItem key={opt.name} value={opt.name}>
                                  {renderIconItem(opt.name)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Grid/Card Button */}
              <Card className="shadow-lg border-none ring-1 ring-border">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-lg">Catalog Grid Button</CardTitle>
                  <CardDescription>The quick-add button shown on product cards in the shop and homepage.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="storeGridCartText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Button Label</FormLabel>
                          <FormControl><Input placeholder="Add to Bag" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="storeGridCartIcon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Button Icon</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {iconOptions.map(opt => (
                                <SelectItem key={opt.name} value={opt.name}>
                                  {renderIconItem(opt.name)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Hero Carousel Button */}
              <Card className="shadow-lg border-none ring-1 ring-border">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-lg">Hero Carousel CTA</CardTitle>
                  <CardDescription>The primary action button on your homepage slideshow.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="storeHeroBtnText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Button Label</FormLabel>
                          <FormControl><Input placeholder="Shop Collection" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="storeHeroBtnIcon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Button Icon</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {iconOptions.map(opt => (
                                <SelectItem key={opt.name} value={opt.name}>
                                  {renderIconItem(opt.name)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4 pt-4">
                <Button type="submit" disabled={isSaving} size="lg" className="min-w-[200px] h-14 text-lg font-black shadow-xl shadow-primary/20">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save All Button Settings
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-widest">
                <Info className="h-4 w-4" /> Conversion Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
              <p>Labels matter. Use strong action verbs like <strong>Buy</strong>, <strong>Get</strong>, or <strong>Add</strong> to drive higher conversion rates.</p>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <p>Keep grid labels short (e.g., "Add") for mobile clarity.</p>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <p>Use "Secure Purchase" to build trust during checkout.</p>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <p>Experiment with emojis in text for a modern brand feel.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
