'use client';

import React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Boxes, Info, ShieldAlert, X as CloseIcon } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { useIsMobile } from '@/hooks/use-mobile';


const createBulkUpdateSchema = (allowDeduction: boolean) => z.object({
  quantity: z.coerce.number().int().refine(val => val !== 0, "Quantity cannot be zero.").refine(val => allowDeduction || val > 0, 'Deducting stock is disabled. Please talk to your administrator.'),
  supplierName: z.string().optional(),
  notes: z.string().optional(),
});

export type BulkUpdateFormValues = z.infer<ReturnType<typeof createBulkUpdateSchema>>;

interface BulkStockUpdateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BulkUpdateFormValues) => Promise<void>;
  selectedProducts: Product[];
  isSubmitting?: boolean;
}

export function BulkStockUpdateDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  selectedProducts,
  isSubmitting = false,
}: BulkStockUpdateDialogProps) {
  const { settings } = useSettings();
  const isMobile = useIsMobile();
  const allowStockDeduction = settings?.allowStockDeduction ?? true;
  const bulkUpdateSchema = createBulkUpdateSchema(allowStockDeduction);

  const form = useForm<BulkUpdateFormValues>({
    resolver: zodResolver(bulkUpdateSchema),
    defaultValues: {
      quantity: 10,
      supplierName: '',
      notes: '',
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        quantity: 10,
        supplierName: '',
        notes: '',
      });
    }
  }, [isOpen, form]);

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} id="bulk-update-form" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 p-6">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity to Add/Deduct for Each Product <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 50 or -10" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="supplierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Main Distributor" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., End of year stock count adjustment" {...field} value={field.value ?? ''} disabled={isSubmitting} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="flex items-start gap-2 p-3 mt-3 border border-yellow-500/50 bg-yellow-500/10 rounded-md text-yellow-700 dark:text-yellow-300">
                    <Info className="h-5 w-5 shrink-0 mt-0.5"/>
                    <p className="text-xs leading-relaxed">This action is irreversible. Stock for all {selectedProducts.length} selected products will be increased or decreased by the specified quantity.</p>
                </div>
                <div>
                    <h4 className="font-semibold text-sm mb-2">Selected Products ({selectedProducts.length}):</h4>
                    <ScrollArea className="h-40 border rounded-md p-2 bg-muted/40">
                        <ul className="text-xs space-y-1">
                            {selectedProducts.map(p => (
                                <li key={p.id} className="flex justify-between items-center">
                                    <span>{p.name}</span>
                                    <span className="text-muted-foreground">Current: {p.stock}</span>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </div>
            </div>
        </ScrollArea>
        {isMobile ? (
          <DrawerFooter className="p-6 pt-4 border-t mt-auto bg-background flex-col sm:flex-row sm:justify-between items-center gap-4">
            <div>
                {!allowStockDeduction && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Deductions are disabled in settings.</span>
                  </div>
                )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="flex-1 sm:flex-none">Cancel</Button>
              <Button type="submit" disabled={isSubmitting || selectedProducts.length === 0} className="flex-1 sm:flex-none">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update {selectedProducts.length} Products
              </Button>
            </div>
          </DrawerFooter>
        ) : (
          <DialogFooter className="p-6 pt-4 border-t mt-auto bg-background flex flex-col sm:flex-row sm:justify-between items-center gap-4">
            <div>
                {!allowStockDeduction && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Deductions are disabled in settings.</span>
                  </div>
                )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || selectedProducts.length === 0}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update {selectedProducts.length} Products
              </Button>
            </div>
          </DialogFooter>
        )}
      </form>
    </Form>
  );

  // Mobile Drawer View
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange} dismissible={true}>
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
              <DrawerTitle className="flex items-center gap-2 text-xl">
                <Boxes className="h-6 w-6 text-primary"/> 
                Bulk Stock Update
              </DrawerTitle>
              <DrawerDescription>
                Update the stock for {selectedProducts.length} selected product(s). The quantity entered will be added to each product's current stock.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {formContent}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Dialog View
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Boxes className="h-6 w-6 text-primary"/> 
            Bulk Stock Update
          </DialogTitle>
          <DialogDescription>
            Update the stock for {selectedProducts.length} selected product(s). The quantity entered will be added to each product's current stock.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
