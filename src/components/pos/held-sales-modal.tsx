'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, User, FileText, ShoppingCart, Trash2, RotateCcw, Search, X, AlertTriangle, Info } from "lucide-react";
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import type { HeldSale } from '@/lib/types';
import { convertToDateSafely } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

export interface HeldSaleDisplay extends HeldSale {
  id: string;
}

interface HeldSalesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currencySymbol: string;
  onRestoreHeldSale: (saleId: string) => void;
  onDeleteHeldSale: (sale: HeldSaleDisplay) => void;
}

const formatAmountWithCurrencySymbol = (amount: number, symbol: string) => `${symbol}${amount.toFixed(2)}`;

const HeldSaleCard = React.memo(({ sale, currencySymbol, onRestore, onDelete }: {
  sale: HeldSaleDisplay;
  currencySymbol: string;
  onRestore: (id: string) => void;
  onDelete: (sale: HeldSaleDisplay) => void;
}) => {
  const [timeAgo, setTimeAgo] = React.useState('...');

  React.useEffect(() => {
    const heldAtDate = convertToDateSafely(sale.heldAt);
    if (heldAtDate) {
      setTimeAgo(formatDistanceToNow(heldAtDate, { addSuffix: true }));
    } else {
      setTimeAgo('Unknown time');
    }
  }, [sale.heldAt]);

  const itemCount = sale.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden border-none sm:border shadow-none sm:shadow-sm">
      <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-grow space-y-2 min-w-0">
          <div className="flex items-center text-base font-bold truncate">
            <User className="h-4 w-4 mr-2 text-primary shrink-0" />
            <span>{sale.customerIdentifier || 'Walk-in Customer'}</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center">
            <Clock className="h-3.5 w-3.5 mr-2" />
            Held {timeAgo}
          </p>
          {sale.notes && (
            <p className="text-xs text-muted-foreground italic flex items-start bg-muted/50 p-2 rounded border-l-2 border-primary/20">
              <FileText className="h-3.5 w-3.5 mr-2 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">Note: {sale.notes}</span>
            </p>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-3 sm:gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-dashed">
          <p className="text-xl font-black text-primary font-mono">
            {formatAmountWithCurrencySymbol(sale.totalAmount, currencySymbol)}
          </p>
          <div className="flex items-center gap-2">
            <div className="hidden xs:flex items-center text-[10px] uppercase font-bold text-muted-foreground mr-2">
              <ShoppingCart className="h-3 w-3 mr-1" />
              {itemCount} item{itemCount > 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => onDelete(sale)}>
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Delete</span>
              </Button>
              <Button size="sm" className="h-8 text-xs px-3" onClick={() => onRestore(sale.id)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
HeldSaleCard.displayName = 'HeldSaleCard';

export function HeldSalesModal({ isOpen, onOpenChange, currencySymbol, onRestoreHeldSale, onDeleteHeldSale }: HeldSalesModalProps) {
  const [heldSales, setHeldSales] = useState<HeldSaleDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();
  const { store, staffMember } = useAuth();

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const fetchHeldSales = useCallback(async () => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);
    setError(null);
    try {
      const q = query(
        collection(firestore, "heldSales"), 
        where("store_id", "==", currentStoreId),
        orderBy("heldAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const sales = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as HeldSale),
      }));
      setHeldSales(sales as HeldSaleDisplay[]);
    } catch (e: any) {
      console.error("Error fetching held sales:", e);
      setError("Failed to load held sales. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [firestore, currentStoreId]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      fetchHeldSales();
    }
  }, [isOpen, fetchHeldSales]);

  const filteredSales = useMemo(() => {
    if (!searchTerm) return heldSales;
    const lowercasedTerm = searchTerm.toLowerCase();
    return heldSales.filter(sale =>
      sale.customerIdentifier?.toLowerCase().includes(lowercasedTerm) ||
      sale.notes?.toLowerCase().includes(lowercasedTerm)
    );
  }, [searchTerm, heldSales]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl h-[100dvh] sm:h-[85vh] flex flex-col p-0 overflow-hidden border-none sm:border"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center">
                <Clock className="mr-2 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                Held Sales
            </DialogTitle>
            <DialogClose asChild className="sm:hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <X className="h-4 w-4" />
                </Button>
            </DialogClose>
          </div>
          <DialogDescription className="text-xs sm:text-sm">
            Restore a previously held sale or delete it.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-6 py-4 border-b bg-muted/5 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 sm:h-10 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-grow">
          <div className="p-4 sm:p-6 space-y-4">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}

            {!isLoading && error && (
              <Card className="text-center py-10 text-destructive bg-destructive/5 border-destructive/20 mx-4">
                <CardContent className="p-6">
                  <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                  <p className="font-semibold">{error}</p>
                </CardContent>
              </Card>
            )}

            {!isLoading && !error && filteredSales.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                  <Info className="mx-auto h-12 w-12 mb-4 opacity-20" />
                  <p className="font-medium">
                    {searchTerm ? `No sales found for "${searchTerm}"` : "No held sales available"}
                  </p>
              </div>
            )}

            {!isLoading && !error && filteredSales.map(sale => (
              <HeldSaleCard
                key={sale.id}
                sale={sale}
                currencySymbol={currencySymbol}
                onRestore={onRestoreHeldSale}
                onDelete={onDeleteHeldSale}
              />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 sm:p-6 border-t mt-auto shrink-0 bg-background flex flex-row justify-end">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="h-9">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
