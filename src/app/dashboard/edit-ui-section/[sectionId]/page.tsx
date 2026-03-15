'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Pencil, 
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
  ArrowLeft,
  X,
  Copy,
  CheckCircle2,
  History,
  RotateCcw
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import Link from 'next/link';
import type { HomepageSection } from '@/lib/types';

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

export default function EditUISectionPage() {
  const params = useParams();
  const sectionId = params.sectionId as string;
  const { permissions, isLoading: authLoading } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [syncedCode, setSyncedCode] = useState('');
  const hasHydrated = useRef(false);

  const sectionRef = useMemo(() => 
    firestore && sectionId ? doc(firestore, 'homepageSections', sectionId) : null, 
  [firestore, sectionId]);

  const { data: section, isLoading: isLoadingSection } = useDoc<HomepageSection>(sectionRef);

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

  // Reactive Hydration Protocol
  useEffect(() => {
    if (section && !hasHydrated.current) {
      form.reset({
        title: section.title || '',
        uiType: (section.uiType as any) || 'image',
        order: section.order ?? 0,
        published: section.published ?? true,
        fullWidth: section.fullWidth ?? false,
        backgroundColor: section.backgroundColor || '#FFFFFF',
        imageUrl: section.imageUrl || '',
        linkUrl: section.linkUrl || '',
        overlayTitle: section.overlayTitle || '',
        overlaySubtitle: section.overlaySubtitle || '',
        buttonText: section.buttonText || 'Explore Collection',
        alignment: (section.alignment as any) || 'center',
        htmlContent: section.htmlContent || '',
      });
      hasHydrated.current = true;
    }
  }, [section, form]);

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
        form.setValue('imageUrl', result.display_url, { shouldValidate: true, shouldDirty: true });
        toast({ title: "Asset Uploaded", description: "Design image is updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message });
      } finally {
        setIsUploading(false);
      }
    };
  };

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !sectionId) return;
    setIsSaving(true);
    try {
      const ref = doc(firestore, 'homepageSections', sectionId);
      await updateDoc(ref, {
        ...values,
        selectionType: 'custom-ui',
        updatedAt: Timestamp.now(),
      });
      
      toast({ title: 'Section Updated!', description: `"${values.title}" changes have been published.` });
      
      if (values.uiType === 'html') {
          setSyncedCode(values.htmlContent || '');
          setShowSyncModal(true);
      } else {
          router.push('/dashboard/homepage-sections');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCode = (code: string) => {
      navigator.clipboard.writeText(code);
      toast({ title: "Binary Copied", description: "Logic added to clipboard." });
  };

  const handleRestoreLogic = () => {
    if (section?.htmlContent) {
      form.setValue('htmlContent', section.htmlContent, { shouldDirty: true, shouldValidate: true });
      setShowHistoryModal(false);
      toast({ title: "Logic Restored", description: "Last production version has been pushed to the editor." });
    }
  };

  if (authLoading || isLoadingSection) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!permissions?.manage_website_content) return <AccessDenied />;

  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Section not found</h2>
        <Button asChild><Link href="/dashboard/homepage-sections">Back to Manager</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
            icon={Pencil}
            title="Edit UI Section"
            description={`Refining: ${section.title} | Selection Mode: ${section.selectionType}`}
        />
        <Button variant="ghost" asChild className="gap-2">
            <Link href="/dashboard/homepage-sections"><ArrowLeft className="h-4 w-4" /> Back to Sections</Link>
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle>Creative Architecture</CardTitle>
                <CardDescription>Modify the underlying technology and content for this section.</CardDescription>
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
                                        <div className="relative w-48 aspect-video rounded-2xl overflow-hidden border shadow-xl bg-white shrink-0">
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
                                                Change Background
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
                                <div className="flex items-center justify-between">
                                    <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Custom HTML Logic <span className="text-destructive">*</span></FormLabel>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 gap-2 font-black text-[10px] uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 rounded-full px-4"
                                        onClick={() => setShowHistoryModal(true)}
                                    >
                                        <History className="h-3.5 w-3.5" />
                                        View Last Update
                                    </Button>
                                </div>
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
            <Card className="shadow-xl border-none ring-1 ring-border">
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
                            <FormControl><Input type="color" {...field} className="p-1 h-10 w-12 cursor-pointer border-none shadow-sm" /></FormControl>
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
                <Button type="submit" disabled={isSaving || isUploading} className="w-full h-14 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]">
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Sync UI Section
                </Button>
              </CardFooter>
            </Card>

            <div className="p-6 border-2 border-dashed rounded-[2.5rem] bg-muted/5 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-md">
                    <Info className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-black text-sm uppercase tracking-tight">Technical Protocol</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Modifying this section updates the live homepage loop instantly. Ensure HTML code remains valid to prevent layout shifting.
                </p>
            </div>
          </div>
        </form>
      </Form>

      {/* Logic Synchronization Modal */}
      <Dialog open={showSyncModal} onOpenChange={(open) => {
          setShowSyncModal(open);
          if (!open) router.push('/dashboard/homepage-sections');
      }}>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-8 bg-muted/30 border-b">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-green-500 text-white flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase leading-none">Logic Synchronized</DialogTitle>
                        <DialogDescription className="mt-1 font-bold text-[10px] uppercase tracking-widest text-green-600">Your bespoke HTML is now live in the homepage loop.</DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <div className="p-8 space-y-6">
                <p className="text-sm font-medium text-slate-500 leading-relaxed">The following "Raw Code Injection" has been pushed to your storefront registry. You can select or copy this binary for external documentation.</p>
                
                <div className="relative group">
                    <ScrollArea className="h-[300px] w-full rounded-[2rem] border-2 border-slate-100 bg-slate-950 p-6 shadow-inner">
                        <pre className="text-xs text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
                            {syncedCode}
                        </pre>
                    </ScrollArea>
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        className="absolute top-4 right-4 h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-90"
                        onClick={() => handleCopyCode(syncedCode)}
                    >
                        <Copy className="h-3.5 w-3.5 mr-2" /> Copy Binary
                    </Button>
                </div>
            </div>
            <DialogFooter className="p-8 bg-muted/10 border-t flex-row justify-end items-center gap-4">
                <DialogClose asChild>
                    <Button variant="outline" className="rounded-2xl font-bold h-12 px-8">Return to Manager</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historical Logic Retrieval Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-8 bg-primary/5 border-b">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg">
                        <History className="h-7 w-7" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase leading-none">Last Production logic</DialogTitle>
                        <DialogDescription className="mt-1 font-bold text-[10px] uppercase tracking-widest text-primary">Currently stored in the master registry.</DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <div className="p-8 space-y-6">
                <p className="text-sm font-medium text-slate-500 leading-relaxed">This is the HTML logic currently serving your live visitors. Use this to restore or compare your current changes.</p>
                
                <div className="relative group">
                    <ScrollArea className="h-[300px] w-full rounded-[2rem] border-2 border-slate-100 bg-slate-950 p-6 shadow-inner">
                        <pre className="text-xs text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
                            {section.htmlContent || '<!-- No HTML content found in registry -->'}
                        </pre>
                    </ScrollArea>
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        className="absolute top-4 right-4 h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-90"
                        onClick={() => handleCopyCode(section.htmlContent || '')}
                    >
                        <Copy className="h-3.5 w-3.5 mr-2" /> Copy logic
                    </Button>
                </div>
            </div>
            <DialogFooter className="p-8 bg-muted/10 border-t flex-row justify-end gap-3">
                <Button 
                    type="button" 
                    variant="default" 
                    className="rounded-2xl font-black uppercase text-[10px] tracking-widest h-12 px-8 shadow-lg"
                    onClick={handleRestoreLogic}
                >
                    <RotateCcw className="h-4 w-4 mr-2" /> Restore to Editor
                </Button>
                <DialogClose asChild>
                    <Button variant="outline" className="rounded-2xl font-bold h-12 px-8">Close Registry</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
