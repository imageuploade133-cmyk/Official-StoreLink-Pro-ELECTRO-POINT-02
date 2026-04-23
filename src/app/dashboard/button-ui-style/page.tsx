'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
  Palette,
  Type,
  Magnet,
  Brush,
  Upload,
  X,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Layout,
  Circle
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

const buttonSizes = [
  { name: 'sm', label: 'Small', description: 'Compact' },
  { name: 'md', label: 'Medium', description: 'Standard' },
  { name: 'lg', label: 'Large', description: 'Prominent' },
  { name: 'xl', label: 'Extra Large', description: 'Maximum' },
];

const buttonShapes = [
  { name: 'none', label: 'Square', description: 'No rounding', class: 'rounded-none' },
  { name: 'sm', label: 'Small', description: 'Slightly rounded', class: 'rounded-sm' },
  { name: 'md', label: 'Medium', description: 'Standard rounding', class: 'rounded-md' },
  { name: 'lg', label: 'Large', description: 'Heavily rounded', class: 'rounded-2xl' },
  { name: 'full', label: 'Pill', description: 'Maximum rounding', class: 'rounded-full' },
];

const shadowOptions = [
  { name: 'none', label: 'None', class: 'shadow-none' },
  { name: 'sm', label: 'Small', class: 'shadow-sm' },
  { name: 'md', label: 'Medium', class: 'shadow-md' },
  { name: 'lg', label: 'Large', class: 'shadow-lg' },
  { name: 'xl', label: 'X-Large', class: 'shadow-xl' },
  { name: '2xl', label: '2X-Large', class: 'shadow-2xl' },
  { name: 'inner', label: 'Inner', class: 'shadow-inner' },
];

