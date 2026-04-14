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
  Image as ImageIcon
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
  { name: 'lg', label: 'Large', description: 'Heavily rounded', class: 'rounded-lg' },
  { name: 'full', label: 'Pill', description: 'Maximum rounding', class: 'rounded-full' },
];

const shoppingExpSchema = z.object({
  storeAddToCartText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeAddToCartIcon: z.string().default('ShoppingCart'),
  storeAddToCartStyle: z.enum(['standard', 'gradient', 'image', 'outline', 'ghost']).default('standard'),
  storeAddToCartColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeAddToCartGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeAddToCartGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#1d4ed8'),
  storeAddToCartImageUrl: z.string().url().or(z.literal('')).optional(),
  storeAddToCartSize: z.enum(['sm', 'md', 'lg', 'xl']).default('lg'),
  storeAddToCartShape: z.enum(['none', 'sm', 'md', 'lg', 'full']).default('lg'),
  
  storeGridCartText: z.string().min(1, 'Label required').max(20, 'Label too long.'),
  storeGridCartIcon: z.string().default('ShoppingCart'),
  storeGridCartStyle: z.enum(['standard', 'gradient', 'image', 'outline', 'ghost']).default('standard'),
  storeGridCartColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#10b981'),
  storeGridCartGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#10b981'),
  storeGridCartGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#059669'),
  storeGridCartImageUrl: z.string().url().or(z.literal('')).optional(),
  storeGridCartSize: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
  storeGridCartShape: z.enum(['none', 'sm', 'md', 'lg', 'full']).default('md'),
  
  storeHeroBtnText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeHeroBtnIcon: z.string().default('ArrowRight'),
  storeHeroBtnStyle: z.enum(['standard', 'gradient', 'image', 'outline', 'ghost']).default('gradient'),
  storeHeroBtnColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#8b5cf6'),
  storeHeroBtnGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#8b5cf6'),
  storeHeroBtnGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#7c3aed'),
  storeHeroBtnImageUrl: z.string().url().or(z.literal('')).optional(),
  storeHeroBtnSize: z.enum(['sm', 'md', 'lg', 'xl']).default('lg'),
  storeHeroBtnShape: z.enum(['none', 'sm', 'md', 'lg', 'full']).default('lg'),

  storeExploreBtnText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeExploreBtnIcon: z.string().default('ArrowRight'),
  storeExploreBtnStyle: z.enum(['standard', 'gradient', 'image', 'outline', 'ghost']).default('standard'),
  storeExploreBtnColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeExploreBtnGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#3b82f6'),
  storeExploreBtnGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i).default('#1d4ed8'),
  storeExploreBtnImageUrl: z.string().url().or(z.literal('')).optional(),
  storeExploreBtnSize: z.enum(['sm', 'md', 'lg', 'xl']).default('lg'),
  storeExploreBtnShape: z.enum(['none', 'sm', 'md', 'lg', 'full']).default('lg'),
  
  useIndividualBtnSettings: z.boolean().default(true),
  showProductReviews: z.boolean().default(true),
  showReviewRatingOnCard: z.boolean().default(true),
});

type FormValues = z.infer<typeof shoppingExpSchema>;

// Button Style Selector Component
function ButtonStyleSelector({
  value,
  onChange,
  prefix,
  imageUrl,
  onImageUpload,
  isUploading
}: {
  value: string;
  onChange: (value: string) => void;
  prefix: string;
  imageUrl?: string;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
}) {
  return (
    <FormItem className="space-y-3">
      <FormLabel className="text-base font-bold flex items-center gap-2">
        <Brush className="h-4 w-4" /> Background Style
      </FormLabel>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Standard Style */}
        <button
          type="button"
          onClick={() => onChange('standard')}
          className={cn(
            "relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
            value === 'standard'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-primary/30 hover:bg-muted/30'
          )}
        >
          <div className="w-10 h-10 bg-blue-500 rounded-lg" />
          <div className="text-center">
            <p className="text-[10px] font-semibold">Solid</p>
          </div>
          {value === 'standard' && (
            <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
          )}
        </button>

        {/* Gradient Style */}
        <button
          type="button"
          onClick={() => onChange('gradient')}
          className={cn(
            "relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
            value === 'gradient'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-primary/30 hover:bg-muted/30'
          )}
        >
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg" />
          <div className="text-center">
            <p className="text-[10px] font-semibold">Gradient</p>
          </div>
          {value === 'gradient' && (
            <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
          )}
        </button>

        {/* Outline Style */}
        <button
          type="button"
          onClick={() => onChange('outline')}
          className={cn(
            "relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
            value === 'outline'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-primary/30 hover:bg-muted/30'
          )}
        >
          <div className="w-10 h-10 border-2 border-primary rounded-lg flex items-center justify-center bg-background" />
          <div className="text-center">
            <p className="text-[10px] font-semibold">Outline</p>
          </div>
          {value === 'outline' && (
            <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
          )}
        </button>

        {/* Ghost Style */}
        <button
          type="button"
          onClick={() => onChange('ghost')}
          className={cn(
            "relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
            value === 'ghost'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-primary/30 hover:bg-muted/30'
          )}
        >
          <div className="w-10 h-10 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-transparent" />
          <div className="text-center">
            <p className="text-[10px] font-semibold">Ghost</p>
          </div>
          {value === 'ghost' && (
            <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
          )}
        </button>

        {/* Image Style */}
        <button
          type="button"
          onClick={() => onChange('image')}
          className={cn(
            "relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
            value === 'image'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-primary/30 hover:bg-muted/30'
          )}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Button background" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="text-center">
            <p className="text-[10px] font-semibold">Image</p>
          </div>
          {value === 'image' && (
            <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
          )}
        </button>
      </div>
    </FormItem>
  );
}

