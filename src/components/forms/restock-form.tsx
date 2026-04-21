'use client';

import React, { useEffect, useState } from 'react';
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
  DrawerClose,
} from '@/components/ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, CalendarIcon, ChevronsUpDown, Check, Pencil, X as CloseIcon, X, FileText, Upload, Eye, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { useAuth } from '@/contexts/auth-context';
import type { Product, ProductForRestockForm } from '@/lib/types';
import Image from 'next/image';

const createRestockFormSchema = (allowDeduction: boolean) => z.object({
  productId: z.string().min(1, 'Product is required.'),
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
  const { store, staffMember } = useAuth();
  const currentStoreId = store?.id || staffMember?.store_id;
  
  const restockFormSchema = createRestockFormSchema(allowStockDeduction);

  const form = useForm<RestockFormValues>({
    resolver: zodResolver(restockFormSchema),
  });

  useEffect(() => {
    if (isOpen) {
      const product = defaultProduct || null;
      form.reset({
        productId: product?.id || '',
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
  }, [isOpen, defaultProduct, products, form]);

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setValue('productId', product.id, { shouldValidate: true });
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
        const imageDataUri = reader.result as string;
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
  
  const selectedProduct = products.find(p => p.id === form.watch('productId'));

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product</FormLabel>
              <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={isSubmitting || !!defaultProduct}
                      className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                    >
                      {field.value ? products.find(p => p.id === field.value)?.name : 'Select a product'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                            >
                            <Check className={cn('mr-2 h-4 w-4', product.id === field.value ? 'opacity-100' : 'opacity-0')}/>
                            <div className="flex justify-between w-full">
                                <span className="truncate">{product.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">Stock: {product.stock}</span>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" placeholder="e.g., 10 or -2" {...field}/></FormControl><FormMessage/></FormItem>
          )}/>
          <FormField control={form.control} name="costPricePerUnit" render={({ field }) => (
            <FormItem><FormLabel>Cost Per Unit</FormLabel><FormControl><Input type="number" step="0.01" {...field}/></FormControl><FormMessage/></FormItem>
          )}/>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm font-medium flex items-center gap-1"><Pencil className="h-4 w-4"/>Update Pricing (Optional)</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <FormField control={form.control} name="newPurchasePrice" render={({ field }) => (
                            <FormItem><FormLabel>New Purchase Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} placeholder={selectedProduct?.purchasePrice?.toFixed(2)}/></FormControl><FormMessage/></FormItem>
                        )}/>
                        <FormField control={form.control} name="newSellingPrice" render={({ field }) => (
                            <FormItem><FormLabel>New Selling Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} placeholder={selectedProduct?.sellingPrice?.toFixed(2)}/></FormControl><FormMessage/></FormItem>
                        )}/>
                    </div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="supplier-info">
                <AccordionTrigger className="text-sm font-medium flex items-center gap-1"><Truck className="h-4 w-4"/>Supplier Information (Optional)</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="supplierName" render={({ field }) => (
                            <FormItem><FormLabel>Stock Supplier</FormLabel><FormControl><Input placeholder="Company Name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="supplierContactName" render={({ field }) => (
                            <FormItem><FormLabel>Supplier Name</FormLabel><FormControl><Input placeholder="Contact Person" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="supplierPhone" render={({ field }) => (
                            <FormItem><FormLabel>Supplier Phone</FormLabel><FormControl><Input placeholder="Phone Number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="supplierLocation" render={({ field }) => (
                            <FormItem><FormLabel>Supplier Location</FormLabel><FormControl><Input placeholder="Location" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <FormField
                      control={form.control}
                      name="receiptUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" /> Stock Document / Receipt
                          </FormLabel>
                          <div className="flex items-start gap-4">
                              {field.value && (
                                  <div className="relative w-20 h-20 rounded-lg border overflow-hidden shrink-0 shadow-sm bg-muted flex items-center justify-center">
                                      {field.value.match(/\.(jpeg|jpg|gif|png)$/) != null || field.value.includes('imgbb') ? (
                                        <Image src={field.value} alt="Receipt" fill className="object-contain" unoptimized />
                                      ) : (
                                        <FileText className="h-8 w-8 text-muted-foreground" />
                                      )}
                                      <Button type="button" variant="destructive" size="icon" className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full" onClick={() => form.setValue('receiptUrl', '')}>
                                          <X className="h-3 w-3" />
                                      </Button>
                                  </div>
                              )}
                              <div className="flex-grow space-y-2">
                                  <FormControl>
                                      <Input placeholder="URL or upload below" {...field} value={field.value || ''} disabled={isSubmitting || isUploadingStockDoc} className="h-8 text-xs" />
                                  </FormControl>
                                  <div className="flex items-center gap-2">
                                    <Button asChild variant="outline" size="sm" disabled={isSubmitting || isUploadingStockDoc} className="h-8 text-xs">
                                        <label htmlFor="restock-doc-upload" className="cursor-pointer flex items-center gap-1">
                                            {isUploadingStockDoc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                            Upload
                                        </label>
                                    </Button>
                                    {field.value && (
                                      <Button type="button" variant="ghost" size="sm" asChild className="h-8 text-xs">
                                        <a href={field.value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                          <Eye className="h-3 w-3" /> View
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
          <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )}/>

        {isMobile ? (
          <DrawerFooter className="px-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Entry
            </Button>
          </DrawerFooter>
        ) : (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Entry
            </Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  );

  // Mobile Drawer View
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose} dismissible={true}>
        <DrawerContent className="flex flex-col h-screen w-screen overflow-hidden">
          <div 
            className="w-full flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none hover:bg-muted/20 transition-colors shrink-0"
            data-vaul-drag-handle
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex justify-end px-6 py-2 shrink-0">
            <DrawerClose asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-muted"
              >
                <CloseIcon className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <DrawerHeader className="px-6 pt-0 pb-4 shrink-0">
              <DrawerTitle>Add Stock Entry</DrawerTitle>
              <DrawerDescription>
                Record new stock for {defaultProduct?.name ? `"${defaultProduct.name}"` : 'a product'}.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
              {formContent}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Dialog View
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock Entry</DialogTitle>
          <DialogDescription>
            Record new stock for {defaultProduct?.name ? `"${defaultProduct.name}"` : 'a product'}.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
