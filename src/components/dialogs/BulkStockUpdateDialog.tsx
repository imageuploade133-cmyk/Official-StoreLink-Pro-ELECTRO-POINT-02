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
} from '@/components/ui/drawer';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Boxes, Info, ShieldAlert, Plus, Hash, Truck, AlertTriangle } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';


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

  const renderFields = () => (
    <div className="space-y-6">
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                Quantity to Add/Deduct for Each Product <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 50 or -10" {...field} disabled={isSubmitting} className="h-11 text-lg font-medium" />
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
              <FormLabel className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Supplier Name (Optional)
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g., Main Distributor" {...field} value={field.value ?? ''} disabled={isSubmitting} className="h-11" />
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
              <FormLabel className="text-sm font-medium">Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., End of year stock count adjustment" {...field} value={field.value ?? ''} disabled={isSubmitting} rows={3} className="rounded-xl" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         <div className="flex items-start gap-3 p-4 border border-orange-200 bg-orange-50 rounded-xl text-orange-800 dark:bg-orange-950/20 dark:border-orange-900 dark:text-orange-300">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-orange-600"/>
            <p className="text-xs leading-relaxed font-medium">
                This action will update stock for <strong>{selectedProducts.length}</strong> products simultaneously. This cannot be undone automatically.
            </p>
        </div>

        <div className="space-y-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                Impacted Products ({selectedProducts.length})
            </h4>
            <div className="border rounded-xl overflow-hidden bg-muted/20">
                <ScrollArea className="h-48">
                    <div className="p-1">
                        {selectedProducts.map((p, index) => (
                            <React.Fragment key={p.id}>
                                <div className="flex justify-between items-center px-4 py-2.5 hover:bg-muted/40 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{p.name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-mono">Current: {p.stock}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
                                        <Badge variant={ (p.stock + (form.watch('quantity') || 0)) < 0 ? "destructive" : "secondary" } className="font-mono text-[10px]">
                                            {p.stock + (form.watch('quantity') || 0)}
                                        </Badge>
                                    </div>
                                </div>
                                {index < selectedProducts.length - 1 && <Separator className="bg-border/50" />}
                            </React.Fragment>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    </div>
  );

  const footerContent = (
    <>
      <div className="flex-1 text-left hidden sm:block">
          {!allowStockDeduction && (
            <div className="flex items-center gap-2 text-xs text-destructive font-medium bg-destructive/10 px-3 py-1.5 rounded-full w-fit">
              <ShieldAlert className="h-4 w-4" />
              <span>Deductions disabled</span>
            </div>
          )}
      </div>
      <div className="flex gap-3 w-full sm:w-auto">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="flex-1 sm:flex-none h-11 px-6 rounded-xl">
          Cancel
        </Button>
        <Button 
          form={isMobile ? "mobile-bulk-form" : "desktop-bulk-form"} 
          type="submit" 
          disabled={isSubmitting || selectedProducts.length === 0} 
          className="flex-[2] sm:flex-none h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Update {selectedProducts.length} Products
        </Button>
      </div>
    </>
  );

  // Mobile Drawer View
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[96dvh] flex flex-col focus:outline-none">
          <DrawerHeader className="text-left border-b px-6 py-4 flex-shrink-0">
            <DrawerTitle className="flex items-center gap-2 text-xl font-black">
              <Boxes className="h-6 w-6 text-primary"/> 
              Bulk Stock Update
            </DrawerTitle>
            <DrawerDescription>
              Record stock for multiple products at once.
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <Form {...form}>
              <form id="mobile-bulk-form" onSubmit={form.handleSubmit(onSubmit)}>
                {renderFields()}
              </form>
            </Form>
          </div>

          <DrawerFooter className="border-t p-6 bg-background flex-shrink-0">
            {footerContent}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Dialog View
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-8 pt-8 pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black">
            <Boxes className="h-6 w-6 text-primary"/> 
            Bulk Stock Update
          </DialogTitle>
          <DialogDescription className="text-base">
             Update the stock for {selectedProducts.length} selected product(s) simultaneously.
          </DialogDescription>
        </DialogHeader>

        <Separator className="opacity-50" />

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <Form {...form}>
            <form id="desktop-bulk-form" onSubmit={form.handleSubmit(onSubmit)}>
              {renderFields()}
            </form>
          </Form>
        </div>

        <Separator className="opacity-50" />

        <DialogFooter className="px-8 py-6 bg-muted/10">
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArrowRightIcon(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    )
}
