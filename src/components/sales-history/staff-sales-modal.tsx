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
      <DialogContent className="max-w-4xl h flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-row justify-between items-center">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Users className="h-7 w-7 text-primary" />
              Staff Performance
            </DialogTitle>
            <DialogDescription>
              A detailed breakdown of sales by each staff member for the selected day.
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="px-6 py-4 border-b grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search sold products within this day..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                />
            </div>
            <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => handleDatePreset('today')}>Today</Button>
                <Button variant="outline" size="sm" onClick={() => handleDatePreset('yesterday')}>Yesterday</Button>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? formatDate(selectedDate, "PPP") : <span>Pick a date</span>}
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
          <div className="p-6 space-y-4">
            <div id="printable-staff-report">
                <div className="report-header no-print">
                    <h1 className="store-name">Staff Sales Report</h1>
                    <p className="report-title">{settings?.storeName || 'v9 POS System'}</p>
                    <p className="report-date">{selectedDate ? formatDate(selectedDate, 'PPP') : 'N/A'}</p>
                </div>
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                ) : aggregatedStaffSales.length === 0 ? (
                  <div className="text-center text-muted-foreground py-16">
                     <Info className="mx-auto h-12 w-12 mb-4" />
                    <p className="font-semibold text-lg">No Sales Data</p>
                    <p>No sales recorded by any staff for {selectedDate ? formatDate(selectedDate, 'PPP') : 'the selected date'}.</p>
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
                      <AccordionItem value={staff.staffId} key={staff.staffId} className="staff-section">
                        <AccordionTrigger className="hover:bg-accent/50 px-4 py-3 rounded-lg text-lg staff-header">
                          <div className="flex justify-between items-center w-full pr-4">
                            <div className="text-left">
                                <p className="font-semibold text-primary staff-name">{staff.staffName}</p>
                                <p className="text-xs text-muted-foreground">{staff.staffEmail}</p>
                            </div>
                            <div className="flex items-center gap-4 text-sm staff-summary">
                                <Badge variant="secondary">{staff.totalTransactions} sale(s)</Badge>
                                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(staff.totalSales, currencySymbol)}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-muted/30 p-0">
                          {filteredItems.length === 0 ? (
                               <p className="text-center text-sm text-muted-foreground py-4">No matching products found for this staff member.</p>
                          ) : (
                            <>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="pl-6 w-1/3">Product Sold</TableHead>
                                    <TableHead className="text-center">Time</TableHead>
                                    <TableHead className="text-center">Quantity</TableHead>
                                    <TableHead className="text-right pr-6">Total Value</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginatedItems.map((item, index) => (
                                    <TableRow key={`${item.productId}-${index}`}>
                                      <TableCell className="font-medium pl-6">{item.productName}</TableCell>
                                      <TableCell className="text-center text-xs">{formatDate(item.timestamp, 'p')}</TableCell>
                                      <TableCell className="text-center">{item.quantity}</TableCell>
                                      <TableCell className="text-right pr-6">{formatCurrency(item.totalPrice, currencySymbol)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {totalPages > 1 && (
                                  <div className="flex items-center justify-end gap-2 p-2 border-t no-print">
                                      <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePageChange('prev')} disabled={currentPage === 1}>
                                          <ChevronLeft className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePageChange('next')} disabled={currentPage === totalPages}>
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

        <DialogFooter className="p-6 border-t mt-auto flex-row justify-between items-center no-print">
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
            </div>
            <DialogClose asChild>
                <Button variant="outline" size="sm"><X className="mr-2 h-4 w-4" /> Close</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
