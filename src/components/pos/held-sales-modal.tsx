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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-grow space-y-2">
          <div className="flex items-center text-sm font-semibold">
            <User className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{sale.customerIdentifier || 'Walk-in Customer'}</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center">
            <Clock className="h-3.5 w-3.5 mr-2" />
            Held {timeAgo}
          </p>
          {sale.notes && (
            <p className="text-xs text-muted-foreground italic flex items-start">
              <FileText className="h-3.5 w-3.5 mr-2 mt-0.5 flex-shrink-0" />
              <span className="break-all">Note: {sale.notes}</span>
            </p>
          )}
        </div>
        <div className="flex-shrink-0 sm:text-right space-y-2">
          <p className="text-lg font-bold text-primary">
            {formatAmountWithCurrencySymbol(sale.totalAmount, currencySymbol)}
          </p>
          <div className="flex items-center justify-end gap-4">
            <div className="flex items-center text-xs text-muted-foreground">
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              {itemCount} item{itemCount > 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onDelete(sale)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => onRestore(sale.id)}>
                <RotateCcw className="h-4 w-4 mr-2" /> Restore
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
        className="max-w-3xl h-[85vh] flex flex-col p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold flex items-center">
            <Clock className="mr-3 h-7 w-7 text-primary" />
            Held Sales
          </DialogTitle>
          <DialogDescription>
            Restore a previously held sale to the cart or delete it.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-grow p-6 pt-4">
          <div className="space-y-3">
            {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}

            {!isLoading && error && (
              <Card className="text-center py-10 text-destructive bg-destructive/5 border-destructive/20">
                <CardContent>
                  <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                  <p className="font-semibold">{error}</p>
                </CardContent>
              </Card>
            )}

            {!isLoading && !error && filteredSales.length === 0 && (
              <Card className="text-center py-10 text-muted-foreground bg-muted/50">
                <CardContent>
                  <Info className="mx-auto h-12 w-12 mb-4" />
                  <p className="font-semibold">
                    {searchTerm ? `No sales found for "${searchTerm}"` : "There are no held sales."}
                  </p>
                </CardContent>
              </Card>
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

        <DialogFooter className="p-6 border-t mt-auto">
          <DialogClose asChild>
            <Button variant="outline"><X className="mr-2 h-4 w-4" />Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