// Button Shape Selector Component
function ButtonShapeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormItem className="space-y-3">
      <FormLabel className="text-base font-bold flex items-center gap-2">
        <Palette className="h-4 w-4" /> Button Shape
      </FormLabel>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {buttonShapes.map((shape) => (
          <button
            key={shape.name}
            type="button"
            onClick={() => onChange(shape.name)}
            className={cn(
              "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
              value === shape.name
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-primary/30 hover:bg-muted/30'
            )}
          >
            <div className={cn("w-12 h-6 bg-primary/20 border border-primary/40", shape.class)} />
            <div className="text-center">
              <p className="text-[10px] font-semibold">{shape.label}</p>
            </div>
            {value === shape.name && (
              <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
            )}
          </button>
        ))}
      </div>
    </FormItem>
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
    <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
      <p className="text-xs font-semibold text-muted-foreground mb-3">Preview</p>
      <Button
        type="button"
        className={cn(getSizeClasses(size), getShapeClass(shape), "font-semibold shadow-sm")}
        style={getStyleProperties()}
      >
        {Icon && <Icon className="mr-2 h-4 w-4" />}
        {text}
      </Button>
    </div>
  );
}

// Button Configuration Section
function ButtonSection({
  type,
  title,
  description,
  icon: SectionIcon,
  form,
  isUploading,
  handleImageUpload
}: {
  type: 'addToCart' | 'gridCart' | 'heroBtn' | 'exploreBtn';
  title: string;
  description: string;
  icon: any;
  form: any;
  isUploading: boolean;
  handleImageUpload: (prefix: string, e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const prefix = type === 'addToCart' ? 'storeAddToCart'
    : type === 'gridCart' ? 'storeGridCart'
    : type === 'heroBtn' ? 'storeHeroBtn'
    : 'storeExploreBtn';

  const styleValue = form.watch(`${prefix}Style`);
  const imageUrlValue = form.watch(`${prefix}ImageUrl`);

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <SectionIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Text & Icon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`${prefix}Text` as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-semibold flex items-center gap-2">
                  <Type className="h-4 w-4" /> Button Label
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Add to Cart" {...field} />
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
                <FormLabel className="font-semibold flex items-center gap-2">
                  <Magnet className="h-4 w-4" /> Button Icon
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
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

        <Separator />

        {/* Button Style Selection */}
        <FormField
          control={form.control}
          name={`${prefix}Style` as any}
          render={({ field }) => (
            <ButtonStyleSelector
              value={field.value}
              onChange={field.onChange}
              prefix={prefix}
              imageUrl={imageUrlValue}
              onImageUpload={(e) => handleImageUpload(prefix, e)}
              isUploading={isUploading}
            />
          )}
        />

        {/* Button Shape Selection */}
        <FormField
          control={form.control}
          name={`${prefix}Shape` as any}
          render={({ field }) => (
            <ButtonShapeSelector
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {/* Standard Color */}
        {(styleValue === 'standard' || styleValue === 'outline' || styleValue === 'ghost') && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <FormField
              control={form.control}
              name={`${prefix}Color` as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Button Color</FormLabel>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-md border-2" />
                    </FormControl>
                    <span className="text-sm font-mono bg-muted px-3 py-2 rounded-md border">{field.value}</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Gradient Colors */}
        {styleValue === 'gradient' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={`${prefix}GradientStart` as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Gradient Start</FormLabel>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-md border-2" />
                      </FormControl>
                      <span className="text-sm font-mono bg-muted px-3 py-2 rounded-md border">{field.value}</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`${prefix}GradientEnd` as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Gradient End</FormLabel>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Input type="color" {...field} className="p-1 h-10 w-14 cursor-pointer rounded-md border-2" />
                      </FormControl>
                      <span className="text-sm font-mono bg-muted px-3 py-2 rounded-md border">{field.value}</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Image Upload */}
        {styleValue === 'image' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <FormField
              control={form.control}
              name={`${prefix}ImageUrl` as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold">Background Image</FormLabel>
                  <div className="flex gap-4 items-start">
                    {imageUrlValue ? (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-primary/20 bg-muted shrink-0 group">
                        <img
                          src={imageUrlValue}
                          alt="Button background"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => field.onChange('')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 flex items-center justify-center shrink-0">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        className="w-full"
                      >
                        <label htmlFor={`${prefix}-image-upload`} className="cursor-pointer">
                          {isUploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
                          Upload Image
                        </label>
                      </Button>
                      <Input
                        id={`${prefix}-image-upload`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(prefix, e)}
                        disabled={isUploading}
                      />
                      <p className="text-xs text-muted-foreground">Max 5MB image</p>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Size Selection */}
        <FormField
          control={form.control}
          name={`${prefix}Size` as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold">Button Size</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {buttonSizes.map(size => (
                    <SelectItem key={size.name} value={size.name}>
                      <div>
                        <p className="font-semibold">{size.label}</p>
                        <p className="text-xs text-muted-foreground">{size.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preview */}
        <ButtonPreview settings={form.watch()} type={type} />
      </CardContent>
    </Card>
  );
}

export default function ShoppingExperienceSettingsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
      storeAddToCartImageUrl: '',
      storeAddToCartSize: 'lg',
      storeAddToCartShape: 'lg',

      storeGridCartText: 'Add to Bag',
      storeGridCartIcon: 'ShoppingCart',
      storeGridCartStyle: 'standard',
      storeGridCartColor: '#10b981',
      storeGridCartGradientStart: '#10b981',
      storeGridCartGradientEnd: '#059669',
      storeGridCartImageUrl: '',
      storeGridCartSize: 'md',
      storeGridCartShape: 'md',

      storeHeroBtnText: 'Shop Collection',
      storeHeroBtnIcon: 'ArrowRight',
      storeHeroBtnStyle: 'gradient',
      storeHeroBtnColor: '#8b5cf6',
      storeHeroBtnGradientStart: '#8b5cf6',
      storeHeroBtnGradientEnd: '#7c3aed',
      storeHeroBtnImageUrl: '',
      storeHeroBtnSize: 'lg',
      storeHeroBtnShape: 'lg',

      storeExploreBtnText: 'Explore Collection',
      storeExploreBtnIcon: 'ArrowRight',
      storeExploreBtnStyle: 'standard',
      storeExploreBtnColor: '#3b82f6',
      storeExploreBtnGradientStart: '#3b82f6',
      storeExploreBtnGradientEnd: '#1d4ed8',
      storeExploreBtnImageUrl: '',
      storeExploreBtnSize: 'lg',
      storeExploreBtnShape: 'lg',

      useIndividualBtnSettings: true,
      showProductReviews: true,
      showReviewRatingOnCard: true,
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        storeAddToCartText: settingsData.storeAddToCartText || 'Secure Purchase',
        storeAddToCartIcon: settingsData.storeAddToCartIcon || 'ShoppingCart',
        storeAddToCartStyle: (settingsData.storeAddToCartStyle as any) || 'standard',
        storeAddToCartColor: settingsData.storeAddToCartColor || '#3b82f6',
        storeAddToCartGradientStart: settingsData.storeAddToCartGradientStart || '#3b82f6',
        storeAddToCartGradientEnd: settingsData.storeAddToCartGradientEnd || '#1d4ed8',
        storeAddToCartImageUrl: settingsData.storeAddToCartImageUrl || '',
        storeAddToCartSize: (settingsData.storeAddToCartSize as any) || 'lg',
        storeAddToCartShape: (settingsData.storeAddToCartShape as any) || 'lg',

        storeGridCartText: settingsData.storeGridCartText || 'Add to Bag',
        storeGridCartIcon: settingsData.storeGridCartIcon || 'ShoppingCart',
        storeGridCartStyle: (settingsData.storeGridCartStyle as any) || 'standard',
        storeGridCartColor: settingsData.storeGridCartColor || '#10b981',
        storeGridCartGradientStart: settingsData.storeGridCartGradientStart || '#10b981',
        storeGridCartGradientEnd: settingsData.storeGridCartGradientEnd || '#059669',
        storeGridCartImageUrl: settingsData.storeGridCartImageUrl || '',
        storeGridCartSize: (settingsData.storeGridCartSize as any) || 'md',
        storeGridCartShape: (settingsData.storeGridCartShape as any) || 'md',

        storeHeroBtnText: settingsData.storeHeroBtnText || 'Shop Collection',
        storeHeroBtnIcon: settingsData.storeHeroBtnIcon || 'ArrowRight',
        storeHeroBtnStyle: (settingsData.storeHeroBtnStyle as any) || 'gradient',
        storeHeroBtnColor: settingsData.storeHeroBtnColor || '#8b5cf6',
        storeHeroBtnGradientStart: settingsData.storeHeroBtnGradientStart || '#8b5cf6',
        storeHeroBtnGradientEnd: settingsData.storeHeroBtnGradientEnd || '#7c3aed',
        storeHeroBtnImageUrl: settingsData.storeHeroBtnImageUrl || '',
        storeHeroBtnSize: (settingsData.storeHeroBtnSize as any) || 'lg',
        storeHeroBtnShape: (settingsData.storeHeroBtnShape as any) || 'lg',

        storeExploreBtnText: settingsData.storeExploreBtnText || 'Explore Collection',
        storeExploreBtnIcon: settingsData.storeExploreBtnIcon || 'ArrowRight',
        storeExploreBtnStyle: (settingsData.storeExploreBtnStyle as any) || 'standard',
        storeExploreBtnColor: settingsData.storeExploreBtnColor || '#3b82f6',
        storeExploreBtnGradientStart: settingsData.storeExploreBtnGradientStart || '#3b82f6',
        storeExploreBtnGradientEnd: settingsData.storeExploreBtnGradientEnd || '#1d4ed8',
        storeExploreBtnImageUrl: settingsData.storeExploreBtnImageUrl || '',
        storeExploreBtnSize: (settingsData.storeExploreBtnSize as any) || 'lg',
        storeExploreBtnShape: (settingsData.storeExploreBtnShape as any) || 'lg',

        useIndividualBtnSettings: settingsData.useIndividualBtnSettings !== false,
        showProductReviews: settingsData.showProductReviews ?? true,
        showReviewRatingOnCard: settingsData.showReviewRatingOnCard ?? true,
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
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Success', description: 'Your shopping button settings have been saved.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
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

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={MousePointerClick}
        title="Shopping Experience Settings"
        description="Customize the appearance and behavior of shopping buttons throughout your store"
      />

          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Quick Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" /> Button Configuration
              </CardTitle>
              <CardDescription>Use individual settings for each button location</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="useIndividualBtnSettings"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base font-semibold">Individual Button Settings</FormLabel>
                      <FormDescription>Enable to customize each button independently</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Button Sections */}
          <Tabs defaultValue="addToCart" className="w-full" disabled={isSaving}>
            <TabsList className="grid w-full grid-cols-4" style={{ pointerEvents: isSaving ? 'none' : 'auto', opacity: isSaving ? 0.6 : 1 }}>
              <TabsTrigger value="addToCart">Add to Cart</TabsTrigger>
              <TabsTrigger value="gridCart">Grid Button</TabsTrigger>
              <TabsTrigger value="heroBtn">Hero Button</TabsTrigger>
              <TabsTrigger value="exploreBtn">Explore Button</TabsTrigger>
            </TabsList>

            <TabsContent value="addToCart" className="space-y-4">
              <ButtonSection
                type="addToCart"
                title="Add to Cart Button"
                description="Product detail page button"
                icon={ShoppingCart}
                form={form}
                isUploading={isUploading}
                handleImageUpload={handleImageUpload}
              />
            </TabsContent>

            <TabsContent value="gridCart" className="space-y-4">
              <ButtonSection
                type="gridCart"
                title="Grid Button"
                description="Product grid/listing button"
                icon={ShoppingBag}
                form={form}
                isUploading={isUploading}
                handleImageUpload={handleImageUpload}
              />
            </TabsContent>

            <TabsContent value="heroBtn" className="space-y-4">
              <ButtonSection
                type="heroBtn"
                title="Hero Button"
                description="Banner/hero section button"
                icon={Zap}
                form={form}
                isUploading={isUploading}
                handleImageUpload={handleImageUpload}
              />
            </TabsContent>

            <TabsContent value="exploreBtn" className="space-y-4">
              <ButtonSection
                type="exploreBtn"
                title="Explore Button"
                description="Product Section / Category 'Explore' button"
                icon={ArrowRight}
                form={form}
                isUploading={isUploading}
                handleImageUpload={handleImageUpload}
              />
            </TabsContent>
          </Tabs>

          {/* Product Reviews Settings */}
          <ProductReviewsSettings />

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSaving}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="gap-2 min-w-[160px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
