'use client';
import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
        <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] md:w-[85vw] h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b shrink-0">
            <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-3">
              <ListChecks className="h-6 w-6 sm:h-7 sm:w-7 text-primary"/> Sales History
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Review past transactions. View details or reprint receipts.</DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0 bg-muted/5">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search ID, customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9 sm:h-10" />
              </div>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} size="sm" className={cn("w-full sm:w-[240px] justify-start text-left font-normal h-9 sm:h-10 text-xs sm:text-sm", !dateRange && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}</>) : format(dateRange.from, "LLL dd")) : (<span>Range</span>)}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                      <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                  </PopoverContent>
              </Popover>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 sm:px-6">
                {isLoading ? (
                    <div className="space-y-2 py-4 px-2 sm:px-0">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : error ? (
                    <div className="text-center py-10 text-destructive px-4"><AlertTriangle className="mx-auto h-8 w-8 mb-2"/>{error}</div>
                ) : paginatedSales.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground px-4"><Info className="mx-auto h-12 w-12 mb-4"/>No sales found.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-[10px] sm:text-xs uppercase font-black">Date</TableHead>
                                <TableHead className="text-[10px] sm:text-xs uppercase font-black">Customer</TableHead>
                                <TableHead className="text-[10px] sm:text-xs uppercase font-black hidden sm:table-cell">Total</TableHead>
                                <TableHead className="text-[10px] sm:text-xs uppercase font-black">Status</TableHead>
                                <TableHead className="text-right text-[10px] sm:text-xs uppercase font-black">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {paginatedSales.map((sale) => (
                            <TableRow key={sale.id} className="group">
                                <TableCell className="font-medium text-[10px] sm:text-xs py-3 sm:py-4">
                                  <div className="font-bold">{convertToDateSafely(sale.createdAt) ? format(convertToDateSafely(sale.createdAt)!, 'MMM dd, yy') : 'N/A'}</div>
                                  <div className="text-muted-foreground hidden sm:block">{convertToDateSafely(sale.createdAt) ? format(convertToDateSafely(sale.createdAt)!, 'p') : ''}</div>
                                </TableCell>
                                <TableCell className="max-w-[100px] sm:max-w-none">
                                  <div className="truncate font-bold text-xs sm:text-sm">{sale.customerName || 'Walk-in'}</div>
                                  <div className="text-[9px] sm:hidden font-black text-primary">{formatCurrency((sale.grandTotal || 0) - (sale.returnedAmount || 0), currencySymbol)}</div>
                                </TableCell>
                                <TableCell className="font-black text-sm hidden sm:table-cell">{formatCurrency((sale.grandTotal || 0) - (sale.returnedAmount || 0), currencySymbol)}</TableCell>
                                <TableCell>
                                  {sale.isCreditSale && !sale.isPaid ? <Badge variant="outline" className="text-[9px] font-black uppercase text-orange-600 border-orange-500">Credit</Badge> : <Badge variant="secondary" className="text-[9px] font-black uppercase bg-green-100 text-green-800">Paid</Badge>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetails(sale)}><Eye className="h-4 w-4"/></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReprintReceipt(sale)}><Printer className="h-4 w-4"/></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 sm:p-6 py-3 sm:py-4 border-t flex flex-row justify-between items-center shrink-0 bg-background">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{filteredSales.length} Records</p>
            <div className="flex items-center gap-2 sm:gap-3">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1 || isLoading}><ChevronLeft className="h-4 w-4"/></Button>
                <span className="text-xs font-bold">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages || isLoading}><ChevronRight className="h-4 w-4"/></Button>
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
