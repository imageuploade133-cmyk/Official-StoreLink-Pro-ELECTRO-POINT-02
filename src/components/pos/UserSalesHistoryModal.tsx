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
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, 
  Printer, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Calendar as CalendarIcon, 
  Info, 
  AlertTriangle, 
  DollarSign, 
  RotateCcw,
  Clock,
  History,
  CheckCircle2,
  Undo2,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Filter
} from "lucide-react";
import { format, startOfDay, endOfDay, subDays, isBefore } from "date-fns";
import { useFirestore, useAuth } from '@/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import type { SaleTransaction, StaffMember } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { SaleDetailsModal } from '@/components/dialogs/sale-details-modal';
import { ReceiptModal } from '@/components/dialogs/receipt-modal';
import { cn, convertToDateSafely } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ITEMS_PER_PAGE = 15;
type SalesTypeFilter = 'all' | 'sales' | 'credit' | 'refunds';

export function UserSalesHistoryModal({ 
  isOpen, 
  onOpenChange, 
  currencySymbol 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  currencySymbol: string; 
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, staffMember, isAdmin } = useAuth();

  const [allSales, setAllSales] = useState<SaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SalesTypeFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ 
    from: startOfDay(subDays(new Date(), 7)), 
    to: endOfDay(new Date()) 
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<SaleTransaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleTransaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);

  const userStaffMap = useMemo(() => {
    const map = new Map<string, StaffMember>();
    if (user && staffMember) {
        map.set(user.uid, staffMember);
    } else if (isAdmin && user) {
        map.set(user.uid, {
            id: user.uid,
            uid: user.uid,
            name: user.displayName || user.email || 'Admin',
            email: user.email || 'N/A',
            role: 'admin',
            status: 'Active',
            permissions: { pages: [] },
        } as any);
    }
    return map;
  }, [user, staffMember, isAdmin]);

  const fetchData = useCallback(async () => {
    if (!firestore || !user || !isOpen) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const salesQuery = query(
        collection(firestore, "saleTransactions"),
        where("staffId", "==", user.uid),
        limit(1000)
      );

      const salesSnapshot = await getDocs(salesQuery);
      
      const salesData = salesSnapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
      } as SaleTransaction));
      
      salesData.sort((a, b) => {
        const dateA = convertToDateSafely(a.createdAt)?.getTime() || 0;
        const dateB = convertToDateSafely(b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      });

      setAllSales(salesData);
      setCurrentPage(1);

    } catch (e: any) {
      console.error("Error fetching user sales history:", e);
      setError("Could not fetch your sales history.");
    } finally {
      setIsLoading(false);
    }
  }, [firestore, user, isOpen]);

  useEffect(() => {
    if (isOpen && user && firestore) {
      fetchData();
    }
  }, [isOpen, user, firestore, fetchData]);
  
  const filteredSales = useMemo(() => {
    let result = [...allSales];

    if (dateRange?.from) {
        const fromDate = startOfDay(dateRange.from);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        result = result.filter(sale => {
            const saleDate = convertToDateSafely(sale.createdAt);
            return saleDate && saleDate >= fromDate && saleDate <= toDate;
        });
    }

    if (activeTab === 'sales') {
        result = result.filter(s => !s.isCreditSale);
    } else if (activeTab === 'credit') {
        result = result.filter(s => s.isCreditSale);
    } else if (activeTab === 'refunds') {
        result = result.filter(s => (s.returnedAmount || 0) > 0 || s.returnStatus);
    }

    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        result = result.filter(sale => 
            sale.id.toLowerCase().includes(term) ||
            (sale.customerName && sale.customerName.toLowerCase().includes(term)) ||
            (sale.paymentMethod && sale.paymentMethod.toLowerCase().includes(term))
        );
    }

    return result;
  }, [allSales, searchTerm, dateRange, activeTab]);

  const stats = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
        const net = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
        acc.totalSales += net;
        acc.count += 1;
        acc.refunds += (sale.returnedAmount || 0);
        return acc;
    }, { totalSales: 0, count: 0, refunds: 0 });
  }, [filteredSales]);
  
  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSales.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSales, currentPage]);

  const handleViewDetails = (sale: SaleTransaction) => {
    setSelectedSaleForDetails(sale);
    setIsDetailsModalOpen(true);
  };
  
  const handleReprintReceipt = (sale: SaleTransaction) => {
    setSelectedSaleForReprint(sale);
    setIsReceiptModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setSearchTerm('');
      setCurrentPage(1);
      setActiveTab('all');
    }
    onOpenChange(open);
  };

  const getSaleStatusInfo = (sale: SaleTransaction) => {
    if (sale.isPaid || ((sale.grandTotal || 0) - (sale.amountPaidTowardsCredit || 0) - (sale.returnedAmount || 0)) <= 0.001) {
        return { text: "Paid", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    }
    const dueDate = convertToDateSafely(sale.dueDate);
    if (dueDate && isBefore(startOfDay(dueDate), startOfDay(new Date()))) {
        return { text: "Overdue", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    }
    return { text: "Credit", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleModalClose}>
        <DialogContent 
          className="max-w-5xl w-[95vw] sm:w-[90vw] md:w-[85vw] h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b shrink-0 bg-background">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                        <History className="h-6 w-6 sm:h-7 sm:w-7 text-primary"/> POS History
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">Performance and transactions from this terminal.</DialogDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={fetchData} disabled={isLoading}>
                        <RotateCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"><X className="h-4 w-4 sm:h-5 sm:w-5"/></Button>
                    </DialogClose>
                </div>
            </div>
          </DialogHeader>

          {/* Filters & Inputs */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b space-y-3 sm:space-y-4 shrink-0 bg-muted/5">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
                  <div className="relative w-full sm:flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-10 h-9 sm:h-10 text-sm" 
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} size="sm" className={cn("w-full sm:w-[220px] justify-start text-left font-normal h-9 sm:h-10 text-xs", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}</>) : format(dateRange.from, "LLL dd")) : (<span>Pick dates</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} className="hidden sm:block" />
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={1} className="block sm:hidden" />
                        </PopoverContent>
                    </Popover>
                  </div>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SalesTypeFilter)} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-9 sm:h-10">
                    <TabsTrigger value="all" className="text-[10px] sm:text-xs">All</TabsTrigger>
                    <TabsTrigger value="sales" className="text-[10px] sm:text-xs">Paid</TabsTrigger>
                    <TabsTrigger value="credit" className="text-[10px] sm:text-xs">Credit</TabsTrigger>
                    <TabsTrigger value="refunds" className="text-[10px] sm:text-xs">Returns</TabsTrigger>
                </TabsList>
              </Tabs>
          </div>
          
          {/* Summary Banner */}
           <div className="px-4 sm:px-6 py-3 sm:py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 bg-primary/5 shrink-0 border-b">
            <div className="space-y-1">
                 <p className="text-[9px] sm:text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Net Revenue
                 </p>
                 {isLoading ? <Skeleton className="h-6 w-20" /> : <div className="text-base sm:text-xl font-bold tracking-tight text-primary">{formatCurrency(stats.totalSales, currencySymbol)}</div>}
            </div>
            <div className="space-y-1">
                <p className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" /> Volume
                </p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <div className="text-base sm:text-xl font-bold">{stats.count}</div>}
            </div>
            <div className="space-y-1">
                <p className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Avg Sale
                </p>
                {isLoading ? <Skeleton className="h-6 w-16" /> : <div className="text-base sm:text-xl font-bold">{formatCurrency(stats.count > 0 ? stats.totalSales / stats.count : 0, currencySymbol)}</div>}
            </div>
            <div className="space-y-1 text-right">
                <p className="text-[9px] sm:text-[10px] font-black uppercase text-orange-600 tracking-widest flex items-center justify-end gap-1">
                    <Undo2 className="h-3 w-3" /> Refunds
                </p>
                {isLoading ? <Skeleton className="h-6 w-16 ml-auto" /> : <div className="text-base sm:text-xl font-bold text-orange-600">{formatCurrency(stats.refunds, currencySymbol)}</div>}
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col relative">
            <ScrollArea className="flex-1">
                <div className="px-2 sm:px-6 min-h-full">
                    {isLoading ? (
                        <div className="space-y-2 py-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 sm:py-24 text-center px-4">
                          <AlertTriangle className="h-10 w-10 sm:h-16 sm:w-16 text-destructive/30 mb-4"/>
                          <h3 className="text-lg sm:text-xl font-bold text-destructive">Error</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-2">{error}</p>
                          <Button variant="outline" size="sm" onClick={fetchData} className="mt-6">
                            Retry
                          </Button>
                        </div>
                    ) : filteredSales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-muted-foreground text-center">
                          <Search className="h-10 w-10 sm:h-12 sm:w-12 opacity-10 mb-4"/>
                          <h3 className="text-lg font-semibold">No transactions</h3>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[100px] sm:w-[120px] text-[10px] uppercase font-black">Date</TableHead>
                                    <TableHead className="text-[10px] uppercase font-black">Customer</TableHead>
                                    <TableHead className="text-right text-[10px] uppercase font-black">Total</TableHead>
                                    <TableHead className="text-right text-[10px] uppercase font-black">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {paginatedSales.map((sale) => {
                                const saleDate = convertToDateSafely(sale.createdAt);
                                const total = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
                                const status = getSaleStatusInfo(sale);
                                return (
                                    <TableRow key={sale.id} className="group">
                                        <TableCell className="py-3 sm:py-4">
                                          <div className="font-bold text-[10px] sm:text-xs">{saleDate ? format(saleDate, 'MMM dd, yy') : 'N/A'}</div>
                                          <div className="text-[9px] text-muted-foreground hidden sm:block">{saleDate ? format(saleDate, 'h:mm a') : ''}</div>
                                        </TableCell>
                                        <TableCell className="py-3 sm:py-4">
                                          <div className="truncate font-bold text-xs sm:text-sm" title={sale.customerName || 'Walk-in'}>
                                            {sale.customerName || 'Walk-in'}
                                          </div>
                                          <Badge variant="outline" className={cn("text-[8px] font-black uppercase px-1 py-0", status.color)}>
                                            {status.text}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right py-3 sm:py-4">
                                          <div className="font-black text-xs sm:text-sm">{formatCurrency(total, currencySymbol)}</div>
                                          <div className="text-[9px] text-muted-foreground hidden sm:block">{sale.paymentMethod}</div>
                                        </TableCell>
                                        <TableCell className="text-right py-3 sm:py-4 px-1 sm:px-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleViewDetails(sale)}>
                                                  <Eye className="h-4 w-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleReprintReceipt(sale)}>
                                                  <Printer className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </ScrollArea>
          </div>

          {/* Pagination */}
          <DialogFooter className="p-4 sm:p-6 py-3 sm:py-4 border-t flex flex-row justify-between items-center shrink-0 bg-background shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                {filteredSales.length} Records
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1 sm:gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1 || isLoading}
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4"/>
                    </Button>
                    <div className="text-[10px] sm:text-[11px] font-bold tabular-nums min-w-[30px] sm:min-w-[40px] text-center">
                        {currentPage} / {totalPages || 1}
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} 
                      disabled={currentPage >= totalPages || isLoading}
                    >
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4"/>
                    </Button>
                </div>
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
            staffMap={userStaffMap}
        />
      )}

      {selectedSaleForReprint && (
        <ReceiptModal
            isOpen={isReceiptModalOpen}
            onClose={() => setIsReceiptModalOpen(false)}
            saleTransaction={selectedSaleForReprint}
            staffMap={userStaffMap}
        />
      )}
    </>
  );
}
