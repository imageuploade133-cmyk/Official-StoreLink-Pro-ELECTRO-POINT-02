
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Coins, 
  Loader2, 
  Save, 
  Info, 
  Eye, 
  EyeOff, 
  PartyPopper, 
  Sparkles, 
  Wallet, 
  Palette, 
  Gift, 
  Heart, 
  Star, 
  CheckCircle2, 
  Zap, 
  Trophy, 
  Upload, 
  X, 
  Type, 
  ImageIcon 
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Separator } from '@/components/ui/separator';

const iconOptions = [
  { name: 'PartyPopper', icon: PartyPopper },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Gift', icon: Gift },
  { name: 'Heart', icon: Heart },
  { name: 'Star', icon: Star },
  { name: 'CheckCircle2', icon: CheckCircle2 },
  { name: 'Zap', icon: Zap },
  { name: 'Coins', icon: Coins },
  { name: 'Trophy', icon: Trophy },
];

const welcomeCreditSchema = z.object({
  enableWelcomeCredit: z.boolean().default(false),
  welcomeCreditAmount: z.coerce.number().min(0, 'Magnitude cannot be negative.').default(0),
  showWelcomePopup: z.boolean().default(true),
  welcomePopupTitle: z.string().min(2, 'Title is too short.').max(60, 'Title is too long.').default('Welcome to the Collection!'),
  welcomePopupMessage: z.string().min(2, 'Message is too short.').max(300, 'Message is too long.').default('Your digital profile has been initialized with a premium starter credit.'),
  welcomePopupImageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  welcomePopupIcon: z.string().default('PartyPopper'),
  welcomePopupIconColor: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').default('#3b82f6'),
  welcomePopupBgColor: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').default('#ffffff'),
  welcomePopupTextColor: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').default('#000000'),
});

type FormValues = z.infer<typeof welcomeCreditSchema>;

const ColorInput = ({ field, label }: { field: any; label: string }) => (
    <FormItem>
        <FormLabel className="text font-black uppercase tracking-widest text-muted-foreground">{label}</FormLabel>
        <div className="relative flex items-center">
             <FormControl>
                <Input type="color" {...field} value={field.value || '#ffffff'} className="p-1 h-10 w-12 cursor-pointer rounded-lg border-2" />
            </FormControl>
            <span className="absolute left-14 text-sm text-muted-foreground font-mono font-bold">{field.value}</span>
        </div>
        <FormMessage />
    </FormItem>
);

