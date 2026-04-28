'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Loader2, 
  ChevronsUpDown, 
  Check, 
  Pencil, 
  X, 
  FileText, 
  Upload, 
  Eye, 
  Truck, 
  Package, 
  Hash, 
  DollarSign, 
  Info,
  Layers,
  ArrowRight,
  Plus,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/settings-context';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { compressAndResizeImage } from "@/lib/image-utils";
import { useAuth } from '@/contexts/auth-context';
import type { Product, ProductForRestockForm } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const createRestockFormSchema = (allowDeduction: boolean) => z.object({
  productId: z.string().min(1, 'Product is required.'),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int('Must be an integer.').refine(val => val !== 0, 'Quantity cannot be zero.').refine(val => allowDeduction || val > 0, "Deducting stock is disabled in settings."),
  costPricePerUnit: z.coerce.number().min(0, 'Cost price cannot be negative.'),
  newPurchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative.').optional().nullable(),
  newSellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative.').optional().nullable(),
  restockDate: z.date({ required_error: 'Restock date is required.' }),
  supplierName: z.string().optional(),
  supplierContactName: z.string().optional(),
  supplierPhone: z.string().optional(),
  supplierLocation: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});


export type RestockFormValues = z.infer<ReturnType<typeof createRestockFormSchema>>;

interface RestockFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: RestockFormValues) => void;
  products: ProductForRestockForm[];
  defaultProduct?: Product;
  isSubmitting: boolean;
  allowStockDeduction?: boolean;
}

