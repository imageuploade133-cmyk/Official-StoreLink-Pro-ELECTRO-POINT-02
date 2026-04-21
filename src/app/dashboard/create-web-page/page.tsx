"use client";
import React from "react";


import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { addDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FilePlus, Save, Loader2, Upload } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/contexts/settings-context';
import { compressAndResizeImage } from '@/lib/image-utils';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

const pageFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  slug: z.string().min(3, 'Slug must be at least 3 characters long.').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'),
  bannerImageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  content: z.string().min(10, 'Content must have at least 10 characters.'),
  footerSection: z.enum(['Support', 'Company'], { required_error: 'You must select a footer section.' }),
  published: z.boolean().default(true),
});

type PageFormValues = z.infer<typeof pageFormSchema>;

const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove special characters
    .trim()
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .slice(0, 50); // limit length
};

export default function CreateWebPage() {
  const { permissions, isLoading: authLoading, store, staffMember } = useAuth();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: { title: '', slug: '', bannerImageUrl: '', content: '', footerSection: 'Support', published: true },
  });

  const titleValue = form.watch('title');
  const bannerImage = form.watch('bannerImageUrl');

  useEffect(() => {
    if (titleValue) {
      form.setValue('slug', generateSlug(titleValue), { shouldValidate: true });
    }
  }, [titleValue, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const maxFileSizeMb = settings?.imageMaxFileSizeMb || 5;
    if (file.size > maxFileSizeMb * 1024 * 1024) {
        toast({ variant: "destructive", title: "File too large", description: `Banner must be smaller than ${maxFileSizeMb}MB.` });
        return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        let imageDataUri = reader.result as string;

        // Optimization
        try {
            imageDataUri = await compressAndResizeImage(
                imageDataUri,
                settings?.imageUploadQuality || 80,
                settings?.imageMaxWidth || 1920
            );
        } catch (optError) {
            console.error("Optimization failed:", optError);
        }

        const result = await uploadImage({ imageDataUri, storeId: currentStoreId });
        form.setValue('bannerImageUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Image Uploaded", description: "Banner image optimized and set." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Error", description: "Could not read the selected file."});
        setIsUploading(false);
    };
  };

  const onSubmit = async (values: PageFormValues) => {
    if (!firestore || !currentStoreId) return;
    setIsSaving(true);
    try {
      // Check if slug already exists
      const q = query(collection(firestore, 'publicPages'), where('store_id', '==', currentStoreId), where('slug', '==', values.slug));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        form.setError('slug', { type: 'manual', message: 'This slug is already in use. Please choose another.' });
        setIsSaving(false);
        return;
      }

      await addDoc(collection(firestore, 'publicPages'), {
        ...values,
        store_id: currentStoreId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      toast({
        title: 'Page Created Successfully!',
        description: `Your new page "${values.title}" is now live.`,
      });
      router.push(`/store/pages/${values.slug}`);

    } catch (error: any) {
      console.error("Error creating page:", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not create the page.' });
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!permissions?.manage_website_content) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FilePlus}
        title="Create New Web Page"
        description="Build a new public-facing page for your website using our rich text visual designer."
      />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-xl border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
              <CardTitle>Page Designer</CardTitle>
              <CardDescription>Fill in the details for your new page. Max image size: {settings?.imageMaxFileSizeMb || 5}MB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Page Title</FormLabel>
                      <FormControl><Input placeholder="e.g., About Our Company" {...field} disabled={isSaving || isUploading} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Page URL Slug</FormLabel>
                      <FormControl><Input placeholder="e.g., about-our-company" {...field} disabled={isSaving || isUploading} /></FormControl>
                      <FormDescription className="text-xs">This determines the URL. It's auto-generated from the title but can be customized.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                control={form.control}
                name="bannerImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Banner Image (Optional)</FormLabel>
                    <div className="flex items-start gap-4">
                      {bannerImage && (
                        <div className="w-32 h-20 rounded-xl overflow-hidden relative border shadow-sm">
                          <Image src={bannerImage} alt="Banner preview" fill style={{ objectFit: 'cover' }} unoptimized/>
                        </div>
                      )}
                      <div className="flex-grow space-y-2">
                        <div className="flex gap-2">
                            <FormControl>
                                <Input placeholder="https://example.com/banner.png" {...field} value={field.value || ''} disabled={isSaving || isUploading} />
                            </FormControl>
                            <Button asChild variant="outline" className="shrink-0 font-bold" disabled={isSaving || isUploading}>
                                <label htmlFor="banner-upload" className="cursor-pointer">
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4 mr-2" />}
                                    Upload
                                </label>
                            </Button>
                            <Input id="banner-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving || isUploading} />
                        </div>
                        <FormDescription className="text-[10px]">Recommended size: 1920x600 pixels for hero banners.</FormDescription>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Page Content</FormLabel>
                    <FormControl>
                        <RichTextEditor 
                            value={field.value || ''} 
                            onChange={field.onChange} 
                            placeholder="Design your page content here..."
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed">
                <FormField
                    control={form.control}
                    name="footerSection"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold">Footer Placement</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSaving || isUploading}>
                        <FormControl>
                            <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select where to show this link" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Support">Support Column</SelectItem>
                            <SelectItem value="Company">Company Column</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">Choose which column in the site footer this page's link will appear.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                  control={form.control}
                  name="published"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                       <div className="flex flex-row items-center justify-between rounded-2xl border p-4 bg-primary/5">
                        <div className="space-y-0.5">
                          <FormLabel className="font-black text-xs uppercase tracking-widest">Publish Page</FormLabel>
                          <FormDescription className="text-[10px]">
                            Make this page live and accessible to the public.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-6">
              <Button type="submit" disabled={isSaving || isUploading} size="lg" className="px-10 h-14 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Synchronizing...' : 'Publish Web Page'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
