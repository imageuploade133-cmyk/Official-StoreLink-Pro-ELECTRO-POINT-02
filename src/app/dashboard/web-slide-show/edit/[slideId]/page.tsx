"use client";
import React from "react";


import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useFirestore, useDoc } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  GalleryHorizontal, 
  Save, 
  Loader2, 
  Upload, 
  Video, 
  Image as ImageIcon, 
  LayoutGrid, 
  Zap,
  ArrowLeft 
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Switch } from '@/components/ui/switch';
import { convertToDateSafely } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const slideFormSchema = z.object({
  placement: z.enum(['homepage', 'flash-hub']).default('homepage'),
  mediaType: z.enum(['image', 'video'], { required_error: "You must select a media type." }).default('image'),
  pretitle: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  videoUrl: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  videoPosterUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  published: z.boolean().default(true),
  order: z.coerce.number().int().min(0, 'Order must be a non-negative number.'),
  showActionButton: z.boolean().default(true),
  showOverlay: z.boolean().default(true),
}).superRefine((data, ctx) => {
    if (data.mediaType === 'image' && (!data.imageUrl || data.imageUrl.trim() === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Image URL is required for Image type.', path: ['imageUrl'] });
    }
    if (data.mediaType === 'video' && (!data.videoUrl || data.videoUrl.trim() === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Video URL is required for Video type.', path: ['videoUrl'] });
    }
});

type SlideFormValues = z.infer<typeof slideFormSchema>;

export default function EditSlidePage() {
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const slideId = params.slideId as string;
  const slideRef = useMemo(() => firestore && slideId ? doc(firestore, 'slideShows', slideId) : null, [firestore, slideId]);
  const { data: slideData, isLoading: isLoadingSlide } = useDoc<any>(slideRef);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);

  const form = useForm<SlideFormValues>({
    resolver: zodResolver(slideFormSchema),
    defaultValues: {
      placement: 'homepage',
      mediaType: 'image',
      pretitle: '',
      title: '',
      description: '',
      imageUrl: '',
      videoUrl: '',
      videoPosterUrl: '',
      published: true,
      order: 0,
      showActionButton: true,
      showOverlay: true
    }
  });
  
  const mediaType = form.watch('mediaType');
  const imageUrl = form.watch('imageUrl');
  const videoPosterUrl = form.watch('videoPosterUrl');

  useEffect(() => {
    if (slideData) {
        form.reset({
            placement: slideData.placement || 'homepage',
            mediaType: slideData.mediaType || 'image',
            pretitle: slideData.pretitle || '',
            title: slideData.title || '',
            description: slideData.description || '',
            imageUrl: slideData.imageUrl || '',
            videoUrl: slideData.videoUrl || '',
            videoPosterUrl: slideData.videoPosterUrl || '',
            published: slideData.published ?? true,
            order: slideData.order ?? 0,
            showActionButton: slideData.showActionButton ?? true,
            showOverlay: slideData.showOverlay ?? true,
        });
    }
  }, [slideData, form]);

  useEffect(() => {
    if (mediaType === 'image') {
      form.setValue('videoUrl', '');
      form.setValue('videoPosterUrl', '');
    } else if (mediaType === 'video') {
      form.setValue('imageUrl', '');
    }
  }, [mediaType, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'videoPosterUrl') => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ variant: "destructive", title: "File too large", description: "Image must be smaller than 5MB." });
      return;
    }
    if (field === 'videoPosterUrl') setIsUploadingPoster(true);
    else setIsUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue(field, result.display_url, { shouldValidate: true });
        toast({ title: "Asset Updated", description: `Your ${field === 'imageUrl' ? 'background' : 'poster'} has been set.` });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
      } finally {
        setIsUploading(false);
        setIsUploadingPoster(false);
      }
    };
  };

  const onSubmit = async (values: SlideFormValues) => {
    if (!firestore || !slideId) return;
    setIsSaving(true);
    try {
      const slideRef = doc(firestore, 'slideShows', slideId);
      await updateDoc(slideRef, {
        ...values,
        updatedAt: Timestamp.now(),
      });
      
      toast({ title: 'Slide Updated Successfully!', description: `Slide "${values.title || 'Untitled'}" has been saved.` });
      
      if (values.placement === 'flash-hub') {
          router.push('/dashboard/flash-hub-manager');
      } else {
          router.push('/dashboard/web-slide-show');
      }

    } catch (error: any) {
      console.error("Error updating slide:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not update the slide.' });
    } finally {
        setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingSlide;

  if (isLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-[500px] w-full" />
        </div>
    );
  }

  if (!permissions?.manage_website_content) {
    return <AccessDenied />;
  }
  
  if (!slideData && !isLoadingSlide) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Slide Not Found</h1>
        <p>The slide you are trying to edit does not exist.</p>
        <Button asChild className="mt-4 rounded-xl"><Link href="/dashboard/web-slide-show">Go Back</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
            icon={GalleryHorizontal}
            title={`Edit Slide: ${slideData?.title || '...'}`}
            description="Update the content, settings, and visibility of this visual asset."
        />
        <Button variant="ghost" asChild className="gap-2 btn-back">
            <Link href={slideData?.placement === 'flash-hub' ? '/dashboard/flash-hub-manager' : '/dashboard/web-slide-show'}>
                <ArrowLeft className="h-4 w-4" /> Back to Registry
            </Link>
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className=" border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle>Slide Placement & Content</CardTitle>
              <CardDescription>Make changes to your slide attributes below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                        control={form.control}
                        name="placement"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Placement Location</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 border-primary/20">
                                            <SelectValue placeholder="Select placement" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="homepage">
                                            <div className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Main Homepage</div>
                                        </SelectItem>
                                        <SelectItem value="flash-hub">
                                            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-rose-500" /> Flash Hub Hub</div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField control={form.control} name="mediaType" render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Media Engine Type</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-8 h-12 items-center">
                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="image" id="type-image" /></FormControl><FormLabel htmlFor="type-image" className="font-bold flex items-center gap-2 cursor-pointer text-sm"><ImageIcon className="h-4 w-4" /> Static Image</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="video" id="type-video" /></FormControl><FormLabel htmlFor="type-video" className="font-bold flex items-center gap-2 cursor-pointer text-sm"><Video className="h-4 w-4"/> Dynamic Video</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>

                <Separator className="border-dashed" />

                {mediaType === 'image' && (
                    <FormField control={form.control} name="imageUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold">Background Asset <span className="text-destructive">*</span></FormLabel>
                            <div className="flex items-start gap-6">
                                {imageUrl && (
                                    <div className="relative w-48 aspect-video rounded-2xl overflow-hidden border-2 border-white  flex-shrink-0">
                                        <Image src={imageUrl} alt="Background preview" fill className="object-cover" unoptimized/>
                                    </div>
                                )}
                                <div className="flex-grow space-y-3">
                                    <FormControl>
                                        <Input placeholder="https://example.com/image.png" {...field} value={field.value || ''} disabled={isSaving || isUploading} className="h-11" />
                                    </FormControl>
                                    <div className="flex items-center gap-3">
                                        <Button asChild variant="outline" size="lg" className="rounded-xl h-11 px-6 font-bold border-primary/20 text-primary hover:bg-primary/5" disabled={isSaving || isUploading}>
                                            <label htmlFor="image-upload" className="cursor-pointer">
                                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                                                Change Background
                                            </label>
                                        </Button>
                                        <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'imageUrl')} disabled={isSaving || isUploading} />
                                    </div>
                                </div>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />
                )}
                
                {mediaType === 'video' && (
                    <div className="space-y-6 p-6 border-2 border-primary/10 rounded-[2rem] bg-primary/5">
                        <FormField control={form.control} name="videoUrl" render={({ field }) => (<FormItem><FormLabel>Background Video URL <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="https://example.com/video.mp4" {...field} value={field.value || ''} className="h-11" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="videoPosterUrl" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Video Poster Image (Optional)</FormLabel>
                                <div className="flex items-start gap-4">
                                {videoPosterUrl && (
                                    <div className="relative w-48 aspect-video rounded-2xl overflow-hidden border-2 border-white  flex-shrink-0">
                                        <Image src={videoPosterUrl} alt="Poster preview" fill className="object-cover" unoptimized/>
                                    </div>
                                )}
                                <div className="flex-grow space-y-3">
                                    <FormControl>
                                        <Input placeholder="https://example.com/poster.png" {...field} value={field.value || ''} disabled={isSaving || isUploadingPoster} className="h-11" />
                                    </FormControl>
                                    <div className="flex items-center gap-3">
                                        <Button asChild variant="outline" size="lg" className="rounded-xl h-11 px-6 font-bold border-primary/20 text-primary hover:bg-primary/5" disabled={isSaving || isUploadingPoster}>
                                            <label htmlFor="poster-upload" className="cursor-pointer">
                                                {isUploadingPoster ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                                                Change Poster
                                            </label>
                                        </Button>
                                        <Input id="poster-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'videoPosterUrl')} disabled={isSaving || isUploadingPoster} />
                                    </div>
                                </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
                
              <Separator className="border-dashed" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="pretitle" render={({ field }) => ( <FormItem> <FormLabel className="font-bold">Overline Text (Pre-title)</FormLabel> <FormControl><Input placeholder="e.g., SEASON FINALE" {...field} value={field.value ?? ''} disabled={isSaving || isUploading} className="h-11" /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel className="font-bold">Main Headline</FormLabel> <FormControl><Input placeholder="e.g., Up to 70% Off Essentials" {...field} value={field.value ?? ''} disabled={isSaving || isUploading} className="h-11 font-bold text-lg" /></FormControl> <FormMessage /> </FormItem> )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel className="font-bold">Slide Narrative</FormLabel> <FormControl><Textarea placeholder="Explain the promotion or collection highlights..." {...field} value={field.value ?? ''} disabled={isSaving || isUploading} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                 <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Carousel Sequence Order</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} disabled={isSaving || isUploading} className="h-11" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="published"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                       <div className="flex flex-row items-center justify-between rounded-2xl border-2 border-primary/10 p-4 h-11 bg-primary/5">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">Live Visibility</FormLabel>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </div>
                    </FormItem>
                )} />
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <FormField
                      control={form.control}
                      name="showActionButton"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 bg-muted/20">
                          <div className="space-y-0.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider">Show CTA Button</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="showOverlay"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-4 bg-muted/20">
                          <div className="space-y-0.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider">Contrast Overlay</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-8 flex justify-between">
              <Button type="submit" disabled={isSaving || isUploading || isUploadingPoster} size="lg" className="px-12 h-14 rounded-2xl font-black uppercase text-xs tracking-widest  shadow-primary/20 transition-all active:scale-95">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Synchronizing...' : 'Save Changes'}
              </Button>
               <Button variant="outline" asChild className="h-14 px-8 rounded-2xl font-bold"><Link href={slideData?.placement === 'flash-hub' ? '/dashboard/flash-hub-manager' : '/dashboard/web-slide-show'}>Cancel</Link></Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
