'use client';

import { useState, useEffect, useMemo, useCallback, type ChangeEvent } from 'react';
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
  Circle,
  Shapes,
  Maximize,
  Box
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
  { name: 'lg', label: 'Large', description: 'Apple-style rounded', class: 'rounded-[16px]' },
  { name: 'full', label: 'Pill', description: 'Maximum rounding', class: 'rounded-full' },
];

const shadowOptions = [
  { name: 'none', label: 'None', class: 'shadow-none' },
  { name: 'sm', label: 'Soft', class: 'shadow-sm shadow-black/5' },
  { name: 'md', label: 'Medium', class: 'shadow-md shadow-black/5' },
  { name: 'lg', label: 'Elevated', class: 'shadow-lg shadow-black/5' },
  { name: 'xl', label: 'High', class: 'shadow-xl shadow-black/5' },
  { name: '2xl', label: 'Deep', class: 'shadow-2xl shadow-black/10' },
  { name: 'inner', label: 'Pressed', class: 'shadow-inner' },
];

const buttonStyleOptions = [
  { id: 'standard', label: 'Solid', icon: Circle, color: 'bg-primary' },
  { id: 'gradient', label: 'Gradient', icon: Sparkles, color: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
  { id: 'glass', label: 'Glass', icon: Smartphone, color: 'bg-white/40 backdrop-blur-md border border-white/40' },
  { id: 'outline', label: 'Outline', icon: Layout, color: 'border border-primary bg-transparent' },
  { id: 'ghost', label: 'Ghost', icon: Eye, color: 'bg-transparent border border-dashed border-muted' },
  { id: 'image', label: 'Image', icon: ImageIcon, color: 'bg-muted' },
];

const shoppingExpSchema = z.object({
  storeAddToCartText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeAddToCartIcon: z.preprocess((val) => val || 'ShoppingCart', z.string()).default('ShoppingCart'),
  storeAddToCartStyle: z.preprocess((val) => val || 'standard', z.enum(['standard', 'gradient', 'image', 'outline', 'ghost', 'glass'])).default('standard'),
  storeAddToCartColor: z.preprocess((val) => val || '#3b82f6', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#3b82f6'),
  storeAddToCartGradientStart: z.preprocess((val) => val || '#3b82f6', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#3b82f6'),
  storeAddToCartGradientEnd: z.preprocess((val) => val || '#1d4ed8', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#1d4ed8'),
  storeAddToCartImageUrl: z.string().url().or(z.literal('')).optional(),
  storeAddToCartSize: z.preprocess((val) => val || 'lg', z.enum(['sm', 'md', 'lg', 'xl'])).default('lg'),
  storeAddToCartShape: z.preprocess((val) => val || 'lg', z.enum(['none', 'sm', 'md', 'lg', 'full'])).default('lg'),
  storeAddToCartShadow: z.preprocess((val) => val || 'sm', z.enum(['none', 'sm', 'md', 'lg', 'xl', '2xl', 'inner'])).default('sm'),
  
  storeGridCartText: z.string().min(1, 'Label required').max(20, 'Label too long.'),
  storeGridCartIcon: z.preprocess((val) => val || 'ShoppingCart', z.string()).default('ShoppingCart'),
  storeGridCartStyle: z.preprocess((val) => val || 'standard', z.enum(['standard', 'gradient', 'image', 'outline', 'ghost', 'glass'])).default('standard'),
  storeGridCartColor: z.preprocess((val) => val || '#10b981', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#10b981'),
  storeGridCartGradientStart: z.preprocess((val) => val || '#10b981', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#10b981'),
  storeGridCartGradientEnd: z.preprocess((val) => val || '#059669', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#059669'),
  storeGridCartImageUrl: z.string().url().or(z.literal('')).optional(),
  storeGridCartSize: z.preprocess((val) => val || 'md', z.enum(['sm', 'md', 'lg', 'xl'])).default('md'),
  storeGridCartShape: z.preprocess((val) => val || 'md', z.enum(['none', 'sm', 'md', 'lg', 'full'])).default('md'),
  storeGridCartShadow: z.preprocess((val) => val || 'sm', z.enum(['none', 'sm', 'md', 'lg', 'xl', '2xl', 'inner'])).default('sm'),
  
  storeHeroBtnText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeHeroBtnIcon: z.preprocess((val) => val || 'ArrowRight', z.string()).default('ArrowRight'),
  storeHeroBtnStyle: z.preprocess((val) => val || 'gradient', z.enum(['standard', 'gradient', 'image', 'outline', 'ghost', 'glass'])).default('gradient'),
  storeHeroBtnColor: z.preprocess((val) => val || '#8b5cf6', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#8b5cf6'),
  storeHeroBtnGradientStart: z.preprocess((val) => val || '#8b5cf6', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#8b5cf6'),
  storeHeroBtnGradientEnd: z.preprocess((val) => val || '#7c3aed', z.string().regex(/^#[0-9a-fA-F]{6}$/i)).default('#7c3aed'),
  storeHeroBtnImageUrl: z.string().url().or(z.literal('')).optional(),
  storeHeroBtnSize: z.preprocess((val) => val || 'lg', z.enum(['sm', 'md', 'lg', 'xl'])).default('lg'),
  storeHeroBtnShape: z.preprocess((val) => val || 'lg', z.enum(['none', 'sm', 'md', 'lg', 'full'])).default('lg'),
  storeHeroBtnShadow: z.preprocess((val) => val || 'md', z.enum(['none', 'sm', 'md', 'lg', 'xl', '2xl', 'inner'])).default('md'),

  storeExploreBtnText: z.string().min(1, 'Label required').max(40, 'Label too long.'),
  storeExploreBtnIcon: z.preprocess((val) => val || 'ArrowRight', z.string()).default('ArrowRight'),
  storeExploreBtnStyle: z.preprocess((val) => val || 'standard', z.enum(['standard', 'gradient', 'image', 'outline', 'ghost', 'glass'])).default('standard'),
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {buttonStyleOptions.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => onChange(style.id)}
          className={cn(
            "relative flex flex-col items-center gap-2.5 p-3 rounded-2xl border transition-all duration-300 group",
            value === style.id
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]'
              : 'border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-zinc-900 hover:border-black/[0.12] dark:hover:border-white/[0.12] hover:bg-zinc-50 dark:hover:bg-zinc-800'
          )}
        >
          {style.id === 'image' && imageUrl ? (
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm border border-black/5 ring-2 ring-white">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-110", 
              style.color,
              style.id === 'glass' && "bg-white/40 dark:bg-white/10 backdrop-blur-md"
            )}>
               <style.icon className={cn(
                 "h-5 w-5", 
                 (style.id === 'outline' || style.id === 'ghost' || style.id === 'glass') ? 'text-blue-500' : 'text-white'
               )} />
            </div>
          )}
          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">{style.label}</span>
          {value === style.id && (
            <div className="absolute top-1.5 right-1.5">
              <div className="bg-blue-500 text-white rounded-full p-0.5 shadow-md">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
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
      case 'sm': return 'px-3 py-1.5 text-xs h-9';
      case 'md': return 'px-5 py-2.5 text-sm h-11';
      case 'lg': return 'px-7 py-3.5 text-base h-13';
      case 'xl': return 'px-9 py-4.5 text-lg h-15';
      default: return 'px-5 py-2.5 text-sm h-11';
    }
  };

  const getShapeClass = (sh: string) => {
    const found = buttonShapes.find(s => s.name === sh);
    return found ? found.class : 'rounded-[12px]';
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
        border: `1.5px solid ${settings[`${prefix}Color`]}`,
      };
    } else if (style === 'ghost') {
      return {
        backgroundColor: 'transparent',
        color: settings[`${prefix}Color`],
        border: 'none',
      };
    } else if (style === 'glass') {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(12px)',
        color: settings[`${prefix}Color`],
        border: '1px solid rgba(255, 255, 255, 0.5)',
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
    <div className="flex items-center justify-center p-16 bg-[#F2F2F7] dark:bg-zinc-950 rounded-[32px] border border-black/[0.04] dark:border-white/[0.04] shadow-inner relative overflow-hidden group">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <Button
        type="button"
        className={cn(
          getSizeClasses(size), 
          getShapeClass(shape), 
          getShadowClass(shadow), 
          "font-bold transition-all duration-500 transform hover:scale-[1.03] active:scale-[0.97] flex items-center gap-2"
        )}
        style={getStyleProperties()}
      >
        {Icon && <Icon className="h-[1.2em] w-[1.2em]" />}
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

  const handleImageUpload = async (prefix: string, event: ChangeEvent<HTMLInputElement>) => {
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
      <div className="space-y-8 p-6 lg:p-10 bg-[#F5F5F7] min-h-screen">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-6 w-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[600px] w-full rounded-[32px]" />
          <Skeleton className="h-[600px] w-full rounded-[32px]" />
        </div>
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="space-y-8">
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center">
                <Type className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Content & Icon</h3>
                <p className="text-xs text-zinc-500">How the button speaks to your customers.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name={`${prefix}Text` as any}
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Button Label</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Buy Now" 
                        {...field} 
                        className="h-12 rounded-2xl border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`${prefix}Icon` as any}
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Icon Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-2xl border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-sm">
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border-black/[0.08] shadow-2xl">
                        {iconOptions.map(opt => (
                          <SelectItem key={opt.name} value={opt.name} className="rounded-xl">
                            <div className="flex items-center gap-2.5 py-0.5">
                              <opt.icon className="h-4 w-4 text-blue-500" />
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">{opt.name}</span>
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
          </section>

          <Separator className="bg-black/[0.05] dark:bg-white/[0.05]" />

          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center">
                <Brush className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Visual Style</h3>
                <p className="text-xs text-zinc-500">The overall aesthetic and presence.</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name={`${prefix}Style` as any}
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Preset Style</FormLabel>
                  <ButtonStyleSelector
                    value={field.value}
                    onChange={field.onChange}
                    imageUrl={imageUrlValue}
                  />
                </FormItem>
              )}
            />

            {(styleValue === 'standard' || styleValue === 'outline' || styleValue === 'ghost' || styleValue === 'glass') && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <FormField
                  control={form.control}
                  name={`${prefix}Color` as any}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Accent Color</FormLabel>
                      <div className="flex items-center gap-4">
                        <FormControl>
                          <div className="relative group">
                            <Input 
                              type="color" 
                              {...field} 
                              className="p-0 h-14 w-14 cursor-pointer rounded-2xl border-2 border-white shadow-md group-hover:scale-105 transition-transform overflow-hidden" 
                            />
                            <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-black/5" />
                          </div>
                        </FormControl>
                        <div className="flex-1">
                          <Input 
                            value={field.value} 
                            onChange={field.onChange} 
                            className="h-12 rounded-2xl font-mono text-sm border-black/[0.08] bg-white shadow-sm" 
                          />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {styleValue === 'gradient' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 grid grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name={`${prefix}GradientStart` as any}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Start Color</FormLabel>
                      <FormControl>
                        <Input type="color" {...field} className="p-0 h-14 w-full cursor-pointer rounded-2xl border-2 border-white shadow-md" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`${prefix}GradientEnd` as any}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">End Color</FormLabel>
                      <FormControl>
                        <Input type="color" {...field} className="p-0 h-14 w-full cursor-pointer rounded-2xl border-2 border-white shadow-md" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {styleValue === 'image' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <FormField
                  control={form.control}
                  name={`${prefix}ImageUrl` as any}
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Background Image</FormLabel>
                      <div className="flex gap-6 items-center p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-200 dark:border-zinc-700">
                        {imageUrlValue ? (
                          <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-black/5 shadow-lg group shrink-0">
                            <img src={imageUrlValue} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <button
                              type="button"
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => field.onChange('')}
                            >
                              <X className="h-6 w-6 text-white" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center bg-white shadow-inner shrink-0">
                            <ImageIcon className="h-8 w-8 text-zinc-300" />
                          </div>
                        )}
                        <div className="flex-1 space-y-3">
                           <Button
                              asChild
                              variant="outline"
                              disabled={isUploading}
                              className="w-full h-12 rounded-2xl border-zinc-200 bg-white hover:bg-zinc-50 shadow-sm"
                            >
                              <label className="cursor-pointer">
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-500" /> : <Upload className="mr-2 h-4 w-4 text-blue-500" />}
                                <span className="font-bold">Choose Image</span>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*" 
                                  onChange={(e) => handleImageUpload(prefix, e)}
                                  disabled={isUploading}
                                />
                              </label>
                            </Button>
                            <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                              Transparent PNGs work best for textures. Max 5MB.
                            </p>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </section>

          <Separator className="bg-black/[0.05] dark:bg-white/[0.05]" />

          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center">
                <Shapes className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Shape & Depth</h3>
                <p className="text-xs text-zinc-500">Geometry and elevation settings.</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name={`${prefix}Shape` as any}
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Corner Rounding</FormLabel>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {buttonShapes.map((shape) => (
                      <button
                        key={shape.name}
                        type="button"
                        onClick={() => field.onChange(shape.name)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300",
                          field.value === shape.name
                            ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                            : 'border-black/[0.06] bg-white hover:bg-zinc-50'
                        )}
                      >
                        <div className={cn("w-full h-8 bg-zinc-200 border border-black/5", shape.class)} />
                        <p className="text-[10px] font-bold text-zinc-600">{shape.label}</p>
                        {field.value === shape.name && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-2.5 w-2.5 text-blue-500 stroke-[3]" />
                          </div>
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
                <FormItem className="space-y-4">
                  <FormLabel className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Elevation</FormLabel>
                  <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
                    {shadowOptions.map((shadow) => (
                      <button
                        key={shadow.name}
                        type="button"
                        onClick={() => field.onChange(shadow.name)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all duration-300",
                          field.value === shadow.name
                            ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                            : 'border-black/[0.06] bg-white hover:bg-zinc-50'
                        )}
                      >
                        <div className={cn("w-full h-4 bg-white border border-black/5", shadow.class)} />
                        <p className="text-[9px] font-bold truncate w-full text-center text-zinc-500">{shadow.label}</p>
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
                <FormItem className="space-y-2">
                  <FormLabel className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Button Size</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-2xl border-black/[0.08] bg-white shadow-sm">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      {buttonSizes.map(size => (
                        <SelectItem key={size.name} value={size.name} className="rounded-xl">
                          <div className="flex flex-col py-0.5">
                            <span className="font-bold text-zinc-800">{size.label}</span>
                            <span className="text-[10px] text-zinc-400 font-medium">{size.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </section>
        </div>

        <div className="space-y-8">
          <Card className="sticky top-10 border-none rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden bg-white/70 backdrop-blur-3xl ring-1 ring-black/[0.05]">
            <CardHeader className="bg-zinc-50/50 border-b border-black/[0.04] px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight">Live Preview</CardTitle>
                    <CardDescription className="text-xs font-medium">Real-time storefront visualization.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-200/50 p-1.5 rounded-2xl border border-black/5">
                  {[
                    { id: 'mobile', icon: Smartphone },
                    { id: 'tablet', icon: Tablet },
                    { id: 'desktop', icon: Monitor },
                  ].map((device) => (
                    <button
                      key={device.id}
                      onClick={() => setPreviewDevice(device.id as any)}
                      className={cn(
                        "p-2.5 rounded-[12px] transition-all duration-300",
                        previewDevice === device.id 
                          ? "bg-white shadow-sm text-blue-500 scale-105" 
                          : "text-zinc-400 hover:text-zinc-600 hover:bg-white/50"
                      )}
                    >
                      <device.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 flex flex-col items-center">
              <div className={cn(
                "transition-all duration-1000 ease-in-out w-full flex flex-col items-center",
                previewDevice === 'mobile' ? "max-w-[320px]" : previewDevice === 'tablet' ? "max-w-[600px]" : "max-w-full"
              )}>
                 <div className="w-full relative">
                    <ButtonPreview settings={form.watch()} type={type} />
                    <div className="mt-12 w-full space-y-6 px-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-zinc-100 rounded-full animate-pulse shrink-0" />
                        <div className="h-4 w-1/2 bg-zinc-100 rounded-full animate-pulse" />
                      </div>
                      <div className="space-y-3">
                        <div className="h-3 w-full bg-zinc-50 rounded-full animate-pulse" />
                        <div className="h-3 w-3/4 bg-zinc-50 rounded-full animate-pulse" />
                        <div className="h-3 w-1/2 bg-zinc-50 rounded-full animate-pulse opacity-50" />
                      </div>
                    </div>
                 </div>
              </div>
            </CardContent>
            <CardFooter className="bg-zinc-50/30 border-t border-black/[0.04] p-6 justify-center">
               <div className="flex items-center gap-2 py-1 px-4 rounded-full bg-blue-500/5 border border-blue-500/10">
                 <Sparkles className="h-3 w-3 text-blue-500 animate-pulse" />
                 <p className="text-[11px] font-bold text-blue-600/70 tracking-wide uppercase">Interactive Design Engine</p>
               </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-24">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white shadow-sm border border-black/5">
              <MousePointerClick className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Experience Designer</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-zinc-900 leading-tight">
              Button Style <span className="text-blue-500">Interface</span>
            </h1>
            <p className="text-lg text-zinc-500 font-medium max-w-2xl leading-relaxed">
              Craft high-conversion touchpoints with Apple-inspired design precision. Every pixel matters.
            </p>
          </div>

          <div className="flex items-center gap-4">
             <Button
                variant="ghost"
                onClick={() => form.reset()}
                disabled={isSaving}
                className="h-14 px-8 rounded-3xl font-bold text-zinc-500 hover:text-zinc-900 hover:bg-white/50 transition-all"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSaving}
                className="h-14 px-10 rounded-3xl bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-[0_20px_40px_-10px_rgba(59,130,246,0.4)] transition-all active:scale-95 group"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                    <span>Save Configuration</span>
                  </>
                )}
              </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
            <Card className="border-none rounded-[32px] shadow-sm bg-white ring-1 ring-black/[0.05] overflow-hidden group hover:shadow-md transition-shadow duration-500">
              <CardContent className="p-8">
                 <FormField
                    control={form.control}
                    name="useIndividualBtnSettings"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between gap-10">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <FormLabel className="text-xl font-bold tracking-tight">Granular Control</FormLabel>
                            <div className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase">Advanced</div>
                          </div>
                          <FormDescription className="text-sm font-medium text-zinc-400 max-w-xl">
                            Enable individual customization for each button location. When off, the global theme overrides these settings.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                            disabled={isSaving} 
                            className="scale-125 data-[state=checked]:bg-blue-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-10">
              <TabsList className="flex w-full h-auto p-1.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-[28px] border border-black/[0.03] overflow-x-auto scrollbar-hide">
                <TabsTrigger 
                  value="addToCart" 
                  className="flex-1 rounded-[22px] py-5 px-6 flex items-center justify-center gap-3 transition-all duration-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] data-[state=active]:scale-[1.02] text-zinc-500 font-bold text-sm whitespace-nowrap"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Product Page</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="gridCart" 
                  className="flex-1 rounded-[22px] py-5 px-6 flex items-center justify-center gap-3 transition-all duration-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] data-[state=active]:scale-[1.02] text-zinc-500 font-bold text-sm whitespace-nowrap"
                >
                  <Box className="h-4 w-4" />
                  <span>Product Card</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="heroBtn" 
                  className="flex-1 rounded-[22px] py-5 px-6 flex items-center justify-center gap-3 transition-all duration-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] data-[state=active]:scale-[1.02] text-zinc-500 font-bold text-sm whitespace-nowrap"
                >
                  <Zap className="h-4 w-4" />
                  <span>Hero/Banner</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="exploreBtn" 
                  className="flex-1 rounded-[22px] py-5 px-6 flex items-center justify-center gap-3 transition-all duration-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] data-[state=active]:scale-[1.02] text-zinc-500 font-bold text-sm whitespace-nowrap"
                >
                  <Maximize className="h-4 w-4" />
                  <span>Explore View</span>
                </TabsTrigger>
              </TabsList>

              <div className="focus-visible:outline-none">
                <TabsContent value="addToCart" className="m-0 focus-visible:outline-none">
                  {renderButtonSettings('addToCart')}
                </TabsContent>
                <TabsContent value="gridCart" className="m-0 focus-visible:outline-none">
                  {renderButtonSettings('gridCart')}
                </TabsContent>
                <TabsContent value="heroBtn" className="m-0 focus-visible:outline-none">
                  {renderButtonSettings('heroBtn')}
                </TabsContent>
                <TabsContent value="exploreBtn" className="m-0 focus-visible:outline-none">
                  {renderButtonSettings('exploreBtn')}
                </TabsContent>
              </div>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
}
