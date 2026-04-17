'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, ListChecks, Search, Calendar as CalendarIcon, Info, Loader2, Eye, Printer, X, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { useFirestore, useAuth } from '@/firebase';
import { collection, getDocs, query, orderBy, where, type QueryDocumentSnapshot, type DocumentData, limit } from 'firebase/firestore';
import type { SaleTransaction, StaffMember } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { SaleDetailsModal } from '@/components/dialogs/sale-details-modal';
import { ReceiptModal } from '@/components/dialogs/receipt-modal';
import { cn, convertToDateSafely } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import type { DateRange } from 'react-day-picker';
import { useBranch } from '@/contexts/branch-context';

const ITEMS_PER_PAGE = 20;

export function SalesHistoryModal({ isOpen, onOpenChange, currencySymbol }: { isOpen: boolean; onOpenChange: (open: boolean) => void; currencySymbol: string; }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useAuth();
  const { currentBranchId } = useBranch();

  const [allSales, setAllSales] = useState<SaleTransaction[]>([]);
  const [staffMap, setStaffMap] = useState<Map<string, StaffMember>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 7), to: new Date() });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<SaleTransaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleTransaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    if (!firestore || !user) return;
    setIsLoading(true);
    setError(null);

    try {
      const salesConstraints: any[] = [];
      if (currentBranchId) {
        salesConstraints.push(where("branchId", "==", currentBranchId));
      }
      if(dateRange?.from) {
        salesConstraints.push(where("createdAt", ">=", startOfDay(dateRange.from)));
      }
      if(dateRange?.to) {
        salesConstraints.push(where("createdAt", "<=", endOfDay(dateRange.to)));
      }
      const salesQuery = query(collection(firestore, "saleTransactions"), ...salesConstraints, limit(500));
      
      const staffQuery = query(collection(firestore, "staff"));

      const [salesSnapshot, staffSnapshot] = await Promise.all([getDocs(salesQuery), getDocs(staffQuery)]);

      const salesData = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleTransaction));
      
      salesData.sort((a, b) => {
          const timeA = convertToDateSafely(a.createdAt)?.getTime() ?? 0;
          const timeB = convertToDateSafely(b.createdAt)?.getTime() ?? 0;
          return timeB - timeA;
      });

      setAllSales(salesData);

      const staffDataMap = new Map<string, StaffMember>();
      staffSnapshot.docs.forEach(doc => {
          staffDataMap.set(doc.id, { id: doc.id, ...doc.data() } as StaffMember);
      });
      setStaffMap(staffDataMap);
      setCurrentPage(1);

    } catch (e: any) {
      console.error("Error fetching sales history:", e);
      setError("Failed to load sales history.");
      toast({ variant: 'destructive', title: "Error", description: e.message || "Could not fetch sales history." });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, user, currentBranchId, dateRange, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, dateRange, fetchData]);
  
  const filteredSales = useMemo(() => {
    if (!searchTerm) return allSales;
    const lowercasedTerm = searchTerm.toLowerCase();
    return allSales.filter(sale => 
      sale.id.toLowerCase().includes(lowercasedTerm) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(lowercasedTerm)) ||
      sale.paymentMethod.toLowerCase().includes(lowercasedTerm)
    );
  }, [allSales, searchTerm]);
  
  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSales, currentPage]);

  const handleViewDetails = (sale: SaleTransaction) => {
    setSelectedSaleForDetails(sale);
    setIsDetailsModalOpen(true);
  };
  
  const handleReprintReceipt = (sale: SaleTransaction) => {
    setSelectedSaleForReprint(sale);
    setIsReceiptModalOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <ListChecks className="h-7 w-7 text-primary"/> Sales History
            </DialogTitle>
            <DialogDescription>Review past transactions. You can view details or reprint receipts.</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 border-b flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search ID, customer, payment method..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full md:w justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : format(dateRange.from, "LLL dd, y")) : (<span>Pick a date range</span>)}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                      <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                  </PopoverContent>
              </Popover>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-6">
                {isLoading ? (
                    <div className="space-y-2 py-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : error ? (
                    <div className="text-center py-10 text-destructive"><AlertTriangle className="mx-auto h-8 w-8 mb-2"/>{error}</div>
                ) : paginatedSales.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground"><Info className="mx-auto h-12 w-12 mb-4"/>No sales found for the selected criteria.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {paginatedSales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell className="font-medium text-xs">{convertToDateSafely(sale.createdAt) ? format(convertToDateSafely(sale.createdAt)!, 'PP p') : 'N/A'}</TableCell>
                                <TableCell>{sale.customerName || 'Walk-in Customer'}</TableCell>
                                <TableCell className="font-semibold">{formatCurrency((sale.grandTotal || 0) - (sale.returnedAmount || 0), currencySymbol)}</TableCell>
                                <TableCell>
                                  {sale.isCreditSale && !sale.isPaid ? <Badge variant="outline" className="text-orange-600 border-orange-500">Credit</Badge> : <Badge variant="secondary" className="bg-green-100 text-green-800">Paid</Badge>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(sale)}><Eye className="h-4 w-4 mr-1"/> Details</Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleReprintReceipt(sale)}><Printer className="h-4 w-4 mr-1"/> Reprint</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-4 border-t flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">Showing {paginatedSales.length} of {filteredSales.length} sales</p>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1 || isLoading}><ChevronLeft className="h-4 w-4 mr-1"/> Prev</Button>
                <span className="text-sm">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages || isLoading}><ChevronRight className="h-4 w-4 ml-1"/> Next</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedSaleForDetails && (
        <SaleDetailsModal
            isOpen={isDetailsModalOpen}
            onOpenChange={setIsDetailsModalOpen}
            saleTransaction={selectedSaleForDetails}
            currencySymbol={currencySymbol}
            staffMap={staffMap}
        />
      )}

      {selectedSaleForReprint && (
        <ReceiptModal
            isOpen={isReceiptModalOpen}
            onClose={() => setIsReceiptModalOpen(false)}
            saleTransaction={selectedSaleForReprint}
        />
      )}
    </>
  );
}
