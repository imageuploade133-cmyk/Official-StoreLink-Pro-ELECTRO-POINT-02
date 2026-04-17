
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
} from 'firebase/firestore';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings, SlideShow, HomepageSection } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Loader2, 
  Save, 
  Upload, 
  X, 
  PlusCircle, 
  Edit, 
  Trash2, 
  GalleryHorizontal, 
  ExternalLink,
  TrendingDown,
  RotateCcw,
  Palette,
  Undo2,
  ImageIcon,
  ArrowRight,
  Maximize
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Switch } from '@/components/ui/switch';
import { cn, convertToDateSafely } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';

const DEFAULT_HUB_COLOR = '#e11d48';
const DEFAULT_ICON_COLOR = '#fbbf24';
const DEFAULT_CORNER_RADIUS = 24;

const flashHubSettingsSchema = z.object({
  flashHubTitle: z.string().min(2, 'Title is required.'),
  flashHubDescription: z.string().optional().or(z.literal('')),
  flashHubColor: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').default(DEFAULT_HUB_COLOR),
  flashHubIconColor: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').default(DEFAULT_ICON_COLOR),
  flashHubIconUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  flashHubBannerImageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  flashHubBannerVideoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  flashHubBannerVideoPosterUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  flashHubShowSlideshow: z.boolean().default(false),
  flashHubCornerRadius: z.coerce.number().min(0).max(100).default(DEFAULT_CORNER_RADIUS),
});

type FormValues = z.infer<typeof flashHubSettingsSchema>;