export function RestockForm({
  isOpen,
  onClose,
  onSubmit,
  products,
  defaultProduct,
  isSubmitting,
  allowStockDeduction = true,
}: RestockFormProps) {
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [isUploadingStockDoc, setIsUploadingStockDoc] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { settings } = useSettings();
  const { store, staffMember } = useAuth();
  const currentStoreId = store?.id || staffMember?.store_id;
  
  const restockFormSchema = createRestockFormSchema(allowStockDeduction);

  const form = useForm<RestockFormValues>({
    resolver: zodResolver(restockFormSchema),
    defaultValues: {
      quantity: 1,
      restockDate: new Date(),
    }
  });

  useEffect(() => {
    if (isOpen) {
      const product = defaultProduct || null;
      form.reset({
        productId: product?.id || '',
        variantId: null,
        quantity: 1,
        costPricePerUnit: product?.purchasePrice || 0,
        newPurchasePrice: product?.purchasePrice || 0,
        newSellingPrice: product?.sellingPrice || 0,
        restockDate: new Date(),
        supplierName: '',
        supplierContactName: '',
        supplierPhone: '',
        supplierLocation: '',
        receiptUrl: '',
        notes: '',
      });
    }
  }, [isOpen, defaultProduct, form]);

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setValue('productId', product.id, { shouldValidate: true });
      form.setValue('variantId', null);
      form.setValue('costPricePerUnit', product.purchasePrice || 0);
      form.setValue('newPurchasePrice', product.purchasePrice || 0);
      form.setValue('newSellingPrice', product.sellingPrice || 0);
    }
    setIsComboboxOpen(false);
  };

  const handleStockDocUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { 
      toast({ variant: "destructive", title: "File too large", description: "Document must be smaller than 5MB." });
      return;
    }
    setIsUploadingStockDoc(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        let imageDataUri = reader.result as string;

        if (file.type.startsWith('image/')) {
            try {
                imageDataUri = await compressAndResizeImage(
                    imageDataUri,
                    settings?.imageUploadQuality || 80,
                    settings?.imageMaxWidth || 1920
                );
            } catch (optError) {
                console.error("Optimization failed:", optError);
            }
        }

        const result = await uploadImage({ imageDataUri, storeId: currentStoreId });
        form.setValue('receiptUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Document Uploaded", description: "Stock document/receipt has been saved." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload document." });
      } finally {
        setIsUploadingStockDoc(false);
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Error", description: "Could not read the selected file."});
        setIsUploadingStockDoc(false);
    };
  };
  
  const watchedProductId = form.watch('productId');
  const watchedQuantity = form.watch('quantity') || 0;
  const watchedCostPrice = form.watch('costPricePerUnit') || 0;
  const watchedVariantId = form.watch('variantId');

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === watchedProductId) || (defaultProduct?.id === watchedProductId ? (defaultProduct as any) : null);
  }, [products, defaultProduct, watchedProductId]);

  const selectedVariant = useMemo(() => {
    if (!selectedProduct || !watchedVariantId) return null;
    return selectedProduct.variants?.find((v: any) => v.id === watchedVariantId);
  }, [selectedProduct, watchedVariantId]);

  const totalCost = watchedQuantity > 0 ? watchedQuantity * watchedCostPrice : 0;

  const renderFormFields = () => (
    <div className="space-y-6">
      {/* Product Selection */}
      <FormField
        control={form.control}
        name="productId"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Product
            </FormLabel>
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={isSubmitting || !!defaultProduct}
                    className={cn('w-full justify-between h-11', !field.value && 'text-muted-foreground')}
                  >
                    {field.value ? selectedProduct?.name : 'Select a product'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name, SKU, or barcode..." />
                  <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                      {products.map(product => (
                          <CommandItem
                          value={`${product.name} ${product.sku || ''} ${product.barcode || ''}`}
                          key={product.id}
                          onSelect={() => handleProductSelect(product.id)}
                          className="py-3"
                          >
                          <Check className={cn('mr-2 h-4 w-4', product.id === field.value ? 'opacity-100' : 'opacity-0')}/>
                          <div className="flex justify-between w-full items-center">
                              <span className="truncate font-medium">{product.name}</span>
                              <Badge variant="secondary" className="ml-2 font-mono">
                                {product.stock}
                              </Badge>
                          </div>
                          </CommandItem>
                      ))}
                      </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Stock Summary Preview */}
      {selectedProduct && (
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="h-3.5 w-3.5" /> Current Stock
            </span>
            <span className="font-bold">{selectedVariant ? selectedVariant.stock : selectedProduct.stock} units</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5" /> New Stock Level
            </span>
            <span className={cn(
              "font-black text-lg",
              ((selectedVariant ? (Number(selectedVariant.stock) || 0) : (Number(selectedProduct.stock) || 0)) + watchedQuantity) < 0 ? "text-destructive" : "text-primary"
            )}>
              {(selectedVariant ? (Number(selectedVariant.stock) || 0) : (Number(selectedProduct.stock) || 0)) + watchedQuantity} units
            </span>
          </div>
          {totalCost > 0 && (
            <>
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-muted-foreground">Estimated Total Cost</span>
                <span className="font-bold text-primary">
                  {settings?.currency || '$'}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Variant Selection */}
      {selectedProduct?.hasVariants && selectedProduct.variants && (
        <FormField
          control={form.control}
          name="variantId"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Layers className="h-4 w-4" /> Select Variant to Restock
              </FormLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedProduct.variants?.filter((v: any) => v.isActive).map((variant: any) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      field.onChange(variant.id);
                      if (variant.sellingPrice) form.setValue('newSellingPrice', variant.sellingPrice);
                      if (variant.purchasePrice) {
                        form.setValue('costPricePerUnit', variant.purchasePrice);
                        form.setValue('newPurchasePrice', variant.purchasePrice);
                      }
                    }}
                    className={cn(
                      "text-left px-3 py-3 rounded-xl border-2 transition-all flex justify-between items-center group",
                      field.value === variant.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                        : "border-muted hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "relative h-10 w-10 rounded-lg overflow-hidden border bg-background shrink-0 transition-transform group-hover:scale-105",
                        field.value === variant.id ? "border-primary/50" : "border-muted"
                      )}>
                        {variant.imageUrl ? (
                          <Image src={variant.imageUrl} alt={variant.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/50">
                            <Package className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate leading-tight">{variant.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono mt-0.5">SKU: {variant.sku || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-xs font-black",
                        variant.stock <= (settings?.lowStockThreshold || 10) ? "text-orange-500" : "text-foreground"
                      )}>{variant.stock} left</p>
                      {variant.sellingPrice > 0 && <p className="text-[10px] text-primary font-bold mt-0.5">{settings?.currency || '$'}{variant.sellingPrice}</p>}
                    </div>
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Quantity and Cost */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={form.control} name="quantity" render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" /> Quantity
            </FormLabel>
            <FormControl>
              <Input 
                type="number" 
                placeholder="e.g., 10" 
                {...field} 
                className="h-11 text-lg font-medium"
              />
            </FormControl>
            <FormMessage/>
          </FormItem>
        )}/>
        <FormField control={form.control} name="costPricePerUnit" render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Cost Per Unit
            </FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="0.01" 
                {...field} 
                className="h-11 text-lg font-medium font-mono"
              />
            </FormControl>
            <FormMessage/>
          </FormItem>
        )}/>
      </div>
      
      <Accordion type="single" collapsible className="w-full border rounded-xl overflow-hidden bg-muted/20">
          <AccordionItem value="item-1" className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 hover:no-underline transition-colors">
                <span className="text-sm font-bold flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-primary"/>
                  Update Pricing (Optional)
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-2 pb-4 space-y-4 bg-background border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                     <FormField control={form.control} name="newPurchasePrice" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">New Purchase Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} value={field.value ?? ''} placeholder={selectedProduct?.purchasePrice?.toFixed(2)} className="h-10 font-mono"/>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                      )}/>
                      <FormField control={form.control} name="newSellingPrice" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">New Selling Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} value={field.value ?? ''} placeholder={selectedProduct?.sellingPrice?.toFixed(2)} className="h-10 font-mono"/>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                      )}/>
                  </div>
              </AccordionContent>
          </AccordionItem>
          
          <Separator className="bg-border/50" />

          <AccordionItem value="supplier-info" className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 hover:no-underline transition-colors">
                <span className="text-sm font-bold flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary"/>
                  Supplier & Procurement (Optional)
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-2 pb-4 space-y-4 bg-background border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <FormField control={form.control} name="supplierName" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Stock Supplier (Company)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Electronics Wholesale Ltd" {...field} value={field.value ?? ''} className="h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                      )}/>
                      <FormField control={form.control} name="restockDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-xs">
                              <Calendar className="h-3.5 w-3.5 text-primary" /> Restock Date
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                                className="h-10 font-mono"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                      )}/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="supplierPhone" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Supplier Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 234 567 890" {...field} value={field.value ?? ''} className="h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                      )}/>
                      <FormField control={form.control} name="supplierLocation" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Supplier Location</FormLabel>
                            <FormControl>
                              <Input placeholder="City, Country" {...field} value={field.value ?? ''} className="h-10" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                      )}/>
                  </div>
                  <FormField
                    control={form.control}
                    name="receiptUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-xs">
                            <FileText className="h-3.5 w-3.5 text-primary" /> Stock Document / Receipt
                        </FormLabel>
                        <div className="flex items-start gap-4 pt-1">
                            {field.value && (
                                <div className="relative w-24 h-24 rounded-xl border overflow-hidden shrink-0 shadow-sm bg-muted flex items-center justify-center group">
                                    {field.value.match(/\.(jpeg|jpg|gif|png)$/) != null || field.value.includes('imgbb') ? (
                                      <Image src={field.value} alt="Receipt" fill className="object-contain" unoptimized />
                                    ) : (
                                      <FileText className="h-8 w-8 text-muted-foreground" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <Button type="button" variant="destructive" size="icon" className="h-8 w-8 rounded-full" onClick={() => form.setValue('receiptUrl', '')}>
                                          <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                </div>
                            )}
                            <div className="flex-grow space-y-3">
                                <FormControl>
                                    <Input placeholder="URL or upload below" {...field} value={field.value || ''} disabled={isSubmitting || isUploadingStockDoc} className="h-9 text-xs font-mono" />
                                </FormControl>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button asChild variant="outline" size="sm" disabled={isSubmitting || isUploadingStockDoc} className="h-9 px-4 rounded-full">
                                      <label htmlFor="restock-doc-upload" className="cursor-pointer flex items-center gap-2">
                                          {isUploadingStockDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                          Upload File
                                      </label>
                                  </Button>
                                  {field.value && (
                                    <Button type="button" variant="secondary" size="sm" asChild className="h-9 px-4 rounded-full">
                                      <a href={field.value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                        <Eye className="h-3.5 w-3.5" /> View
                                      </a>
                                    </Button>
                                  )}
                                </div>
                                <input id="restock-doc-upload" type="file" accept="image/*,.pdf" className="hidden" onChange={handleStockDocUpload} disabled={isSubmitting || isUploadingStockDoc} />
                            </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </AccordionContent>
          </AccordionItem>
      </Accordion>
      
      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium">Notes (Optional)</FormLabel>
          <FormControl>
            <Textarea {...field} value={field.value ?? ''} placeholder="Add any details about this restock..." className="min-h-[100px] rounded-xl focus-visible:ring-primary/20" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}/>
    </div>
  );

  const isFormInvalid = !watchedProductId || (selectedProduct?.hasVariants && !watchedVariantId) || watchedQuantity === 0;

  // Mobile Drawer View
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[96dvh] flex flex-col focus:outline-none">
          <DrawerHeader className="text-left border-b px-6 py-4 flex-shrink-0">
            <DrawerTitle className="text-xl font-black">Add Stock Entry</DrawerTitle>
            <DrawerDescription>
              Record new stock for {defaultProduct?.name ? `"${defaultProduct.name}"` : 'a product'}.
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <Form {...form}>
              <form id="mobile-restock-form" onSubmit={form.handleSubmit(onSubmit)}>
                {renderFormFields()}
              </form>
            </Form>
          </div>

          <DrawerFooter className="border-t p-6 bg-background flex-shrink-0">
            <div className="flex gap-3 w-full">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                form="mobile-restock-form" 
                type="submit" 
                className="flex-[2] h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20" 
                disabled={isSubmitting || isFormInvalid}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
                Add Stock
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Dialog View
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-8 pt-8 pb-4">
          <DialogTitle className="text-2xl font-black">Add Stock Entry</DialogTitle>
          <DialogDescription className="text-base">
            Record new stock for {defaultProduct?.name ? `"${defaultProduct.name}"` : 'a product'}.
          </DialogDescription>
        </DialogHeader>

        <Separator className="opacity-50" />
        
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <Form {...form}>
            <form id="desktop-restock-form" onSubmit={form.handleSubmit(onSubmit)}>
              {renderFormFields()}
            </form>
          </Form>
        </div>

        <Separator className="opacity-50" />

        <DialogFooter className="px-8 py-6 bg-muted/10">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="h-11 px-6 rounded-xl font-medium">
            Cancel
          </Button>
          <Button 
            form="desktop-restock-form" 
            type="submit" 
            disabled={isSubmitting || isFormInvalid}
            className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add Stock Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
