"use client";
import React from "react";


import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  SquarePlus, 
  Save, 
  Loader2, 
  Upload, 
  Monitor, 
  Code, 
  ImageIcon, 
  Maximize, 
  AlignLeft,
  AlignCenter,
  Palette,
  Info,
  X
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

const uiSectionSchema = z.object({
  title: z.string().min(3, 'Internal title is required.'),
  uiType: z.enum(['image', 'html']),
  order: z.coerce.number().int().min(0),
  published: z.boolean().default(true),
  fullWidth: z.boolean().default(false),
  backgroundColor: z.string().optional().or(z.literal('')),
  // Image Type Fields
  imageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  linkUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  overlayTitle: z.string().optional().or(z.literal('')),
  overlaySubtitle: z.string().optional().or(z.literal('')),
  buttonText: z.string().optional().or(z.literal('')),
  alignment: z.enum(['left', 'center']).default('center'),
  // HTML Type Fields
  htmlContent: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
    if (data.uiType === 'image' && (!data.imageUrl || data.imageUrl.trim() === '')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Image URL is required for Image mode.', path: ['imageUrl'] });
    }
    if (data.uiType === 'html' && (!data.htmlContent || data.htmlContent.trim() === '')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'HTML content is required for Code mode.', path: ['htmlContent'] });
    }
});

type FormValues = z.infer<typeof uiSectionSchema>;