export default function FlashHubManagerPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { toast } = useToast();
  
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<SlideShow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const isLoadingSettings = isLoadingMainSettings && (currentStoreId ? isLoadingOldSettings : true);

  // Fetch only Flash Hub slides
  const slidesQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(
        collection(firestore, 'slideShows'), 
        where('store_id', '==', currentStoreId),
        where('placement', '==', 'flash-hub'),
        orderBy('order', 'asc')
    );
  }, [firestore, currentStoreId]);
  const { data: slides, isLoading: isLoadingSlides } = useCollection<SlideShow>(slidesQuery);

  // Fetch active flash sale sections for an overview
  const sectionsQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(
        collection(firestore, 'homepageSections'), 
        where('store_id', '==', currentStoreId),
        where('isFlashSale', '==', true),
        orderBy('order', 'asc')
    );
  }, [firestore, currentStoreId]);
  const { data: flashSections, isLoading: isLoadingSections } = useCollection<HomepageSection>(sectionsQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(flashHubSettingsSchema),
    defaultValues: {
      flashHubTitle: 'FLASH HUB',
      flashHubDescription: 'Every active section-wide deal consolidated.',
      flashHubColor: DEFAULT_HUB_COLOR,
      flashHubIconColor: DEFAULT_ICON_COLOR,
      flashHubIconUrl: '',
      flashHubBannerImageUrl: '',
      flashHubBannerVideoUrl: '',
      flashHubBannerVideoPosterUrl: '',
      flashHubShowSlideshow: false,
      flashHubCornerRadius: DEFAULT_CORNER_RADIUS,
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        flashHubTitle: settingsData.flashHubTitle || 'FLASH HUB',
        flashHubDescription: settingsData.flashHubDescription || 'Every active section-wide deal consolidated.',
        flashHubColor: settingsData.flashHubColor || DEFAULT_HUB_COLOR,
        flashHubIconColor: settingsData.flashHubIconColor || DEFAULT_ICON_COLOR,
        flashHubIconUrl: settingsData.flashHubIconUrl || '',
        flashHubBannerImageUrl: settingsData.flashHubBannerImageUrl || '',
        flashHubBannerVideoUrl: settingsData.flashHubBannerVideoUrl || '',
        flashHubBannerVideoPosterUrl: settingsData.flashHubBannerVideoPosterUrl || '',
        flashHubShowSlideshow: settingsData.flashHubShowSlideshow ?? false,
        flashHubCornerRadius: settingsData.flashHubCornerRadius ?? DEFAULT_CORNER_RADIUS,
      });
    }
  }, [settingsData, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: keyof FormValues) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Media must be smaller than 5MB." });
      return;
    }

    if (field === 'flashHubIconUrl') setIsUploadingIcon(true);
    else setIsUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue(field, result.display_url as any, { shouldValidate: true });
        toast({ title: "Media Uploaded", description: "Flash Hub asset has been updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message });
      } finally {
        setIsUploading(false);
        setIsUploadingIcon(false);
      }
    };
  };

  const handleResetColor = () => {
    form.setValue('flashHubColor', DEFAULT_HUB_COLOR, { shouldValidate: true });
    toast({ title: "Color Reset", description: "Flash Hub theme has been reset to default." });
  };

  const handleResetIconColor = () => {
    form.setValue('flashHubIconColor', DEFAULT_ICON_COLOR, { shouldValidate: true });
    toast({ title: "Icon Color Reset", description: "Icon theme has been reset to default." });
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
      toast({ title: 'Sync Successful', description: 'Flash Hub configuration has been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update Flash Hub settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSlide = async () => {
    if (!slideToDelete || !firestore) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'slideShows', slideToDelete.id));
      toast({ title: 'Slide Removed', description: 'The Flash Hub slide has been deleted.' });
      setSlideToDelete(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete slide.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingSettings || isLoadingSlides || isLoadingSections;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Zap} title="Flash Hub Manager" description="Syncing hub configurations..." />
        <Skeleton className="h w-full rounded-3xl" />
        <Skeleton className="h w-full rounded-3xl" />
      </div>
    );
  }

  if (!permissions.manage_website_content) {
    return <AccessDenied />;
  }

  const iconUrl = form.watch('flashHubIconUrl');
  const iconColor = form.watch('flashHubIconColor');
  const cornerRadius = form.watch('flashHubCornerRadius');

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
            icon={Zap}
            title="Flash Hub Command Center"
            description="Manage the high-impact promotional hub for your public storefront."
        />
        <div className="flex items-center gap-3">
            <Button variant="outline" asChild className="rounded-xl h-11 px-6 font-bold gap-2">
                <Link href="/store/flash-sales" target="_blank">
                    <ExternalLink className="h-4 w-4" /> Preview Hub
                </Link>
            </Button>
            <Button 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={isSaving || isUploading || isUploadingIcon}
                className="rounded-xl h-11 px-8 font-black uppercase tracking-widest  "
            >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Sync Flash Hub
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <Form {...form}>
            <form className="space-y-10">
              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader 
                    className="text-white p-8 transition-all duration-500"
                    style={{ 
                        backgroundColor: form.watch('flashHubColor'),
                        borderRadius: `${cornerRadius}px ${cornerRadius}px 0 0`
                    }}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-black tracking-tighter uppercase">Hub Visual Identity</CardTitle>
                        <CardDescription className="text-white/80 font-medium">Customize the header and landing experience.</CardDescription>
                    </div>
                    {iconUrl ? (
                        <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-white  bg-white">
                            <Image src={iconUrl} alt="Hub Icon" fill className="object-cover" unoptimized />
                        </div>
                    ) : (
                        <Zap className="h-10 w-10 fill-current opacity-50" style={{ color: iconColor }} />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                        control={form.control}
                        name="flashHubTitle"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">Display Heading</FormLabel>
                            <FormControl><Input placeholder="e.g., FLASH HUB" {...field} className="h-12 text-xl font-black" /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="flashHubDescription"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">Sub-Heading / Tagline</FormLabel>
                            <FormControl><Input placeholder="Every deal in one place..." {...field} className="h-12" /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <FormField
                        control={form.control}
                        name="flashHubColor"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Palette className="h-3.5 w-3.5" /> Promotion Theme Color
                            </FormLabel>
                            <div className="flex items-center gap-3">
                                <FormControl>
                                    <Input type="color" {...field} value={field.value || DEFAULT_HUB_COLOR} className="p-1 h-12 w-16 cursor-pointer rounded-xl border-2" />
                                </FormControl>
                                <div className="flex flex-col">
                                    <span className="text-sm font-mono font-bold text-muted-foreground">{field.value}</span>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={handleResetColor}
                                        className="h-auto p-0 text font-black text-primary uppercase tracking-widest hover:bg-transparent hover:underline flex items-center gap-1 mt-1"
                                    >
                                        <Undo2 className="h-2.5 w-2.5" /> Reset Default
                                    </Button>
                                </div>
                            </div>
                            <FormDescription className="text">Applies to the hub header and thematic accents.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="flashHubIconColor"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Zap className="h-3.5 w-3.5" /> Primary Icon Color
                            </FormLabel>
                            <div className="flex items-center gap-3">
                                <FormControl>
                                    <Input type="color" {...field} value={field.value || DEFAULT_ICON_COLOR} className="p-1 h-12 w-16 cursor-pointer rounded-xl border-2" />
                                </FormControl>
                                <div className="flex flex-col">
                                    <span className="text-sm font-mono font-bold text-muted-foreground">{field.value}</span>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={handleResetIconColor}
                                        className="h-auto p-0 text font-black text-primary uppercase tracking-widest hover:bg-transparent hover:underline flex items-center gap-1 mt-1"
                                    >
                                        <Undo2 className="h-2.5 w-2.5" /> Reset Default
                                    </Button>
                                </div>
                            </div>
                            <FormDescription className="text">Customize the accent color of the Hub badge.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>

                  <Separator className="border-dashed" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <FormField
                        control={form.control}
                        name="flashHubCornerRadius"
                        render={({ field }) => (
                        <FormItem className="space-y-4">
                            <div className="flex justify-between items-center">
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Maximize className="h-3.5 w-3.5" /> Banner Corner Rounding ({field.value}px)
                                </FormLabel>
                                <Badge variant="outline" className="font-mono">{field.value}px</Badge>
                            </div>
                            <FormControl>
                                <Slider
                                    value={[field.value || DEFAULT_CORNER_RADIUS]}
                                    onValueChange={(value) => field.onChange(value[0])}
                                    min={0}
                                    max={100}
                                    step={1}
                                    className="py-4"
                                />
                            </FormControl>
                            <FormDescription className="text">Adjust the "smoothness" of the Flash Sale banner corners.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <div className="p-4 bg-muted/20 rounded-2xl border-2 border-dashed flex items-center justify-center text-center">
                        <div className="space-y-2">
                            <div 
                                className="w-24 h-12 mx-auto border-2 border-primary/20 bg-primary/10 transition-all duration-300"
                                style={{ borderRadius: `${cornerRadius}px` }}
                            />
                            <p className="text font-black uppercase text-muted-foreground">Rounding Preview</p>
                        </div>
                    </div>
                  </div>

                  <Separator className="border-dashed" />

                  <div className="space-y-6">
                    <h4 className="text font-black uppercase tracking text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-3.5 w-3.5" /> Hub Brand Assets
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                            control={form.control}
                            name="flashHubIconUrl"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold">Custom Icon Image (Optional)</FormLabel>
                                <div className="flex flex-col gap-4">
                                    {iconUrl && (
                                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary/10  bg-white group">
                                            <Image src={iconUrl} alt="Custom Icon" fill className="object-cover" unoptimized />
                                            <Button 
                                                type="button" 
                                                variant="destructive" 
                                                size="icon" 
                                                className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => form.setValue('flashHubIconUrl', '')}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <FormControl><Input placeholder="https://example.com/icon.png" {...field} value={field.value || ''} /></FormControl>
                                        <Button asChild variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl" disabled={isUploadingIcon}>
                                            <label htmlFor="hub-icon-upload" className="cursor-pointer">
                                                {isUploadingIcon ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                                            </label>
                                        </Button>
                                        <input id="hub-icon-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'flashHubIconUrl')} disabled={isUploadingIcon} />
                                    </div>
                                </div>
                                <FormDescription className="text">Replaces the Zap icon. 200x200px recommended.</FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="flashHubBannerImageUrl"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold">Banner Background Image URL</FormLabel>
                                <div className="flex gap-2">
                                    <FormControl><Input placeholder="https://example.com/banner.jpg" {...field} value={field.value || ''} /></FormControl>
                                    <Button asChild variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl" disabled={isUploading}>
                                        <label htmlFor="hub-image-upload" className="cursor-pointer">
                                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                                        </label>
                                    </Button>
                                    <input id="hub-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'flashHubBannerImageUrl')} disabled={isUploading} />
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between p-8">
                  <div>
                    <CardTitle className="text-xl">Flash Hub Slideshow</CardTitle>
                    <CardDescription>Targeted slides that appear only at the top of the sales hub.</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <FormField
                        control={form.control}
                        name="flashHubShowSlideshow"
                        render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0 rounded-full border px-4 py-2 bg-background ">
                            <FormLabel className="text font-black uppercase tracking-widest">{field.value ? 'Active' : 'Off'}</FormLabel>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                        )}
                    />
                    <Button asChild variant="secondary" className="rounded-xl font-bold h-10 px-6 ">
                        <Link href="/dashboard/web-slide-show/create?placement=flash-hub">
                            <PlusCircle className="h-4 w-4 mr-2" /> Add Hub Slide
                        </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-16 text-center">Order</TableHead>
                            <TableHead>Preview</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {slides && slides.length > 0 ? (
                            slides.map(slide => (
                                <TableRow key={slide.id} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-center font-black text-primary">{slide.order}</TableCell>
                                    <TableCell>
                                        <div className="relative w-20 h-12 rounded-lg overflow-hidden border  bg-slate-100 flex items-center justify-center">
                                            {slide.mediaType === 'image' && slide.imageUrl ? (
                                                <Image src={slide.imageUrl} alt="" fill className="object-cover" unoptimized />
                                            ) : slide.mediaType === 'video' && slide.videoPosterUrl ? (
                                                <Image src={slide.videoPosterUrl} alt="" fill className="object-cover" unoptimized />
                                            ) : (
                                                <Zap className="h-5 w-5 text-primary/30" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-bold text-sm">{slide.title || 'Untitled Slide'}</TableCell>
                                    <TableCell>
                                        <Badge variant={slide.published ? 'default' : 'secondary'} className={cn("text font-black h-5 uppercase", slide.published ? 'bg-green-100 text-green-800' : '')}>
                                            {slide.published ? 'Live' : 'Draft'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg">
                                                <Link href={`/dashboard/web-slide-show/edit/${slide.id}`}>
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => setSlideToDelete(slide)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground font-medium italic">
                                    No hub-specific slides configured.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1 space-y-10">
          <Card className="bg-primary text-primary-foreground border-none  rounded overflow-hidden relative group">
            <CardHeader className="pt-12 px-10">
                <CardTitle className="text-3xl font-black tracking-tighter uppercase leading-tight">Sales Hub Registry</CardTitle>
                <CardDescription className="text-primary-foreground/70 font-bold text uppercase tracking pt-2">Active Flash Sections</CardDescription>
            </CardHeader>
            <CardContent className="px-10 pb-12 space-y-8 relative z-10">
                <div className="space-y-4">
                    {flashSections && flashSections.length > 0 ? (
                        flashSections.map(section => {
                            const now = new Date();
                            const start = convertToDateSafely(section.flashSaleStartDate);
                            const end = convertToDateSafely(section.flashSaleEndDate);
                            const isActive = (!start || now >= start) && (!end || now <= end);

                            return (
                                <div key={section.id} className="p-4 bg-white/10 rounded-2xl border border-white/10 flex items-center justify-between group/section transition-all hover:bg-white/20">
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm truncate pr-2">{section.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge className={cn(
                                                "h-4 px-1.5 text font-black uppercase border-none",
                                                isActive ? "bg-green-400 text-green-950" : "bg-blue-400 text-blue-950"
                                            )}>
                                                {isActive ? 'LIVE' : 'WAITING'}
                                            </Badge>
                                            <span className="text text-primary-foreground/60 font-mono">
                                                {section.flashSaleDiscountType === 'percentage' ? `-${section.flashSaleDiscountValue}%` : `-${section.flashSaleDiscountValue}`}
                                            </span>
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" asChild className="h-8 w-8 rounded-full bg-white/5 hover:bg-white text-white hover:text-primary opacity-0 group-hover/section:opacity-100 transition-all">
                                        <Link href={`/dashboard/homepage-sections/edit/${section.id}`}>
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-10 opacity-50">
                            <TrendingDown className="h-10 w-10 mx-auto mb-2" />
                            <p className="text-xs font-bold uppercase tracking-widest">No Active Sections</p>
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-white/5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-400">
                        <div className="h-2 w-2 rounded-full animate-pulse bg-current" />
                        <h4 className="text font-black uppercase tracking-widest">Merchandising Tip</h4>
                    </div>
                    <p className="text-xs leading-relaxed text-primary-foreground/80 font-medium">
                        The Flash Hub automatically pulls any homepage section with the <strong>Flash Sale Engine</strong> active. Use the color picker to set the primary thematic accent for the entire hub.
                    </p>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <DeleteConfirmationDialog 
        isOpen={!!slideToDelete} 
        onOpenChange={() => setSlideToDelete(null)} 
        onConfirm={handleDeleteSlide} 
        isDeleting={isDeleting} 
        itemName={slideToDelete?.title || 'Untitled Hub Slide'} 
        itemType="flash hub slide" 
      />
    </div>
  );
}
