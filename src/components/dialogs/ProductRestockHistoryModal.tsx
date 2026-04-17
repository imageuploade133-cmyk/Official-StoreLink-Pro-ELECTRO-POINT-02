'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { RestockEntry } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, X, Info } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely } from '@/lib/utils';
import { useFirestore } from '@/firebase';

interface ProductRestockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currencySymbol: string;
}

export function ProductRestockHistoryModal({ isOpen, onClose, productId, productName, currencySymbol }: ProductRestockHistoryModalProps) {
  const [history, setHistory] = useState<RestockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();

  const fetchHistory = useCallback(async () => {
    if (!productId || !firestore) return;
    setIsLoading(true);
    setError(null);
    try {
      const q = query(
        collection(firestore, 'restockEntries'),
        where('productId', '==', productId),
        orderBy('restockDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        restockDate: convertToDateSafely(doc.data().restockDate),
        createdAt: convertToDateSafely(doc.data().createdAt),
      } as RestockEntry));
      setHistory(entries);
    } catch (e: any) {
      console.error("Error fetching restock history:", e);
      setError("Failed to load history.");
    } finally {
      setIsLoading(false);
    }
  }, [productId, firestore]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <History className="h-6 w-6 text-primary" />
            Restock History: {productName}
          </DialogTitle>
          <DialogDescription>
            A log of all restock events for this product.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : error ? (
              <div className="text-center py-10 text-red-500">{error}</div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <Info className="w-12 h-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold">No History Found</h3>
                <p className="text-sm">This product has not been restocked yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost/Unit</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => {
                    const restockDate = convertToDateSafely(entry.restockDate);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs">{restockDate ? format(restockDate, 'PP p') : 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">+{entry.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.costPricePerUnit, currencySymbol)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(entry.totalCost, currencySymbol)}</TableCell>
                        <TableCell>{entry.supplierName || 'N/A'}</TableCell>
                        <TableCell className="text-xs">{entry.userEmail ? entry.userEmail.split('@')[0] : 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
