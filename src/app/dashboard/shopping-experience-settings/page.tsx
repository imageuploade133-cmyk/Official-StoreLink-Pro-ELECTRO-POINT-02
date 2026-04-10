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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Palette,
  LayoutGrid,
  FileText,
  Scan,
  Eye,
  Square,
  Circle,
  Ruler,
  BorderAll,
  Type,
  Magnet
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductReviewsSettings } from './components/ProductReviewsSettings';
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

// Button shape options
const buttonShapes = [
  { name: 'rounded-none', label: 'None', icon: Square },
  { name: 'rounded-sm', label: 'Small', icon: Square },
  { name: 'rounded-md', label: 'Medium', icon: Square },
  { name: 'rounded-lg', label: 'Large', icon: Ruler },
  { name: 'rounded-xl', label: 'X-Large', icon: BorderAll },
  { name: 'rounded-2xl', label: '2X-Large', icon: Circle },
  { name: 'rounded-full', label: 'Pill', icon: Circle },
];

// Button size options
const buttonSizes = [
  { name: 'sm', label: 'Small', description: 'Compact for tight spaces' },
  { name: 'md', label: 'Medium', description: 'Standard size' },
  { name: 'lg', label: 'Large', description: 'Prominent call-to-action' },
  { name: 'xl', label: 'Extra Large', description: 'Maximum visibility' },
];

const ColorInput = ({ field, label, description }: { field: any; label: string; description?: string }) => (
  <FormItem>
    <FormLabel className="font-bold">{label}</FormLabel>
    {description && <FormDescription className="text-xs mb-2">{description}</FormDescription>}
    <div className="flex items-center gap-3">
      <FormControl>
        <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer shrink-0 rounded-md border-2 border-muted" />
      </FormControl>
      <span className="text-sm font-mono bg-muted px-3 py-1.5 rounded-md border font-medium">{field.value}</span>
    </div>
    <FormMessage />
  </FormItem>
);

const shoppingExpSchema = z.object({
  // Product Details Button
  storeAddToCartText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeAddToCartIcon: z.string().default('ShoppingCart'),
  storeAddToCartStyle: z.enum(['standard', 'gradient', 'outline', 'ghost']).default('standard'),
  storeAddToCartColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeAddToCartGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeAddToCartGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#1d4ed8'),
  storeAddToCartShape: z.string().default('rounded-xl'),
  storeAddToCartSize: z.enum(['sm', 'md', 'lg', 'xl']).default('lg'),
  
  // Grid/Card Button
  storeGridCartText: z.string().min(1, 'Label required').max(20, 'Label too long.'),
  storeGridCartIcon: z.string().default('ShoppingCart'),
  storeGridCartStyle: z.enum(['standard', 'gradient', 'outline', 'ghost']).default('standard'),
  storeGridCartColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#10b981'),
  storeGridCartGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#10b981'),
  storeGridCartGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#059669'),
  storeGridCartShape: z.string().default('rounded-lg'),
  storeGridCartSize: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
  
  // Hero Carousel Button
  storeHeroBtnText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeHeroBtnIcon: z.string().default('ArrowRight'),
  storeHeroBtnStyle: z.enum(['standard', 'gradient', 'outline', 'ghost']).default('gradient'),
  storeHeroBtnColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#8b5cf6'),
  storeHeroBtnGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#8b5cf6'),
  storeHeroBtnGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#7c3aed'),
  storeHeroBtnShape: z.string().default('rounded-full'),
  storeHeroBtnSize: z.enum(['sm', 'md', 'lg', 'xl']).default('lg'),
  
  // Global Button Branding (for legacy/override)
  storeBtnStyle: z.enum(['standard', 'gradient']).default('standard'),
  storeBtnColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeBtnGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeBtnGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#1d4ed8'),
  storeBtnShape: z.string().default('rounded-xl'),
  storeBtnSize: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
  
  // Use individual settings flag
  useIndividualBtnSettings: z.boolean().default(true),
});

