import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Upload, 
  Zap, 
  TrendingDown, 
  CalendarIcon, 
  PlusCircle,
  Save,
  ShieldCheck,
  LayoutGrid,
  X,
  Plus,
  Info
} from "lucide-react";
import { uploadImage } from "@/ai/flows/image-upload-flow";
import { useToast } from "@/hooks/use-toast";
import { compressAndResizeImage } from "@/lib/image-utils";
import { useSettings } from "@/contexts/settings-context";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn, convertToDateSafely } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from 'next/link';

const categoryFormSchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }).max(50, { message: "Category name must not exceed 50 characters." }),
  description: z.string().max(10000, { message: "Description is too long." }).optional().or(z.literal("")).nullable(),
  imageUrl: z.union([
    z.literal(''),
    z.string().url("Must be a valid URL.")
  ]).optional().nullable(),
  allowIndividualProductSales: z.boolean().default(true),
  isFlashSale: z.boolean().default(false),
  flashSaleDiscountType: z.enum(['percentage', 'fixed']).default('percentage'),
  flashSaleDiscountValue: z.coerce.number().min(0).optional().default(0),
  flashSaleStartDate: z.date().optional().nullable(),
  flashSaleEndDate: z.date().optional().nullable(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  onSubmit: (values: CategoryFormValues) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<CategoryFormValues>;
  isEditMode?: boolean;
  onCancel?: () => void;
  isModal?: boolean;
}