export default function WelcomeCreditSettingsPage() {
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
    resolver: zodResolver(welcomeCreditSchema),
    defaultValues: {
      enableWelcomeCredit: false,
      welcomeCreditAmount: 0,
      showWelcomePopup: true,
      welcomePopupTitle: 'Welcome to the Collection!',
      welcomePopupMessage: 'Your digital profile has been initialized with a premium starter credit.',
      welcomePopupImageUrl: '',
      welcomePopupIcon: 'PartyPopper',
      welcomePopupIconColor: '#3b82f6',
      welcomePopupBgColor: '#ffffff',
      welcomePopupTextColor: '#000000',
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        enableWelcomeCredit: settingsData.enableWelcomeCredit ?? false,
        welcomeCreditAmount: settingsData.welcomeCreditAmount || 0,
        showWelcomePopup: settingsData.showWelcomePopup ?? true,
        welcomePopupTitle: settingsData.welcomePopupTitle || 'Welcome to the Collection!',
        welcomePopupMessage: settingsData.welcomePopupMessage || 'Your digital profile has been initialized with a premium starter credit.',
        welcomePopupImageUrl: settingsData.welcomePopupImageUrl || '',
        welcomePopupIcon: settingsData.welcomePopupIcon || 'PartyPopper',
        welcomePopupIconColor: settingsData.welcomePopupIconColor || '#3b82f6',
        welcomePopupBgColor: settingsData.welcomePopupBgColor || '#ffffff',
        welcomePopupTextColor: settingsData.welcomePopupTextColor || '#000000',
      });
    }
  }, [settingsData, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { 
      toast({ variant: "destructive", title: "File too large", description: "Image must be smaller than 2MB." });
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('welcomePopupImageUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Visual Asset Sync", description: "The congratulation image has been updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message });
      } finally {
        setIsUploading(false);
      }
    };
  };

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Protocol Updated', description: 'Welcome Bonus configuration is now active.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingSettings;
  const isEnabled = form.watch('enableWelcomeCredit');
  const isPopupEnabled = form.watch('showWelcomePopup');
  const currencySymbol = settingsData?.currency || '$';
  
  const currentIconName = form.watch('welcomePopupIcon');
  const iconColor = form.watch('welcomePopupIconColor');
  const SelectedIcon = iconOptions.find(i => i.name === currentIconName)?.icon || PartyPopper;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Coins} title="Welcome Bonus Settings" description="Loading registry..." />
        <Skeleton className="h w-full rounded-3xl" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
            icon={Coins}
            title="Welcome Bonus Management"
            description="Configure automated account credits and onboarding visuals for new users."
        />
        <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving || isUploading}
            className="h-12 px-8 font-black uppercase tracking-widest   transition-all active:scale-95"
        >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Sync Bonus Protocol
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <Form {...form}>
            <form className="space-y-10">
              <Card className={cn(" border-none ring-1 ring-border overflow-hidden", !isEnabled && "opacity-60 grayscale")}>
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Bonus Configuration</CardTitle>
                    <CardDescription>Adjust the magnitude and activation of the automated onboarding credit.</CardDescription>
                  </div>
                  <FormField
                    control={form.control}
                    name="enableWelcomeCredit"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0 rounded-full border px-4 py-2 bg-background ">
                        <div className="flex items-center gap-2">
                            {field.value ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                            <FormLabel className="text font-black uppercase tracking-widest">{field.value ? 'Active' : 'Disabled'}</FormLabel>
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
                <CardContent className="pt-8">
                  <FormField
                    control={form.control}
                    name="welcomeCreditAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">Bonus Magnitude ({currencySymbol})</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-amber-500" />
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    {...field} 
                                    className="h-14 pl-12 text-2xl font-black tracking-tighter" 
                                />
                            </div>
                        </FormControl>
                        <FormDescription className="text-xs">This amount will be instantly credited to every new account balance upon registration.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Congratulation Pop-up Customization */}
              <Card className={cn(" border-none ring-1 ring-border overflow-hidden", !isPopupEnabled && "opacity-60")}>
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <PartyPopper className="h-5 w-5 text-primary" /> Onboarding Visual Protocol
                        </CardTitle>
                        <CardDescription>Customize the "Congratulations" pop-up shown after signup.</CardDescription>
                    </div>
                    <FormField
                        control={form.control}
                        name="showWelcomePopup"
                        render={({ field }) => (
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        )}
                    />
                </CardHeader>
                <CardContent className={cn("pt-8 space-y-8 transition-opacity duration-500", !isPopupEnabled && "pointer-events-none")}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                            control={form.control}
                            name="welcomePopupTitle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Type className="h-3.5 w-3.5" /> Identity Heading
                                    </FormLabel>
                                    <FormControl><Input placeholder="Welcome to the Collection!" {...field} className="h-11 font-bold" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="welcomePopupIcon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Sparkles className="h-3.5 w-3.5" /> Symbolic Icon
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-11">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {iconOptions.map(opt => (
                                                <SelectItem key={opt.name} value={opt.name}>
                                                    <div className="flex items-center gap-2">
                                                        <opt.icon className="h-4 w-4" />
                                                        <span>{opt.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="welcomePopupMessage"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">Onboarding Narrative</FormLabel>
                                <FormControl><Textarea placeholder="Share the excitement of joining..." {...field} rows={3} className="rounded-2xl resize-none" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Separator className="border-dashed" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <FormField 
                            control={form.control} 
                            name="welcomePopupBgColor" 
                            render={({ field }) => <ColorInput field={field} label="Overlay Background" />} 
                        />
                        <FormField 
                            control={form.control} 
                            name="welcomePopupTextColor" 
                            render={({ field }) => <ColorInput field={field} label="Message Text Color" />} 
                        />
                        <FormField 
                            control={form.control} 
                            name="welcomePopupIconColor" 
                            render={({ field }) => <ColorInput field={field} label="Icon Accent Color" />} 
                        />
                    </div>

                    <Separator className="border-dashed" />

                    <FormField
                        control={form.control}
                        name="welcomePopupImageUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <ImageIcon className="h-3.5 w-3.5" /> High-End Media Asset
                                </FormLabel>
                                <div className="flex flex-col gap-4">
                                    {field.value && (
                                        <div className="relative w-full aspect-video max-w-sm rounded overflow-hidden border-2  group">
                                            <Image src={field.value} alt="Welcome Visual" fill className="object-cover" unoptimized />
                                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity " onClick={() => field.onChange('')}><X className="h-4 w-4" /></Button>
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <FormControl><Input placeholder="Direct URL or use upload..." {...field} value={field.value || ''} className="h-11" /></FormControl>
                                        <Button asChild variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={isUploading}>
                                            <label htmlFor="welcome-img-upload" className="cursor-pointer">
                                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                                            </label>
                                        </Button>
                                        <input id="welcome-img-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </div>
                                </div>
                                <FormDescription className="text">Displayed at the top of the congratulation pop-up. Optimized for 800x400px.</FormDescription>
                            </FormItem>
                        )}
                    />
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className=" border-none ring-1 ring-border overflow-hidden rounded">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-sm font-black uppercase tracking text-primary flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Live Simulation
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-8 pb-10 flex flex-col items-center">
                    {/* The Simulation Pop-up View */}
                    <div 
                        className="w-full rounded overflow-hidden  border transition-all duration-500 scale-95 origin-top"
                        style={{ backgroundColor: form.watch('welcomePopupBgColor'), color: form.watch('welcomePopupTextColor') }}
                    >
                        {form.watch('welcomePopupImageUrl') && (
                            <div className="relative aspect w-full border-b">
                                <Image src={form.watch('welcomePopupImageUrl')!} alt="" fill className="object-cover" unoptimized />
                            </div>
                        )}
                        <div className="p-8 flex flex-col items-center text-center space-y-4">
                            <div className="size-16 rounded flex items-center justify-center mb-2 " style={{ backgroundColor: `${iconColor}15` }}>
                                <SelectedIcon className="size-8" style={{ color: iconColor }} strokeWidth={3} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">{form.watch('welcomePopupTitle')}</h3>
                                <p className="text font-medium opacity-70 leading-relaxed px-4">{form.watch('welcomePopupMessage')}</p>
                            </div>
                            <div className="pt-4 w-full">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                    <p className="text font-black uppercase tracking-widest opacity-50 mb-1">Bonus Verified</p>
                                    <p className="text-3xl font-black tracking-tighter" style={{ color: iconColor }}>{formatCurrency(form.watch('welcomeCreditAmount') || 0, currencySymbol)}</p>
                                </div>
                            </div>
                            <Button variant="ghost" className="text font-black uppercase tracking-widest pointer-events-none mt-2 opacity-40">Dismiss Hub</Button>
                        </div>
                    </div>
                    <p className="text text-muted-foreground font-black uppercase text-center mt-6 tracking-widest">Onboarding Overlay Projection</p>
                </CardContent>
            </Card>

            <div className="p-6 bg-primary/5 rounded border-2 border-dashed border-primary/10 flex gap-4 items-start">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-2">
                    <p className="font-bold text-primary uppercase tracking-wider">Conversion Strategy</p>
                    <p className="text-muted-foreground leading-relaxed font-medium">
                        A customized onboarding visual increases user sentiment by 45%. Use high-contrast colors and a welcoming brand image to build immediate trust.
                    </p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
