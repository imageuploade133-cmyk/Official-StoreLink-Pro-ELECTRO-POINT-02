
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  Info,
  Palette
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductReviewsSettings } from './components/ProductReviewsSettings';

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

const ColorInput = ({ field, label }: { field: any; label: string }) => (
  <FormItem>
      <FormLabel className="font-bold">{label}</FormLabel>
      <div className="flex items-center gap-3">
           <FormControl>
              <Input type="color" {...field} className="p-1 h-10 w-12 cursor-pointer shrink-0" />
          </FormControl>
          <span className="text-sm font-mono bg-muted px-2 py-1 rounded border">{field.value}</span>
      </div>
      <FormMessage />
  </FormItem>
);

const shoppingExpSchema = z.object({
  storeAddToCartText: z.string().min(2, 'Label too short.').max(30, 'Label too long.'),
  storeAddToCartIcon: z.string().default('ShoppingCart'),
  storeAddToCartStyle: z.enum(['standard', 'gradient']).default('standard'),
  storeAddToCartColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeAddToCartGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeAddToCartGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#1d4ed8'),
  storeGridCartText: z.string().min(2, 'Label too short.').max(20, 'Label too long.'),
  storeGridCartIcon: z.string().default('ShoppingCart'),
  storeGridCartStyle: z.enum(['standard', 'gradient']).default('standard'),
  storeGridCartColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#10b981'),
  storeGridCartGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#10b981'),
  storeGridCartGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#059669'),
  storeHeroBtnText: z.string().min(2, 'Label too short.').max(30, 'Label too long.'),
  storeHeroBtnIcon: z.string().default('ArrowRight'),
  storeHeroBtnStyle: z.enum(['standard', 'gradient']).default('gradient'),
  storeHeroBtnColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#8b5cf6'),
  storeHeroBtnGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#8b5cf6'),
  storeHeroBtnGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#7c3aed'),
  storeBtnStyle: z.enum(['standard', 'gradient']).default('standard'),
  storeBtnColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeBtnGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeBtnGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#1d4ed8'),
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
    storeAddToCartStyle: 'standard',
    storeAddToCartColor: '#3b82f6',
    storeAddToCartGradientStart: '#3b82f6',
    storeAddToCartGradientEnd: '#1d4ed8',
    storeGridCartText: 'Add to Bag',
    storeGridCartIcon: 'ShoppingCart',
    storeGridCartStyle: 'standard',
    storeGridCartColor: '#10b981',
    storeGridCartGradientStart: '#10b981',
    storeGridCartGradientEnd: '#059669',
    storeHeroBtnText: 'Shop Collection',
    storeHeroBtnIcon: 'ArrowRight',
    storeHeroBtnStyle: 'gradient',
    storeHeroBtnColor: '#8b5cf6',
    storeHeroBtnGradientStart: '#8b5cf6',
    storeHeroBtnGradientEnd: '#7c3aed',
    storeBtnStyle: 'standard',
    storeBtnColor: '#3b82f6',
    storeBtnGradientStart: '#3b82f6',
    storeBtnGradientEnd: '#1d4ed8',
  }
  });

  useEffect(() => {
    if (settingsData) {
        form.reset({
          storeAddToCartText: settingsData.storeAddToCartText || 'Secure Purchase',
          storeAddToCartIcon: settingsData.storeAddToCartIcon || 'ShoppingCart',
          storeAddToCartStyle: settingsData.storeAddToCartStyle || 'standard',
          storeAddToCartColor: settingsData.storeAddToCartColor || '#3b82f6',
          storeAddToCartGradientStart: settingsData.storeAddToCartGradientStart || '#3b82f6',
          storeAddToCartGradientEnd: settingsData.storeAddToCartGradientEnd || '#1d4ed8',
          storeGridCartText: settingsData.storeGridCartText || 'Add to Bag',
          storeGridCartIcon: settingsData.storeGridCartIcon || 'ShoppingCart',
          storeGridCartStyle: settingsData.storeGridCartStyle || 'standard',
          storeGridCartColor: settingsData.storeGridCartColor || '#10b981',
          storeGridCartGradientStart: settingsData.storeGridCartGradientStart || '#10b981',
          storeGridCartGradientEnd: settingsData.storeGridCartGradientEnd || '#059669',
          storeHeroBtnText: settingsData.storeHeroBtnText || 'Shop Collection',
          storeHeroBtnIcon: settingsData.storeHeroBtnIcon || 'ArrowRight',
          storeHeroBtnStyle: settingsData.storeHeroBtnStyle || 'gradient',
          storeHeroBtnColor: settingsData.storeHeroBtnColor || '#8b5cf6',
          storeHeroBtnGradientStart: settingsData.storeHeroBtnGradientStart || '#8b5cf6',
          storeHeroBtnGradientEnd: settingsData.storeHeroBtnGradientEnd || '#7c3aed',
          storeBtnStyle: settingsData.storeBtnStyle || 'standard',
          storeBtnColor: settingsData.storeBtnColor || '#3b82f6',
          storeBtnGradientStart: settingsData.storeBtnGradientStart || '#3b82f6',
          storeBtnGradientEnd: settingsData.storeBtnGradientEnd || '#1d4ed8',
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
        title="Shopping Experience & Product Ratings"
        description="Customize buttons, CTAs, and enable customer review ratings on your public website."
      />

      {/* Product Reviews Section */}
      <div className="mt-8">
        {firestore && (
          <ProductReviewsSettings settingsData={settingsData} firestore={firestore} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Global Button Branding */}
              <Card className="shadow-lg border-none ring-1 ring-border">
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Global Button Branding
                  </CardTitle>
                  <CardDescription>This setting applies a consistent color style across ALL buttons in your store.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  <FormField
                    control={form.control}
                    name="storeBtnStyle"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-black">Overall Button Theme</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            <div>
                              <RadioGroupItem value="standard" id="global-standard" className="peer sr-only" />
                              <Label
                                htmlFor="global-standard"
                                className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                              >
                                <div className="h-10 w-full rounded-lg bg-primary mb-2 shadow-sm" />
                                <span className="font-bold">Solid Primary</span>
                              </Label>
                            </div>
                            <div>
                              <RadioGroupItem value="gradient" id="global-gradient" className="peer sr-only" />
                              <Label
                                htmlFor="global-gradient"
                                className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                              >
                                <div className="h-10 w-full rounded-lg bg-gradient-to-r from-primary to-blue-700 mb-2 shadow-sm" />
                                <span className="font-bold">Modern Gradient</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('storeBtnStyle') === 'standard' ? (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <FormField
                        control={form.control}
                        name="storeBtnColor"
                        render={({ field }) => <ColorInput field={field} label="Global Button Color" />}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                      <FormField
                        control={form.control}
                        name="storeBtnGradientStart"
                        render={({ field }) => <ColorInput field={field} label="Gradient Start" />}
                      />
                      <FormField
                        control={form.control}
                        name="storeBtnGradientEnd"
                        render={({ field }) => <ColorInput field={field} label="Gradient End" />}
                      />
                    </div>
                  )}

                  {/* Live Preview */}
                  <div className="mt-8 p-6 rounded-2xl border-2 border-dashed border-primary/20 flex flex-col items-center gap-4 bg-muted/5">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Live Global Preview</span>
                    <Button 
                      type="button" 
                      style={form.watch('storeBtnStyle') === 'standard' ? { backgroundColor: form.watch('storeBtnColor') } : { background: `linear-gradient(to right, ${form.watch('storeBtnGradientStart')}, ${form.watch('storeBtnGradientEnd')})` }}
                      className="h-14 px-10 rounded-xl font-black text-lg shadow-xl border-none text-white pointer-events-none"
                    >
                      Sample Store Button
                    </Button>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900 flex gap-3 items-start">
                    <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                      <strong>Note:</strong> While text and icons can be customized for each button type below, the color and gradient defined here will be used globally for a unified brand experience.
                    </p>
                  </div>
                </CardContent>
              </Card>

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
