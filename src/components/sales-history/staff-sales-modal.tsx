'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; table-layout: auto; }
            th, td { border: 1px solid #ddd; padding: 12px 15px; text-align: left !important; font-size: 0.95rem; overflow: hidden; word-wrap: break-word; }
            th { background-color: #f7f7f7; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
            td { vertical-align: middle; }
            .financial-value { white-space: nowrap; font-weight: 700; }
            .report-header { text-align: left; margin-bottom: 2.5rem; border-bottom: 3px solid #eee; padding-bottom: 1.5rem; }
            .store-name { font-size: 2.2rem; font-weight: 900; margin: 0; color: #000; }
            .report-title { font-size: 1.6rem; margin: 0.5rem 0; font-weight: 700; }
            .report-date { font-size: 1.1rem; color: #666; font-weight: 500; }
            .staff-section { margin-bottom: 3rem; page-break-inside: auto; border: 1px solid #eee; border-radius: 0.75rem; overflow: hidden; }
            .staff-header { background-color: #f8fafc; padding: 1.25rem; border-bottom: 2px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
            .staff-name { font-size: 1.4rem; font-weight: 800; color: #1e293b; }
            .staff-summary { font-size: 1.1rem; font-weight: 700; color: #059669; }
            .no-print { display: none !important; }
            @page { size: A3 landscape; margin: 15mm; }

            /* Responsive table adjustments for print */
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
            }
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
      <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] md:w-[85vw] h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b flex-row justify-between items-center shrink-0">
          <div>
            <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-3">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              Staff Performance
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm hidden sm:block">
              Detailed breakdown of sales by staff for the selected day.
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex flex-col sm:flex-row gap-3 items-center shrink-0">
            <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search sold products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 sm:h-10"
                />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] px-2" onClick={() => handleDatePreset('today')}>Today</Button>
                    <Button variant="outline" size="sm" className="h-8 text-[10px] px-2" onClick={() => handleDatePreset('yesterday')}>Yesterday</Button>
                </div>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      size="sm"
                      className={cn("flex-1 sm:w-[180px] justify-start text-left font-normal h-8 text-[10px] sm:text-xs", !selectedDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                      {selectedDate ? formatDate(selectedDate, "MMM dd, yy") : <span>Pick a date</span>}
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
                <div className="report-header no-print hidden sm:block text-center">
                    <h1 className="store-name text-2xl font-bold">Staff Sales Report</h1>
                    <p className="report-title text-muted-foreground">{settings?.storeName || 'StoreLink Pro'}</p>
                    <p className="report-date text-sm font-medium">{selectedDate ? formatDate(selectedDate, 'PPP') : 'N/A'}</p>
                </div>
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                ) : aggregatedStaffSales.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 sm:py-16">
                     <Info className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-4 opacity-20" />
                    <p className="font-semibold text-base sm:text-lg">No Sales Data</p>
                    <p className="text-xs sm:text-sm px-4">No sales recorded by staff for {selectedDate ? formatDate(selectedDate, 'PPP') : 'the selected date'}.</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full" defaultValue={aggregatedStaffSales.map(s => s.staffId)}>
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
                      <AccordionItem value={staff.staffId} key={staff.staffId} className="staff-section border-none mb-3 bg-muted/20 rounded-xl overflow-hidden">
                        <AccordionTrigger className="hover:no-underline hover:bg-muted/40 px-4 py-3 text-lg staff-header">
                          <div className="flex justify-between items-center w-full pr-2">
                            <div className="text-left flex flex-col sm:flex-row sm:items-center sm:gap-3">
                                <p className="font-bold text-primary staff-name text-sm sm:text-base leading-none mb-1 sm:mb-0">{staff.staffName}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[120px] sm:max-w-none">{staff.staffEmail}</p>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 text-xs staff-summary">
                                <Badge variant="secondary" className="text-[10px] sm:text-xs">{staff.totalTransactions} sale(s)</Badge>
                                <span className="font-black text-green-600 dark:text-green-400 text-sm sm:text-base">{formatCurrency(staff.totalSales, currencySymbol)}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                          {filteredItems.length === 0 ? (
                               <p className="text-center text-[10px] sm:text-xs text-muted-foreground py-4">No matching products found.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader className="bg-muted/50">
                                  <TableRow>
                                    <TableHead className="pl-4 text-[10px] uppercase font-black text-left">Product</TableHead>
                                    <TableHead className="text-left text-[10px] uppercase font-black">Time</TableHead>
                                    <TableHead className="text-left text-[10px] uppercase font-black">Qty</TableHead>
                                    <TableHead className="text-left pr-4 text-[10px] uppercase font-black">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginatedItems.map((item, index) => (
                                    <TableRow key={`${item.productId}-${index}`} className="hover:bg-transparent">
                                      <TableCell className="font-bold pl-4 text-xs text-left">{item.productName}</TableCell>
                                      <TableCell className="text-left text-[10px] font-medium">{formatDate(item.timestamp, 'p')}</TableCell>
                                      <TableCell className="text-left text-xs font-bold">{item.quantity}</TableCell>
                                      <TableCell className="text-left pr-4 text-xs font-black financial-value">{formatCurrency(item.totalPrice, currencySymbol)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {totalPages > 1 && (
                                  <div className="flex items-center justify-between p-3 border-t no-print bg-white/50">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePageChange('prev')} disabled={currentPage === 1}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePageChange('next')} disabled={currentPage === totalPages}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                      </div>
                                  </div>
                              )}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )})}
                  </Accordion>
                )}
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="p-4 sm:p-6 border-t mt-auto flex flex-col sm:flex-row justify-between items-center gap-4 no-print shrink-0 bg-background">
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-10 sm:h-9" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-10 sm:h-9" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" /> Export</Button>
            </div>
            <DialogClose asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto h-10 sm:h-9" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" /> Close</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
