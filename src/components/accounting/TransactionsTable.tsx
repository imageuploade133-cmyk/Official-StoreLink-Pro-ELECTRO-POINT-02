'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Printer, Info } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { SaleTransaction, StaffMember } from '@/lib/types';
import { SaleDetailsModal } from '@/components/dialogs/sale-details-modal';
import { ReceiptModal } from '@/components/dialogs/receipt-modal';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';

const ITEMS_PER_PAGE = 15;

interface TransactionsTableProps {
    sales: SaleTransaction[];
    staffMap: Map<string, StaffMember>;
    currencySymbol: string;
}

export function TransactionsTable({ sales, staffMap, currencySymbol }: TransactionsTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<SaleTransaction | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleTransaction | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    const paginatedSales = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sales.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sales, currentPage]);

    const totalPages = Math.ceil(sales.length / ITEMS_PER_PAGE);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Transactions List</CardTitle>
                <CardDescription>All sales recorded within the selected date range.</CardDescription>
            </CardHeader>
            <CardContent>
                {paginatedSales.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10"><Info className="mx-auto h-12 w-12 mb-3" /><p>No sales recorded in this period.</p></div>
                ) : (
                    <div className="border rounded-md">
                    <Table>
                        <TableHeader><TableRow><TableHead className="text-left">Sale ID</TableHead><TableHead className="text-left">Date</TableHead><TableHead className="text-left">Customer</TableHead><TableHead className="text-left">Method</TableHead><TableHead className="text-left">Amount</TableHead><TableHead className="text-left">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {paginatedSales.map(sale => {
                                const netTotal = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
                                return (
                                <TableRow key={sale.id}>
                                    <TableCell className="font-mono text-xs text-left">{sale.id.substring(0, 8)}...</TableCell>
                                    <TableCell className="text-left">{sale.createdAt ? format(sale.createdAt as Date, 'PP p') : 'N/A'}</TableCell>
                                    <TableCell className="text-left">{sale.customerName || 'Walk-in'}</TableCell>
                                    <TableCell className="text-left">{sale.paymentMethod}</TableCell>
                                    <TableCell className="text-left font-semibold financial-value">{formatCurrency(netTotal, currencySymbol)}</TableCell>
                                    <TableCell className="text-left">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => { setSelectedSaleForDetails(sale); setIsDetailsModalOpen(true); }}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => { setSelectedSaleForReprint(sale); setIsReceiptModalOpen(true); }}><Printer className="mr-2 h-4 w-4" /> Print Receipt</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                    </div>
                )}
            </CardContent>
            {totalPages > 1 && (
                <CardFooter className="justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>Next</Button>
                </CardFooter>
            )}

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
        </Card>
    )
}
