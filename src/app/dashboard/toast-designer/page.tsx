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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  BellRing, 
  Loader2, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  Palette,
  Brush,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Layout,
  ArrowLeftRight,
  X,
  CircleX,
  XSquare,
  Minus,
  Maximize,
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const toastSchema = z.object({
  toastBackgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).default('#ffffff'),
  toastTextColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).default('#000000'),
  toastBorderColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).default('#e2e8f0'),
  toastBorderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl', '2xl', 'full']).default('2xl'),
  toastSuccessColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).default('#10b981'),
  toastErrorColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).default('#ef4444'),
  toastWarningColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).default('#f59e0b'),
  toastInfoColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).default('#3b82f6'),
  toastPosition: z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center']).default('top-center'),
  toastAnimation: z.enum(['slide', 'fade', 'zoom']).default('slide'),
  toastUseGradient: z.boolean().default(false),
  toastGradientStartColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).default('#ffffff'),
  toastGradientEndColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).default('#f8fafc'),
  toastGradientAngle: z.number().min(0).max(360).default(135),
  toastScale: z.number().min(0.5).max(1.5).default(1),
  toastCloseIconColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).default('#000000'),
  toastCloseIconType: z.enum(['x', 'circle-x', 'x-square', 'minus']).default('x'),
});

type FormValues = z.infer<typeof toastSchema>;

const borderRadii = [
  { name: 'none', label: 'Square', class: 'rounded-none' },
  { name: 'sm', label: 'Small', class: 'rounded-sm' },
  { name: 'md', label: 'Medium', class: 'rounded-md' },
  { name: 'lg', label: 'Large', class: 'rounded-lg' },
  { name: 'xl', label: 'X-Large', class: 'rounded-xl' },
  { name: '2xl', label: '2X-Large', class: 'rounded-2xl' },
  { name: 'full', label: 'Pill', class: 'rounded-full' },
];

const solidPresets = [
  { name: 'White', color: '#ffffff' },
  { name: 'Black', color: '#000000' },
  { name: 'Slate', color: '#0f172a' },
  { name: 'Royal', color: '#1e3a8a' },
  { name: 'Emerald', color: '#064e3b' },
  { name: 'Rose', color: '#4c0519' },
];

const gradientPresets = [
  { name: 'Soft Gray', start: '#ffffff', end: '#f8fafc', angle: 135 },
  { name: 'Sunset', start: '#ff7e5f', end: '#feb47b', angle: 135 },
  { name: 'Ocean', start: '#2b5876', end: '#4e4376', angle: 135 },
  { name: 'Emerald', start: '#11998e', end: '#38ef7d', angle: 135 },
  { name: 'Royal', start: '#24243e', end: '#302b63', angle: 135 },
  { name: 'Midnight', start: '#232526', end: '#414345', angle: 135 },
  { name: 'Passion', start: '#e52d27', end: '#b31217', angle: 135 },
  { name: 'Frost', start: '#00c6ff', end: '#0072ff', angle: 135 },
  { name: 'Lush', start: '#a8ff78', end: '#78ffd6', angle: 135 },
  { name: 'Purpure', start: '#6a11cb', end: '#2575fc', angle: 135 },
  { name: 'Cyberpunk', start: '#ff00cc', end: '#3333ff', angle: 135 },
  { name: 'Gold', start: '#f2994a', end: '#f2c94c', angle: 135 },
];

