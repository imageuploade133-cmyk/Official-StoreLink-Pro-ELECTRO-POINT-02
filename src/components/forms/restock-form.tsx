'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, CalendarIcon, ChevronsUpDown, Check, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Product, ProductForRestockForm } from '@/lib/types';

const createRestockFormSchema = (allowDeduction: boolean) => z.object({
  productId: z.string().min(1, 'Product is required.'),
  quantity: z.coerce.number().int('Must be an integer.').refine(val => val !== 0, 'Quantity cannot be zero.').refine(val => allowDeduction || val > 0, "Deducting stock is disabled in settings."),
  costPricePerUnit: z.coerce.number().min(0, 'Cost price cannot be negative.'),
  newPurchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative.').optional().nullable(),
  newSellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative.').optional().nullable(),
  restockDate: z.date({ required_error: 'Restock date is required.' }),
  supplierName: z.string().optional(),
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
  
  const selectedProduct = products.find(p => p.id === form.watch('productId'));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock Entry</DialogTitle>
          <DialogDescription>
            Record new stock for {defaultProduct?.name ? `"${defaultProduct.name}"` : 'a product'}.
          </DialogDescription>
        </DialogHeader>
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
            </Accordion>
            
            <FormField control={form.control} name="restockDate" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Restock Date</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal',!field.value && 'text-muted-foreground')}>
                  {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus /></PopoverContent></Popover>
                <FormMessage />
              </FormItem>)} />

            <FormField control={form.control} name="supplierName" render={({ field }) => (
              <FormItem><FormLabel>Supplier (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}/>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}/>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Entry
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
