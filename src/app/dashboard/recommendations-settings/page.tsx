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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Loader2, Save, Info, Eye, EyeOff, Palette } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const recommendationsSchema = z.object({
  showRelatedProducts: z.boolean().default(true),
  relatedProductsBackgroundStyle: z.enum(['solid', 'gradient']).default('solid'),
  relatedProductsBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#f8fafc'),
  relatedProductsGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#f5f5f7'),
  relatedProductsGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#ffffff'),
  relatedProductsTitle: z.string().min(3, 'Title must be at least 3 characters.'),
  relatedProductsDescription: z.string().optional().or(z.literal('')),
  // Text Color Settings
  relatedProductsTextColorStyle: z.enum(['solid', 'gradient']).default('solid'),
  relatedProductsTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#1d1d1f'),
  relatedProductsTextGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#3b82f6'),
  relatedProductsTextGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#8b5cf6'),
  // Button Color Settings
  relatedProductsButtonStyle: z.enum(['solid', 'gradient']).default('solid'),
  relatedProductsButtonColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#3b82f6'),
  relatedProductsButtonGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#3b82f6'),
  relatedProductsButtonGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#1d4ed8'),
});

type FormValues = z.infer<typeof recommendationsSchema>;

const ColorInput = ({ field, label, disabled }: { field: any; label: string; disabled?: boolean }) => (
    <FormItem>
        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</FormLabel>
        <div className="flex items-center gap-3">
            <FormControl>
                <Input 
                    type="color" 
                    {...field} 
                    className="p-1 h-10 w-12 cursor-pointer rounded-md border-2" 
                    disabled={disabled}
                />
            </FormControl>
            <span className="text-sm font-mono font-medium text-muted-foreground">{field.value}</span>
        </div>
        <FormMessage />
    </FormItem>
);

