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
        <DialogContent className="max-w-4xl h-[100dvh] sm:h-[90vh] flex flex-col p-0 overflow-hidden border-none sm:border">
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
                <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
                <ListChecks className="h-6 w-6 sm:h-7 sm:w-7 text-primary"/> Sales History
                </DialogTitle>
                <DialogClose asChild className="sm:hidden">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
                </DialogClose>
            </div>
            <DialogDescription className="text-xs sm:text-sm">Review past transactions. You can view details or reprint receipts.</DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-6 py-4 border-b flex flex-col md:flex-row gap-3 sm:gap-4 shrink-0 bg-muted/5">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search ID, customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 sm:h-10 text-sm" />
              </div>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full md:w-[280px] justify-start text-left font-normal h-9 sm:h-10 text-sm", !dateRange && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          <span className="truncate">
                            {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : format(dateRange.from, "LLL dd, y")) : (<span>Pick a date range</span>)}
                          </span>
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                      <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                  </PopoverContent>
              </Popover>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-4 sm:px-6 py-4">
                {isLoading ? (
                    <div className="space-y-3 py-4">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 sm:h-12 w-full rounded-xl" />)}
                    </div>
                ) : error ? (
                    <div className="text-center py-10 text-destructive"><AlertTriangle className="mx-auto h-8 w-8 mb-2"/>{error}</div>
                ) : paginatedSales.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground"><Info className="mx-auto h-12 w-12 mb-4"/>No sales found for the selected criteria.</div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block">
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
                                    <TableRow key={sale.id} className="hover:bg-muted/30">
                                        <TableCell className="font-medium text-xs">
                                            {convertToDateSafely(sale.createdAt) ? format(convertToDateSafely(sale.createdAt)!, 'PP p') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="max-w-[150px] truncate">{sale.customerName || 'Walk-in'}</TableCell>
                                        <TableCell className="font-bold font-mono">{formatCurrency((sale.grandTotal || 0) - (sale.returnedAmount || 0), currencySymbol)}</TableCell>
                                        <TableCell>
                                        {sale.isCreditSale && !sale.isPaid ? <Badge variant="outline" className="text-orange-600 border-orange-500 bg-orange-50">Credit</Badge> : <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Paid</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(sale)} className="h-8"><Eye className="h-3.5 w-3.5 mr-1"/> Details</Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleReprintReceipt(sale)} className="h-8"><Printer className="h-3.5 w-3.5 mr-1"/> Receipt</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile List */}
                        <div className="md:hidden space-y-4">
                            {paginatedSales.map((sale) => (
                                <div key={sale.id} className="p-4 rounded-xl border bg-card shadow-sm active:bg-muted/50 transition-colors space-y-3" onClick={() => handleViewDetails(sale)}>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold">{convertToDateSafely(sale.createdAt) ? format(convertToDateSafely(sale.createdAt)!, 'MMM dd, yyyy') : 'N/A'}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{sale.id.substring(0, 12)}...</p>
                                        </div>
                                        {sale.isCreditSale && !sale.isPaid ? 
                                            <Badge variant="outline" className="text-orange-600 border-orange-500 bg-orange-50">Credit</Badge> : 
                                            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100">Paid</Badge>
                                        }
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase font-medium tracking-tight">Customer</p>
                                            <p className="text-sm font-semibold truncate max-w-[150px]">{sale.customerName || 'Walk-in'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold font-mono text-primary">{formatCurrency((sale.grandTotal || 0) - (sale.returnedAmount || 0), currencySymbol)}</p>
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t flex gap-2">
                                        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDetails(sale); }} className="flex-1 h-8 text-xs"><Eye className="h-3 w-3 mr-1"/> Details</Button>
                                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleReprintReceipt(sale); }} className="flex-1 h-8 text-xs"><Printer className="h-3 w-3 mr-1"/> Receipt</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 sm:p-6 pt-4 border-t flex flex-row justify-between items-center shrink-0 bg-background">
            <p className="text-xs text-muted-foreground">Total: {filteredSales.length}</p>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1 || isLoading}><ChevronLeft className="h-4 w-4"/></Button>
                <span className="text-xs font-medium">{currentPage} / {totalPages}</span>
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