type FormValues = z.infer<typeof shoppingExpSchema>;

// Button preview component
function ButtonPreview({ 
  settings, 
  type 
}: { 
  settings: any; 
  type: 'addToCart' | 'gridCart' | 'heroBtn' | 'global';
}) {
  const prefix = type === 'addToCart' ? 'storeAddToCart' 
    : type === 'gridCart' ? 'storeGridCart' 
    : type === 'heroBtn' ? 'storeHeroBtn' 
    : 'storeBtn';
  
  const text = settings[`${prefix}Text`] || 'Sample Button';
  const style = settings[`${prefix}Style`] || 'standard';
  const shape = settings[`${prefix}Shape`] || 'rounded-xl';
  const size = settings[`${prefix}Size`] || 'md';
  
  const getSizeClasses = (s: string) => {
    switch(s) {
      case 'sm': return 'px-3 py-1.5 text-xs';
      case 'md': return 'px-4 py-2 text-sm';
      case 'lg': return 'px-6 py-3 text-base';
      case 'xl': return 'px-8 py-4 text-lg';
      default: return 'px-4 py-2 text-sm';
    }
  };
  
  const getStyleProperties = () => {
    if (style === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${settings[`${prefix}GradientStart`]}, ${settings[`${prefix}GradientEnd`]})`,
        color: 'white',
        border: 'none'
      };
    } else if (style === 'outline') {
      return {
        background: 'transparent',
        color: settings[`${prefix}Color`],
        border: `2px solid ${settings[`${prefix}Color`]}`
      };
    } else if (style === 'ghost') {
      return {
        background: 'transparent',
        color: settings[`${prefix}Color`],
        border: 'none'
      };
    }
    return {
      backgroundColor: settings[`${prefix}Color`],
      color: 'white',
      border: 'none'
    };
  };
  
  const iconMap: Record<string, any> = {
    ShoppingCart, ShoppingBag, Plus, Check, CheckCircle2, Zap, CreditCard, ArrowRight, Package
  };
  const Icon = iconMap[settings[`${prefix}Icon`] || 'ShoppingCart'];
  
  return (
    <Button 
      type="button"
      className={cn(shape, getSizeClasses(size), "font-black uppercase tracking-wide shadow-lg transition-all hover:scale-105 active:scale-95")}
      style={getStyleProperties()}
    >
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      {text}
    </Button>
  );
}

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
      // Product Details Button Defaults
      storeAddToCartText: 'Secure Purchase',
      storeAddToCartIcon: 'ShoppingCart',
      storeAddToCartStyle: 'standard',
      storeAddToCartColor: '#3b82f6',
      storeAddToCartGradientStart: '#3b82f6',
      storeAddToCartGradientEnd: '#1d4ed8',
      storeAddToCartShape: 'rounded-xl',
      storeAddToCartSize: 'lg',
      
      // Grid Button Defaults
      storeGridCartText: 'Add to Bag',
      storeGridCartIcon: 'ShoppingCart',
      storeGridCartStyle: 'standard',
      storeGridCartColor: '#10b981',
      storeGridCartGradientStart: '#10b981',
      storeGridCartGradientEnd: '#059669',
      storeGridCartShape: 'rounded-lg',
      storeGridCartSize: 'md',
      
      // Hero Button Defaults
      storeHeroBtnText: 'Shop Collection',
      storeHeroBtnIcon: 'ArrowRight',
      storeHeroBtnStyle: 'gradient',
      storeHeroBtnColor: '#8b5cf6',
      storeHeroBtnGradientStart: '#8b5cf6',
      storeHeroBtnGradientEnd: '#7c3aed',
      storeHeroBtnShape: 'rounded-full',
      storeHeroBtnSize: 'lg',
      
      // Global Defaults
      storeBtnStyle: 'standard',
      storeBtnColor: '#3b82f6',
      storeBtnGradientStart: '#3b82f6',
      storeBtnGradientEnd: '#1d4ed8',
      storeBtnShape: 'rounded-xl',
      storeBtnSize: 'md',
      
      useIndividualBtnSettings: true,
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
        storeAddToCartShape: settingsData.storeAddToCartShape || 'rounded-xl',
        storeAddToCartSize: settingsData.storeAddToCartSize || 'lg',
        
        storeGridCartText: settingsData.storeGridCartText || 'Add to Bag',
        storeGridCartIcon: settingsData.storeGridCartIcon || 'ShoppingCart',
        storeGridCartStyle: settingsData.storeGridCartStyle || 'standard',
        storeGridCartColor: settingsData.storeGridCartColor || '#10b981',
        storeGridCartGradientStart: settingsData.storeGridCartGradientStart || '#10b981',
        storeGridCartGradientEnd: settingsData.storeGridCartGradientEnd || '#059669',
        storeGridCartShape: settingsData.storeGridCartShape || 'rounded-lg',
        storeGridCartSize: settingsData.storeGridCartSize || 'md',
        
        storeHeroBtnText: settingsData.storeHeroBtnText || 'Shop Collection',
        storeHeroBtnIcon: settingsData.storeHeroBtnIcon || 'ArrowRight',
        storeHeroBtnStyle: settingsData.storeHeroBtnStyle || 'gradient',
        storeHeroBtnColor: settingsData.storeHeroBtnColor || '#8b5cf6',
        storeHeroBtnGradientStart: settingsData.storeHeroBtnGradientStart || '#8b5cf6',
        storeHeroBtnGradientEnd: settingsData.storeHeroBtnGradientEnd || '#7c3aed',
        storeHeroBtnShape: settingsData.storeHeroBtnShape || 'rounded-full',
        storeHeroBtnSize: settingsData.storeHeroBtnSize || 'lg',
        
        storeBtnStyle: settingsData.storeBtnStyle || 'standard',
        storeBtnColor: settingsData.storeBtnColor || '#3b82f6',
        storeBtnGradientStart: settingsData.storeBtnGradientStart || '#3b82f6',
        storeBtnGradientEnd: settingsData.storeBtnGradientEnd || '#1d4ed8',
        storeBtnShape: settingsData.storeBtnShape || 'rounded-xl',
        storeBtnSize: settingsData.storeBtnSize || 'md',
        
        useIndividualBtnSettings: settingsData.useIndividualBtnSettings !== false,
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Button Settings Updated', description: 'Your store button styles have been saved successfully.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update button settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoadingSettings) {
    return (
      <div className="space-y-6">
        <PageHeader icon={MousePointerClick} title="Shopping Experience" description="Loading..." />
        <Skeleton className="h-[800px] w-full" />
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

  const renderShapeItem = (shapeName: string, shapeLabel: string, Icon: any) => (
    <div className="flex items-center gap-2">
      <div className={cn("w-6 h-6 border-2 border-current", shapeName)} />
      <span>{shapeLabel}</span>
    </div>
  );

  // Individual button settings component
  const ButtonStyleSection = ({ 
    type, 
    title, 
    description, 
    prefix,
    icon: SectionIcon 
  }: { 
    type: string; 
    title: string; 
    description: string;
    prefix: string;
    icon: any;
  }) => {
    const styleValue = form.watch(`${prefix}Style`);
    const colorValue = form.watch(`${prefix}Color`);
    const gradientStartValue = form.watch(`${prefix}GradientStart`);
    const gradientEndValue = form.watch(`${prefix}GradientEnd`);
    
    return (
      <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <SectionIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Text & Icon Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name={`${prefix}Text` as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold flex items-center gap-2">
                    <Type className="h-4 w-4" /> Button Label
                  </FormLabel>
                  <FormControl><Input placeholder="Button text" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`${prefix}Icon` as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold flex items-center gap-2">
                    <Magnet className="h-4 w-4" /> Button Icon
                  </FormLabel>
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
          
          <Separator className="my-4" />
          
          {/* Style Selection */}
          <FormField
            control={form.control}
            name={`${prefix}Style` as any}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-base font-black flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Button Style
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3"
                  >
                    {['standard', 'gradient', 'outline', 'ghost'].map((style) => (
                      <div key={style}>
                        <RadioGroupItem value={style} id={`${prefix}-${style}`} className="peer sr-only" />
                        <Label
                          htmlFor={`${prefix}-${style}`}
                          className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all text-center"
                        >
                          <div className={cn(
                            "h-8 w-full mb-2 flex items-center justify-center",
                            style === 'standard' && "bg-primary rounded",
                            style === 'gradient' && "bg-gradient-to-r from-primary to-blue-700 rounded",
                            style === 'outline' && "border-2 border-primary bg-transparent rounded",
                            style === 'ghost' && "bg-transparent"
                          )} />
                          <span className="text-xs font-bold capitalize">{style}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
          
          {/* Color Settings based on style */}
          {styleValue === 'standard' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <FormField
                control={form.control}
                name={`${prefix}Color` as any}
                render={({ field }) => <ColorInput field={field} label="Button Color" description="Solid color for the button background" />}
              />
            </div>
          )}
          
          {(styleValue === 'gradient' || styleValue === 'outline' || styleValue === 'ghost') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <FormField
                control={form.control}
                name={`${prefix}GradientStart` as any}
                render={({ field }) => <ColorInput field={field} label={styleValue === 'gradient' ? "Gradient Start" : "Button Color"} />}
              />
              {styleValue === 'gradient' && (
                <FormField
                  control={form.control}
                  name={`${prefix}GradientEnd` as any}
                  render={({ field }) => <ColorInput field={field} label="Gradient End" />}
                />
              )}
            </div>
          )}
          
          <Separator className="my-4" />
          
          {/* Shape & Size */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name={`${prefix}Shape` as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold flex items-center gap-2">
                    <Square className="h-4 w-4" /> Button Shape
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {buttonShapes.map(shape => (
                        <SelectItem key={shape.name} value={shape.name}>
                          {renderShapeItem(shape.name, shape.label, shape.icon)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name={`${prefix}Size` as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" /> Button Size
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {buttonSizes.map(size => (
                        <SelectItem key={size.name} value={size.name}>
                          <div className="flex flex-col">
                            <span className="font-bold">{size.label}</span>
                            <span className="text-xs text-muted-foreground">{size.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          
          {/* Live Preview */}
          <div className="mt-6 p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-muted/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" /> Live Preview
              </span>
            </div>
            <div className="flex flex-wrap gap-4 justify-center p-4 bg-white dark:bg-slate-900 rounded-xl">
              <ButtonPreview settings={form.getValues()} type={type as any} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MousePointerClick}
        title="Shopping Button Settings"
        description="Customize colors, styles, shapes, and sizes for all store buttons."
      />

      {/* Product Reviews Section */}
      <div className="mt-8">
        {firestore && (
          <ProductReviewsSettings settingsData={settingsData} firestore={firestore} />
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Quick Overview Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-black uppercase text-blue-600">Product Page</span>
              </div>
              <div className="flex justify-center">
                <ButtonPreview settings={form.getValues()} type="addToCart" />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid className="h-4 w-4 text-green-600" />
                <span className="text-xs font-black uppercase text-green-600">Catalog Grid</span>
              </div>
              <div className="flex justify-center">
                <ButtonPreview settings={form.getValues()} type="gridCart" />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/20 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-2 mb-3">
                <Scan className="h-4 w-4 text-violet-600" />
                <span className="text-xs font-black uppercase text-violet-600">Hero Carousel</span>
              </div>
              <div className="flex justify-center">
                <ButtonPreview settings={form.getValues()} type="heroBtn" />
              </div>
            </div>
          </div>

          {/* Individual Button Settings */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-black">Button Customization</h2>
            </div>
            
            {/* Product Details Button */}
            <ButtonStyleSection 
              type="addToCart"
              title="Product Details Button"
              description="The main CTA on individual product pages"
              prefix="storeAddToCart"
              icon={FileText}
            />
            
            {/* Grid/Card Button */}
            <ButtonStyleSection 
              type="gridCart"
              title="Catalog Grid Button"
              description="Quick-add button shown on product cards"
              prefix="storeGridCart"
              icon={LayoutGrid}
            />
            
            {/* Hero Carousel Button */}
            <ButtonStyleSection 
              type="heroBtn"
              title="Hero Carousel Button"
              description="Primary action button on homepage slideshow"
              prefix="storeHeroBtn"
              icon={Scan}
            />
          </div>

          {/* Global Override Section */}
          <Card className="shadow-lg border-none ring-1 ring-border bg-slate-50 dark:bg-slate-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Magnet className="h-5 w-5" />
                Global Override (Optional)
              </CardTitle>
              <CardDescription>
                Apply a single style to all buttons at once. Leave disabled to use individual settings above.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="useIndividualBtnSettings"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-white dark:bg-slate-800">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-bold">
                        Use Individual Button Settings
                      </FormLabel>
                      <FormDescription>
                        When enabled, each button uses its own unique style above
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Button
                        type="button"
                        variant={field.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(!field.value)}
                        className="w-16"
                      >
                        {field.value ? "ON" : "OFF"}
                      </Button>
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {form.watch('useIndividualBtnSettings') === false && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-6 p-4 rounded-xl bg-white dark:bg-slate-800 border">
                  <FormField
                    control={form.control}
                    name="storeBtnStyle"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base font-black">Global Button Theme</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-2 md:grid-cols-4 gap-3"
                          >
                            {['standard', 'gradient'].map((style) => (
                              <div key={style}>
                                <RadioGroupItem value={style} id={`global-${style}`} className="peer sr-only" />
                                <Label
                                  htmlFor={`global-${style}`}
                                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                                >
                                  <div className={cn(
                                    "h-8 w-full mb-2",
                                    style === 'standard' && "bg-primary rounded",
                                    style === 'gradient' && "bg-gradient-to-r from-primary to-blue-700 rounded"
                                  )} />
                                  <span className="text-xs font-bold capitalize">{style}</span>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('storeBtnStyle') === 'standard' ? (
                    <FormField
                      control={form.control}
                      name="storeBtnColor"
                      render={({ field }) => <ColorInput field={field} label="Global Button Color" />}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="storeBtnShape"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Button Shape</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {buttonShapes.map(shape => (
                                <SelectItem key={shape.name} value={shape.name}>
                                  {renderShapeItem(shape.name, shape.label, shape.icon)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="storeBtnSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Button Size</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {buttonSizes.map(size => (
                                <SelectItem key={size.name} value={size.name}>
                                  <div className="flex flex-col">
                                    <span className="font-bold">{size.label}</span>
                                    <span className="text-xs text-muted-foreground">{size.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Global Preview */}
                  <div className="mt-4 p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-muted/5">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-4">Global Preview</span>
                    <div className="flex justify-center">
                      <ButtonPreview settings={form.getValues()} type="global" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900 flex gap-3 items-start">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p className="font-medium">
                <strong>Pro Tip:</strong> Each button type now has its own dedicated style settings. Enable "Use Individual Button Settings" to give each button a unique look, or disable it to apply one style across all buttons.
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Product Details Button - Appears on individual product pages</li>
                <li>Catalog Grid Button - Shows on product cards in the shop</li>
                <li>Hero Carousel Button - Used in homepage slideshow</li>
              </ul>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4 pt-4 sticky bottom-4 bg-background/95 backdrop-blur p-4 border-t">
            <Button 
              type="submit" 
              disabled={isSaving} 
              size="lg" 
              className="min-w-[250px] h-14 text-lg font-black shadow-xl shadow-primary/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save All Button Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}