export default function RecommendationsSettingsPage() {
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
    resolver: zodResolver(recommendationsSchema),
    defaultValues: {
      showRelatedProducts: true,
      relatedProductsBackgroundStyle: 'solid',
      relatedProductsBackgroundColor: '#f8fafc',
      relatedProductsGradientStart: '#f5f5f7',
      relatedProductsGradientEnd: '#ffffff',
      relatedProductsTitle: 'You Might Also Like',
      relatedProductsDescription: 'Specially curated items from the same collection.',
      relatedProductsTextColorStyle: 'solid',
      relatedProductsTextColor: '#1d1d1f',
      relatedProductsTextGradientStart: '#3b82f6',
      relatedProductsTextGradientEnd: '#8b5cf6',
      relatedProductsButtonStyle: 'solid',
      relatedProductsButtonColor: '#3b82f6',
      relatedProductsButtonGradientStart: '#3b82f6',
      relatedProductsButtonGradientEnd: '#1d4ed8',
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        showRelatedProducts: settingsData.showRelatedProducts ?? true,
        relatedProductsBackgroundStyle: settingsData.relatedProductsBackgroundStyle || 'solid',
        relatedProductsBackgroundColor: settingsData.relatedProductsBackgroundColor || '#f8fafc',
        relatedProductsGradientStart: settingsData.relatedProductsGradientStart || '#f5f5f7',
        relatedProductsGradientEnd: settingsData.relatedProductsGradientEnd || '#ffffff',
        relatedProductsTitle: settingsData.relatedProductsTitle || 'You Might Also Like',
        relatedProductsDescription: settingsData.relatedProductsDescription || 'Specially curated items from the same collection.',
        relatedProductsTextColorStyle: settingsData.relatedProductsTextColorStyle || 'solid',
        relatedProductsTextColor: settingsData.relatedProductsTextColor || '#1d1d1f',
        relatedProductsTextGradientStart: settingsData.relatedProductsTextGradientStart || '#3b82f6',
        relatedProductsTextGradientEnd: settingsData.relatedProductsTextGradientEnd || '#8b5cf6',
        relatedProductsButtonStyle: settingsData.relatedProductsButtonStyle || 'solid',
        relatedProductsButtonColor: settingsData.relatedProductsButtonColor || '#3b82f6',
        relatedProductsButtonGradientStart: settingsData.relatedProductsButtonGradientStart || '#3b82f6',
        relatedProductsButtonGradientEnd: settingsData.relatedProductsButtonGradientEnd || '#1d4ed8',
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
      toast({ title: 'Settings Saved', description: 'Product recommendation preferences updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingMainSettings || (currentStoreId ? isLoadingOldSettings : false);
  const isVisible = form.watch('showRelatedProducts');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Sparkles} title="Recommendation Settings" description="Loading..." />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        title="Product Recommendations"
        description="Manage the dynamic 'You Might Also Like' section displayed on product detail pages."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className={cn(!isVisible && "border-orange-200 bg-orange-50/30")}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Display & Styling</CardTitle>
                        <CardDescription>Control the appearance of related products.</CardDescription>
                    </div>
                    <FormField
                        control={form.control}
                        name="showRelatedProducts"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-full border px-4 py-2 bg-background shadow-sm">
                            <div className="flex items-center gap-2">
                                {field.value ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                                <FormLabel className="text-xs font-bold uppercase tracking-widest">{field.value ? 'Visible' : 'Hidden'}</FormLabel>
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
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="relatedProductsTitle"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Section Title</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., You Might Also Like" {...field} disabled={!isVisible} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                      control={form.control}
                      name="relatedProductsDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tagline / Description</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Specially curated items from the same collection" 
                              {...field} 
                              disabled={!isVisible}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Palette className="h-4 w-4" /> Background Styling
                    </h4>
                    
                    <FormField
                      control={form.control}
                      name="relatedProductsBackgroundStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {[
                                { value: 'solid', label: 'Solid Color', icon: '■' },
                                { value: 'gradient', label: 'Gradient', icon: '⊔' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => field.onChange(option.value)}
                                  disabled={!isVisible}
                                  className={`flex items-center justify-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                                    field.value === option.value
                                      ? 'border-primary bg-primary/5 shadow-sm'
                                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                                  } ${!isVisible && 'opacity-50 cursor-not-allowed'}`}
                                >
                                  <span className="text-xl">{option.icon}</span>
                                  <span className="text-sm font-bold">{option.label}</span>
                                </button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('relatedProductsBackgroundStyle') === 'solid' ? (
                      <div className="p-4 rounded-xl border bg-muted/30 animate-in fade-in duration-300">
                        <FormField
                          control={form.control}
                          name="relatedProductsBackgroundColor"
                          render={({ field }) => (
                            <div className="flex items-center justify-between gap-4">
                                <ColorInput field={field} label="Solid Background Color" disabled={!isVisible} />
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => field.onChange('#f8fafc')}
                                    disabled={!isVisible}
                                    className="rounded-full px-4"
                                >
                                    Reset Default
                                </Button>
                            </div>
                          )}
                        />
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border bg-muted/30 animate-in fade-in duration-300 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                            control={form.control}
                            name="relatedProductsGradientStart"
                            render={({ field }) => <ColorInput field={field} label="Gradient Start" disabled={!isVisible} />}
                            />
                            <FormField
                            control={form.control}
                            name="relatedProductsGradientEnd"
                            render={({ field }) => <ColorInput field={field} label="Gradient End" disabled={!isVisible} />}
                            />
                        </div>
                        <div 
                          className="h-10 w-full rounded-lg border shadow-inner" 
                          style={{ 
                            background: `linear-gradient(to right, ${form.watch('relatedProductsGradientStart')}, ${form.watch('relatedProductsGradientEnd')})` 
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Text Color Styling */}
                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Palette className="h-4 w-4" /> Text Color Styling
                    </h4>
                    
                    <FormField
                      control={form.control}
                      name="relatedProductsTextColorStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {[
                                { value: 'solid', label: 'Solid Color', icon: '■' },
                                { value: 'gradient', label: 'Gradient', icon: '⊔' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => field.onChange(option.value)}
                                  disabled={!isVisible}
                                  className={`flex items-center justify-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                                    field.value === option.value
                                      ? 'border-primary bg-primary/5 shadow-sm'
                                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                                  } ${!isVisible && 'opacity-50 cursor-not-allowed'}`}
                                >
                                  <span className="text-xl">{option.icon}</span>
                                  <span className="text-sm font-bold">{option.label}</span>
                                </button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('relatedProductsTextColorStyle') === 'solid' ? (
                      <div className="p-4 rounded-xl border bg-muted/30 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between gap-4">
                            <FormField
                              control={form.control}
                              name="relatedProductsTextColor"
                              render={({ field }) => <ColorInput field={field} label="Text Color" disabled={!isVisible} />}
                            />
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => form.setValue('relatedProductsTextColor', '#1d1d1f')}
                                disabled={!isVisible}
                                className="rounded-full px-4"
                            >
                                Reset Default
                            </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border bg-muted/30 animate-in fade-in duration-300 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                            control={form.control}
                            name="relatedProductsTextGradientStart"
                            render={({ field }) => <ColorInput field={field} label="Gradient Start Color" disabled={!isVisible} />}
                            />
                            <FormField
                            control={form.control}
                            name="relatedProductsTextGradientEnd"
                            render={({ field }) => <ColorInput field={field} label="Gradient End Color" disabled={!isVisible} />}
                            />
                        </div>
                        <div 
                          className="h-10 w-full rounded-lg border shadow-inner relative overflow-hidden"
                          style={{ 
                            background: `linear-gradient(to right, ${form.watch('relatedProductsTextGradientStart')}, ${form.watch('relatedProductsTextGradientEnd')})` 
                          }}
                        >
                          <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm drop-shadow-md">
                            Preview
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Button Color Styling */}
                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Palette className="h-4 w-4" /> Button Color Styling
                    </h4>
                    
                    <FormField
                      control={form.control}
                      name="relatedProductsButtonStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {[
                                { value: 'solid', label: 'Solid Color', icon: '■' },
                                { value: 'gradient', label: 'Gradient', icon: '⊔' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => field.onChange(option.value)}
                                  disabled={!isVisible}
                                  className={`flex items-center justify-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                                    field.value === option.value
                                      ? 'border-primary bg-primary/5 shadow-sm'
                                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                                  } ${!isVisible && 'opacity-50 cursor-not-allowed'}`}
                                >
                                  <span className="text-xl">{option.icon}</span>
                                  <span className="text-sm font-bold">{option.label}</span>
                                </button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('relatedProductsButtonStyle') === 'solid' ? (
                      <div className="p-4 rounded-xl border bg-muted/30 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between gap-4">
                            <FormField
                              control={form.control}
                              name="relatedProductsButtonColor"
                              render={({ field }) => <ColorInput field={field} label="Button Color" disabled={!isVisible} />}
                            />
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => form.setValue('relatedProductsButtonColor', '#3b82f6')}
                                disabled={!isVisible}
                                className="rounded-full px-4"
                            >
                                Reset Default
                            </Button>
                        </div>
                        <div className="mt-4">
                          <Button 
                            className="w-full font-bold"
                            style={{ backgroundColor: form.watch('relatedProductsButtonColor') }}
                          >
                            Button Preview
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border bg-muted/30 animate-in fade-in duration-300 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                            control={form.control}
                            name="relatedProductsButtonGradientStart"
                            render={({ field }) => <ColorInput field={field} label="Button Gradient Start" disabled={!isVisible} />}
                            />
                            <FormField
                            control={form.control}
                            name="relatedProductsButtonGradientEnd"
                            render={({ field }) => <ColorInput field={field} label="Button Gradient End" disabled={!isVisible} />}
                            />
                        </div>
                        <div 
                          className="h-10 w-full rounded-lg border shadow-inner relative overflow-hidden"
                          style={{ 
                            background: `linear-gradient(to right, ${form.watch('relatedProductsButtonGradientStart')}, ${form.watch('relatedProductsButtonGradientEnd')})` 
                          }}
                        >
                          <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm drop-shadow-md">
                            Preview
                          </span>
                        </div>
                        <div className="mt-4">
                          <Button 
                            className="w-full font-bold text-white"
                            style={{ 
                              background: `linear-gradient(to right, ${form.watch('relatedProductsButtonGradientStart')}, ${form.watch('relatedProductsButtonGradientEnd')})`
                            }}
                          >
                            Button Preview
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-6">
                  <Button type="submit" disabled={isSaving} size="lg" className="min-w-[200px] font-bold">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Recommendation Settings
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
                <Info className="h-4 w-4" /> Recommendation Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
              <p>The &quot;You Might Also Like&quot; section uses a smart fallback algorithm:</p>
              <ul className="list-disc pl-5 space-y-2 font-medium">
                <li>First, it finds products in the **same category**.</li>
                <li>It then **randomizes** them to provide a fresh experience.</li>
                <li>If the category is empty, it displays your **newest products**.</li>
              </ul>
              <Separator className="bg-primary/10" />
              <p className="text-xs italic">
                Turning this section OFF will remove it entirely from all individual product pages.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
