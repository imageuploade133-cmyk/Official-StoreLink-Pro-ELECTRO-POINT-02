'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, CalendarIcon, PlusCircle, Trash2, Search, PackageSearch } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ProductForRestockForm } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '../ui/table';
import { Label } from '../ui/label';

const bulkRestockItemSchema = z.object({
  productId: z.string().min(1, 'Product is required.'),
  productName: z.string(),
  quantity: z.coerce.number().int('Quantity must be an integer.').refine(val => val !== 0, 'Quantity cannot be zero.'),
  costPricePerUnit: z.coerce.number().min(0, 'Cost cannot be negative.').nullable().optional(),
});

const bulkRestockSchema = z.object({
  items: z.array(bulkRestockItemSchema).min(1, "Please add at least one product to the restock list."),
  restockDate: z.date({ required_error: 'A restock date is required.' }),
  supplierName: z.string().optional(),
  notes: z.string().optional(),
});

export type BulkRestockFormValues = z.infer<typeof bulkRestockSchema>;

interface BulkRestockDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductForRestockForm[];
  isSubmitting: boolean;
  onSubmit: (values: BulkRestockFormValues) => Promise<void>;
}

export function BulkRestockDialog({ isOpen, onOpenChange, products, isSubmitting, onSubmit }: BulkRestockDialogProps) {
  const form = useForm<BulkRestockFormValues>({
    resolver: zodResolver(bulkRestockSchema),
    defaultValues: {
      items: [],
      restockDate: new Date(),
      supplierName: '',
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const onProductSelect = (product: ProductForRestockForm) => {
    const existingIndex = fields.findIndex(field => field.productId === product.id);
    if (existingIndex !== -1) {
      const input = document.getElementById(`quantity-${product.id}`);
      input?.focus();
      input?.select();
    } else {
      append({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        costPricePerUnit: product.purchasePrice,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Bulk Stock Adjustment</DialogTitle>
          <DialogDescription>
            Add or deduct stock for multiple products at once. Use positive numbers to add stock and negative numbers to deduct.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div className="space-y-4">
                <FormField control={form.control} name="restockDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Adjustment Date</FormLabel>
                    <Popover><PopoverTrigger asChild>
                      <FormControl><Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                      </Button></FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent></Popover>
                  <FormMessage />
                </FormItem>)} />
                <FormField control={form.control} name="supplierName" render={({ field }) => ( <FormItem><FormLabel>Supplier Name (Optional)</FormLabel><FormControl><Input placeholder="e.g., Main Distributor" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Annual stock count adjustment" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <div className="space-y-2">
                <Label>Add Products</Label>
                <ProductSearch products={products} onSelect={onProductSelect} selectedIds={fields.map(f => f.productId)} />
                <FormDescription>Search for products to add them to the adjustment list below.</FormDescription>
              </div>
            </div>

            <div className="flex-grow min-h px-6">
                <ScrollArea className="h-full border rounded-md">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted z-10">
                            <TableRow>
                                <TableHead className="w-1/2 pl-4">Product</TableHead>
                                <TableHead className="w">Quantity</TableHead>
                                <TableHead className="w">Cost / Unit</TableHead>
                                <TableHead className="w text-right pr-4">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.length > 0 ? fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell className="font-medium pl-4">{field.productName}</TableCell>
                                <TableCell>
                                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: qtyField }) => (
                                      <Input id={`quantity-${field.productId}`} type="number" {...qtyField} className="h-8" />
                                    )} />
                                </TableCell>
                                <TableCell>
                                    <FormField control={form.control} name={`items.${index}.costPricePerUnit`} render={({ field: costField }) => (
                                      <Input type="number" step="0.01" {...costField} value={costField.value ?? ''} className="h-8" placeholder="Auto" />
                                    )}/>
                                </TableCell>
                                <TableCell className="text-right pr-4">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </TableCell>
                            </TableRow>
                            )) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                              <div className="flex flex-col items-center gap-2">
                                <PackageSearch className="h-8 w-8" />
                                <span>Search and select products to begin.</span>
                              </div>
                            </TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
             <FormField control={form.control} name="items" render={({ fieldState }) => (
                <div className="px-6 pt-2">
                  <FormMessage>{fieldState.error?.root?.message}</FormMessage>
                </div>
            )} />

            <DialogFooter className="p-6 pt-4 border-t mt-auto">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting || fields.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Bulk Adjustment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ProductSearch({ products, onSelect, selectedIds }: { products: ProductForRestockForm[], onSelect: (product: ProductForRestockForm) => void, selectedIds: string[] }) {
  const [search, setSearch] = useState("");
  
  const availableProducts = useMemo(() => {
    let prods = products.filter(p => !selectedIds.includes(p.id));
    if (search.trim()) {
      const lowercasedSearch = search.toLowerCase();
      prods = prods.filter(p => 
        p.name.toLowerCase().includes(lowercasedSearch) ||
        p.sku?.toLowerCase().includes(lowercasedSearch) ||
        p.barcode?.toLowerCase().includes(lowercasedSearch)
      );
    }
    return prods;
  }, [products, selectedIds, search]);

  return (
    <Command shouldFilter={false} className="border rounded-lg">
      <div className="flex items-center border-b px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandInput 
          placeholder="Search by name, SKU, or barcode..."
          value={search}
          onValueChange={setSearch}
          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {search.trim() && (
        <CommandList>
          {availableProducts.length === 0 && <CommandEmpty>No product found.</CommandEmpty>}
          <CommandGroup>
            {availableProducts.slice(0, 50).map((product) => ( // limit to 50 results
              <CommandItem
                key={product.id}
                onSelect={() => {
                  onSelect(product);
                  setSearch("");
                }}
                className="cursor-pointer"
              >
                {product.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      )}
    </Command>
  );
}
