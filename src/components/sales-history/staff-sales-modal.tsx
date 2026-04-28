'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Users, X, Info, Calendar as CalendarIcon, Search, ChevronLeft, ChevronRight, Printer, Download } from "lucide-react";
import { formatCurrency } from '@/lib/formatUtils';
import { Badge } from '@/components/ui/badge';
import type { SaleTransactionItem, SaleTransaction, StaffMember } from '@/lib/types';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format as formatDate, startOfDay, endOfDay, subDays } from 'date-fns';
import { cn, convertToDateSafely } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { useSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';


export interface StaffSalesData {
  staffId: string;
  staffName: string;
  staffEmail: string;
  totalSales: number;
  totalTransactions: number;
  itemsSold: (SaleTransactionItem & { saleId: string, timestamp: Date })[];
}

interface StaffSalesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allSales: SaleTransaction[];
  staffMap: Map<string, StaffMember>;
  currencySymbol: string;
}

const ITEMS_PER_ACCORDION_PAGE = 5;

export function StaffSalesModal({ isOpen, onOpenChange, allSales, staffMap, currencySymbol }: StaffSalesModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<Record<string, number>>({});
  const { settings } = useSettings();
  const { toast } = useToast();
  const { user: currentUser } = useAuth(); // Get current user from Auth context

  const aggregatedStaffSales = useMemo(() => {
    setIsLoading(true);
    if (!selectedDate || !allSales || !currentUser) {
        setIsLoading(false);
        return [];
    }
    
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

    const filteredSales = allSales.filter(sale => {
        const saleDate = convertToDateSafely(sale.createdAt);
        return saleDate && saleDate >= dayStart && saleDate <= dayEnd;
    });

    const salesByStaff = new Map<string, StaffSalesData>();

    filteredSales.forEach(sale => {
        const staffId = sale.staffId || currentUser.uid;
        
        let staffEntry = salesByStaff.get(staffId);
        if (!staffEntry) {
            const staffInfo = staffMap.get(staffId);
            
            const userEmail = staffInfo?.email || (staffId === currentUser.uid ? currentUser.email : null) || '(No Profile)';
            
            const staffName = (staffInfo?.name && staffInfo.name !== 'Admin User') ? staffInfo.name : userEmail;

            staffEntry = {
                staffId: staffId,
                staffName: staffName,
                staffEmail: userEmail,
                totalSales: 0,
                totalTransactions: 0,
                itemsSold: [],
            };
        }
        
        const netSaleTotal = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
        staffEntry.totalSales += netSaleTotal;
        staffEntry.totalTransactions += 1;

        sale.items.forEach(item => {
            const saleDate = convertToDateSafely(sale.createdAt);
            if(saleDate) {
              staffEntry!.itemsSold.push({ ...item, saleId: sale.id, timestamp: saleDate });
            }
        });

        salesByStaff.set(staffId, staffEntry);
    });
    
    setIsLoading(false);
    return Array.from(salesByStaff.values()).sort((a,b) => b.totalSales - a.totalSales);
  }, [allSales, staffMap, selectedDate, currentUser]);
  
  const handleDatePreset = (preset: 'today' | 'yesterday') => {
      if (preset === 'today') {
          setSelectedDate(new Date());
      } else {
          setSelectedDate(subDays(new Date(), 1));
      }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        toast({
            variant: "destructive",
            title: "Print Blocked",
            description: "Please allow pop-ups for this site to print.",
        });
        return;
    }
    const printContent = document.getElementById('printable-staff-report');
    if (!printContent) {
        toast({
            variant: "destructive",
            title: "Print Error",
            description: "Could not find content to print.",
        });
        return;
    }

    const styles = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; line-height: 1.5; color: #333; }
            h1, h2, h3 { color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9rem; }
            th { background-color: #f7f7f7; }
            .report-header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #eee; padding-bottom: 1rem; }
            .store-name { font-size: 1.8rem; font-weight: bold; margin: 0; }
            .report-title { font-size: 1.5rem; margin: 0.5rem 0; }
            .report-date { font-size: 1rem; color: #555; }
            .staff-section { margin-bottom: 2rem; page-break-inside: avoid; }
            .staff-header { background-color: #eef2ff; padding: 0.75rem; border-radius: 0.5rem; display: flex; justify-content: space-between; align-items: center; }
            .staff-name { font-size: 1.2rem; font-weight: 600; }
            .staff-summary { font-size: 1rem; font-weight: 500; }
            .no-print { display: none !important; }
            @page { size: auto; margin: 20mm; }
        </style>
    `;

    printWindow.document.write('<html><head><title>Staff Sales Report</title>');
    printWindow.document.write(styles);
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPdf = () => {
    toast({
        title: "Preparing Download",
        description: "Your report will open in a print dialog. Please use the 'Save as PDF' or 'Print to PDF' option from your browser.",
        duration: 8000,
    });
    handlePrint();
  };


  useEffect(() => {
    if(isOpen) {
        setSearchTerm('');
        setPagination({});
    }
  }, [isOpen, selectedDate]);
  
  useEffect(() => {
    setPagination({});
  }, [searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[100dvh] sm:h-[90vh] flex flex-col p-0 overflow-hidden border-none sm:border">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between w-full">
            <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
                <Users className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
                Staff Performance
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                A detailed breakdown of sales by each staff member.
                </DialogDescription>
            </div>
            <DialogClose asChild className="sm:hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <X className="h-4 w-4" />
                </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        
        <div className="px-4 sm:px-6 py-4 border-b flex flex-col md:flex-row gap-3 sm:gap-4 shrink-0 bg-muted/5">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search sold products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 sm:h-10 text-sm"
                />
            </div>
            <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" size="sm" className="h-9 text-xs sm:text-sm" onClick={() => handleDatePreset('today')}>Today</Button>
                <Button variant="outline" size="sm" className="h-9 text-xs sm:text-sm" onClick={() => handleDatePreset('yesterday')}>Yesterday</Button>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full md:w-[240px] justify-start text-left font-normal h-9 sm:h-10 text-sm", !selectedDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{selectedDate ? formatDate(selectedDate, "PPP") : <span>Pick a date</span>}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
            </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 space-y-4">
            <div id="printable-staff-report">
                <div className="report-header no-print">
                    <h1 className="store-name">Staff Sales Report</h1>
                    <p className="report-title">{settings?.storeName || 'v9 POS System'}</p>
                    <p className="report-date">{selectedDate ? formatDate(selectedDate, 'PPP') : 'N/A'}</p>
                </div>
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                    </div>
                ) : aggregatedStaffSales.length === 0 ? (
                  <div className="text-center text-muted-foreground py-16">
                     <Info className="mx-auto h-12 w-12 mb-4" />
                    <p className="font-semibold text-lg">No Sales Data</p>
                    <p>No sales recorded by any staff for {selectedDate ? formatDate(selectedDate, 'PPP') : 'the selected date'}.</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full space-y-3" defaultValue={aggregatedStaffSales.map(s => s.staffId)}>
                    {aggregatedStaffSales.map((staff) => {
                      const lowercasedSearchTerm = searchTerm.toLowerCase();
                      const filteredItems = staff.itemsSold.filter(item => 
                          item.productName.toLowerCase().includes(lowercasedSearchTerm)
                      );

                      const currentPage = pagination[staff.staffId] || 1;
                      const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_ACCORDION_PAGE);
                      const startIndex = (currentPage - 1) * ITEMS_PER_ACCORDION_PAGE;
                      const endIndex = startIndex + ITEMS_PER_ACCORDION_PAGE;
                      const paginatedItems = filteredItems.slice(startIndex, endIndex);

                      const handlePageChange = (direction: 'next' | 'prev') => {
                        setPagination(prev => ({
                          ...prev,
                          [staff.staffId]: direction === 'next' ? Math.min(totalPages, currentPage + 1) : Math.max(1, currentPage - 1)
                        }));
                      };
                      
                      return (
                      <AccordionItem value={staff.staffId} key={staff.staffId} className="staff-section border rounded-xl overflow-hidden shadow-sm bg-card">
                        <AccordionTrigger className="hover:bg-accent/50 px-4 py-3 text-lg staff-header transition-all">
                          <div className="flex justify-between items-center w-full pr-4 text-left">
                            <div className="min-w-0 pr-2">
                                <p className="font-bold text-primary staff-name truncate">{staff.staffName}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{staff.staffEmail}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-4 text-sm staff-summary shrink-0">
                                <Badge variant="secondary" className="font-medium">{staff.totalTransactions} sale(s)</Badge>
                                <span className="font-bold text-green-600 dark:text-green-400 font-mono">{formatCurrency(staff.totalSales, currencySymbol)}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-muted/30 p-0 border-t">
                          {filteredItems.length === 0 ? (
                               <p className="text-center text-sm text-muted-foreground py-6">No matching products found.</p>
                          ) : (
                            <>
                              <div className="hidden sm:block">
                                <Table>
                                    <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6 w-1/3 text-xs uppercase tracking-wider">Product</TableHead>
                                        <TableHead className="text-center text-xs uppercase tracking-wider">Time</TableHead>
                                        <TableHead className="text-center text-xs uppercase tracking-wider">Qty</TableHead>
                                        <TableHead className="text-right pr-6 text-xs uppercase tracking-wider">Total</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {paginatedItems.map((item, index) => (
                                        <TableRow key={`${item.productId}-${index}`} className="hover:bg-muted/50">
                                        <TableCell className="font-medium pl-6 text-sm">{item.productName}</TableCell>
                                        <TableCell className="text-center text-xs text-muted-foreground">{formatDate(item.timestamp, 'p')}</TableCell>
                                        <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                                        <TableCell className="text-right pr-6 font-bold font-mono">{formatCurrency(item.totalPrice, currencySymbol)}</TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                              </div>

                              <div className="sm:hidden space-y-2 p-3">
                                {paginatedItems.map((item, index) => (
                                    <div key={`${item.productId}-${index}`} className="p-3 rounded-lg border bg-background/50 shadow-sm flex justify-between items-start">
                                        <div className="space-y-1 flex-1 min-w-0 pr-2">
                                            <p className="text-sm font-bold truncate">{item.productName}</p>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <CalendarIcon className="h-2.5 w-2.5" />
                                                {formatDate(item.timestamp, 'p')}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold font-mono text-primary">{formatCurrency(item.totalPrice, currencySymbol)}</p>
                                            <Badge variant="outline" className="text-[10px] font-bold h-5 px-1.5 mt-1">Qty: {item.quantity}</Badge>
                                        </div>
                                    </div>
                                ))}
                              </div>

                              {totalPages > 1 && (
                                  <div className="flex items-center justify-end gap-2 p-3 border-t no-print">
                                      <span className="text-[10px] sm:text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
                                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handlePageChange('prev')} disabled={currentPage === 1}>
                                          <ChevronLeft className="h-4 w-4" />
                                      </Button>
                                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handlePageChange('next')} disabled={currentPage === totalPages}>
                                          <ChevronRight className="h-4 w-4" />
                                      </Button>
                                  </div>
                              )}
                            </>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )})}
                  </Accordion>
                )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 sm:p-6 border-t mt-auto flex flex-row justify-between items-center no-print shrink-0 bg-background">
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs sm:h-10 sm:text-sm" onClick={handlePrint}><Printer className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Print</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs sm:h-10 sm:text-sm" onClick={handleDownloadPdf}><Download className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Export PDF</Button>
            </div>
            <DialogClose asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs sm:h-10 sm:text-sm">Close</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