export default function AddUISectionPage() {
  const { permissions, isLoading: authLoading, store, staffMember } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const form = useForm<FormValues>({
    resolver: zodResolver(uiSectionSchema),
    shouldUnregister: false,
    defaultValues: {
      title: '',
      uiType: 'image',
      order: 0,
      published: true,
      fullWidth: false,
      backgroundColor: '#FFFFFF',
      imageUrl: '',
      linkUrl: '',
      overlayTitle: '',
      overlaySubtitle: '',
      buttonText: 'Explore Collection',
      alignment: 'center',
      htmlContent: '',
    },
  });

  const uiType = form.watch('uiType');
  const imageUrl = form.watch('imageUrl');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const result = await uploadImage({ imageDataUri: reader.result as string });
        form.setValue('imageUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Asset Uploaded", description: "Design image is ready." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message });
      } finally {
        setIsUploading(false);
      }
    };
  };

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !currentStoreId) return;
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'homepageSections'), {
        ...values,
        store_id: currentStoreId,
        selectionType: 'custom-ui',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      toast({ title: 'Section Created!', description: `"${values.title}" has been added to the registry.` });
      router.push('/dashboard/homepage-sections');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setIsSaving(false);
    }
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!permissions?.manage_website_content) return <AccessDenied />;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        icon={SquarePlus}
        title="Add Custom UI Section"
        description="Integrate high-impact visual banners or bespoke HTML designs into your homepage loop."
      />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className=" border-none ring-1 ring-border overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle>Creative Architecture</CardTitle>
                <CardDescription>Configure the underlying technology and content for this section.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Internal Registry Title</FormLabel>
                            <FormControl><Input placeholder="e.g., Seasonal Hero Banner" { ...field} className="h-12" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="order" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Sequence Order</FormLabel>
                            <FormControl><Input type="number" {...field} className="h-12" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <FormField control={form.control} name="uiType" render={({ field }) => (
                    <FormItem className="space-y-4">
                        <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Design Protocol</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <RadioGroupItem value="image" id="type-image" className="peer sr-only" />
                                    <Label htmlFor="type-image" className="flex items-center gap-4 p-6 rounded-2xl border-2 bg-muted/5 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all">
                                        <ImageIcon className="h-6 w-6" />
                                        <div><p className="font-bold">Image Visual</p><p className="text-[10px] text-muted-foreground uppercase">Overlay & Banners</p></div>
                                    </Label>
                                </div>
                                <div className="relative">
                                    <RadioGroupItem value="html" id="type-html" className="peer sr-only" />
                                    <Label htmlFor="type-html" className="flex items-center gap-4 p-6 rounded-2xl border-2 bg-muted/5 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all">
                                        <Code className="h-6 w-6" />
                                        <div><p className="font-bold">Bespoke HTML</p><p className="text-[10px] text-muted-foreground uppercase">Raw Code Injection</p></div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </FormControl>
                    </FormItem>
                )} />

                <Separator className="border-dashed" />

                {uiType === 'image' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500">
                        <FormField control={form.control} name="imageUrl" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Primary Design Asset <span className="text-destructive">*</span></FormLabel>
                                <div className="flex items-start gap-6">
                                    {imageUrl ? (
                                        <div className="relative w-48 aspect-video rounded-2xl overflow-hidden border  bg-white shrink-0">
                                            <Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized />
                                        </div>
                                    ) : (
                                        <div className="w-48 aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/20 shrink-0">
                                            <ImageIcon className="h-8 w-8 opacity-20" />
                                        </div>
                                    )}
                                    <div className="flex-grow space-y-3">
                                        <FormControl><Input placeholder="https://example.com/banner.jpg" {...field} value={field.value || ''} className="h-11" /></FormControl>
                                        <Button asChild variant="outline" size="sm" disabled={isUploading}>
                                            <label htmlFor="ui-image-upload" className="cursor-pointer">
                                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                                Upload Background
                                            </label>
                                        </Button>
                                        <input id="ui-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormField control={form.control} name="overlayTitle" render={({ field }) => (
                                <FormItem><FormLabel className="font-bold">Display Heading</FormLabel><FormControl><Input placeholder="e.g., NEW LUXURY ARRIVALS" {...field} value={field.value || ''} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="buttonText" render={({ field }) => (
                                <FormItem><FormLabel className="font-bold">Action Button Label</FormLabel><FormControl><Input placeholder="Explore Collection" {...field} value={field.value || ''} /></FormControl></FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="linkUrl" render={({ field }) => (
                            <FormItem><FormLabel className="font-bold">Destination URL</FormLabel><FormControl><Input placeholder="https://..." {...field} value={field.value || ''} /></FormControl></FormItem>
                        )} />

                        <FormField control={form.control} name="alignment" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-[10px] uppercase tracking-widest text-primary">Content Alignment</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="left"><div className="flex items-center gap-2"><AlignLeft className="h-4 w-4" /> Left Aligned</div></SelectItem>
                                        <SelectItem value="center"><div className="flex items-center gap-2"><AlignCenter className="h-4 w-4" /> Centered</div></SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        <FormField control={form.control} name="htmlContent" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Custom HTML Logic <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Textarea 
                                        {...field} 
                                        value={field.value || ''} 
                                        placeholder="<div class='custom-banner'>...</div>"
                                        className="min-h-[300px] font-mono text-sm leading-relaxed bg-slate-950 text-emerald-400 p-6 rounded-2xl"
                                    />
                                </FormControl>
                                <FormDescription>Note: Use standard Tailwind utility classes for consistent styling.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className=" border-none ring-1 ring-border">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" /> Display Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <FormField control={form.control} name="fullWidth" render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-muted/5 transition-all hover:bg-muted/10">
                        <div className="space-y-0.5">
                            <FormLabel className="font-black text-[10px] uppercase tracking-wider flex items-center gap-2">
                                <Maximize className="h-3.5 w-3.5 text-blue-500" /> Edge-to-Edge
                            </FormLabel>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase">Disable container padding</p>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />

                <FormField control={form.control} name="backgroundColor" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                            <Palette className="h-3.5 w-3.5" /> Background Color
                        </FormLabel>
                        <div className="flex items-center gap-3">
                            <FormControl><Input type="color" {...field} className="p-1 h-10 w-12 cursor-pointer border-none " /></FormControl>
                            <span className="text-xs font-mono font-bold text-muted-foreground">{field.value}</span>
                        </div>
                    </FormItem>
                )} />

                <FormField control={form.control} name="published" render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-primary/5 transition-all hover:bg-primary/10">
                        <div className="space-y-0.5">
                            <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Live Activation</FormLabel>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )} />
              </CardContent>
              <CardFooter className="pt-6 border-t bg-muted/10">
                <Button type="submit" disabled={isSaving || isUploading} className="w-full h-14 text-lg font-black uppercase tracking-widest  shadow-primary/20 transition-all active:scale-[0.98]">
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Publish UI Section
                </Button>
              </CardFooter>
            </Card>

            <div className="p-6 border-2 border-dashed rounded-[2.5rem] bg-muted/5 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center ">
                    <Info className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-black text-sm uppercase tracking-tight">Technical Protocol</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    This section will appear in the homepage loop based on its <strong>Sequence Order</strong>. It can co-exist perfectly with product carousels.
                </p>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