const shoppingExpSchema = z.object({
  storeAddToCartText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeAddToCartIcon: z.preprocess((val) => val || 'ShoppingCart', z.string()).default('ShoppingCart'),
  storeAddToCartStyle: z.preprocess((val) => val || 'standard', z.enum(['standard', 'gradient', 'image', 'outline', 'ghost'])).default('standard'),
  storeAddToCartColor: z.preprocess((val) => val || '#3b82f6', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#3b82f6'),
  storeAddToCartGradientStart: z.preprocess((val) => val || '#3b82f6', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#3b82f6'),
  storeAddToCartGradientEnd: z.preprocess((val) => val || '#1d4ed8', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#1d4ed8'),
  storeAddToCartImageUrl: z.string().url().or(z.literal('')).optional(),
  storeAddToCartSize: z.preprocess((val) => val || 'lg', z.enum(['sm', 'md', 'lg', 'xl'])).default('lg'),
  storeAddToCartShape: z.preprocess((val) => val || 'lg', z.enum(['none', 'sm', 'md', 'lg', 'full'])).default('lg'),
  storeAddToCartShadow: z.preprocess((val) => val || 'sm', z.enum(['none', 'sm', 'md', 'lg', 'xl', '2xl', 'inner'])).default('sm'),
  
  storeGridCartText: z.string().min(1, 'Label required').max(20, 'Label too long.'),
  storeGridCartIcon: z.preprocess((val) => val || 'ShoppingCart', z.string()).default('ShoppingCart'),
  storeGridCartStyle: z.preprocess((val) => val || 'standard', z.enum(['standard', 'gradient', 'image', 'outline', 'ghost'])).default('standard'),
  storeGridCartColor: z.preprocess((val) => val || '#10b981', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#10b981'),
  storeGridCartGradientStart: z.preprocess((val) => val || '#10b981', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#10b981'),
  storeGridCartGradientEnd: z.preprocess((val) => val || '#059669', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#059669'),
  storeGridCartImageUrl: z.string().url().or(z.literal('')).optional(),
  storeGridCartSize: z.preprocess((val) => val || 'md', z.enum(['sm', 'md', 'lg', 'xl'])).default('md'),
  storeGridCartShape: z.preprocess((val) => val || 'md', z.enum(['none', 'sm', 'md', 'lg', 'full'])).default('md'),
  storeGridCartShadow: z.preprocess((val) => val || 'sm', z.enum(['none', 'sm', 'md', 'lg', 'xl', '2xl', 'inner'])).default('sm'),
  
  storeHeroBtnText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeHeroBtnIcon: z.preprocess((val) => val || 'ArrowRight', z.string()).default('ArrowRight'),
  storeHeroBtnStyle: z.preprocess((val) => val || 'gradient', z.enum(['standard', 'gradient', 'image', 'outline', 'ghost'])).default('gradient'),
  storeHeroBtnColor: z.preprocess((val) => val || '#8b5cf6', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#8b5cf6'),
  storeHeroBtnGradientStart: z.preprocess((val) => val || '#8b5cf6', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#8b5cf6'),
  storeHeroBtnGradientEnd: z.preprocess((val) => val || '#7c3aed', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#7c3aed'),
  storeHeroBtnImageUrl: z.string().url().or(z.literal('')).optional(),
  storeHeroBtnSize: z.preprocess((val) => val || 'lg', z.enum(['sm', 'md', 'lg', 'xl'])).default('lg'),
  storeHeroBtnShape: z.preprocess((val) => val || 'lg', z.enum(['none', 'sm', 'md', 'lg', 'full'])).default('lg'),
  storeHeroBtnShadow: z.preprocess((val) => val || 'md', z.enum(['none', 'sm', 'md', 'lg', 'xl', '2xl', 'inner'])).default('md'),

  storeExploreBtnText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeExploreBtnIcon: z.preprocess((val) => val || 'ArrowRight', z.string()).default('ArrowRight'),
  storeExploreBtnStyle: z.preprocess((val) => val || 'standard', z.enum(['standard', 'gradient', 'image', 'outline', 'ghost'])).default('standard'),
  storeExploreBtnColor: z.preprocess((val) => val || '#3b82f6', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#3b82f6'),
  storeExploreBtnGradientStart: z.preprocess((val) => val || '#3b82f6', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#3b82f6'),
  storeExploreBtnGradientEnd: z.preprocess((val) => val || '#1d4ed8', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#1d4ed8'),
  storeExploreBtnImageUrl: z.string().url().or(z.literal('')).optional(),
  storeExploreBtnSize: z.preprocess((val) => val || 'lg', z.enum(['sm', 'md', 'lg', 'xl'])).default('lg'),
  storeExploreBtnShape: z.preprocess((val) => val || 'lg', z.enum(['none', 'sm', 'md', 'lg', 'full'])).default('lg'),
  storeExploreBtnShadow: z.preprocess((val) => val || 'sm', z.enum(['none', 'sm', 'md', 'lg', 'xl', '2xl', 'inner'])).default('sm'),
  
  useIndividualBtnSettings: z.boolean().default(true),
});

type FormValues = z.infer<typeof shoppingExpSchema>;

// Button Style Selector Component
function ButtonStyleSelector({
  value,
  onChange,
  imageUrl,
}: {
  value: string;
  onChange: (value: string) => void;
  imageUrl?: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {[
        { id: 'standard', label: 'Solid', icon: Circle, color: 'bg-primary' },
        { id: 'gradient', label: 'Gradient', icon: Sparkles, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
        { id: 'outline', label: 'Outline', icon: Layout, color: 'border-2 border-primary bg-background' },
        { id: 'ghost', label: 'Ghost', icon: Eye, color: 'border-2 border-dashed border-muted' },
        { id: 'image', label: 'Image', icon: ImageIcon, color: 'bg-muted' },
      ].map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => onChange(style.id)}
          className={cn(
            "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
            value === style.id
              ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
              : 'border-muted hover:border-primary/30 hover:bg-muted/30'
          )}
        >
          {style.id === 'image' && imageUrl ? (
            <img src={imageUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", style.color)}>
               <style.icon className={cn("h-5 w-5", style.id === 'outline' || style.id === 'ghost' ? 'text-primary' : 'text-white')} />
            </div>
          )}
          <div className="text-center">
            <p className="text-xs font-bold">{style.label}</p>
          </div>
          {value === style.id && (
            <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1 shadow-lg">
              <Check className="h-3 w-3" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// Button Preview Component
function ButtonPreview({
  settings,
  type
}: {
  settings: any;
  type: 'addToCart' | 'gridCart' | 'heroBtn' | 'exploreBtn';
}) {
  const prefix = type === 'addToCart' ? 'storeAddToCart'
    : type === 'gridCart' ? 'storeGridCart'
    : type === 'heroBtn' ? 'storeHeroBtn'
    : 'storeExploreBtn';

  const text = settings[`${prefix}Text`] || 'Button';
  const style = settings[`${prefix}Style`] || 'standard';
  const size = settings[`${prefix}Size`] || 'md';
  const shape = settings[`${prefix}Shape`] || 'md';
  const shadow = settings[`${prefix}Shadow`] || 'sm';

  const getSizeClasses = (s: string) => {
    switch (s) {
      case 'sm': return 'px-3 py-1.5 text-xs h-8';
      case 'md': return 'px-4 py-2 text-sm h-10';
      case 'lg': return 'px-6 py-3 text-base h-12';
      case 'xl': return 'px-8 py-4 text-lg h-14';
      default: return 'px-4 py-2 text-sm h-10';
    }
  };

  const getShapeClass = (sh: string) => {
    const found = buttonShapes.find(s => s.name === sh);
    return found ? found.class : 'rounded-md';
  };

  const getShadowClass = (shd: string) => {
    const found = shadowOptions.find(s => s.name === shd);
    return found ? found.class : 'shadow-sm';
  };

  const getStyleProperties = () => {
    if (style === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${settings[`${prefix}GradientStart`]}, ${settings[`${prefix}GradientEnd`]})`,
        color: 'white',
        border: 'none',
      };
    } else if (style === 'image' && settings[`${prefix}ImageUrl`]) {
      return {
        backgroundImage: `url('${settings[`${prefix}ImageUrl`]}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        border: 'none',
      };
    } else if (style === 'outline') {
      return {
        backgroundColor: 'transparent',
        color: settings[`${prefix}Color`],
        border: `2px solid ${settings[`${prefix}Color`]}`,
      };
    } else if (style === 'ghost') {
      return {
        backgroundColor: 'transparent',
        color: settings[`${prefix}Color`],
        border: 'none',
      };
    }
    return {
      backgroundColor: settings[`${prefix}Color`],
      color: 'white',
      border: 'none',
    };
  };

  const iconMap: Record<string, any> = {
    ShoppingCart, ShoppingBag, Plus, Check, CheckCircle2, Zap, CreditCard, ArrowRight, Package
  };
  const Icon = iconMap[settings[`${prefix}Icon`] || 'ShoppingCart'];

  return (
    <div className="flex items-center justify-center p-12 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-muted-foreground/20">
      <Button
        type="button"
        className={cn(getSizeClasses(size), getShapeClass(shape), getShadowClass(shadow), "font-bold transition-all duration-300 transform hover:scale-105 active:scale-95")}
        style={getStyleProperties()}
      >
        {Icon && <Icon className="mr-2 h-5 w-5" />}
        {text}
      </Button>
    </div>
  );
}

export default function ButtonUIStylePage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('addToCart');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

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
    resolver: zodResolver(shoppingExpSchema),
    defaultValues: {
      storeAddToCartText: 'Add to Cart',
      storeAddToCartIcon: 'ShoppingCart',
      storeAddToCartStyle: 'standard',
      storeAddToCartColor: '#3b82f6',
      storeAddToCartGradientStart: '#3b82f6',
      storeAddToCartGradientEnd: '#1d4ed8',
      storeAddToCartImageUrl: '',
      storeAddToCartSize: 'lg',
      storeAddToCartShape: 'lg',
      storeAddToCartShadow: 'sm',

      storeGridCartText: 'Add to Bag',
      storeGridCartIcon: 'ShoppingCart',
      storeGridCartStyle: 'standard',
      storeGridCartColor: '#10b981',
      storeGridCartGradientStart: '#10b981',
      storeGridCartGradientEnd: '#059669',
      storeGridCartImageUrl: '',
      storeGridCartSize: 'md',
      storeGridCartShape: 'md',
      storeGridCartShadow: 'sm',

      storeHeroBtnText: 'Shop Now',
      storeHeroBtnIcon: 'ArrowRight',
      storeHeroBtnStyle: 'gradient',
      storeHeroBtnColor: '#8b5cf6',
      storeHeroBtnGradientStart: '#8b5cf6',
      storeHeroBtnGradientEnd: '#7c3aed',
      storeHeroBtnImageUrl: '',
      storeHeroBtnSize: 'lg',
      storeHeroBtnShape: 'lg',
      storeHeroBtnShadow: 'md',

      storeExploreBtnText: 'Explore',
      storeExploreBtnIcon: 'ArrowRight',
      storeExploreBtnStyle: 'standard',
      storeExploreBtnColor: '#3b82f6',
      storeExploreBtnGradientStart: '#3b82f6',
      storeExploreBtnGradientEnd: '#1d4ed8',
      storeExploreBtnImageUrl: '',
      storeExploreBtnSize: 'lg',
      storeExploreBtnShape: 'lg',
      storeExploreBtnShadow: 'sm',

      useIndividualBtnSettings: true,
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        storeAddToCartText: settingsData.storeAddToCartText || 'Add to Cart',
        storeAddToCartIcon: settingsData.storeAddToCartIcon || 'ShoppingCart',
        storeAddToCartStyle: (settingsData.storeAddToCartStyle as any) || 'standard',
        storeAddToCartColor: settingsData.storeAddToCartColor || '#3b82f6',
        storeAddToCartGradientStart: settingsData.storeAddToCartGradientStart || '#3b82f6',
        storeAddToCartGradientEnd: settingsData.storeAddToCartGradientEnd || '#1d4ed8',
        storeAddToCartImageUrl: settingsData.storeAddToCartImageUrl || '',
        storeAddToCartSize: (settingsData.storeAddToCartSize as any) || 'lg',
        storeAddToCartShape: (settingsData.storeAddToCartShape as any) || 'lg',
        storeAddToCartShadow: (settingsData.storeAddToCartShadow as any) || 'sm',

        storeGridCartText: settingsData.storeGridCartText || 'Add to Bag',
        storeGridCartIcon: settingsData.storeGridCartIcon || 'ShoppingCart',
        storeGridCartStyle: (settingsData.storeGridCartStyle as any) || 'standard',
        storeGridCartColor: settingsData.storeGridCartColor || '#10b981',
        storeGridCartGradientStart: settingsData.storeGridCartGradientStart || '#10b981',
        storeGridCartGradientEnd: settingsData.storeGridCartGradientEnd || '#059669',
        storeGridCartImageUrl: settingsData.storeGridCartImageUrl || '',
        storeGridCartSize: (settingsData.storeGridCartSize as any) || 'md',
        storeGridCartShape: (settingsData.storeGridCartShape as any) || 'md',
        storeGridCartShadow: (settingsData.storeGridCartShadow as any) || 'sm',

        storeHeroBtnText: settingsData.storeHeroBtnText || 'Shop Now',
        storeHeroBtnIcon: settingsData.storeHeroBtnIcon || 'ArrowRight',
        storeHeroBtnStyle: (settingsData.storeHeroBtnStyle as any) || 'gradient',
        storeHeroBtnColor: settingsData.storeHeroBtnColor || '#8b5cf6',
        storeHeroBtnGradientStart: settingsData.storeHeroBtnGradientStart || '#8b5cf6',
        storeHeroBtnGradientEnd: settingsData.storeHeroBtnGradientEnd || '#7c3aed',
        storeHeroBtnImageUrl: settingsData.storeHeroBtnImageUrl || '',
        storeHeroBtnSize: (settingsData.storeHeroBtnSize as any) || 'lg',
        storeHeroBtnShape: (settingsData.storeHeroBtnShape as any) || 'lg',
        storeHeroBtnShadow: (settingsData.storeHeroBtnShadow as any) || 'md',

        storeExploreBtnText: settingsData.storeExploreBtnText || 'Explore',
        storeExploreBtnIcon: settingsData.storeExploreBtnIcon || 'ArrowRight',
        storeExploreBtnStyle: (settingsData.storeExploreBtnStyle as any) || 'standard',
        storeExploreBtnColor: settingsData.storeExploreBtnColor || '#3b82f6',
        storeExploreBtnGradientStart: settingsData.storeExploreBtnGradientStart || '#3b82f6',
        storeExploreBtnGradientEnd: settingsData.storeExploreBtnGradientEnd || '#1d4ed8',
        storeExploreBtnImageUrl: settingsData.storeExploreBtnImageUrl || '',
        storeExploreBtnSize: (settingsData.storeExploreBtnSize as any) || 'lg',
        storeExploreBtnShape: (settingsData.storeExploreBtnShape as any) || 'lg',
        storeExploreBtnShadow: (settingsData.storeExploreBtnShadow as any) || 'sm',

        useIndividualBtnSettings: settingsData.useIndividualBtnSettings !== false,
      });
    }
  }, [settingsData, form]);

  const handleImageUpload = async (prefix: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
      });
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue(`${prefix}ImageUrl` as any, result.display_url, { shouldValidate: true });
        toast({
          title: 'Image Uploaded',
          description: 'Your background image has been set.',
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message || 'Could not upload image. Please try again.',
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read the selected file.' });
      setIsUploading(false);
    };
  };

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (currentStoreId) {
        await saveStoreSettings(firestore, currentStoreId, data);
      } else {
        await saveGlobalSettings(firestore, data);
      }
      toast({ title: 'Success', description: 'Your button UI settings have been saved.' });
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
        <PageHeader icon={MousePointerClick} title="Button UI/Style" description="Loading..." />
        <Skeleton className="h-[800px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  const renderButtonSettings = (type: 'addToCart' | 'gridCart' | 'heroBtn' | 'exploreBtn') => {
    const prefix = type === 'addToCart' ? 'storeAddToCart'
      : type === 'gridCart' ? 'storeGridCart'
      : type === 'heroBtn' ? 'storeHeroBtn'
      : 'storeExploreBtn';

    const styleValue = form.watch(`${prefix}Style` as any);
    const imageUrlValue = form.watch(`${prefix}ImageUrl` as any);

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/20">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Type className="h-5 w-5 text-primary" /> Content & Icon
              </CardTitle>
              <CardDescription>Customize what your button says and its icon.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`${prefix}Text` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Button Label</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Buy Now" {...field} className="bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`${prefix}Icon` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Button Icon</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iconOptions.map(opt => (
                            <SelectItem key={opt.name} value={opt.name}>
                              <div className="flex items-center gap-2">
                                <opt.icon className="h-4 w-4" />
                                {opt.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Brush className="h-5 w-5 text-primary" /> Visual Style
              </CardTitle>
              <CardDescription>Choose the look and feel of the button background.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name={`${prefix}Style` as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Background Style</FormLabel>
                    <ButtonStyleSelector
                      value={field.value}
                      onChange={field.onChange}
                      imageUrl={imageUrlValue}
                    />
                  </FormItem>
                )}
              />

              {styleValue === 'standard' || styleValue === 'outline' || styleValue === 'ghost' ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormField
                    control={form.control}
                    name={`${prefix}Color` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Button Color</FormLabel>
                        <div className="flex items-center gap-4">
                          <FormControl>
                            <Input type="color" {...field} className="p-1 h-12 w-20 cursor-pointer rounded-xl border-2" />
                          </FormControl>
                          <div className="flex-1">
                            <Input value={field.value} onChange={field.onChange} className="font-mono bg-background/50" />
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              ) : styleValue === 'gradient' ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`${prefix}GradientStart` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Start Color</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} className="p-1 h-12 w-full cursor-pointer rounded-xl border-2" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`${prefix}GradientEnd` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">End Color</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} className="p-1 h-12 w-full cursor-pointer rounded-xl border-2" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              ) : styleValue === 'image' ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormField
                    control={form.control}
                    name={`${prefix}ImageUrl` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Background Image</FormLabel>
                        <div className="flex gap-4 items-center">
                          {imageUrlValue ? (
                            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary shadow-lg group">
                              <img src={imageUrlValue} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => field.onChange('')}
                              >
                                <X className="h-6 w-6 text-white" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center bg-primary/5">
                              <ImageIcon className="h-8 w-8 text-primary/30" />
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                             <Button
                                asChild
                                variant="outline"
                                disabled={isUploading}
                                className="w-full h-12 rounded-xl"
                              >
                                <label className="cursor-pointer">
                                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                  Upload Texture/Image
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => handleImageUpload(prefix, e)}
                                    disabled={isUploading}
                                  />
                                </label>
                              </Button>
                              <p className="text-xs text-muted-foreground text-center">Transparent PNGs work best for textures.</p>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" /> Shape & Shadow
              </CardTitle>
              <CardDescription>Adjust the geometry and depth of the button.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name={`${prefix}Shape` as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Button Shape</FormLabel>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {buttonShapes.map((shape) => (
                        <button
                          key={shape.name}
                          type="button"
                          onClick={() => field.onChange(shape.name)}
                          className={cn(
                            "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                            field.value === shape.name
                              ? 'border-primary bg-primary/5 shadow-inner'
                              : 'border-muted hover:border-primary/30 hover:bg-muted/30'
                          )}
                        >
                          <div className={cn("w-full h-8 bg-primary/20 border border-primary/40", shape.class)} />
                          <p className="text-[10px] font-bold">{shape.label}</p>
                          {field.value === shape.name && (
                            <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`${prefix}Shadow` as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Elevation (Shadow)</FormLabel>
                    <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
                      {shadowOptions.map((shadow) => (
                        <button
                          key={shadow.name}
                          type="button"
                          onClick={() => field.onChange(shadow.name)}
                          className={cn(
                            "relative flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all",
                            field.value === shadow.name
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/30 hover:bg-muted/30'
                          )}
                        >
                          <div className={cn("w-full h-4 bg-background border border-muted", shadow.class)} />
                          <p className="text-[8px] font-bold truncate w-full text-center">{shadow.label}</p>
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`${prefix}Size` as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Button Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl bg-background/50">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {buttonSizes.map(size => (
                          <SelectItem key={size.name} value={size.name}>
                            <div className="flex flex-col">
                              <span className="font-bold">{size.label}</span>
                              <span className="text-[10px] text-muted-foreground">{size.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6 border-none shadow-2xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" /> Live Preview
                  </CardTitle>
                  <CardDescription>Real-time look on the storefront.</CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                  {[
                    { id: 'mobile', icon: Smartphone },
                    { id: 'tablet', icon: Tablet },
                    { id: 'desktop', icon: Monitor },
                  ].map((device) => (
                    <button
                      key={device.id}
                      onClick={() => setPreviewDevice(device.id as any)}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        previewDevice === device.id ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                      )}
                    >
                      <device.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 flex flex-col items-center">
              <div className={cn(
                "transition-all duration-500 w-full flex flex-col items-center",
                previewDevice === 'mobile' ? "max-w-[320px]" : previewDevice === 'tablet' ? "max-w-[600px]" : "max-w-full"
              )}>
                 <ButtonPreview settings={form.watch()} type={type} />
                 
                 <div className="mt-8 w-full space-y-4">
                    <div className="h-4 w-3/4 bg-muted rounded-full animate-pulse" />
                    <div className="h-4 w-full bg-muted/50 rounded-full animate-pulse" />
                    <div className="h-4 w-1/2 bg-muted/30 rounded-full animate-pulse" />
                 </div>
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
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          icon={MousePointerClick}
          title="Button UI/Style Designer"
          description="Design high-converting buttons for your shopping experience"
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
          <Card className="border-none shadow-lg bg-primary/5 overflow-hidden">
            <CardContent className="p-6">
               <FormField
                  control={form.control}
                  name="useIndividualBtnSettings"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-1">
                        <FormLabel className="text-lg font-bold">Individual Button Customization</FormLabel>
                        <FormDescription className="text-sm">
                          When enabled, you can style each button location uniquely. 
                          Disabling this will use global theme settings.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange} 
                          disabled={isSaving} 
                          className="data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-muted/50 rounded-2xl">
              <TabsTrigger value="addToCart" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:shadow-md">
                Product Page (Add to Cart)
              </TabsTrigger>
              <TabsTrigger value="gridCart" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:shadow-md">
                Product Grid (Card Button)
              </TabsTrigger>
              <TabsTrigger value="heroBtn" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:shadow-md">
                Hero/Banner Button
              </TabsTrigger>
              <TabsTrigger value="exploreBtn" className="rounded-xl py-3 data-[state=active]:bg-background data-[state=active]:shadow-md">
                Explore Section Button
              </TabsTrigger>
            </TabsList>

            <div className="mt-8">
              <TabsContent value="addToCart" className="focus-visible:outline-none">
                {renderButtonSettings('addToCart')}
              </TabsContent>
              <TabsContent value="gridCart" className="focus-visible:outline-none">
                {renderButtonSettings('gridCart')}
              </TabsContent>
              <TabsContent value="heroBtn" className="focus-visible:outline-none">
                {renderButtonSettings('heroBtn')}
              </TabsContent>
              <TabsContent value="exploreBtn" className="focus-visible:outline-none">
                {renderButtonSettings('exploreBtn')}
              </TabsContent>
            </div>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
