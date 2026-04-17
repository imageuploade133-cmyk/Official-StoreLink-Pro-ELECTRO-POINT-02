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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { runTransaction, doc, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import type { SaleTransaction, SaleReturn } from '@/lib/types';
import { Loader2, Undo2, Search, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { logActivity } from '@/lib/activity-log-utils';
import { Card, CardContent } from '@/components/ui/card';

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-primary"/>
            Return Items from Sale #{saleTransaction.id.substring(0, 8)}
          </DialogTitle>
          <DialogDescription>
            Select the quantity of each item to return. Stock will be automatically adjusted.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for items in this sale..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            <ScrollArea className="h-64 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead className="w-12 text-center">
                        <Checkbox
                            checked={areAllVisibleSelected}
                            onCheckedChange={handleSelectAllVisible}
                            aria-label="Select all visible items"
                            disabled={filteredItemsWithIndex.every(f => f.maxReturnable === 0)}
                        />
                     </TableHead>
                    <TableHead className="w-1/2">Product</TableHead>
                    <TableHead className="text-center">Returnable</TableHead>
                    <TableHead className="text-center w">Qty to Return</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItemsWithIndex.map((item) => {
                      const originalIndex = item.originalIndex;
                      return (
                        <TableRow key={item.fieldId || `item-${originalIndex}`}>
                           <TableCell className="text-center">
                                <Checkbox
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
                           </TableCell>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-center">{item.maxReturnable}</TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${originalIndex}.quantity`}
                              render={({ field: qtyField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input type="number" min="0" max={item.maxReturnable} {...qtyField} disabled={item.maxReturnable === 0}/>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {form.formState.errors.items?.message && (
                <div className="flex items-center gap-2 text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertTriangle className="h-4 w-4" />
                    {form.formState.errors.items.message}
                </div>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Return (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Damaged item, customer changed mind" {...field}/>
                  </FormControl>
                </FormItem>
              )}
            />
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Refund Amount:</span>
                    <span className="text-destructive">{formatCurrency(totalRefundAmount, currencySymbol)}</span>
                  </div>
              </CardContent>
            </Card>
             <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting || totalRefundAmount <= 0}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Process Return
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}