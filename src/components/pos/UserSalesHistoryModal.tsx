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

  const handleRecordPayment = (sale: SaleTransaction) => {
    // This is just a placeholder to keep SaleDetailsModal happy
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleModalClose}>
        <DialogContent 
          className="max-w-5xl h-[100dvh] sm:h-[90vh] flex flex-col p-0 overflow-hidden border-none sm:border"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b shrink-0 bg-background">
            <div className="flex items-center justify-between">
                <div className="space-y-1 text-left">
                    <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
                        <History className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0"/> POS History
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">Manage transactions from this terminal.</DialogDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={fetchData} disabled={isLoading}>
                        <RotateCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                    <DialogClose asChild className="sm:hidden">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><X className="h-4 w-4"/></Button>
                    </DialogClose>
                </div>
            </div>
          </DialogHeader>

          {/* Filters & Inputs */}
          <div className="px-4 sm:px-6 py-4 border-b space-y-4 shrink-0 bg-muted/5">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
                  <div className="relative flex-grow w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search ID, customer..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-9 h-9 sm:h-10 text-sm" 
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full sm:w-[240px] justify-start text-left font-normal h-9 sm:h-10 text-sm", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">{dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd, y")}</>) : format(dateRange.from, "LLL dd, y")) : (<span>Pick a date range</span>)}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                        </PopoverContent>
                    </Popover>
                  </div>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SalesTypeFilter)} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-9 sm:h-10">
                    <TabsTrigger value="all" className="text-[10px] sm:text-xs">All</TabsTrigger>
                    <TabsTrigger value="sales" className="text-[10px] sm:text-xs">Paid</TabsTrigger>
                    <TabsTrigger value="credit" className="text-[10px] sm:text-xs">Credit</TabsTrigger>
                    <TabsTrigger value="refunds" className="text-[10px] sm:text-xs">Refunds</TabsTrigger>
                </TabsList>
              </Tabs>
          </div>
          
          {/* Summary Banner */}
           <div className="px-4 sm:px-6 py-3 sm:py-4 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-primary/5 shrink-0 border-b">
            <div className="space-y-1 text-left">
                 <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3" /> Net Revenue
                 </p>
                 {isLoading ? <Skeleton className="h-6 sm:h-8 w-24" /> : <div className="text-base sm:text-xl font-bold tracking-tight text-primary font-mono">{formatCurrency(stats.totalSales, currencySymbol)}</div>}
            </div>
            <div className="space-y-1 text-left">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                    <ShoppingBag className="h-3 w-3" /> Volume
                </p>
                {isLoading ? <Skeleton className="h-6 sm:h-8 w-12" /> : <div className="text-base sm:text-xl font-bold">{stats.count}</div>}
            </div>
            <div className="space-y-1 text-left hidden md:block">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3" /> Avg Sale
                </p>
                {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-xl font-bold font-mono">{formatCurrency(stats.count > 0 ? stats.totalSales / stats.count : 0, currencySymbol)}</div>}
            </div>
            <div className="space-y-1 text-right">
                <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest flex items-center justify-end gap-1.5">
                    <Undo2 className="h-3 w-3" /> Refunds
                </p>
                {isLoading ? <Skeleton className="h-6 sm:h-8 w-20 ml-auto" /> : <div className="text-base sm:text-xl font-bold text-orange-600 font-mono">{formatCurrency(stats.refunds, currencySymbol)}</div>}
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col relative">
            <ScrollArea className="flex-1">
                <div className="px-4 sm:px-6 min-h-full py-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-24 sm:h-16 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                          <AlertTriangle className="h-16 w-16 text-destructive/30 mb-4"/>
                          <h3 className="text-xl font-bold text-destructive">Loading Error</h3>
                          <p className="text-muted-foreground max-w-sm mt-2">{error}</p>
                          <Button variant="outline" onClick={fetchData} className="mt-6">
                            <RotateCcw className="mr-2 h-4 w-4" /> Try Again
                          </Button>
                        </div>
                    ) : filteredSales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground text-center">
                          <div className="bg-muted p-6 rounded-full mb-6">
                            <Search className="h-12 w-12 opacity-20"/>
                          </div>
                          <h3 className="text-xl font-semibold">No transactions found</h3>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[120px]">Date</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Net Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {paginatedSales.map((sale) => {
                                        const saleDate = convertToDateSafely(sale.createdAt);
                                        const total = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
                                        const status = getSaleStatusInfo(sale);
                                        return (
                                            <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors group">
                                                <TableCell className="font-medium text-xs py-4 text-left">
                                                  <div className="font-bold">{saleDate ? format(saleDate, 'EEE, MMM dd') : 'N/A'}</div>
                                                  <div className="text-muted-foreground">{saleDate ? format(saleDate, 'h:mm a') : ''}</div>
                                                </TableCell>
                                                <TableCell className="max-w-[180px] py-4 text-left">
                                                  <div className="truncate font-semibold">{sale.customerName || 'Walk-in Customer'}</div>
                                                  <div className="text-[10px] text-muted-foreground uppercase font-mono">#{sale.id.substring(0, 8)}</div>
                                                </TableCell>
                                                <TableCell className="text-right py-4">
                                                  <div className="font-bold text-sm font-mono">{formatCurrency(total, currencySymbol)}</div>
                                                  <div className="text-[10px] text-muted-foreground">{sale.paymentMethod}</div>
                                                </TableCell>
                                                <TableCell className="py-4 text-left">
                                                  <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-2 py-0", status.color)}>
                                                    {status.text}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell className="text-right py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetails(sale)}>
                                                          <Eye className="h-4 w-4"/>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReprintReceipt(sale)}>
                                                          <Printer className="h-4 w-4"/>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile List */}
                            <div className="md:hidden space-y-4">
                                {paginatedSales.map((sale) => {
                                    const saleDate = convertToDateSafely(sale.createdAt);
                                    const total = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
                                    const status = getSaleStatusInfo(sale);
                                    return (
                                        <div key={sale.id} className="p-4 rounded-xl border bg-card shadow-sm active:bg-muted/50 transition-colors space-y-3" onClick={() => handleViewDetails(sale)}>
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1 text-left">
                                                    <p className="text-sm font-bold">{saleDate ? format(saleDate, 'MMM dd, yyyy') : 'N/A'}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">#{sale.id.substring(0, 12)}</p>
                                                </div>
                                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase", status.color)}>
                                                    {status.text}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1 text-left">
                                                    <p className="text-xs text-muted-foreground uppercase font-medium">Customer</p>
                                                    <p className="text-sm font-semibold truncate max-w-[150px]">{sale.customerName || 'Walk-in'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold font-mono text-primary">{formatCurrency(total, currencySymbol)}</p>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t flex gap-2">
                                                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDetails(sale); }} className="flex-1 h-8 text-xs">View Details</Button>
                                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleReprintReceipt(sale); }} className="flex-1 h-8 text-xs">Receipt</Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>
          </div>

          {/* Pagination */}
          <DialogFooter className="p-4 sm:p-6 py-3 sm:py-4 border-t flex flex-row justify-between items-center shrink-0 bg-background">
            <p className="text-xs text-muted-foreground font-medium">{filteredSales.length} Total</p>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isLoading}><ChevronLeft className="h-4 w-4"/></Button>
                <div className="text-[11px] font-bold tabular-nums min-w-[40px] text-center">{currentPage} / {totalPages || 1}</div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages || isLoading}><ChevronRight className="h-4 w-4"/></Button>
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
            onRecordPayment={(s) => handleRecordPayment(s)}
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
