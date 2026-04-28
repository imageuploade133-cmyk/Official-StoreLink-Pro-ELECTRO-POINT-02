'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { runTransaction, doc, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import type { SaleTransaction, SaleReturn } from '@/lib/types';
import { Loader2, Undo2, Search, AlertTriangle, Minus, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { logActivity } from '@/lib/activity-log-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const returnItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative."),
  unitPrice: z.coerce.number(),
  maxReturnable: z.number(),
}).refine(data => data.quantity <= data.maxReturnable, {
  message: "Cannot return more than purchased.",
  path: ['quantity'],
});

const returnFormSchema = z.object({
  items: z.array(returnItemSchema).min(1),
  reason: z.string().optional(),
}).refine(data => data.items.some(item => (Number(item.quantity) || 0) > 0), {
    message: "You must select at least one item to return.",
    path: ["items"],
});

type ReturnFormValues = z.infer<typeof returnFormSchema>;

function QuantityAdjuster({ 
  value, 
  max, 
  onChange, 
  disabled 
}: { 
  value: number; 
  max: number; 
  onChange: (val: number) => void; 
  disabled?: boolean 
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full shrink-0"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value <= 0}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <div className="relative w-12">
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 0;
            onChange(Math.min(max, Math.max(0, val)));
          }}
          className="h-8 w-12 p-0 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-xs font-bold"
          disabled={disabled}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full shrink-0"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface SaleReturnDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  saleTransaction: SaleTransaction | null;
  currencySymbol: string;
  onReturnSuccess: () => void;
}