const getContrastingColor = (hex: string) => {
  if (!hex) return '#000000';
  const color = hex.startsWith('#') ? hex.slice(1) : hex;
  if (color.length === 3) {
    const r = parseInt(color[0] + color[0], 16);
    const g = parseInt(color[1] + color[1], 16);
    const b = parseInt(color[2] + color[2], 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
  }
  if (color.length === 6) {
    const r = parseInt(color.slice(0, 2), 16);
    const g = parseInt(color.slice(2, 4), 16);
    const b = parseInt(color.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
  }
  return '#000000';
};

export default function ToastDesignerPage() {
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

  const { data: settingsData, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(toastSchema),
    defaultValues: {
      toastBackgroundColor: '#ffffff',
      toastTextColor: '#000000',
      toastBorderColor: '#e2e8f0',
      toastBorderRadius: '2xl',
      toastSuccessColor: '#10b981',
      toastErrorColor: '#ef4444',
      toastWarningColor: '#f59e0b',
      toastInfoColor: '#3b82f6',
      toastPosition: 'top-center',
      toastAnimation: 'slide',
      toastUseGradient: false,
      toastGradientStartColor: '#ffffff',
      toastGradientEndColor: '#f8fafc',
      toastGradientAngle: 135,
      toastScale: 1,
      toastCloseIconColor: '#000000',
      toastCloseIconType: 'x',
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        toastBackgroundColor: settingsData.toastBackgroundColor || '#ffffff',
        toastTextColor: settingsData.toastTextColor || '#000000',
        toastBorderColor: settingsData.toastBorderColor || '#e2e8f0',
        toastBorderRadius: (settingsData.toastBorderRadius as any) || '2xl',
        toastSuccessColor: settingsData.toastSuccessColor || '#10b981',
        toastErrorColor: settingsData.toastErrorColor || '#ef4444',
        toastWarningColor: settingsData.toastWarningColor || '#f59e0b',
        toastInfoColor: settingsData.toastInfoColor || '#3b82f6',
        toastPosition: (settingsData.toastPosition as any) || 'top-center',
        toastAnimation: (settingsData.toastAnimation as any) || 'slide',
        toastUseGradient: settingsData.toastUseGradient || false,
        toastGradientStartColor: settingsData.toastGradientStartColor || '#ffffff',
        toastGradientEndColor: settingsData.toastGradientEndColor || '#f8fafc',
        toastGradientAngle: settingsData.toastGradientAngle || 135,
        toastScale: settingsData.toastScale || 1,
        toastCloseIconColor: settingsData.toastCloseIconColor || '#000000',
        toastCloseIconType: (settingsData.toastCloseIconType as any) || 'x',
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
      toast({ title: 'Success', description: 'Your Toast UI settings have been saved.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingSettings;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={BellRing} title="Toast Designer" description="Loading..." />
        <Skeleton className="h-[800px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  const watchedValues = form.watch();

  const getBorderRadiusClass = (radius: string) => {
    const found = borderRadii.find(r => r.name === radius);
    return found ? found.class : 'rounded-2xl';
  };

  const ToastPreview = ({ type }: { type: 'default' | 'success' | 'error' | 'warning' | 'info' }) => {
    let icon = <Info className="h-5 w-5" />;
    let title = "Notification Title";
    let description = "This is a toast message description.";
    let accentColor = watchedValues.toastInfoColor;

    if (type === 'success') {
      icon = <CheckCircle2 className="h-5 w-5" />;
      title = "Success Message";
      description = "Your action was completed successfully.";
      accentColor = watchedValues.toastSuccessColor;
    } else if (type === 'error') {
      icon = <XCircle className="h-5 w-5" />;
      title = "Error Occurred";
      description = "Something went wrong. Please try again.";
      accentColor = watchedValues.toastErrorColor;
    } else if (type === 'warning') {
      icon = <AlertTriangle className="h-5 w-5" />;
      title = "Warning Issued";
      description = "Please be careful with this action.";
      accentColor = watchedValues.toastWarningColor;
    }

    const CloseIcon = () => {
      switch (watchedValues.toastCloseIconType) {
        case 'circle-x': return <CircleX className="h-4 w-4" style={{ color: watchedValues.toastCloseIconColor }} />;
        case 'x-square': return <XSquare className="h-4 w-4" style={{ color: watchedValues.toastCloseIconColor }} />;
        case 'minus': return <Minus className="h-4 w-4" style={{ color: watchedValues.toastCloseIconColor }} />;
        default: return <X className="h-4 w-4" style={{ color: watchedValues.toastCloseIconColor }} />;
      }
    };

    return (
      <div 
        className={cn(
          "w-full max-w-sm p-4 border shadow-lg flex items-center gap-4 relative overflow-hidden",
          getBorderRadiusClass(watchedValues.toastBorderRadius)
        )}
        style={{
          background: watchedValues.toastUseGradient 
            ? `linear-gradient(${watchedValues.toastGradientAngle}deg, ${watchedValues.toastGradientStartColor}, ${watchedValues.toastGradientEndColor})`
            : watchedValues.toastBackgroundColor,
          color: watchedValues.toastTextColor,
          borderColor: watchedValues.toastBorderColor,
          transform: `scale(${watchedValues.toastScale})`,
        }}
      >
        <div 
          className="flex-shrink-0 p-2 rounded-xl"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">{title}</h4>
          <p className="text-xs opacity-70">{description}</p>
        </div>
        
        <div className="flex-shrink-0 self-start mt-0.5">
          <CloseIcon />
        </div>
        
        {/* Progress bar simulation */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-black/5">
          <div 
            className="h-full" 
            style={{ 
              backgroundColor: type === 'default' ? watchedValues.toastInfoColor : accentColor,
              width: '60%' 
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          icon={BellRing}
          title="Toast Notification Designer"
          description="Customize the look and feel of your app's notifications"
        />
        <div className="flex gap-3">
           <Button
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSaving}
              className="gap-2 rounded-xl"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSaving}
              className="gap-2 min-w-[150px] rounded-xl shadow-lg shadow-primary/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Config</span>
                </>
              )}
            </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/20">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Brush className="h-5 w-5 text-primary" /> Colors & Base Style
                  </CardTitle>
                  <CardDescription>Adjust the fundamental colors and shape of your toasts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="toastBackgroundColor"
                      render={({ field }) => (
                        <FormItem className={watchedValues.toastUseGradient ? 'opacity-40 grayscale pointer-events-none' : ''}>
                          <FormLabel className="font-bold">Background Color</FormLabel>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-lg border-2" />
                            </FormControl>
                            <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                          </div>
                          {watchedValues.toastUseGradient && <p className="text-[10px] text-muted-foreground italic">Overridden by gradient</p>}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="toastTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="font-bold">Text Color</FormLabel>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] uppercase font-bold text-primary hover:bg-primary/10"
                              onClick={() => {
                                const bg = watchedValues.toastUseGradient 
                                  ? watchedValues.toastGradientStartColor 
                                  : watchedValues.toastBackgroundColor;
                                form.setValue('toastTextColor', getContrastingColor(bg));
                              }}
                            >
                              Auto-Contrast
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-lg border-2" />
                            </FormControl>
                            <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="toastBorderColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Border Color</FormLabel>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-lg border-2" />
                            </FormControl>
                            <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="toastBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Corner Rounding</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-background/50">
                                <SelectValue placeholder="Select rounding" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {borderRadii.map(r => (
                                <SelectItem key={r.name} value={r.name}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  {!watchedValues.toastUseGradient && (
                    <div className="space-y-3 pt-4 border-t border-dashed">
                      <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Quick Solid Presets</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {solidPresets.map((preset) => (
                          <Button
                            key={preset.name}
                            type="button"
                            variant="outline"
                            className="text-[10px] h-7 px-2 gap-1.5 rounded-full hover:bg-muted"
                            onClick={() => {
                              form.setValue('toastBackgroundColor', preset.color);
                              form.setValue('toastTextColor', getContrastingColor(preset.color));
                            }}
                          >
                            <div 
                              className="h-3 w-3 rounded-full border border-muted" 
                              style={{ backgroundColor: preset.color }}
                            />
                            {preset.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/20">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Gradient Background
                  </CardTitle>
                  <CardDescription>Enhance your toasts with a beautiful gradient effect.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="toastUseGradient"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background/50">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-bold">Use Gradient</FormLabel>
                          <FormDescription>
                            Enable linear gradient background for notifications.
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

                  {watchedValues.toastUseGradient && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        <FormField
                          control={form.control}
                          name="toastGradientStartColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">Start Color</FormLabel>
                              <div className="flex items-center gap-3">
                                <FormControl>
                                  <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-lg border-2" />
                                </FormControl>
                                <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="hidden md:flex absolute left-1/2 top-9 -translate-x-1/2 z-10">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="rounded-full h-8 w-8 bg-background shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => {
                              const start = form.getValues('toastGradientStartColor');
                              const end = form.getValues('toastGradientEndColor');
                              form.setValue('toastGradientStartColor', end);
                              form.setValue('toastGradientEndColor', start);
                            }}
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormField
                          control={form.control}
                          name="toastGradientEndColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">End Color</FormLabel>
                              <div className="flex items-center gap-3">
                                <FormControl>
                                  <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-lg border-2" />
                                </FormControl>
                                <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:hidden flex justify-center">
                         <Button 
                            type="button" 
                            variant="outline" 
                            className="rounded-xl gap-2 text-xs"
                            onClick={() => {
                              const start = form.getValues('toastGradientStartColor');
                              const end = form.getValues('toastGradientEndColor');
                              form.setValue('toastGradientStartColor', end);
                              form.setValue('toastGradientEndColor', start);
                            }}
                          >
                            <ArrowLeftRight className="h-3 w-3" /> Swap Colors
                          </Button>
                      </div>

                      <FormField
                        control={form.control}
                        name="toastGradientAngle"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div className="flex justify-between">
                              <FormLabel className="font-bold">Gradient Angle ({field.value}°)</FormLabel>
                              <span className="text-xs font-mono text-muted-foreground">{field.value}°</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={0}
                                max={360}
                                step={1}
                                value={[field.value]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                                className="py-4"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Adjust the direction of the gradient from 0° to 360°.
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      <div className="space-y-3">
                        <FormLabel className="font-bold">Quick Presets</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {gradientPresets.map((preset) => (
                            <Button
                              key={preset.name}
                              type="button"
                              variant="outline"
                              className="text-xs h-8 justify-start gap-2 px-2 hover:bg-muted/50"
                              onClick={() => {
                                form.setValue('toastGradientStartColor', preset.start);
                                form.setValue('toastGradientEndColor', preset.end);
                                form.setValue('toastGradientAngle', preset.angle);
                                form.setValue('toastTextColor', getContrastingColor(preset.start));
                              }}
                            >
                              <div 
                                className="h-4 w-4 rounded-full border border-muted" 
                                style={{ background: `linear-gradient(${preset.angle}deg, ${preset.start}, ${preset.end})` }}
                              />
                              {preset.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" /> Variant Colors
                  </CardTitle>
                  <CardDescription>Customize colors for different notification types.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="toastSuccessColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" /> Success Color
                          </FormLabel>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-lg border-2" />
                            </FormControl>
                            <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="toastErrorColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" /> Error Color
                          </FormLabel>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-lg border-2" />
                            </FormControl>
                            <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="toastWarningColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" /> Warning Color
                          </FormLabel>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-lg border-2" />
                            </FormControl>
                            <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="toastInfoColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-500" /> Info Color
                          </FormLabel>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-lg border-2" />
                            </FormControl>
                            <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Layout className="h-5 w-5 text-primary" /> Behavior & Placement
                  </CardTitle>
                  <CardDescription>Control where and how toasts appear on the screen.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="toastPosition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Default Position</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-background/50">
                                <SelectValue placeholder="Select position" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="top-left">Top Left</SelectItem>
                              <SelectItem value="top-center">Top Center</SelectItem>
                              <SelectItem value="top-right">Top Right</SelectItem>
                              <SelectItem value="bottom-left">Bottom Left</SelectItem>
                              <SelectItem value="bottom-center">Bottom Center</SelectItem>
                              <SelectItem value="bottom-right">Bottom Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="toastAnimation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Animation Style</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-background/50">
                                <SelectValue placeholder="Select animation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="slide">Slide In</SelectItem>
                              <SelectItem value="fade">Fade In</SelectItem>
                              <SelectItem value="zoom">Zoom In</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/20">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Maximize className="h-5 w-5 text-primary" /> Sizing & Close Icon
                  </CardTitle>
                  <CardDescription>Adjust the scale and close button appearance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="toastScale"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <div className="flex justify-between">
                          <FormLabel className="font-bold">Toast Scale ({Math.round(field.value * 100)}%)</FormLabel>
                          <span className="text-xs font-mono text-muted-foreground">{field.value.toFixed(2)}x</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0.5}
                            max={1.5}
                            step={0.05}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="py-4"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Increase or decrease the overall size of the notification.
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed">
                    <FormField
                      control={form.control}
                      name="toastCloseIconType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Close Icon Style</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-background/50">
                                <SelectValue placeholder="Select icon" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="x">Standard X</SelectItem>
                              <SelectItem value="circle-x">Circle X</SelectItem>
                              <SelectItem value="x-square">Square X</SelectItem>
                              <SelectItem value="minus">Minimal Minus</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="toastCloseIconColor"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="font-bold">Close Icon Color</FormLabel>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] uppercase font-bold text-primary hover:bg-primary/10"
                              onClick={() => {
                                form.setValue('toastCloseIconColor', watchedValues.toastTextColor);
                              }}
                            >
                              Match Text
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <FormControl>
                              <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-lg border-2" />
                            </FormControl>
                            <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-6 border-none shadow-2xl overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" /> Live Preview
                  </CardTitle>
                  <CardDescription>Real-time look of your notifications.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 flex flex-col items-center gap-8 bg-slate-50 dark:bg-slate-900/50 min-h-[500px] justify-center">
                  <div className="w-full space-y-4 flex flex-col items-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 bg-muted px-2 py-1 rounded">Default Style</p>
                    <ToastPreview type="default" />
                  </div>
                  
                  <div className="w-full space-y-6 flex flex-col items-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 bg-muted px-2 py-1 rounded">Variant Examples</p>
                    <ToastPreview type="success" />
                    <ToastPreview type="error" />
                    <ToastPreview type="warning" />
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t p-4 justify-center">
                   <p className="text-xs text-muted-foreground flex items-center gap-2">
                     <Sparkles className="h-3 w-3 text-primary" /> Changes apply instantly to this preview.
                   </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