export function CategoryForm({
  onSubmit,
  isSubmitting,
  defaultValues,
  isEditMode = false,
  onCancel,
  isModal = false,
}: CategoryFormProps) {
  const { toast } = useToast();
  const { settings } = useSettings();
  const [isUploading, setIsUploading] = useState(false);
  const currencySymbol = settings?.currency || '$';

  const methods = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: '',
      allowIndividualProductSales: true,
      isFlashSale: false,
      flashSaleDiscountType: 'percentage',
      flashSaleDiscountValue: 0,
      flashSaleStartDate: null,
      flashSaleEndDate: null,
    },
  });

  const { watch, setValue, handleSubmit, reset } = methods;

  const imageUrl = watch('imageUrl');
  const isFlashSale = watch('isFlashSale');

  useEffect(() => {
    if (defaultValues) {
      reset({
          name: defaultValues?.name || "",
          description: defaultValues?.description || "",
          imageUrl: defaultValues?.imageUrl || '',
          allowIndividualProductSales: defaultValues?.allowIndividualProductSales ?? true,
          isFlashSale: defaultValues?.isFlashSale ?? false,
          flashSaleDiscountType: defaultValues?.flashSaleDiscountType || 'percentage',
          flashSaleDiscountValue: defaultValues?.flashSaleDiscountValue || 0,
          flashSaleStartDate: convertToDateSafely(defaultValues?.flashSaleStartDate),
          flashSaleEndDate: convertToDateSafely(defaultValues?.flashSaleEndDate),
      });
    }
  }, [defaultValues, reset]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const maxFileSizeMb = settings?.imageMaxFileSizeMb || 5;
    if (file.size > maxFileSizeMb * 1024 * 1024) {
        toast({
            variant: "destructive",
            title: "File too large",
            description: `The maximum allowed size is ${maxFileSizeMb}MB.`
        });
        return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        let imageDataUri = reader.result as string;

        try {
            imageDataUri = await compressAndResizeImage(
                imageDataUri,
                settings?.imageUploadQuality || 80,
                settings?.imageMaxWidth || 1920
            );
        } catch (optError) {
            console.error("Optimization failed:", optError);
        }

        const result = await uploadImage({ imageDataUri });
        setValue('imageUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Image Uploaded", description: "Category icon optimized and saved." });
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

  // Simplified modal version
  if (isModal) {
    return (
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="space-y-4">
            <FormField
              control={methods.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Category Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Electronics, Home Decor" 
                      {...field} 
                      className="h-10" 
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={methods.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Description</FormLabel>
                  <FormControl>
                    <textarea 
                      placeholder="Brief description for your customers..." 
                      {...field}
                      value={field.value || ''}
                      className="w-full h-20 px-3 py-2 border rounded-lg text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={methods.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Category Image</FormLabel>
                  <div className="flex gap-4 items-start">
                    {imageUrl ? (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-primary/20 bg-muted shrink-0 group">
                        <Image
                          src={imageUrl}
                          alt="Category preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setValue('imageUrl', '')}
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
                        disabled={isSubmitting || isUploading}
                        className="w-full"
                      >
                        <label htmlFor="category-image-upload" className="cursor-pointer">
                          {isUploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
                          Upload Image
                        </label>
                      </Button>
                      <Input 
                        id="category-image-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload} 
                        disabled={isSubmitting || isUploading} 
                      />
                      <p className="text-xs text-muted-foreground">Max {settings?.imageMaxFileSizeMb || 5}MB</p>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isUploading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Create Category
            </Button>
          </div>
        </form>
      </FormProvider>
    );
  }

  // Full page version
  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden bg-transparent">
        <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none bg-transparent">
          <CardHeader className="bg-muted/30 border-b shrink-0">
            <CardTitle>{isEditMode ? "Manage Collection" : "New Product Category"}</CardTitle>
            <CardDescription>Create a new category to organize your inventory. Max image size: {settings?.imageMaxFileSizeMb || 5}MB.</CardDescription>
          </CardHeader>
          
          <ScrollArea className="flex-1 h-0 min-h-0 w-full overflow-hidden">
            <CardContent className="p-6 space-y-8 pr-4">
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={methods.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-gray-700">Category Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Electronics, Home Decor" {...field} className="h-12 text-base font-bold shadow-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-gray-700">Description (Rich Text)</FormLabel>
                      <FormControl>
                        <RichTextEditor 
                          value={field.value || ''} 
                          onChange={field.onChange} 
                          placeholder="Brief summary of this collection for the public storefront..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={methods.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-gray-700">Representational Image</FormLabel>
                    <div className="flex flex-col sm:flex-row items-start gap-6 pt-2">
                      {imageUrl ? (
                        <div className="relative w-full sm:w-32 aspect-square rounded-2xl overflow-hidden border-2 shadow-xl bg-muted shrink-0 group ring-4 ring-primary/5">
                          <Image
                              src={imageUrl}
                              alt="Category preview"
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              unoptimized
                          />
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            onClick={() => setValue('imageUrl', '')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-full sm:w-32 aspect-square rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-muted-foreground shrink-0 transition-colors hover:bg-primary/10">
                            <PlusCircle className="h-8 w-8 opacity-20 mb-2" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Awaiting Media</span>
                        </div>
                      )}
                      <div className="flex-grow space-y-4 w-full">
                          <FormControl>
                            <Input placeholder="Direct URL or use upload button" {...field} value={field.value || ''} disabled={isSubmitting || isUploading} className="h-11 shadow-sm" />
                          </FormControl>
                          <div className="flex items-center gap-3">
                            <Button asChild variant="outline" size="lg" disabled={isSubmitting || isUploading} className="h-12 px-6 font-bold border-primary/30 text-primary hover:bg-primary/5 rounded-xl shadow-sm transition-all active:scale-95">
                              <label htmlFor="category-image-upload" className="cursor-pointer">
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload Media
                              </label>
                            </Button>
                            <Input id="category-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSubmitting || isUploading} />
                            <div className="text-[10px] text-muted-foreground font-medium uppercase leading-tight">
                                Recommended:<br/>400x400 PNG/JPG
                            </div>
                          </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="border-dashed" />

              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Sales Control Center</h3>
                
                <FormField
                  control={methods.control}
                  name="allowIndividualProductSales"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start justify-between rounded-2xl border p-4 bg-primary/5 gap-4">
                      <div className="space-y-0.5">
                        <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                          <LayoutGrid className="h-4 w-4" /> Individual Product Sales
                        </FormLabel>
                        <FormDescription className="text-[10px] leading-relaxed">
                          When ON, products with their own active flash sales will keep their unique prices. When OFF, the Global Flash Sale rule below applies to everyone.
                        </FormDescription>
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

                <Card className={cn("shadow-xl border-none ring-1 ring-border transition-all overflow-hidden rounded-[2rem]", isFlashSale ? "border-rose-500 ring-rose-500/20" : "")}>
                  <CardHeader className={cn("bg-muted/30 transition-colors py-6", isFlashSale ? "bg-rose-500/10" : "bg-primary/5")}>
                      <div className="flex justify-between items-center">
                          <div className="space-y-1">
                              <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                                  <Zap className={cn("h-6 w-6", isFlashSale ? "text-rose-500 fill-current" : "text-muted-foreground")} />
                                  Global Flash Sale
                              </CardTitle>
                              <CardDescription className="text-xs font-medium">Applies a uniform discount to all products not using an individual sale.</CardDescription>
                          </div>
                          <FormField
                              control={methods.control}
                              name="isFlashSale"
                              render={({ field }) => (
                                  <FormControl>
                                      <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-rose-600" />
                                  </FormControl>
                              )}
                          />
                      </div>
                  </CardHeader>
                  <CardContent className={cn("pt-8 space-y-8 transition-opacity duration-500", !isFlashSale && "opacity-50")}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <FormField
                              control={methods.control}
                              name="flashSaleDiscountType"
                              render={({ field }) => (
                                  <FormItem className="space-y-4">
                                      <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Discount Architecture</FormLabel>
                                      <FormControl>
                                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                                              <div className="flex items-center space-x-2 rounded-xl border p-3 bg-background cursor-pointer transition-all hover:border-primary/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                                                  <RadioGroupItem value="percentage" id="cat-fs-perc" />
                                                  <Label htmlFor="cat-fs-perc" className="font-bold cursor-pointer text-sm">Percent (%)</Label>
                                              </div>
                                              <div className="flex items-center space-x-2 rounded-xl border p-3 bg-background cursor-pointer transition-all hover:border-primary/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                                                  <RadioGroupItem value="fixed" id="cat-fs-fix" />
                                                  <Label htmlFor="cat-fs-fix" className="font-bold cursor-pointer text-sm">Fixed ({currencySymbol})</Label>
                                              </div>
                                          </RadioGroup>
                                      </FormControl>
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={methods.control}
                              name="flashSaleDiscountValue"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Discount Magnitude</FormLabel>
                                      <FormControl>
                                          <div className="relative">
                                              <TrendingDown className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-rose-500" />
                                              <Input type="number" step="0.01" {...field} className="pl-12 h-14 text-2xl font-black border-rose-200 focus-visible:ring-rose-500 shadow-inner" />
                                          </div>
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-dashed">
                          <FormField
                              control={methods.control}
                              name="flashSaleStartDate"
                              render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                      <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Event Launch (Optional)</FormLabel>
                                      <Popover>
                                          <PopoverTrigger asChild>
                                              <FormControl>
                                                  <Button
                                                      variant="outline"
                                                      className={cn(
                                                          "w-full pl-4 text-left font-bold h-12 rounded-xl border-primary/10 shadow-sm",
                                                          !field.value && "text-muted-foreground"
                                                      )}
                                                  >
                                                      {field.value ? format(field.value, "PPP p") : <span>Immediate Activation</span>}
                                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                  </Button>
                                              </FormControl>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                              <Calendar
                                                  mode="single"
                                                  selected={field.value || undefined}
                                                  onSelect={field.onChange}
                                                  disabled={(date) => date < new Date("1900-01-01")}
                                                  initialFocus
                                              />
                                              <div className="p-4 border-t border-dashed flex justify-between gap-3 bg-muted/30">
                                                  <Input 
                                                      type="time" 
                                                      className="h-9 text-sm bg-background font-bold" 
                                                      onChange={(e) => {
                                                          if (!field.value) return;
                                                          const [hours, minutes] = e.target.value.split(':');
                                                          const newDate = new Date(field.value);
                                                          newDate.setHours(parseInt(hours), parseInt(minutes));
                                                          field.onChange(newDate);
                                                      }}
                                                  />
                                                  <Button variant="ghost" size="sm" onClick={() => field.onChange(null)} className="h-9 px-4 text-[10px] font-black uppercase hover:bg-destructive/10 hover:text-destructive">Reset</Button>
                                              </div>
                                          </PopoverContent>
                                      </Popover>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={methods.control}
                              name="flashSaleEndDate"
                              render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                      <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Event Expiry (Optional)</FormLabel>
                                      <Popover>
                                          <PopoverTrigger asChild>
                                              <FormControl>
                                                  <Button
                                                      variant="outline"
                                                      className={cn(
                                                          "w-full pl-4 text-left font-bold h-12 rounded-xl border-primary/10 shadow-sm",
                                                          !field.value && "text-muted-foreground"
                                                      )}
                                                  >
                                                      {field.value ? format(field.value, "PPP p") : <span>Indefinite Run</span>}
                                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                  </Button>
                                              </FormControl>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                              <Calendar
                                                  mode="single"
                                                  selected={field.value || undefined}
                                                  onSelect={field.onChange}
                                                  disabled={(date) => {
                                                      const start = watch('flashSaleStartDate');
                                                      return date < (start || new Date("1900-01-01"));
                                                  }}
                                                  initialFocus
                                              />
                                              <div className="p-4 border-t border-dashed flex justify-between gap-3 bg-muted/30">
                                                  <Input 
                                                      type="time" 
                                                      className="h-9 text-sm bg-background font-bold" 
                                                      onChange={(e) => {
                                                          if (!field.value) return;
                                                          const [hours, minutes] = e.target.value.split(':');
                                                          const newDate = new Date(field.value);
                                                          newDate.setHours(parseInt(hours), parseInt(minutes));
                                                          field.onChange(newDate);
                                                      }}
                                                  />
                                                  <Button variant="ghost" size="sm" onClick={() => field.onChange(null)} className="h-9 px-4 text-[10px] font-black uppercase hover:bg-destructive/10 hover:text-destructive">Reset</Button>
                                              </div>
                                          </PopoverContent>
                                      </Popover>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                      </div>

                      <div className="p-5 bg-rose-50 border-2 border-rose-100 rounded-2xl flex gap-4 items-start">
                          <Info className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
                          <p className="text-xs leading-relaxed font-bold text-rose-700">
                              Strategic Override: If an individual product has a flash sale active and the "Individual Product Sales" toggle above is ON, that product will ignore this global rule.
                          </p>
                      </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </ScrollArea>

          <CardFooter className="bg-muted/30 border-t p-6 shrink-0 flex justify-between items-center gap-4 flex-wrap">
            <Button type="submit" disabled={isSubmitting || isUploading} size="lg" className="px-8 h-12 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditMode ? "Update Collection" : "Publish Category"}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} className="h-12 px-6 font-bold">
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="outline" asChild className="h-12 px-6 font-bold">
                <Link href="/dashboard/categories">Cancel</Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </FormProvider>
  );
}