export function SaleReturnDialog({ isOpen, onOpenChange, saleTransaction, currencySymbol, onReturnSuccess }: SaleReturnDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, store, staffMember } = useAuth();
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
        items: [],
        reason: ''
    }
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    if (saleTransaction && isOpen) {
      const returnableItems = saleTransaction.items.map(item => {
        const alreadyReturned = saleTransaction.returns?.flatMap(r => r.items)
          .filter(ri => ri.productId === item.productId)
          .reduce((sum, ri) => sum + ri.quantity, 0) || 0;
        
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: 0,
          unitPrice: item.unitPrice,
          maxReturnable: Math.max(0, item.quantity - alreadyReturned)
        };
      });
      replace(returnableItems);
      form.reset({ items: returnableItems, reason: '' });
    }
  }, [saleTransaction, isOpen, replace, form]);

  const watchedItems = useWatch({ control: form.control, name: 'items' });

  const totalRefundAmount = useMemo(() => {
    return (watchedItems || []).reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return sum + (qty * price);
    }, 0);
  }, [watchedItems]);
  
  const filteredItemsWithIndex = useMemo(() => {
    return (watchedItems || [])
      .map((item, index) => ({
        ...item,
        originalIndex: index,
        fieldId: fields[index]?.id,
      }))
      .filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [watchedItems, fields, searchTerm]);

  const handleSelectAllVisible = (checked: boolean) => {
    filteredItemsWithIndex.forEach(item => {
      const { originalIndex, maxReturnable } = item;
      if (checked && maxReturnable > 0) {
        form.setValue(`items.${originalIndex}.quantity`, 1, { shouldValidate: true });
      } else if (!checked) {
        form.setValue(`items.${originalIndex}.quantity`, 0, { shouldValidate: true });
      }
    });
  };
  
  const areAllVisibleSelected = useMemo(() => {
    if (filteredItemsWithIndex.length === 0) return false;
    const canReturnAtLeastOne = filteredItemsWithIndex.some(i => i.maxReturnable > 0);
    if (!canReturnAtLeastOne) return false;
    return filteredItemsWithIndex.every(item => item.maxReturnable === 0 || item.quantity > 0);
  }, [filteredItemsWithIndex]);

  const onSubmit = async (data: ReturnFormValues) => {
    if (!firestore || !user || !saleTransaction) {
        console.error("Missing required data for return:", { firestore: !!firestore, user: !!user, saleTransaction: !!saleTransaction });
        return;
    }
    
    const itemsToReturn = data.items.filter(item => (Number(item.quantity) || 0) > 0);
    if (itemsToReturn.length === 0) {
      toast({ variant: 'destructive', title: "No items selected", description: "Please specify a quantity for at least one item to return."});
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const saleRef = doc(firestore, 'saleTransactions', saleTransaction.id);
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists()) throw new Error("Sale transaction not found.");
        const currentSaleData = saleDoc.data() as SaleTransaction;

        for (const itemToReturn of itemsToReturn) {
          const originalItem = currentSaleData.items.find(i => i.productId === itemToReturn.productId);
          if (!originalItem) throw new Error(`Product ${itemToReturn.productName} not found in original sale.`);

          const alreadyReturned = currentSaleData.returns?.flatMap(r => r.items)
            .filter(ri => ri.productId === itemToReturn.productId)
            .reduce((sum, ri) => sum + ri.quantity, 0) || 0;
            
          if (itemToReturn.quantity > originalItem.quantity - alreadyReturned) {
            throw new Error(`Cannot return ${itemToReturn.quantity} of ${itemToReturn.productName}. Only ${originalItem.quantity - alreadyReturned} are returnable.`);
          }
          
          const productRef = doc(firestore, 'products', itemToReturn.productId);
          transaction.update(productRef, { stock: increment(itemToReturn.quantity) });
        }
        
        if (currentSaleData.customerId) {
            const customerRef = doc(firestore, 'customers', currentSaleData.customerId);
            const updates: any = {
                totalSpent: increment(-totalRefundAmount)
            };
            
            if (currentSaleData.isCreditSale) {
                // Reduce the outstanding credit by the refund amount
                updates.outstandingCredit = increment(-totalRefundAmount);
            }
            
            transaction.update(customerRef, updates);
        }
        
        const newReturn: SaleReturn = {
          returnedAt: Timestamp.now(),
          staffId: user.uid,
          staffEmail: user.email || 'N/A',
          reason: data.reason || 'N/A',
          items: itemsToReturn.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
          totalReturnedAmount: totalRefundAmount,
        };

        const newReturnsArray = [...(currentSaleData.returns || []), newReturn];
        const newTotalReturnedAmount = (currentSaleData.returnedAmount || 0) + totalRefundAmount;
        
        const totalOriginalItems = currentSaleData.items.reduce((sum, i) => sum + i.quantity, 0);
        const totalReturnedItems = newReturnsArray.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.quantity, 0), 0);

        const newReturnStatus = totalReturnedItems >= totalOriginalItems ? 'fullyReturned' : 'partiallyReturned';
        
        transaction.update(saleRef, {
          returns: newReturnsArray,
          returnedAmount: newTotalReturnedAmount,
          returnStatus: newReturnStatus,
          updatedAt: serverTimestamp(),
        });
      });
      
      await logActivity(firestore, {
        user,
        store_id: currentStoreId!,
        actionType: 'SALE_ITEMS_RETURNED',
        entityType: 'SaleTransaction',
        entityId: saleTransaction.id,
        entityDescription: `Return for sale ${saleTransaction.id.substring(0,8)}`,
        summary: `${itemsToReturn.reduce((s, i) => s + i.quantity, 0)} items returned for ${formatCurrency(totalRefundAmount, currencySymbol)}.`,
        details: {
          returnedItems: itemsToReturn.map(i => ({ name: i.productName, qty: i.quantity })),
          reason: data.reason,
        },
      });

      toast({ title: "Return Processed Successfully", description: `${formatCurrency(totalRefundAmount, currencySymbol)} has been credited.`});
      onReturnSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error processing return:", error);
      toast({ variant: 'destructive', title: "Return Failed", description: error.message || "An unexpected error occurred." });
    }
  };

  if (!saleTransaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col p-0 border-none sm:border">
        <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0 bg-background">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
                <Undo2 className="h-6 w-6 text-primary shrink-0"/>
                Return Items
            </DialogTitle>
            <DialogClose asChild className="sm:hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <X className="h-4 w-4" />
                </Button>
            </DialogClose>
          </div>
          <DialogDescription className="text-xs sm:text-sm">
            Sale ID: <span className="font-mono text-primary">#{saleTransaction.id.substring(0, 8).toUpperCase()}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter items in this sale..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={areAllVisibleSelected}
                      onCheckedChange={handleSelectAllVisible}
                      aria-label="Select all visible items"
                      disabled={filteredItemsWithIndex.every(f => f.maxReturnable === 0)}
                    />
                    <Label htmlFor="select-all" className="text-sm font-medium text-muted-foreground cursor-pointer">
                      Select All Items
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {filteredItemsWithIndex.length} items found
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {filteredItemsWithIndex.map((item) => {
                    const originalIndex = item.originalIndex;
                    return (
                      <Card 
                        key={item.fieldId || `item-${originalIndex}`}
                        className={cn(
                          "transition-colors border-l-4",
                          item.quantity > 0 ? "border-l-primary bg-primary/5" : "border-l-transparent"
                        )}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex gap-4 items-start">
                            <div className="pt-1">
                              <Checkbox
                                id={`item-${originalIndex}`}
                                checked={item.quantity > 0}
                                onCheckedChange={(checked) => {
                                  const newQuantity = checked ? 1 : 0;
                                  if (checked && item.maxReturnable < 1) {
                                    toast({ variant: 'destructive', title: "Cannot return", description: "No items available to return." });
                                    return;
                                  }
                                  form.setValue(`items.${originalIndex}.quantity`, newQuantity, { shouldValidate: true });
                                }}
                                disabled={item.maxReturnable === 0}
                              />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <div>
                                  <Label 
                                    htmlFor={`item-${originalIndex}`} 
                                    className="font-bold text-sm sm:text-base leading-tight truncate block cursor-pointer"
                                  >
                                    {item.productName}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(item.unitPrice, currencySymbol)} per unit
                                  </p>
                                </div>
                                <Badge variant="secondary" className="whitespace-nowrap">
                                  {item.maxReturnable} available
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                                <FormField
                                  control={form.control}
                                  name={`items.${originalIndex}.quantity`}
                                  render={({ field: qtyField }) => (
                                    <div className="flex items-center gap-3">
                                      <QuantityAdjuster 
                                        value={qtyField.value} 
                                        max={item.maxReturnable} 
                                        onChange={qtyField.onChange} 
                                        disabled={item.maxReturnable === 0}
                                      />
                                      {item.maxReturnable > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-xs h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                                          onClick={() => qtyField.onChange(item.maxReturnable)}
                                          disabled={qtyField.value === item.maxReturnable}
                                        >
                                          Return All
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                />
                                
                                {item.quantity > 0 && (
                                  <div className="text-sm font-bold text-primary">
                                    Refund: {formatCurrency(item.quantity * item.unitPrice, currencySymbol)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {form.formState.errors.items?.message && (
                <div className="flex items-center gap-2 text-sm font-medium text-destructive bg-destructive/10 p-4 rounded-lg">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  {form.formState.errors.items.message}
                </div>
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold">Reason for Return (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., Damaged item, customer changed mind" 
                        className="resize-none min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <div className="p-6 border-t bg-muted/30">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:w-auto">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Total Refund Amount</p>
              <p className="text-2xl font-black text-primary leading-none">
                {formatCurrency(totalRefundAmount, currencySymbol)}
              </p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 sm:flex-none"
                onClick={() => onOpenChange(false)} 
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                className="flex-1 sm:flex-none min-w-[140px]"
                disabled={form.formState.isSubmitting || totalRefundAmount <= 0}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                ) : (
                  <Undo2 className="mr-2 h-4 w-4"/>
                )}
                Process Return
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}