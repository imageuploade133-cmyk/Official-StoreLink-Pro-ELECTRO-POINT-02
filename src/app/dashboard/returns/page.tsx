
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely, cn } from '@/lib/utils';
import type { SaleTransaction, StaffMember } from '@/lib/types';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Undo2, Info, Eye, DollarSign, Package, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { ReceiptModal } from '@/components/dialogs/receipt-modal';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';

const ITEMS_PER_PAGE = 15;

export default function ReturnsPage() {
  const { user, permissions, isLoading: authLoading, isAdmin } = useAuth();
  const firestore = useFirestore();
  const { settings, isLoading: isLoadingSettings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  
  const [returnedSales, setReturnedSales] = useState<SaleTransaction[]>([]);
  const [staffMap, setStaffMap] = useState<Map<string, StaffMember>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination cursors using refs to avoid loops
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Stats
  const [totalRefundedValue, setTotalRefundedValue] = useState(0);
  const [transactionsCount, setTransactionsCount] = useState(0);

  const fetchStaff = useCallback(async () => {
    if (!firestore) return;
    try {
      const staffQuery = query(collection(firestore, "staff"));
      const snapshot = await getDocs(staffQuery);
      const map = new Map<string, StaffMember>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        map.set(doc.id, { id: doc.id, ...data } as StaffMember);
      });
      if (isAdmin && user && !map.has(user.uid)) {
        map.set(user.uid, {
          id: user.uid,
          uid: user.uid,
          name: user.displayName || user.email || 'Admin',
          email: user.email || 'N/A',
          role: 'admin',
          status: 'Active',
          permissions: { pages: [] }
        } as any);
      }
      setStaffMap(map);
    } catch (e) {
      console.error("Error fetching staff map:", e);
    }
  }, [firestore, isAdmin, user]);

  const fetchReturns = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !user) return;
    setIsLoading(true);
    setError(null);

    try {
      const returnsCol = collection(firestore, "saleTransactions");
      let q = query(
        returnsCol, 
        where("returnStatus", "in", ["partiallyReturned", "fullyReturned"]),
        orderBy("updatedAt", "desc")
      );

      // Handle Pagination using refs
      if (direction === 'next' && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstDocRef.current) {
        q = query(q, endBefore(firstDocRef.current), limitToLast(ITEMS_PER_PAGE));
      } else {
        q = query(q, limit(ITEMS_PER_PAGE));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        firstDocRef.current = docs[0];
        lastDocRef.current = docs[docs.length - 1];
        setIsLastPage(docs.length < ITEMS_PER_PAGE);

        const list = docs.map(d => ({
          id: d.id,
          ...d.data(),
          updatedAt: convertToDateSafely(d.data().updatedAt),
          createdAt: convertToDateSafely(d.data().createdAt),
        } as SaleTransaction));

        setReturnedSales(list);
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') setReturnedSales([]);
        setIsLastPage(true);
      }

      // Fetch global stats (only on initial load)
      if (direction === 'initial') {
        const statsQuery = query(
          returnsCol, 
          where("returnStatus", "in", ["partiallyReturned", "fullyReturned"])
        );
        const statsSnap = await getDocs(statsQuery);
        const val = statsSnap.docs.reduce((sum, d) => sum + (d.data().returnedAmount || 0), 0);
        setTotalRefundedValue(val);
        setTransactionsCount(statsSnap.docs.length);
      }

    } catch (e: any) {
      console.error("Error fetching returns:", e);
      setError("Failed to load return history.");
    } finally {
      setIsLoading(false);
    }
  }, [firestore, user]);

  useEffect(() => {
    if (!authLoading && permissions.canProcessReturns && firestore) {
      fetchStaff();
      fetchReturns('initial');
    }
  }, [authLoading, permissions.canProcessReturns, firestore, fetchStaff, fetchReturns]);

  const handleViewDetails = (sale: SaleTransaction) => {
    setSelectedSale(sale);
    setIsReceiptModalOpen(true);
  };

  const handlePrevPage = () => fetchReturns('prev');
  const handleNextPage = () => fetchReturns('next');

  if (authLoading || isLoadingSettings) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.canProcessReturns) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          icon={Undo2}
          title="Refunds & Returns"
          description="Manage and review all sales that have items returned, processed via terminal or web."
        />
        <Button variant="outline" onClick={() => fetchReturns('initial')} disabled={isLoading}>
          <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          Sync Registry
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
            title="Total Refunded Amount"
            value={formatCurrency(totalRefundedValue, currencySymbol)}
            icon={DollarSign}
            description="Total value of all processed refunds."
            className="bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30"
            titleClassName="text-orange-600 dark:text-orange-400"
            iconClassName="text-orange-500"
            valueClassName="text-orange-700 dark:text-orange-300"
        />
        <StatCard
            title="Transactions with Returns"
            value={transactionsCount.toLocaleString()}
            icon={Undo2}
            description="Sales that have partial or full returns."
            className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30"
            titleClassName="text-blue-600 dark:text-blue-400"
            iconClassName="text-blue-500"
            valueClassName="text-blue-700 dark:text-blue-300"
        />
        <StatCard
            title="Registry Scope"
            value={`${ITEMS_PER_PAGE} per page`}
            icon={Package}
            description="Optimized incremental fetching is active."
            className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30"
            titleClassName="text-purple-600 dark:text-purple-400"
            iconClassName="text-purple-500"
            valueClassName="text-purple-700 dark:text-purple-300"
        />
      </div>

      <Card className="shadow-lg overflow-hidden border-none ring-1 ring-border">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle>Returned Sales Log</CardTitle>
          <CardDescription>
            Historical record of all return transactions. Use pagination to navigate.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Sale ID</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Original Total</TableHead>
                <TableHead className="text-right">Amt Refunded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} className="py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground opacity-20" /></TableCell>
                  </TableRow>
                ))
              ) : returnedSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Info className="h-10 w-10 opacity-10" />
                      <span className="font-bold">No returned sales found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                returnedSales.map((sale) => {
                  const updatedAt = convertToDateSafely(sale.updatedAt);
                  return (
                    <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-[10px] font-bold text-primary">#{sale.id.substring(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-bold">{updatedAt ? format(updatedAt, 'PP') : 'N/A'}</div>
                        <div className="text-[10px] text-muted-foreground">{updatedAt ? format(updatedAt, 'p') : ''}</div>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">{sale.customerName || 'Walk-in'}</TableCell>
                      <TableCell className="text-right font-medium text-xs">
                        {formatCurrency(sale.grandTotal, currencySymbol)}
                      </TableCell>
                      <TableCell className="text-right font-black text-destructive text-sm">
                        -{formatCurrency(sale.returnedAmount || 0, currencySymbol)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.returnStatus === 'fullyReturned' ? 'destructive' : 'secondary'} className="text-[9px] font-black uppercase tracking-tighter">
                          {sale.returnStatus === 'fullyReturned' ? 'Full Return' : 'Partial Return'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => handleViewReceipt(sale)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                Page {currentPage} <span className="mx-2">|</span> Return Registry
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="font-bold">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={isLastPage || isLoading} className="font-bold">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </CardFooter>
      </Card>
      
      {selectedSale && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setSelectedSale(null)}
          saleTransaction={selectedSale}
          staffMap={staffMap}
        />
      )}
    </div>
  );
}
