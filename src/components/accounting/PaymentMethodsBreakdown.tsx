'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Printer, Info, Wallet, Banknote, CreditCard, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import type { SaleTransaction, StaffMember } from '@/lib/types';
import { SaleDetailsModal } from '@/components/dialogs/sale-details-modal';
import { ReceiptModal } from '@/components/dialogs/receipt-modal';

interface PaymentMethodStats {
    method: string;
    total: number;
    count: number;
}

interface PaymentMethodsBreakdownProps {
    paymentMethodStats: PaymentMethodStats[];
    salesByPaymentMethod: Record<string, { total: number, count: number, sales: SaleTransaction[] }>;
    staffMap: Map<string, StaffMember>;
    currencySymbol: string;
}

export function PaymentMethodsBreakdown({ paymentMethodStats, salesByPaymentMethod, staffMap, currencySymbol }: PaymentMethodsBreakdownProps) {
    const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<SaleTransaction | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleTransaction | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    const getPaymentMethodIcon = (method: string) => {
        const lowerMethod = method.toLowerCase();
        if (lowerMethod.includes('cash')) return <Banknote className="h-5 w-5 text-green-600" />;
        if (lowerMethod.includes('card')) return <CreditCard className="h-5 w-5 text-blue-600" />;
        if (lowerMethod.includes('transfer')) return <ArrowLeftRight className="h-5 w-5 text-purple-600" />;
        return <Wallet className="h-5 w-5 text-muted-foreground" />;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sales by Payment Method</CardTitle>
                <CardDescription>A detailed breakdown of all transactions grouped by the payment method used.</CardDescription>
            </CardHeader>
            <CardContent>
                {paymentMethodStats.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10"><Info className="mx-auto h-12 w-12 mb-3" /><p>No payment data found for this period.</p></div>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {paymentMethodStats.map(stat => (
                            <AccordionItem value={stat.method} key={stat.method}>
                                <AccordionTrigger className="text-lg hover:no-underline p-4 rounded-md hover:bg-muted/50">
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-3">
                                            {getPaymentMethodIcon(stat.method)}
                                            <span className="font-semibold">{stat.method}</span>
                                            <Badge>{stat.count} transaction(s)</Badge>
                                        </div>
                                        <span className="text-xl font-bold text-primary mr-4">{formatCurrency(stat.total, currencySymbol)}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="border rounded-md mt-2">
                                      <Table>
                                          <TableHeader><TableRow><TableHead className="text-left">Sale ID</TableHead><TableHead className="text-left">Date</TableHead><TableHead className="text-left">Customer</TableHead><TableHead className="text-left">Amount</TableHead><TableHead className="text-left">Actions</TableHead></TableRow></TableHeader>
                                          <TableBody>
                                              {(salesByPaymentMethod[stat.method]?.sales || []).map(sale => (
                                                  <TableRow key={sale.id}>
                                                      <TableCell className="font-mono text-xs text-left">{sale.id.substring(0, 8)}...</TableCell>
                                                      <TableCell className="text-left">{sale.createdAt ? format(sale.createdAt as Date, 'PP p') : 'N/A'}</TableCell>
                                                      <TableCell className="text-left">{sale.customerName || 'Walk-in'}</TableCell>
                                                      <TableCell className="text-left font-semibold financial-value">{formatCurrency((sale.grandTotal || 0) - (sale.returnedAmount || 0), currencySymbol)}</TableCell>
                                                      <TableCell className="text-left">
                                                          <DropdownMenu>
                                                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                              <DropdownMenuContent align="end">
                                                                  <DropdownMenuItem onSelect={() => { setSelectedSaleForDetails(sale); setIsDetailsModalOpen(true); }}>
                                                                      <Eye className="mr-2 h-4 w-4" /> View Details
                                                                  </DropdownMenuItem>
                                                                  <DropdownMenuItem onSelect={() => { setSelectedSaleForReprint(sale); setIsReceiptModalOpen(true); }}>
                                                                      <Printer className="mr-2 h-4 w-4" /> Print Receipt
                                                                  </DropdownMenuItem>
                                                              </DropdownMenuContent>
                                                          </DropdownMenu>
                                                      </TableCell>
                                                  </TableRow>
                                              ))}
                                          </TableBody>
                                      </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>

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
